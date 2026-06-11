const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const net = require('net');

const port = Number(process.env.FILE_SERVER_PORT || 3000);
const appPath = process.env.APP_PATH || '/app';
const ztHome = process.env.ZT_HOME || '/var/lib/zerotier-one';
const configPath = path.join(appPath, 'config');
const distPath = path.join(appPath, 'dist');
const portalPath = path.join(appPath, 'portal');
const assetsPath = path.join(portalPath, 'assets');
const secretKeyPath = path.join(configPath, 'file_server.key');
const adminAuthPath = path.join(configPath, 'admin_auth.json');
const memberNamesPath = path.join(configPath, 'member_names.json');
const networkProfilesPath = path.join(configPath, 'network_profiles.json');
const ztTokenPath = path.join(ztHome, 'authtoken.secret');
const publicUrl = (process.env.PUBLIC_URL || '').replace(/\/+$/, '');
const defaultTtl = Number(process.env.LINK_TTL_SECONDS || 600);
const maxTtl = Number(process.env.LINK_MAX_TTL_SECONDS || 3600);
const defaultAdminUsername = (process.env.ADMIN_USERNAME || 'admin').trim();
const defaultAdminPassword = (process.env.ADMIN_PASSWORD || 'password').trim();
const sessionTtlMs = Number(process.env.ADMIN_SESSION_TTL_SECONDS || 12 * 60 * 60) * 1000;

function ensureSecretKey() {
  fs.mkdirSync(configPath, { recursive: true });

  if (fs.existsSync(secretKeyPath)) {
    const savedKey = fs.readFileSync(secretKeyPath, 'utf8').trim();
    if (savedKey) {
      return savedKey;
    }
  }

  const key = (process.env.SECRET_KEY || process.env.FILE_KEY || crypto.randomBytes(32).toString('hex')).trim();
  fs.writeFileSync(secretKeyPath, `${key}\n`, { mode: 0o600 });
  return key;
}

const secretKey = ensureSecretKey();

function send(res, statusCode, body, headers = {}) {
  res.writeHead(statusCode, headers);
  res.end(body);
}

function sendJson(res, statusCode, data) {
  send(res, statusCode, JSON.stringify(data), {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
  });
}

function requestBaseUrl(req) {
  if (publicUrl) {
    return publicUrl;
  }
  const proto = req.headers['x-forwarded-proto'] || process.env.PUBLIC_SCHEME || 'http';
  const host = req.headers['x-forwarded-host'] || req.headers.host || `localhost:${port}`;
  return `${proto}://${host}`;
}

function parseRequestUrl(req) {
  const parsed = new URL(req.url, 'http://zerotier-planet.local');
  return {
    pathname: parsed.pathname,
    query: Object.fromEntries(parsed.searchParams.entries()),
  };
}

function readConfigValue(name, fallback = '') {
  const filePath = path.join(configPath, name);
  if (fs.existsSync(filePath)) {
    return fs.readFileSync(filePath, 'utf8').trim();
  }
  return fallback;
}

function controllerPort() {
  return Number(readConfigValue('zerotier-one.port', process.env.ZT_PORT || '9994'));
}

function readZtToken() {
  if (!fs.existsSync(ztTokenPath)) {
    const error = new Error('ZeroTier auth token is not available yet');
    error.statusCode = 503;
    throw error;
  }
  return fs.readFileSync(ztTokenPath, 'utf8').trim();
}

function readJsonFile(filePath, fallback) {
  if (!fs.existsSync(filePath)) {
    return fallback;
  }
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (error) {
    return fallback;
  }
}

