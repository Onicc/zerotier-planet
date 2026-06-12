#!/usr/bin/env node

const fs = require('fs');
const http = require('http');
const path = require('path');
const url = require('url');

const repoRoot = path.resolve(__dirname, '..');
const portalPath = path.join(repoRoot, 'portal');
const assetsPath = path.join(portalPath, 'assets');
const port = Number(process.env.MOCK_PORT || process.env.PORT || 3001);
const bindHost = process.env.MOCK_HOST || '127.0.0.1';

let sessionToken = 'mock-session-token';

function hasMockSession(req) {
  const auth = String(req.headers.authorization || '');
  return auth === `Bearer ${sessionToken}` || auth === 'Bearer mock-session-token';
}

const mockState = {
  networks: [
    {
      nwid: 'e5cd896ab48f3c2f',
      id: 'e5cd896ab48f3c2f',
      name: 'Headquarters mesh',
      private: true,
      routes: [{ target: '10.88.0.0/24', via: null }],
      ipAssignmentPools: [{ ipRangeStart: '10.88.0.20', ipRangeEnd: '10.88.0.240' }],
      v4AssignMode: { zt: true },
      v6AssignMode: { '6plane': false, rfc4193: true, zt: false },
      dns: { domain: 'corp.example', servers: ['10.88.0.2', '10.88.0.3'] },
      profile: {
        managedRouteTarget: '10.88.0.0/24',
        managedPoolStart: '10.88.0.20',
        managedPoolEnd: '10.88.0.240',
      },
      members: [
        {
          id: 'aabbccddeeff',
          address: 'aabbccddeeff',
          name: 'Design validation laptop',
          authorized: true,
          activeBridge: false,
          peerState: 'online',
          peer: { latency: 18 },
          ipAssignments: ['10.88.0.31', '10.88.0.32', '10.88.0.33', 'fd00:1234:5678:abcd::100'],
        },
        {
          id: '112233445566',
          address: '112233445566',
          name: 'Build runner',
          authorized: false,
          activeBridge: false,
          peerState: 'offline',
          peer: null,
          ipAssignments: [],
        },
      ],
    },
    {
      nwid: '8056c2e21c000001',
      id: '8056c2e21c000001',
      name: 'Lab staging',
      private: true,
      routes: [{ target: '10.91.0.0/24', via: null }],
      ipAssignmentPools: [{ ipRangeStart: '10.91.0.10', ipRangeEnd: '10.91.0.120' }],
      v4AssignMode: { zt: true },
      v6AssignMode: { '6plane': false, rfc4193: false, zt: false },
      dns: { domain: '', servers: [] },
      profile: {
        managedRouteTarget: '10.91.0.0/24',
        managedPoolStart: '10.91.0.10',
        managedPoolEnd: '10.91.0.120',
      },
      members: [
        {
          id: '66778899aabb',
          address: '66778899aabb',
          name: 'QA workstation',
          authorized: true,
          activeBridge: true,
          peerState: 'relay',
          peer: { latency: -1 },
          ipAssignments: ['10.91.0.44'],
        },
      ],
    },
  ],
};

function send(res, statusCode, body, headers = {}) {
  res.writeHead(statusCode, {
    'Cache-Control': 'no-store',
    ...headers,
  });
  res.end(body);
}

function sendJson(res, statusCode, payload) {
  send(res, statusCode, JSON.stringify(payload), {
    'Content-Type': 'application/json; charset=utf-8',
  });
}

function readBody(req) {
  return new Promise((resolve) => {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk;
      if (body.length > 1024 * 1024) {
        req.destroy();
      }
    });
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (error) {
        resolve({});
      }
    });
  });
}

function publicNetwork(network) {
  return {
    ...network,
    memberCount: network.members.length,
    authorizedMemberCount: network.members.filter((member) => member.authorized).length,
    members: undefined,
    profile: undefined,
  };
}

function networkBundle(network) {
  return {
    network: publicNetwork(network),
    members: network.members,
    controller: controllerStatus(),
    profile: network.profile || {},
  };
}

