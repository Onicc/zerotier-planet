const state = {
  status: null,
  adminKey: localStorage.getItem('ztp_admin_key') || '',
};

const elements = {
  adminKey: document.getElementById('adminKey'),
  ttl: document.getElementById('ttl'),
  planetState: document.getElementById('planetState'),
  ztPort: document.getElementById('ztPort'),
  apiPort: document.getElementById('apiPort'),
  ttlState: document.getElementById('ttlState'),
  consoleLink: document.getElementById('consoleLink'),
  heroConsoleLink: document.getElementById('heroConsoleLink'),
  wgetCommand: document.getElementById('wgetCommand'),
  linuxCommand: document.getElementById('linuxCommand'),
  macosCommand: document.getElementById('macosCommand'),
  toast: document.getElementById('toast'),
};

function toast(message) {
  elements.toast.textContent = message;
  elements.toast.classList.add('visible');
  window.clearTimeout(toast.timer);
  toast.timer = window.setTimeout(() => {
    elements.toast.classList.remove('visible');
  }, 2600);
}

function commandQuote(value) {
  return `'${String(value).replace(/'/g, `'\\''`)}'`;
}

function sameHostWithPort(port) {
  const url = new URL(window.location.href);
  if (port) {
    url.port = port;
  }
  url.hash = '';
  url.pathname = '/';
  url.search = '';
  return url.toString();
}

function setConsoleLinks(status) {
  const consoleUrl = sameHostWithPort(status.apiPort || '');
  elements.consoleLink.href = consoleUrl;
  elements.heroConsoleLink.href = consoleUrl;
}

function renderStatus(status) {
  state.status = status;
  elements.planetState.textContent = status.hasPlanet ? 'Ready' : 'Missing';
  elements.planetState.style.color = status.hasPlanet ? 'var(--green)' : 'var(--pink)';
  elements.ztPort.textContent = status.zeroTierPort || '--';
  elements.apiPort.textContent = status.apiPort || '--';
  elements.ttlState.textContent = `${Math.round((status.linkTtlSeconds || 600) / 60)} min`;
  setConsoleLinks(status);
}

async function fetchStatus() {
  const response = await fetch('/api/status', { cache: 'no-store' });
  if (!response.ok) {
    throw new Error(`Status request failed: ${response.status}`);
  }
  renderStatus(await response.json());
}

function requireKey() {
  const key = elements.adminKey.value.trim();
  if (!key) {
    toast('Paste the server key first.');
    elements.adminKey.focus();
    throw new Error('Missing server key');
  }
  return key;
}

async function createLink(type, file) {
  const key = requireKey();
  const ttl = elements.ttl.value || '600';
  const params = new URLSearchParams({
    type,
    file,
    ttl,
  });
  const response = await fetch(`/api/link?${params.toString()}`, {
    cache: 'no-store',
    headers: {
      'X-File-Server-Key': key,
    },
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload.error || `Link request failed: ${response.status}`);
  }
  return payload.url;
}

async function generatePlanetCommand() {
  const link = await createLink('download', 'planet');
  elements.wgetCommand.textContent = `wget -O planet ${commandQuote(link)}`;
  toast('Temporary planet command generated.');
}

async function generateLinuxCommand() {
  const link = await createLink('install', 'linux.sh');
  elements.linuxCommand.textContent = `curl -fsSL ${commandQuote(link)} | sudo bash`;
  toast('Linux installer command generated.');
}

async function generateMacosCommand() {
  const link = await createLink('install', 'macos.sh');
  elements.macosCommand.textContent = `curl -fsSL ${commandQuote(link)} | bash`;
  toast('macOS installer command generated.');
}

async function copyFrom(targetId) {
  const target = document.getElementById(targetId);
  const text = target.textContent.trim();
  if (!text || text.includes('Generate')) {
    toast('Generate a command first.');
    return;
  }

  if (navigator.clipboard && window.isSecureContext) {
    await navigator.clipboard.writeText(text);
  } else {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.setAttribute('readonly', '');
    textarea.style.position = 'fixed';
    textarea.style.left = '-9999px';
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand('copy');
    document.body.removeChild(textarea);
  }
  toast('Copied.');
}

function saveKey() {
  state.adminKey = elements.adminKey.value.trim();
  if (state.adminKey) {
    localStorage.setItem('ztp_admin_key', state.adminKey);
    toast('Saved in this browser.');
  } else {
    localStorage.removeItem('ztp_admin_key');
    toast('Local key cleared.');
  }
}

function bindEvents() {
  elements.adminKey.value = state.adminKey;
  document.getElementById('saveKeyButton').addEventListener('click', saveKey);
  document.getElementById('refreshButton').addEventListener('click', () => {
    fetchStatus().then(() => toast('Status refreshed.')).catch((error) => toast(error.message));
  });
  document.getElementById('planetLinkButton').addEventListener('click', () => {
    generatePlanetCommand().catch((error) => toast(error.message));
  });
  document.getElementById('linuxLinkButton').addEventListener('click', () => {
    generateLinuxCommand().catch((error) => toast(error.message));
  });
  document.getElementById('macosLinkButton').addEventListener('click', () => {
    generateMacosCommand().catch((error) => toast(error.message));
  });

  document.querySelectorAll('[data-copy-target]').forEach((button) => {
    button.addEventListener('click', () => {
      copyFrom(button.dataset.copyTarget).catch((error) => toast(error.message));
    });
  });
}

bindEvents();
fetchStatus().catch((error) => toast(error.message));