function writeJsonFile(filePath, data) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(data, null, 2)}\n`, { mode: 0o600 });
}

function hashPassword(password, salt, iterations = 140000) {
  return crypto.pbkdf2Sync(String(password), salt, iterations, 32, 'sha256').toString('hex');
}

function timingEqual(left, right, encoding = 'hex') {
  const leftBuffer = Buffer.from(String(left || ''), encoding);
  const rightBuffer = Buffer.from(String(right || ''), encoding);
  return leftBuffer.length === rightBuffer.length && crypto.timingSafeEqual(leftBuffer, rightBuffer);
}

function parseIpv4(value) {
  const parts = String(value || '').trim().split('.');
  if (parts.length !== 4) {
    return null;
  }
  let parsed = 0;
  for (const part of parts) {
    if (!/^\d{1,3}$/.test(part)) {
      return null;
    }
    const number = Number(part);
    if (number < 0 || number > 255) {
      return null;
    }
    parsed = (parsed << 8) + number;
  }
  return parsed >>> 0;
}

function formatIpv4(value) {
  return [
    (value >>> 24) & 255,
    (value >>> 16) & 255,
    (value >>> 8) & 255,
    value & 255,
  ].join('.');
}

function parseIpv4Cidr(cidr) {
  const [address, prefixText] = String(cidr || '').trim().split('/');
  const prefix = Number(prefixText);
  const ip = parseIpv4(address);
  if (ip === null || !Number.isInteger(prefix) || prefix < 1 || prefix > 30) {
    return null;
  }
  const mask = (0xffffffff << (32 - prefix)) >>> 0;
  const network = (ip & mask) >>> 0;
  const broadcast = (network | (~mask >>> 0)) >>> 0;
  return { address, prefix, network, broadcast, normalized: `${formatIpv4(network)}/${prefix}` };
}

function parseIpv4RouteCidr(cidr) {
  const [address, prefixText] = String(cidr || '').trim().split('/');
  const prefix = Number(prefixText);
  const ip = parseIpv4(address);
  if (ip === null || !Number.isInteger(prefix) || prefix < 0 || prefix > 32) {
    return null;
  }
  const mask = prefix === 0 ? 0 : (0xffffffff << (32 - prefix)) >>> 0;
  const network = (ip & mask) >>> 0;
  return { address, prefix, network, normalized: `${formatIpv4(network)}/${prefix}` };
}

function defaultPoolForCidr(cidr) {
  const parsed = parseIpv4Cidr(cidr);
  if (!parsed) {
    return null;
  }
  const usableStart = parsed.network + 1;
  const usableEnd = parsed.broadcast - 1;
  if (usableEnd < usableStart) {
    return null;
  }
  const usableCount = usableEnd - usableStart + 1;
  const start = usableCount <= 16 ? usableStart : usableStart + 9;
  const end = usableCount <= 16 ? usableEnd : usableEnd - 5;
  return {
    cidr: parsed.normalized,
    poolStart: formatIpv4(start >>> 0),
    poolEnd: formatIpv4(end >>> 0),
  };
}

function validatePoolRange(cidr, poolStart, poolEnd) {
  const parsed = parseIpv4Cidr(cidr);
  const start = parseIpv4(poolStart);
  const end = parseIpv4(poolEnd);
  if (!parsed || start === null || end === null) {
    return 'Pool start and end must be valid IPv4 addresses';
  }
  if (start > end) {
    return 'Pool start must be lower than or equal to pool end';
  }
  if (start <= parsed.network || end >= parsed.broadcast) {
    return 'Pool range must be inside the managed route CIDR';
  }
  return '';
}

function createAuthStore(username = defaultAdminUsername || 'admin', password = defaultAdminPassword || 'password') {
  const salt = crypto.randomBytes(16).toString('hex');
  const iterations = 140000;
  return {
    version: 1,
    username,
    passwordSalt: salt,
    passwordHash: hashPassword(password, salt, iterations),
    passwordIterations: iterations,
    mustChangePassword: true,
    sessions: {},
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

function loadAuthStore() {
  fs.mkdirSync(configPath, { recursive: true });
  const saved = readJsonFile(adminAuthPath, null);
  if (saved && saved.username && saved.passwordHash && saved.passwordSalt) {
    saved.sessions = saved.sessions && typeof saved.sessions === 'object' ? saved.sessions : {};
    saved.passwordIterations = Number(saved.passwordIterations || 140000);
    saved.mustChangePassword = Boolean(saved.mustChangePassword);
    return saved;
  }

  const store = createAuthStore();
  writeJsonFile(adminAuthPath, store);
  return store;
}

let authStore = loadAuthStore();

function saveAuthStore() {
  authStore.updatedAt = new Date().toISOString();
  writeJsonFile(adminAuthPath, authStore);
}

function verifyAdminPassword(password) {
  const candidate = hashPassword(password, authStore.passwordSalt, authStore.passwordIterations);
  return timingEqual(candidate, authStore.passwordHash);
}

function passwordPolicyError(password) {
  const value = String(password || '');
  if (value.length < 8) {
    return 'Password must be at least 8 characters.';
  }
  if (!/[A-Za-z]/.test(value) || !/[0-9]/.test(value)) {
    return 'Password must include at least one letter and one number.';
  }
  if (value === defaultAdminPassword) {
    return 'Choose a password different from the initial password.';
  }
  return '';
}

function purgeExpiredSessions() {
  const now = Date.now();
  let changed = false;
  for (const [token, session] of Object.entries(authStore.sessions || {})) {
    if (!session || Number(session.expiresAt || 0) <= now) {
      delete authStore.sessions[token];
      changed = true;
    }
  }
  if (changed) {
    saveAuthStore();
  }
}

function createSession() {
  purgeExpiredSessions();
  const token = crypto.randomBytes(32).toString('hex');
  const now = Date.now();
  authStore.sessions[token] = {
    username: authStore.username,
    createdAt: now,
    expiresAt: now + sessionTtlMs,
    passwordChangeRequired: Boolean(authStore.mustChangePassword),
  };
  saveAuthStore();
  return token;
}

function readSessionToken(req, parsedUrl) {
  const authHeader = String(req.headers.authorization || '');
  if (authHeader.toLowerCase().startsWith('bearer ')) {
    return authHeader.slice(7).trim();
  }
  return String(req.headers['x-session-token'] || parsedUrl.query.session || '').trim();
}

function getSession(req, parsedUrl) {
  purgeExpiredSessions();
  const token = readSessionToken(req, parsedUrl);
  if (!token || !authStore.sessions[token]) {
    return null;
  }
  const session = authStore.sessions[token];
  if (session.username !== authStore.username) {
    delete authStore.sessions[token];
    saveAuthStore();
    return null;
  }
  return { token, session };
}

function authorizeAdmin(req, parsedUrl, options = {}) {
  const auth = getSession(req, parsedUrl);
  if (!auth) {
    return null;
  }
  if (authStore.mustChangePassword && !options.allowPasswordChange) {
    return null;
  }
  return auth;
}

function authState(req, parsedUrl) {
  const auth = getSession(req, parsedUrl);
  return {
    username: authStore.username,
    authenticated: Boolean(auth),
    mustChangePassword: Boolean(authStore.mustChangePassword),
    passwordChangeRequired: Boolean(auth && authStore.mustChangePassword),
    sessionTtlSeconds: Math.floor(sessionTtlMs / 1000),
  };
}

function setAdminPassword(password, forceChange = false) {
  const salt = crypto.randomBytes(16).toString('hex');
  const iterations = 140000;
  authStore.passwordSalt = salt;
  authStore.passwordHash = hashPassword(password, salt, iterations);
  authStore.passwordIterations = iterations;
  authStore.mustChangePassword = Boolean(forceChange);
  authStore.sessions = {};
  saveAuthStore();
}

function loadMemberNames() {
  return readJsonFile(memberNamesPath, {});
}

function saveMemberName(memberId, name) {
  const names = loadMemberNames();
  const cleanName = String(name || '').trim();
  if (cleanName) {
    names[memberId] = cleanName;
  } else {
    delete names[memberId];
  }
  writeJsonFile(memberNamesPath, names);
  return cleanName;
}

function removeMemberName(memberId) {
  const names = loadMemberNames();
  delete names[memberId];
  writeJsonFile(memberNamesPath, names);
}

function loadNetworkProfiles() {
  return readJsonFile(networkProfilesPath, {});
}

function saveNetworkProfiles(profiles) {
  writeJsonFile(networkProfilesPath, profiles);
}

function getNetworkProfile(nwid) {
  return loadNetworkProfiles()[nwid] || {};
}

function saveNetworkProfile(nwid, profile) {
  const profiles = loadNetworkProfiles();
  profiles[nwid] = {
    ...(profiles[nwid] || {}),
    ...profile,
    updatedAt: new Date().toISOString(),
  };
  saveNetworkProfiles(profiles);
  return profiles[nwid];
}

function hasManagedProfile(profile) {
  return Boolean(profile.managedRouteTarget || profile.managedPoolStart || profile.managedPoolEnd);
}

function updateNetworkProfile(nwid, updater) {
  const profiles = loadNetworkProfiles();
  const nextProfile = updater({ ...(profiles[nwid] || {}) });
  if (nextProfile) {
    delete nextProfile.updatedAt;
  }
  if (nextProfile && Object.keys(nextProfile).length) {
    profiles[nwid] = {
      ...nextProfile,
      updatedAt: new Date().toISOString(),
    };
  } else {
    delete profiles[nwid];
  }
  saveNetworkProfiles(profiles);
  return profiles[nwid] || {};
}

function deleteNetworkProfile(nwid) {
  const profiles = loadNetworkProfiles();
  if (profiles[nwid]) {
    delete profiles[nwid];
    saveNetworkProfiles(profiles);
  }
}

function readRequestBody(req) {
  return new Promise((resolve, reject) => {
    let raw = '';
    req.on('data', (chunk) => {
      raw += chunk;
      if (raw.length > 1024 * 1024) {
        reject(Object.assign(new Error('Request body is too large'), { statusCode: 413 }));
        req.destroy();
      }
    });
    req.on('end', () => {
      if (!raw) {
        resolve({});
        return;
      }
      try {
        resolve(JSON.parse(raw));
      } catch (error) {
        reject(Object.assign(new Error('Request body must be valid JSON'), { statusCode: 400 }));
      }
    });
    req.on('error', reject);
  });
}

function ztRequest(method, route, body) {
  const requestBody = body === undefined ? null : JSON.stringify(body);
  const requestOptions = {
    hostname: '127.0.0.1',
    port: controllerPort(),
    path: route,
    method,
    headers: {
      'X-ZT1-Auth': readZtToken(),
      Accept: 'application/json',
    },
  };

  if (requestBody !== null) {
    requestOptions.headers['Content-Type'] = 'application/json';
    requestOptions.headers['Content-Length'] = Buffer.byteLength(requestBody);
  }

  return new Promise((resolve, reject) => {
    const request = http.request(requestOptions, (response) => {
      let raw = '';
      response.setEncoding('utf8');
      response.on('data', (chunk) => {
        raw += chunk;
      });
      response.on('end', () => {
        let payload = null;
        if (raw) {
          try {
            payload = JSON.parse(raw);
          } catch (error) {
            payload = raw;
          }
        }

        if (response.statusCode >= 400) {
          let message = typeof payload === 'string' ? payload : `ZeroTier API returned ${response.statusCode}`;
          if (response.statusCode === 404 && route.startsWith('/controller/')) {
            message = [
              'ZeroTier embedded controller API is unavailable.',
              'Restart the container with the latest image so the bundled zerotier-one binary is refreshed from the image.',
            ].join(' ');
          }
          reject(Object.assign(new Error(message), { statusCode: response.statusCode, payload }));
          return;
        }
        resolve(payload);
      });
    });

    request.on('error', (error) => {
      reject(Object.assign(error, { statusCode: 502 }));
    });

    if (requestBody !== null) {
      request.write(requestBody);
    }
    request.end();
  });
}

function fileExists(fileName) {
  return fs.existsSync(path.join(distPath, fileName));
}

function listDownloadableFiles() {
  if (!fs.existsSync(distPath)) {
    return [];
  }

  return fs.readdirSync(distPath)
    .filter((fileName) => fileName === 'planet' || fileName.endsWith('.moon'))
    .map((fileName) => {
      const stat = fs.statSync(path.join(distPath, fileName));
      return {
        name: fileName,
        size: stat.size,
        updatedAt: stat.mtime.toISOString(),
        type: fileName === 'planet' ? 'planet' : 'moon',
      };
    });
}

function sanitizeFileName(fileName) {
  if (!fileName || path.basename(fileName) !== fileName) {
    return '';
  }
  if (fileName === 'planet' || fileName.endsWith('.moon')) {
    return fileName;
  }
  return '';
}

function safeTtl(value) {
  const ttl = Number(value || defaultTtl);
  if (!Number.isFinite(ttl) || ttl <= 0) {
    return defaultTtl;
  }
  return Math.min(Math.floor(ttl), maxTtl);
}

function sign(kind, fileName, expires) {
  return crypto
    .createHmac('sha256', secretKey)
    .update(`${kind}:${fileName}:${expires}`)
    .digest('hex');
}

function verify(kind, fileName, expires, token) {
  if (!expires || !token) {
    return false;
  }
  const expiresNumber = Number(expires);
  if (!Number.isFinite(expiresNumber) || expiresNumber < Math.floor(Date.now() / 1000)) {
    return false;
  }

  const expected = sign(kind, fileName, expiresNumber);
  const expectedBuffer = Buffer.from(expected, 'hex');
  const actualBuffer = Buffer.from(String(token), 'hex');
  return expectedBuffer.length === actualBuffer.length && crypto.timingSafeEqual(expectedBuffer, actualBuffer);
}

function createSignedPath(kind, fileName, ttl) {
  const expires = Math.floor(Date.now() / 1000) + safeTtl(ttl);
  const token = sign(kind, fileName, expires);
  const route = kind === 'install' ? `/install/${fileName}` : `/download/${fileName}`;
  return `${route}?expires=${expires}&token=${token}`;
}

function createSignedLink(req, kind, fileName, ttl) {
  const linkPath = createSignedPath(kind, fileName, ttl);
  return {
    path: linkPath,
    url: `${requestBaseUrl(req)}${linkPath}`,
    expiresIn: safeTtl(ttl),
    file: fileName,
  };
}

function isInsidePath(rootPath, filePath) {
  const relative = path.relative(rootPath, filePath);
  return relative && !relative.startsWith('..') && !path.isAbsolute(relative);
}

function serveStatic(req, res, parsedUrl) {
  let requestPath = parsedUrl.pathname;
  if (requestPath === '/') {
    requestPath = '/index.html';
  }

  const rootPath = requestPath.startsWith('/assets/') ? assetsPath : portalPath;
  const relativePath = requestPath.startsWith('/assets/') ? requestPath.replace(/^\/assets\//, '') : requestPath;
  let filePath = path.normalize(path.join(rootPath, relativePath));

  if ((!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) && req.method === 'GET' && !path.extname(requestPath)) {
    filePath = path.join(portalPath, 'index.html');
  }

  if (!isInsidePath(rootPath, filePath)) {
    return send(res, 403, 'Forbidden', { 'Content-Type': 'text/plain; charset=utf-8' });
  }
  if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    return false;
  }

  const extname = path.extname(filePath).toLowerCase();
  const mimeTypes = {
    '.html': 'text/html; charset=utf-8',
    '.js': 'text/javascript; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.svg': 'image/svg+xml',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
  };
  const contentType = mimeTypes[extname] || 'application/octet-stream';
  const cacheControl = ['.html', '.js', '.css'].includes(extname)
    ? 'no-store'
    : 'public, max-age=300';

  res.writeHead(200, {
    'Content-Type': contentType,
    'Cache-Control': cacheControl,
  });
  fs.createReadStream(filePath).pipe(res);
  return true;
}

function serveFileDownload(res, fileName) {
  const cleanName = sanitizeFileName(fileName);
  if (!cleanName || !fileExists(cleanName)) {
    return send(res, 404, 'File Not Found', { 'Content-Type': 'text/plain; charset=utf-8' });
  }

  const filePath = path.join(distPath, cleanName);
  const stat = fs.statSync(filePath);
  res.writeHead(200, {
    'Content-Type': 'application/octet-stream',
    'Content-Length': stat.size,
    'Content-Disposition': `attachment; filename="${cleanName}"`,
    'Cache-Control': 'no-store',
  });
  fs.createReadStream(filePath).pipe(res);
  return true;
}

function shellSingleQuote(value) {
  return `'${String(value).replace(/'/g, `'\\''`)}'`;
}

