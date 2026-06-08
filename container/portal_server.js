const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');
const crypto = require('crypto');

const port = Number(process.env.FILE_SERVER_PORT || 3000);
const appPath = process.env.APP_PATH || '/app';
const configPath = path.join(appPath, 'config');
const distPath = path.join(appPath, 'dist');
const portalPath = path.join(appPath, 'portal');
const assetsPath = path.join(portalPath, 'assets');
const secretKeyPath = path.join(configPath, 'file_server.key');
const publicUrl = (process.env.PUBLIC_URL || '').replace(/\/+$/, '');
const defaultTtl = Number(process.env.LINK_TTL_SECONDS || 600);
const maxTtl = Number(process.env.LINK_MAX_TTL_SECONDS || 3600);

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

function authorizeAdmin(req, parsedUrl) {
  const headerKey = req.headers['x-file-server-key'] || req.headers['x-admin-key'];
  return headerKey === secretKey || parsedUrl.query.key === secretKey || parsedUrl.query.admin_key === secretKey;
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
  if (requestPath === '/guide' || requestPath === '/clients' || requestPath === '/console') {
    requestPath = '/index.html';
  }

  const rootPath = requestPath.startsWith('/assets/') ? assetsPath : portalPath;
  const relativePath = requestPath.startsWith('/assets/') ? requestPath.replace(/^\/assets\//, '') : requestPath;
  const filePath = path.normalize(path.join(rootPath, relativePath));
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
  const cacheControl = extname === '.html' ? 'no-store' : 'public, max-age=300';

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
    log "Join request sent. Authorize this device in the controller."
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
    log "Join request sent. Authorize this device in the controller."
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
    const files = listDownloadableFiles();
    return sendJson(res, 200, {
      service: 'zerotier-planet',
      apiPort: process.env.API_PORT || '',
      fileServerPort: String(port),
      zeroTierPort: process.env.ZT_PORT || '',
      publicUrl: requestBaseUrl(req),
      hasPlanet: files.some((file) => file.name === 'planet'),
      files,
      linkTtlSeconds: defaultTtl,
      maxLinkTtlSeconds: maxTtl,
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
  const parsedUrl = url.parse(req.url, true);

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
  console.log(`Portal and file server running at http://0.0.0.0:${port}/`);
});