function controllerStatus() {
  return {
    address: '9bee8941b5',
    online: true,
    tcpFallbackActive: false,
    version: 'mock-ui',
  };
}

function findNetwork(nwid) {
  return mockState.networks.find((network) => network.nwid === nwid);
}

function findMember(network, memberId) {
  return network.members.find((member) => (member.id || member.address) === memberId);
}

function nextNetworkId() {
  return `mock${Date.now().toString(16).slice(-12)}`.slice(0, 16);
}

function normalizeRoute(route) {
  return {
    target: String(route.target || route.networkCIDR || '').trim(),
    via: route.via ? String(route.via).trim() : null,
  };
}

function serveStatic(req, res, parsedUrl) {
  if (!['GET', 'HEAD'].includes(req.method)) {
    return false;
  }

  let requestPath = parsedUrl.pathname === '/' ? '/index.html' : parsedUrl.pathname;
  const rootPath = requestPath.startsWith('/assets/') ? assetsPath : portalPath;
  const relativePath = requestPath.startsWith('/assets/')
    ? requestPath.replace(/^\/assets\//, '')
    : requestPath.replace(/^\//, '');
  let filePath = path.normalize(path.join(rootPath, relativePath));

  if ((!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) && !path.extname(requestPath)) {
    filePath = path.join(portalPath, 'index.html');
  }

  const relative = path.relative(rootPath, filePath);
  if (!relative || relative.startsWith('..') || path.isAbsolute(relative)) {
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
    '.png': 'image/png',
    '.svg': 'image/svg+xml',
  };
  const contentType = mimeTypes[extname] || 'application/octet-stream';
  res.writeHead(200, {
    'Content-Type': contentType,
    'Cache-Control': ['.html', '.js', '.css'].includes(extname) ? 'no-store' : 'public, max-age=300',
  });
  if (req.method === 'HEAD') {
    res.end();
    return true;
  }
  fs.createReadStream(filePath).pipe(res);
  return true;
}

async function handleAuth(req, res, parsedUrl, body) {
  if (parsedUrl.pathname === '/api/auth/status' && req.method === 'GET') {
    return sendJson(res, 200, {
      username: 'admin',
      authenticated: hasMockSession(req),
      mustChangePassword: false,
      passwordChangeRequired: false,
      sessionTtlSeconds: 43200,
    });
  }

  if (parsedUrl.pathname === '/api/auth/login' && req.method === 'POST') {
    if (String(body.username || '') !== 'admin') {
      return sendJson(res, 401, { error: 'Invalid username or password' });
    }
    sessionToken = `mock-${Date.now().toString(36)}`;
    return sendJson(res, 200, {
      token: sessionToken,
      username: 'admin',
      mustChangePassword: false,
      sessionTtlSeconds: 43200,
    });
  }

  if (parsedUrl.pathname === '/api/auth/logout' && req.method === 'POST') {
    return sendJson(res, 200, { loggedOut: true });
  }

  if (['/api/auth/password', '/api/auth/reset'].includes(parsedUrl.pathname) && req.method === 'POST') {
    sessionToken = `mock-${Date.now().toString(36)}`;
    return sendJson(res, 200, {
      token: sessionToken,
      username: 'admin',
      mustChangePassword: false,
      sessionTtlSeconds: 43200,
    });
  }

  return sendJson(res, 404, { error: 'Mock auth route not found' });
}

function handleOverview(req, res) {
  return sendJson(res, 200, {
    service: 'zerotier-planet',
    publicUrl: `http://${bindHost}:${port}`,
    zeroTierPort: '9993',
    fileServerPort: String(port),
    linkTtlSeconds: 600,
    hasPlanet: true,
    files: [
      { name: 'planet', type: 'planet', size: 1462 },
      { name: 'linux.sh', type: 'install', size: 6218 },
      { name: 'macos.sh', type: 'install', size: 5814 },
    ],
  });
}

async function handleController(req, res, parsedUrl, body) {
  const parts = parsedUrl.pathname.split('/').filter(Boolean);

  if (parsedUrl.pathname === '/api/controller/status' && req.method === 'GET') {
    return sendJson(res, 200, {
      status: controllerStatus(),
      networks: mockState.networks.map(publicNetwork),
      controllerPort: '9993',
    });
  }

  if (parts.length === 3 && parts[2] === 'networks') {
    if (req.method === 'GET') {
      return sendJson(res, 200, { networks: mockState.networks.map(publicNetwork) });
    }
    if (req.method === 'POST') {
      const nwid = nextNetworkId();
      const network = {
        nwid,
        id: nwid,
        name: String(body.name || 'New network').trim(),
        private: true,
        routes: [],
        ipAssignmentPools: [],
        v4AssignMode: { zt: true },
        v6AssignMode: { '6plane': false, rfc4193: false, zt: false },
        dns: { domain: '', servers: [] },
        profile: {},
        members: [],
      };
      mockState.networks.unshift(network);
      return sendJson(res, 201, { network: publicNetwork(network) });
    }
  }

  if (parts.length >= 4 && parts[2] === 'networks') {
    const network = findNetwork(decodeURIComponent(parts[3]));
    if (!network) {
      return sendJson(res, 404, { error: 'Mock network not found' });
    }

    if (parts.length === 4) {
      if (req.method === 'GET') {
        return sendJson(res, 200, networkBundle(network));
      }
      if (req.method === 'PATCH') {
        if (body.name !== undefined) {
          network.name = String(body.name).trim();
        }
        if (body.private !== undefined) {
          network.private = Boolean(body.private);
        }
        if (body.v4AssignMode) {
          network.v4AssignMode = body.v4AssignMode;
        }
        if (body.v6AssignMode) {
          network.v6AssignMode = body.v6AssignMode;
        }
        if (body.dns) {
          network.dns = {
            domain: String(body.dns.domain || '').trim(),
            servers: Array.isArray(body.dns.servers) ? body.dns.servers : [],
          };
        }
        return sendJson(res, 200, networkBundle(network));
      }
      if (req.method === 'DELETE') {
        mockState.networks = mockState.networks.filter((item) => item !== network);
        return sendJson(res, 200, { deleted: true, network: publicNetwork(network) });
      }
    }

    if (parts.length === 5 && parts[4] === 'easy' && req.method === 'POST') {
      const target = String(body.networkCIDR || '').trim();
      network.routes = [{ target, via: null }, ...network.routes.filter((route) => route.via || route.target !== network.profile.managedRouteTarget)];
      network.ipAssignmentPools = [
        { ipRangeStart: String(body.poolStart || '').trim(), ipRangeEnd: String(body.poolEnd || '').trim() },
        ...network.ipAssignmentPools.filter((pool) => (
          pool.ipRangeStart !== network.profile.managedPoolStart
          || pool.ipRangeEnd !== network.profile.managedPoolEnd
        )),
      ];
      network.profile = {
        managedRouteTarget: target,
        managedPoolStart: String(body.poolStart || '').trim(),
        managedPoolEnd: String(body.poolEnd || '').trim(),
      };
      return sendJson(res, 200, networkBundle(network));
    }

    if (parts.length === 5 && parts[4] === 'routes') {
      if (req.method === 'POST') {
        network.routes.push(normalizeRoute(body));
        return sendJson(res, 200, networkBundle(network));
      }
      if (req.method === 'DELETE') {
        const target = String(parsedUrl.query.target || '');
        network.routes = network.routes.filter((route) => route.target !== target);
        return sendJson(res, 200, networkBundle(network));
      }
    }

    if (parts.length === 5 && parts[4] === 'ip-pools') {
      if (req.method === 'POST') {
        network.ipAssignmentPools.push({
          ipRangeStart: String(body.ipRangeStart || '').trim(),
          ipRangeEnd: String(body.ipRangeEnd || '').trim(),
        });
        return sendJson(res, 200, networkBundle(network));
      }
      if (req.method === 'DELETE') {
        network.ipAssignmentPools = network.ipAssignmentPools.filter((pool) => (
          pool.ipRangeStart !== parsedUrl.query.start || pool.ipRangeEnd !== parsedUrl.query.end
        ));
        return sendJson(res, 200, networkBundle(network));
      }
    }

    if (parts.length >= 6 && parts[4] === 'members') {
      const member = findMember(network, decodeURIComponent(parts[5]));
      if (!member) {
        return sendJson(res, 404, { error: 'Mock member not found' });
      }

      if (parts.length === 6) {
        if (req.method === 'PATCH') {
          if (body.name !== undefined) {
            member.name = String(body.name).trim();
          }
          if (body.authorized !== undefined) {
            member.authorized = Boolean(body.authorized);
          }
          if (body.activeBridge !== undefined) {
            member.activeBridge = Boolean(body.activeBridge);
          }
          return sendJson(res, 200, { member });
        }
        if (req.method === 'DELETE') {
          network.members = network.members.filter((item) => item !== member);
          return sendJson(res, 200, { deleted: true, member });
        }
      }

      if (parts.length === 7 && parts[6] === 'ip-assignments') {
        if (req.method === 'POST') {
          const ipAddress = String(body.ipAddress || '').trim();
          if (ipAddress && !member.ipAssignments.includes(ipAddress)) {
            member.ipAssignments.push(ipAddress);
          }
          return sendJson(res, 200, networkBundle(network));
        }
        if (req.method === 'DELETE') {
          const index = Number(parsedUrl.query.index);
          if (Number.isInteger(index) && index >= 0) {
            member.ipAssignments.splice(index, 1);
          }
          return sendJson(res, 200, networkBundle(network));
        }
      }
    }
  }

  return sendJson(res, 404, { error: 'Mock controller route not found' });
}

async function handleApi(req, res, parsedUrl) {
  const body = ['POST', 'PATCH', 'PUT'].includes(req.method) ? await readBody(req) : {};

  if (parsedUrl.pathname === '/api/status') {
    return sendJson(res, 200, {
      service: 'zerotier-planet',
      fileServerPort: String(port),
      publicUrl: `http://${bindHost}:${port}`,
      integratedController: true,
      auth: {
        username: 'admin',
        authenticated: hasMockSession(req),
        mustChangePassword: false,
        passwordChangeRequired: false,
        sessionTtlSeconds: 43200,
      },
    });
  }

  if (parsedUrl.pathname === '/api/overview') {
    return handleOverview(req, res);
  }

  if (parsedUrl.pathname === '/api/link') {
    const file = String(parsedUrl.query.file || 'planet');
    const type = String(parsedUrl.query.type || 'download');
    return sendJson(res, 200, {
      file,
      expiresIn: Number(parsedUrl.query.ttl || 600),
      path: `/mock/${type}/${file}`,
      url: `http://${bindHost}:${port}/mock/${type}/${file}`,
    });
  }

  if (parsedUrl.pathname.startsWith('/api/auth/')) {
    return handleAuth(req, res, parsedUrl, body);
  }

  if (parsedUrl.pathname.startsWith('/api/controller/')) {
    return handleController(req, res, parsedUrl, body);
  }

  return sendJson(res, 404, { error: 'Mock API route not found' });
}

const server = http.createServer((req, res) => {
  const parsedUrl = url.parse(req.url, true);

  if (parsedUrl.pathname.startsWith('/api/')) {
    handleApi(req, res, parsedUrl).catch((error) => {
      sendJson(res, 500, { error: error.message });
    });
    return;
  }

  if (parsedUrl.pathname.startsWith('/mock/')) {
    return send(res, 200, '# mock downloadable artifact\n', {
      'Content-Type': 'text/plain; charset=utf-8',
    });
  }

  if (serveStatic(req, res, parsedUrl)) {
    return;
  }
  send(res, 404, 'Not Found', { 'Content-Type': 'text/plain; charset=utf-8' });
});

server.listen(port, bindHost, () => {
  console.log(`Mock ZeroTier Planet portal: http://${bindHost}:${port}`);
  console.log('Login with admin / mock123456');
});