function normalizeMemberIds(memberList) {
  if (Array.isArray(memberList)) {
    return memberList.map((item) => {
      if (typeof item === 'string') {
        return item;
      }
      if (item && typeof item === 'object') {
        return Object.keys(item)[0];
      }
      return '';
    }).filter(Boolean);
  }

  if (memberList && typeof memberList === 'object') {
    return Object.keys(memberList);
  }

  return [];
}

async function getControllerStatus() {
  return ztRequest('GET', '/status');
}

async function getPeerMap() {
  const peers = await ztRequest('GET', '/peer');
  const peerMap = {};
  for (const peer of Array.isArray(peers) ? peers : []) {
    if (peer && peer.address) {
      peerMap[peer.address] = peer;
    }
  }
  return peerMap;
}

async function listNetworks() {
  const nwids = await ztRequest('GET', '/controller/network');
  const ids = Array.isArray(nwids) ? nwids : [];
  const networks = await Promise.all(ids.map(async (nwid) => {
    const [network, memberList] = await Promise.all([
      ztRequest('GET', `/controller/network/${encodeURIComponent(nwid)}`),
      ztRequest('GET', `/controller/network/${encodeURIComponent(nwid)}/member`).catch(() => []),
    ]);
    return {
      ...network,
      memberCount: normalizeMemberIds(memberList).length,
    };
  }));
  return networks.sort((a, b) => String(a.name || a.nwid).localeCompare(String(b.name || b.nwid)));
}

async function getNetworkBundle(nwid) {
  const [network, memberList, peerMap, status] = await Promise.all([
    ztRequest('GET', `/controller/network/${encodeURIComponent(nwid)}`),
    ztRequest('GET', `/controller/network/${encodeURIComponent(nwid)}/member`),
    getPeerMap(),
    getControllerStatus(),
  ]);

  const memberIds = normalizeMemberIds(memberList);
  const names = loadMemberNames();
  const members = await Promise.all(memberIds.map(async (memberId) => {
    try {
      const member = await ztRequest('GET', `/controller/network/${encodeURIComponent(nwid)}/member/${encodeURIComponent(memberId)}`);
      const id = member.id || member.address || memberId;
      const peer = peerMap[id] || null;
      return {
        ...member,
        id,
        address: member.address || id,
        name: names[id] || '',
        peer,
        peerState: id === status.address ? 'controller' : peer && peer.latency !== -1 ? 'online' : peer ? 'relay' : 'offline',
      };
    } catch (error) {
      return {
        id: memberId,
        address: memberId,
        name: names[memberId] || '',
        error: error.message,
        peer: peerMap[memberId] || null,
        peerState: 'error',
      };
    }
  }));

  members.sort((a, b) => {
    if (a.authorized !== b.authorized) {
      return a.authorized ? 1 : -1;
    }
    return String(a.name || a.id).localeCompare(String(b.name || b.id));
  });

  return { network, members, controller: status, profile: getNetworkProfile(nwid) };
}

async function createNetwork(body) {
  const name = String(body.name || '').trim();
  if (!name) {
    throw Object.assign(new Error('Network name is required'), { statusCode: 400 });
  }
  const status = await getControllerStatus();
  return ztRequest('POST', `/controller/network/${status.address}______`, { name });
}

async function updateNetwork(nwid, body) {
  const allowed = ['name', 'private', 'v4AssignMode', 'v6AssignMode', 'dns', 'routes', 'ipAssignmentPools'];
  const payload = {};
  for (const key of allowed) {
    if (Object.prototype.hasOwnProperty.call(body, key)) {
      payload[key] = body[key];
    }
  }
  if (!Object.keys(payload).length) {
    throw Object.assign(new Error('No supported network fields supplied'), { statusCode: 400 });
  }
  return ztRequest('POST', `/controller/network/${encodeURIComponent(nwid)}`, payload);
}

async function easySetup(nwid, body) {
  const defaults = defaultPoolForCidr(body.networkCIDR);
  if (!defaults) {
    throw Object.assign(new Error('Enter a valid IPv4 CIDR between /1 and /30'), { statusCode: 400 });
  }
  const networkCIDR = defaults.cidr;
  const poolStart = String(body.poolStart || defaults.poolStart).trim();
  const poolEnd = String(body.poolEnd || defaults.poolEnd).trim();
  const poolError = validatePoolRange(networkCIDR, poolStart, poolEnd);
  if (poolError) {
    throw Object.assign(new Error(poolError), { statusCode: 400 });
  }

  const network = await ztRequest('GET', `/controller/network/${encodeURIComponent(nwid)}`);
  const profile = getNetworkProfile(nwid);
  const routes = Array.isArray(network.routes) ? network.routes.slice() : [];
  const ipAssignmentPools = Array.isArray(network.ipAssignmentPools) ? network.ipAssignmentPools.slice() : [];
  const nextRoute = { target: networkCIDR, via: null };
  const nextPool = { ipRangeStart: poolStart, ipRangeEnd: poolEnd };
  let routeIndex = routes.findIndex((route) => (
    profile.managedRouteTarget && route.target === profile.managedRouteTarget && !route.via
  ));
  let poolIndex = ipAssignmentPools.findIndex((pool) => (
    profile.managedPoolStart
    && profile.managedPoolEnd
    && pool.ipRangeStart === profile.managedPoolStart
    && pool.ipRangeEnd === profile.managedPoolEnd
  ));

  if (routeIndex < 0 && !hasManagedProfile(profile)) {
    routeIndex = routes.findIndex((route) => !route.via && defaultPoolForCidr(route.target));
  }
  if (poolIndex < 0 && !hasManagedProfile(profile)) {
    poolIndex = ipAssignmentPools.findIndex((pool) => {
      const start = parseIpv4(pool.ipRangeStart);
      const end = parseIpv4(pool.ipRangeEnd);
      return start !== null && end !== null;
    });
  }

  if (routeIndex >= 0) {
    routes[routeIndex] = nextRoute;
  } else if (!routes.some((route) => route.target === nextRoute.target && !route.via)) {
    routes.unshift(nextRoute);
  }

  if (poolIndex >= 0) {
    ipAssignmentPools[poolIndex] = nextPool;
  } else {
    ipAssignmentPools.unshift(nextPool);
  }

  const updated = await updateNetwork(nwid, {
    routes,
    ipAssignmentPools,
    v4AssignMode: { zt: true },
  });
  saveNetworkProfile(nwid, {
    managedRouteTarget: nextRoute.target,
    managedPoolStart: nextPool.ipRangeStart,
    managedPoolEnd: nextPool.ipRangeEnd,
  });
  return updated;
}

async function addRoute(nwid, body) {
  const parsedTarget = parseIpv4RouteCidr(body.target);
  if (!parsedTarget) {
    throw Object.assign(new Error('Route target must be a valid IPv4 CIDR'), { statusCode: 400 });
  }
  const target = parsedTarget.normalized;
  const network = await ztRequest('GET', `/controller/network/${encodeURIComponent(nwid)}`);
  const routes = Array.isArray(network.routes) ? network.routes.slice() : [];
  if (routes.some((route) => route.target === target)) {
    throw Object.assign(new Error('Route target already exists'), { statusCode: 409 });
  }
  routes.push({ target, via: body.via ? String(body.via).trim() : null });
  return updateNetwork(nwid, { routes });
}

async function deleteRoute(nwid, query) {
  const target = String(query.target || '').trim();
  const network = await ztRequest('GET', `/controller/network/${encodeURIComponent(nwid)}`);
  const routes = (Array.isArray(network.routes) ? network.routes : []).filter((route) => route.target !== target);
  const updated = await updateNetwork(nwid, { routes });
  updateNetworkProfile(nwid, (profile) => {
    if (profile.managedRouteTarget === target) {
      delete profile.managedRouteTarget;
    }
    return profile;
  });
  return updated;
}

async function addIpPool(nwid, body) {
  const ipRangeStart = String(body.ipRangeStart || '').trim();
  const ipRangeEnd = String(body.ipRangeEnd || '').trim();
  if (!ipRangeStart || !ipRangeEnd) {
    throw Object.assign(new Error('IP range start and end are required'), { statusCode: 400 });
  }
  const start = parseIpv4(ipRangeStart);
  const end = parseIpv4(ipRangeEnd);
  if (start === null || end === null) {
    throw Object.assign(new Error('IP range start and end must be valid IPv4 addresses'), { statusCode: 400 });
  }
  if (start > end) {
    throw Object.assign(new Error('IP range start must be lower than or equal to range end'), { statusCode: 400 });
  }
  const network = await ztRequest('GET', `/controller/network/${encodeURIComponent(nwid)}`);
  const ipAssignmentPools = Array.isArray(network.ipAssignmentPools) ? network.ipAssignmentPools.slice() : [];
  if (ipAssignmentPools.some((pool) => pool.ipRangeStart === ipRangeStart && pool.ipRangeEnd === ipRangeEnd)) {
    throw Object.assign(new Error('Assignment pool already exists'), { statusCode: 409 });
  }
  ipAssignmentPools.push({ ipRangeStart, ipRangeEnd });
  return updateNetwork(nwid, { ipAssignmentPools });
}

async function deleteIpPool(nwid, query) {
  const start = String(query.start || '').trim();
  const end = String(query.end || '').trim();
  const network = await ztRequest('GET', `/controller/network/${encodeURIComponent(nwid)}`);
  const ipAssignmentPools = (Array.isArray(network.ipAssignmentPools) ? network.ipAssignmentPools : [])
    .filter((pool) => pool.ipRangeStart !== start || pool.ipRangeEnd !== end);
  const updated = await updateNetwork(nwid, { ipAssignmentPools });
  updateNetworkProfile(nwid, (profile) => {
    if (profile.managedPoolStart === start && profile.managedPoolEnd === end) {
      delete profile.managedPoolStart;
      delete profile.managedPoolEnd;
    }
    return profile;
  });
  return updated;
}

async function updateMember(nwid, memberId, body) {
  const payload = {};
  for (const field of ['authorized', 'activeBridge', 'noAutoAssign']) {
    if (Object.prototype.hasOwnProperty.call(body, field)) {
      payload[field] = Boolean(body[field]);
    }
  }

  let savedName = null;
  if (Object.prototype.hasOwnProperty.call(body, 'name')) {
    savedName = saveMemberName(memberId, body.name);
  }

  let member = null;
  if (Object.keys(payload).length) {
    member = await ztRequest('POST', `/controller/network/${encodeURIComponent(nwid)}/member/${encodeURIComponent(memberId)}`, payload);
  } else {
    member = await ztRequest('GET', `/controller/network/${encodeURIComponent(nwid)}/member/${encodeURIComponent(memberId)}`);
  }

  return {
    ...member,
    id: member.id || member.address || memberId,
    name: savedName === null ? loadMemberNames()[memberId] || '' : savedName,
  };
}

async function addIpAssignment(nwid, memberId, body) {
  const ipAddress = String(body.ipAddress || '').trim();
  if (!ipAddress) {
    throw Object.assign(new Error('IP address is required'), { statusCode: 400 });
  }
  if (!net.isIP(ipAddress)) {
    throw Object.assign(new Error('IP address must be a valid IPv4 or IPv6 address'), { statusCode: 400 });
  }
  const member = await ztRequest('GET', `/controller/network/${encodeURIComponent(nwid)}/member/${encodeURIComponent(memberId)}`);
  const ipAssignments = Array.isArray(member.ipAssignments) ? member.ipAssignments.slice() : [];
  if (!ipAssignments.includes(ipAddress)) {
    ipAssignments.push(ipAddress);
  }
  return ztRequest('POST', `/controller/network/${encodeURIComponent(nwid)}/member/${encodeURIComponent(memberId)}`, { ipAssignments });
}

async function deleteIpAssignment(nwid, memberId, query) {
  const index = Number(query.index);
  const member = await ztRequest('GET', `/controller/network/${encodeURIComponent(nwid)}/member/${encodeURIComponent(memberId)}`);
  const ipAssignments = Array.isArray(member.ipAssignments) ? member.ipAssignments.slice() : [];
  if (!Number.isInteger(index) || index < 0 || index >= ipAssignments.length) {
    throw Object.assign(new Error('IP assignment index is invalid'), { statusCode: 400 });
  }
  ipAssignments.splice(index, 1);
  return ztRequest('POST', `/controller/network/${encodeURIComponent(nwid)}/member/${encodeURIComponent(memberId)}`, { ipAssignments });
}

function sendApiError(res, error) {
  const statusCode = error.statusCode && error.statusCode >= 400 ? error.statusCode : 500;
  sendJson(res, statusCode, {
    error: error.message || 'Request failed',
    details: error.payload || undefined,
  });
}

async function handleControllerApi(req, res, parsedUrl) {
  if (!authorizeAdmin(req, parsedUrl)) {
    return sendJson(res, 401, {
      error: authStore.mustChangePassword ? 'Password change required' : 'Unauthorized',
      mustChangePassword: Boolean(authStore.mustChangePassword),
    });
  }

  const parts = parsedUrl.pathname.split('/').filter(Boolean);
  const method = req.method;
  const body = ['POST', 'PATCH', 'PUT'].includes(method) ? await readRequestBody(req) : {};

  if (parts.length === 3 && parts[2] === 'status' && method === 'GET') {
    const [status, networks] = await Promise.all([getControllerStatus(), listNetworks()]);
    return sendJson(res, 200, {
      status,
      networks,
      controllerPort: String(controllerPort()),
    });
  }

  if (parts.length === 3 && parts[2] === 'networks') {
    if (method === 'GET') {
      return sendJson(res, 200, { networks: await listNetworks() });
    }
    if (method === 'POST') {
      return sendJson(res, 201, { network: await createNetwork(body) });
    }
  }

  if (parts.length >= 4 && parts[2] === 'networks') {
    const nwid = decodeURIComponent(parts[3]);

    if (parts.length === 4) {
      if (method === 'GET') {
        return sendJson(res, 200, await getNetworkBundle(nwid));
      }
      if (method === 'PATCH') {
        await updateNetwork(nwid, body);
        return sendJson(res, 200, await getNetworkBundle(nwid));
      }
      if (method === 'DELETE') {
        const deleted = await ztRequest('DELETE', `/controller/network/${encodeURIComponent(nwid)}`);
        deleteNetworkProfile(nwid);
        return sendJson(res, 200, { deleted: true, network: deleted });
      }
    }

    if (parts.length === 5 && parts[4] === 'easy' && method === 'POST') {
      await easySetup(nwid, body);
      return sendJson(res, 200, await getNetworkBundle(nwid));
    }

    if (parts.length === 5 && parts[4] === 'routes') {
      if (method === 'POST') {
        await addRoute(nwid, body);
        return sendJson(res, 200, await getNetworkBundle(nwid));
      }
      if (method === 'DELETE') {
        await deleteRoute(nwid, parsedUrl.query);
        return sendJson(res, 200, await getNetworkBundle(nwid));
      }
    }

    if (parts.length === 5 && parts[4] === 'ip-pools') {
      if (method === 'POST') {
        await addIpPool(nwid, body);
        return sendJson(res, 200, await getNetworkBundle(nwid));
      }
      if (method === 'DELETE') {
        await deleteIpPool(nwid, parsedUrl.query);
        return sendJson(res, 200, await getNetworkBundle(nwid));
      }
    }

    if (parts.length >= 6 && parts[4] === 'members') {
      const memberId = decodeURIComponent(parts[5]);

      if (parts.length === 6) {
        if (method === 'GET') {
          const member = await ztRequest('GET', `/controller/network/${encodeURIComponent(nwid)}/member/${encodeURIComponent(memberId)}`);
          return sendJson(res, 200, { member });
        }
        if (method === 'PATCH') {
          return sendJson(res, 200, { member: await updateMember(nwid, memberId, body) });
        }
        if (method === 'DELETE') {
          const deleted = await ztRequest('DELETE', `/controller/network/${encodeURIComponent(nwid)}/member/${encodeURIComponent(memberId)}`);
          removeMemberName(memberId);
          return sendJson(res, 200, { deleted: true, member: deleted });
        }
      }

      if (parts.length === 7 && parts[6] === 'ip-assignments') {
        if (method === 'POST') {
          await addIpAssignment(nwid, memberId, body);
          return sendJson(res, 200, await getNetworkBundle(nwid));
        }
        if (method === 'DELETE') {
          await deleteIpAssignment(nwid, memberId, parsedUrl.query);
          return sendJson(res, 200, await getNetworkBundle(nwid));
        }
      }
    }
  }

  return sendJson(res, 404, { error: 'Controller API route not found' });
}

async function handleAuthApi(req, res, parsedUrl) {
  const method = req.method;
  const body = ['POST', 'PATCH', 'PUT'].includes(method) ? await readRequestBody(req) : {};

  if (parsedUrl.pathname === '/api/auth/status' && method === 'GET') {
    return sendJson(res, 200, authState(req, parsedUrl));
  }

  if (parsedUrl.pathname === '/api/auth/login' && method === 'POST') {
    const username = String(body.username || '').trim();
    const password = String(body.password || '');
    if (username !== authStore.username || !verifyAdminPassword(password)) {
      return sendJson(res, 401, { error: 'Invalid username or password' });
    }
    const token = createSession();
    return sendJson(res, 200, {
      token,
      username: authStore.username,
      mustChangePassword: Boolean(authStore.mustChangePassword),
      sessionTtlSeconds: Math.floor(sessionTtlMs / 1000),
    });
  }

  if (parsedUrl.pathname === '/api/auth/logout' && method === 'POST') {
    const auth = getSession(req, parsedUrl);
    if (auth) {
      delete authStore.sessions[auth.token];
      saveAuthStore();
    }
    return sendJson(res, 200, { loggedOut: true });
  }

  if (parsedUrl.pathname === '/api/auth/password' && method === 'POST') {
    const auth = authorizeAdmin(req, parsedUrl, { allowPasswordChange: true });
    if (!auth) {
      return sendJson(res, 401, { error: 'Unauthorized' });
    }
    const currentPassword = String(body.currentPassword || '');
    const newPassword = String(body.newPassword || '');
    if (!verifyAdminPassword(currentPassword)) {
      return sendJson(res, 400, { error: 'Current password is incorrect' });
    }
    const policyError = passwordPolicyError(newPassword);
    if (policyError) {
      return sendJson(res, 400, { error: policyError });
    }
    setAdminPassword(newPassword, false);
    const token = createSession();
    return sendJson(res, 200, {
      token,
      username: authStore.username,
      mustChangePassword: false,
      sessionTtlSeconds: Math.floor(sessionTtlMs / 1000),
    });
  }

  if (parsedUrl.pathname === '/api/auth/reset' && method === 'POST') {
    const auth = authorizeAdmin(req, parsedUrl);
    if (!auth) {
      return sendJson(res, 401, { error: 'Unauthorized' });
    }
    const newPassword = String(body.newPassword || '');
    const policyError = passwordPolicyError(newPassword);
    if (policyError) {
      return sendJson(res, 400, { error: policyError });
    }
    setAdminPassword(newPassword, false);
    const token = createSession();
    return sendJson(res, 200, {
      token,
      username: authStore.username,
      mustChangePassword: false,
      sessionTtlSeconds: Math.floor(sessionTtlMs / 1000),
    });
  }

  return sendJson(res, 404, { error: 'Auth API route not found' });
}

function linuxInstaller(req, expires) {
  const planetUrl = `${requestBaseUrl(req)}/download/planet?expires=${expires}&token=${sign('download', 'planet', expires)}`;
  return `#!/usr/bin/env bash
set -euo pipefail

PLANET_URL=${shellSingleQuote(planetUrl)}
ZT_HOME="/var/lib/zerotier-one"

log() {
  printf '\\033[1;34m[zerotier-planet]\\033[0m %s\\n' "$*"
}

fail() {
  printf '\\033[1;31m[zerotier-planet]\\033[0m %s\\n' "$*" >&2
  exit 1
}

require_root() {
  if [ "$(id -u)" -ne 0 ]; then
    fail "Please run this installer as root, for example: curl -fsSL <url> | sudo bash"
  fi
}

download() {
  local url="$1"
  local target="$2"
  if command -v curl >/dev/null 2>&1; then
    curl -fL --retry 3 --connect-timeout 10 "$url" -o "$target"
  elif command -v wget >/dev/null 2>&1; then
    wget -O "$target" "$url"
  else
    fail "curl or wget is required"
  fi
}

install_zerotier() {
  if command -v zerotier-cli >/dev/null 2>&1; then
    log "ZeroTier is already installed"
    return
  fi

  log "Installing ZeroTier One"
  if command -v curl >/dev/null 2>&1; then
    curl -fsSL https://install.zerotier.com | bash
  elif command -v wget >/dev/null 2>&1; then
    wget -qO- https://install.zerotier.com | bash
  else
    fail "curl or wget is required to install ZeroTier"
  fi
}

restart_zerotier() {
  if command -v systemctl >/dev/null 2>&1; then
    systemctl restart zerotier-one
    systemctl enable zerotier-one >/dev/null 2>&1 || true
  elif command -v service >/dev/null 2>&1; then
    service zerotier-one restart
  else
    pkill zerotier-one >/dev/null 2>&1 || true
    zerotier-one -d
  fi
}

join_network() {
  local network_id="\${NETWORK_ID:-}"
  if [ -z "$network_id" ]; then
    printf "Network ID to join (press Enter to skip): "
    read -r network_id
  fi

  if [ -n "$network_id" ]; then
    zerotier-cli join "$network_id"
    log "Join request sent. Authorize this device in the console."
  else
    log "Skipped network join"
  fi
}

require_root
install_zerotier

mkdir -p "$ZT_HOME"
tmp_file="$(mktemp)"
trap 'rm -f "$tmp_file"' EXIT

log "Downloading planet file"
download "$PLANET_URL" "$tmp_file"

if [ -f "$ZT_HOME/planet" ]; then
  cp "$ZT_HOME/planet" "$ZT_HOME/planet.bak.$(date +%Y%m%d%H%M%S)"
fi

install -m 0644 "$tmp_file" "$ZT_HOME/planet"
log "Restarting ZeroTier One"
restart_zerotier
sleep 3
join_network

log "Current peers"
zerotier-cli peers || true
`;
}

function macosInstaller(req, expires) {
  const planetUrl = `${requestBaseUrl(req)}/download/planet?expires=${expires}&token=${sign('download', 'planet', expires)}`;
  return `#!/usr/bin/env bash
set -euo pipefail

PLANET_URL=${shellSingleQuote(planetUrl)}
ZT_HOME="/Library/Application Support/ZeroTier/One"
PLIST="/Library/LaunchDaemons/com.zerotier.one.plist"

log() {
  printf '\\033[1;34m[zerotier-planet]\\033[0m %s\\n' "$*"
}

fail() {
  printf '\\033[1;31m[zerotier-planet]\\033[0m %s\\n' "$*" >&2
  exit 1
}

download() {
  local url="$1"
  local target="$2"
  if command -v curl >/dev/null 2>&1; then
    curl -fL --retry 3 --connect-timeout 10 "$url" -o "$target"
  elif command -v wget >/dev/null 2>&1; then
    wget -O "$target" "$url"
  else
    fail "curl or wget is required"
  fi
}

install_zerotier() {
  if command -v zerotier-cli >/dev/null 2>&1; then
    log "ZeroTier is already installed"
    return
  fi
  if [ -x "/Applications/ZeroTier.app/Contents/MacOS/zerotier-cli" ]; then
    log "ZeroTier is already installed"
    return
  fi

  if command -v brew >/dev/null 2>&1; then
    log "Installing ZeroTier One with Homebrew"
    brew install --cask zerotier-one
    return
  fi

  log "Installing ZeroTier One with the official macOS package"
  pkg_file="$(mktemp -t zerotier-one.XXXXXX).pkg"
  download "https://download.zerotier.com/dist/ZeroTierOne.pkg" "$pkg_file"
  sudo installer -pkg "$pkg_file" -target /
  rm -f "$pkg_file"
}

restart_zerotier() {
  if [ -f "$PLIST" ]; then
    sudo launchctl unload "$PLIST" >/dev/null 2>&1 || true
    sudo launchctl load "$PLIST"
  else
    sudo pkill zerotier-one >/dev/null 2>&1 || true
    sudo /Applications/ZeroTier.app/Contents/MacOS/zerotier-one -d >/dev/null 2>&1 || true
  fi
}

join_network() {
  local network_id="\${NETWORK_ID:-}"
  local cli="zerotier-cli"
  if ! command -v "$cli" >/dev/null 2>&1 && [ -x "/Applications/ZeroTier.app/Contents/MacOS/zerotier-cli" ]; then
    cli="/Applications/ZeroTier.app/Contents/MacOS/zerotier-cli"
  fi

  if [ -z "$network_id" ]; then
    printf "Network ID to join (press Enter to skip): "
    read -r network_id
  fi

  if [ -n "$network_id" ]; then
    "$cli" join "$network_id"
    log "Join request sent. Authorize this device in the console."
  else
    log "Skipped network join"
  fi
}

if [ "$(uname -s)" != "Darwin" ]; then
  fail "This installer is for macOS"
fi

install_zerotier

tmp_file="$(mktemp)"
trap 'rm -f "$tmp_file"' EXIT

log "Downloading planet file"
download "$PLANET_URL" "$tmp_file"

sudo mkdir -p "$ZT_HOME"
if [ -f "$ZT_HOME/planet" ]; then
  sudo cp "$ZT_HOME/planet" "$ZT_HOME/planet.bak.$(date +%Y%m%d%H%M%S)"
fi

sudo install -m 0644 "$tmp_file" "$ZT_HOME/planet"
log "Restarting ZeroTier One"
restart_zerotier
sleep 3
join_network

log "Current peers"
if command -v zerotier-cli >/dev/null 2>&1; then
  zerotier-cli peers || true
elif [ -x "/Applications/ZeroTier.app/Contents/MacOS/zerotier-cli" ]; then
  "/Applications/ZeroTier.app/Contents/MacOS/zerotier-cli" peers || true
fi
`;
}

function handleApi(req, res, parsedUrl) {
  if (parsedUrl.pathname === '/api/status') {
    return sendJson(res, 200, {
      service: 'zerotier-planet',
      fileServerPort: String(port),
      publicUrl: requestBaseUrl(req),
      integratedController: true,
      auth: authState(req, parsedUrl),
    });
  }

  if (parsedUrl.pathname === '/api/overview') {
    if (!authorizeAdmin(req, parsedUrl)) {
      return sendJson(res, 401, {
        error: authStore.mustChangePassword ? 'Password change required' : 'Unauthorized',
        mustChangePassword: Boolean(authStore.mustChangePassword),
      });
    }
    const files = listDownloadableFiles();
    return sendJson(res, 200, {
      service: 'zerotier-planet',
      fileServerPort: String(port),
      zeroTierPort: readConfigValue('zerotier-one.port', process.env.ZT_PORT || ''),
      publicUrl: requestBaseUrl(req),
      hasPlanet: files.some((file) => file.name === 'planet'),
      files,
      linkTtlSeconds: defaultTtl,
      maxLinkTtlSeconds: maxTtl,
      integratedController: true,
      auth: authState(req, parsedUrl),
    });
  }

  if (parsedUrl.pathname === '/api/files') {
    if (!authorizeAdmin(req, parsedUrl)) {
      return sendJson(res, 401, { error: 'Unauthorized' });
    }
    return sendJson(res, 200, { files: listDownloadableFiles() });
  }

  if (parsedUrl.pathname === '/api/link') {
    if (!authorizeAdmin(req, parsedUrl)) {
      return sendJson(res, 401, { error: 'Unauthorized' });
    }

    const type = parsedUrl.query.type || 'download';
    const ttl = safeTtl(parsedUrl.query.ttl);
    const fileName = String(parsedUrl.query.file || 'planet');

    if (type === 'download') {
      const cleanName = sanitizeFileName(fileName);
      if (!cleanName || !fileExists(cleanName)) {
        return sendJson(res, 404, { error: 'File not found' });
      }
      return sendJson(res, 200, createSignedLink(req, 'download', cleanName, ttl));
    }

    if (type === 'install') {
      if (!['linux.sh', 'macos.sh'].includes(fileName)) {
        return sendJson(res, 400, { error: 'Unsupported installer' });
      }
      if (!fileExists('planet')) {
        return sendJson(res, 404, { error: 'Planet file not found' });
      }
      return sendJson(res, 200, createSignedLink(req, 'install', fileName, ttl));
    }

    return sendJson(res, 400, { error: 'Unsupported link type' });
  }

  return false;
}

const server = http.createServer((req, res) => {
  const parsedUrl = parseRequestUrl(req);

  if (parsedUrl.pathname.startsWith('/api/auth/')) {
    handleAuthApi(req, res, parsedUrl).catch((error) => sendApiError(res, error));
    return;
  }

  if (parsedUrl.pathname.startsWith('/api/controller/')) {
    handleControllerApi(req, res, parsedUrl).catch((error) => sendApiError(res, error));
    return;
  }

  if (parsedUrl.pathname.startsWith('/api/')) {
    const handled = handleApi(req, res, parsedUrl);
    if (handled !== false) {
      return;
    }
  }

  if (parsedUrl.pathname.startsWith('/download/')) {
    const fileName = decodeURIComponent(parsedUrl.pathname.replace('/download/', ''));
    if (!verify('download', fileName, parsedUrl.query.expires, parsedUrl.query.token)) {
      return send(res, 401, 'Unauthorized or expired', { 'Content-Type': 'text/plain; charset=utf-8' });
    }
    return serveFileDownload(res, fileName);
  }

  if (parsedUrl.pathname === '/install/linux.sh' || parsedUrl.pathname === '/install/macos.sh') {
    const fileName = parsedUrl.pathname.endsWith('linux.sh') ? 'linux.sh' : 'macos.sh';
    if (!verify('install', fileName, parsedUrl.query.expires, parsedUrl.query.token)) {
      return send(res, 401, 'Unauthorized or expired', { 'Content-Type': 'text/plain; charset=utf-8' });
    }
    const expires = Number(parsedUrl.query.expires);
    const installer = fileName === 'linux.sh' ? linuxInstaller(req, expires) : macosInstaller(req, expires);
    return send(res, 200, installer, {
      'Content-Type': 'text/x-shellscript; charset=utf-8',
      'Content-Disposition': `inline; filename="${fileName}"`,
      'Cache-Control': 'no-store',
    });
  }

  const legacyFile = sanitizeFileName(decodeURIComponent(parsedUrl.pathname.replace(/^\/+/, '')));
  if (legacyFile && parsedUrl.query.key === secretKey) {
    return serveFileDownload(res, legacyFile);
  }

  const staticHandled = serveStatic(req, res, parsedUrl);
  if (staticHandled) {
    return;
  }

  send(res, 404, '404 - Not Found', { 'Content-Type': 'text/plain; charset=utf-8' });
});

server.listen(port, () => {
  console.log(`ZeroTier Planet console running at http://0.0.0.0:${port}/`);
});
