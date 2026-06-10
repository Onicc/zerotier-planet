const state = {
  status: null,
  controller: null,
  networks: [],
  selectedNetworkId: localStorage.getItem('ztp_selected_network') || '',
  selectedBundle: null,
  adminKey: localStorage.getItem('ztp_admin_key') || '',
  activeTab: 'members',
};

const elements = {
  adminKey: document.getElementById('adminKey'),
  ttl: document.getElementById('ttl'),
  toast: document.getElementById('toast'),
  consoleState: document.getElementById('consoleState'),
  consoleStateDetail: document.getElementById('consoleStateDetail'),
  planetState: document.getElementById('planetState'),
  controllerStatus: document.getElementById('controllerStatus'),
  networkCount: document.getElementById('networkCount'),
  ztAddress: document.getElementById('ztAddress'),
  publicUrl: document.getElementById('publicUrl'),
  ztPort: document.getElementById('ztPort'),
  filePort: document.getElementById('filePort'),
  ttlState: document.getElementById('ttlState'),
  readinessPill: document.getElementById('readinessPill'),
  networkList: document.getElementById('networkList'),
  networkListCount: document.getElementById('networkListCount'),
  networkEmpty: document.getElementById('networkEmpty'),
  networkDetail: document.getElementById('networkDetail'),
  selectedNetworkName: document.getElementById('selectedNetworkName'),
  selectedNetworkId: document.getElementById('selectedNetworkId'),
  membersTable: document.getElementById('membersTable'),
  routesList: document.getElementById('routesList'),
  poolsList: document.getElementById('poolsList'),
  rawNetworkJson: document.getElementById('rawNetworkJson'),
  networkNameInput: document.getElementById('networkNameInput'),
  networkPrivateInput: document.getElementById('networkPrivateInput'),
  easyCidr: document.getElementById('easyCidr'),
  easyPoolStart: document.getElementById('easyPoolStart'),
  easyPoolEnd: document.getElementById('easyPoolEnd'),
  v4AssignInput: document.getElementById('v4AssignInput'),
  v6PlaneInput: document.getElementById('v6PlaneInput'),
  v6RfcInput: document.getElementById('v6RfcInput'),
  v6ZtInput: document.getElementById('v6ZtInput'),
  dnsDomain: document.getElementById('dnsDomain'),
  dnsServers: document.getElementById('dnsServers'),
  wgetCommand: document.getElementById('wgetCommand'),
  linuxCommand: document.getElementById('linuxCommand'),
  macosCommand: document.getElementById('macosCommand'),
};

function toast(message) {
  elements.toast.textContent = message;
  elements.toast.classList.add('visible');
  window.clearTimeout(toast.timer);
  toast.timer = window.setTimeout(() => {
    elements.toast.classList.remove('visible');
  }, 2800);
}

function commandQuote(value) {
  return `'${String(value).replace(/'/g, `'\\''`)}'`;
}

function requireKey() {
  const key = elements.adminKey.value.trim();
  if (!key) {
    toast('Paste the server key first.');
    elements.adminKey.focus();
    location.hash = '#settings';
    throw new Error('Missing server key');
  }
  return key;
}

async function requestJson(path, options = {}) {
  const headers = {
    Accept: 'application/json',
    ...(options.headers || {}),
  };
  if (options.body !== undefined) {
    headers['Content-Type'] = 'application/json';
  }
  if (options.admin !== false) {
    headers['X-File-Server-Key'] = requireKey();
  }

  const response = await fetch(path, {
    ...options,
    headers,
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
    cache: 'no-store',
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload.error || `Request failed: ${response.status}`);
  }
  return payload;
}

async function fetchStatus() {
  state.status = await requestJson('/api/status', { admin: false });
  renderStatus();
  return state.status;
}

async function fetchController() {
  state.controller = await requestJson('/api/controller/status');
  state.networks = state.controller.networks || [];
  renderController();

  if (state.selectedNetworkId && state.networks.some((network) => network.nwid === state.selectedNetworkId)) {
    await loadNetwork(state.selectedNetworkId, { silent: true });
  } else if (state.networks.length) {
    await loadNetwork(state.networks[0].nwid, { silent: true });
  } else {
    state.selectedBundle = null;
    renderSelectedNetwork();
  }
}

async function refreshAll() {
  await fetchStatus();
  if (elements.adminKey.value.trim()) {
    await fetchController();
  } else {
    renderLocked();
  }
}

function renderStatus() {
  const status = state.status || {};
  elements.planetState.textContent = status.hasPlanet ? 'Ready' : 'Missing';
  elements.planetState.className = status.hasPlanet ? 'ok' : 'danger-text';
  elements.publicUrl.textContent = status.publicUrl || '--';
  elements.ztPort.textContent = status.zeroTierPort || '--';
  elements.filePort.textContent = status.fileServerPort || '--';
  elements.ttlState.textContent = `${Math.round((status.linkTtlSeconds || 600) / 60)} min`;
  elements.readinessPill.textContent = status.hasPlanet ? 'Ready' : 'Needs planet';
  elements.readinessPill.className = status.hasPlanet ? 'pill good' : 'pill warn';
}

function renderLocked() {
  elements.consoleState.textContent = 'Locked';
  elements.consoleStateDetail.textContent = 'Paste the server key to manage networks.';
  elements.controllerStatus.textContent = 'Locked';
  elements.networkCount.textContent = '--';
  elements.ztAddress.textContent = '--';
  elements.networkList.innerHTML = '<div class="empty-inline">Unlock the console to load networks.</div>';
}

function renderController() {
  const controllerStatus = state.controller?.status || {};
  elements.consoleState.textContent = 'Unlocked';
  elements.consoleStateDetail.textContent = `Controller ${controllerStatus.online ? 'online' : 'available'}`;
  elements.controllerStatus.textContent = controllerStatus.online ? 'Online' : 'Available';
  elements.controllerStatus.className = controllerStatus.online ? 'ok' : '';
  elements.networkCount.textContent = String(state.networks.length);
  elements.ztAddress.textContent = controllerStatus.address || '--';
  elements.networkListCount.textContent = String(state.networks.length);
  renderNetworkList();
}

function renderNetworkList() {
  if (!state.networks.length) {
    elements.networkList.innerHTML = '<div class="empty-inline">No networks yet.</div>';
    return;
  }

  elements.networkList.innerHTML = state.networks.map((network) => `
    <button class="list-item ${network.nwid === state.selectedNetworkId ? 'active' : ''}" data-network-id="${escapeHtml(network.nwid)}" type="button">
      <span>
        <strong>${escapeHtml(network.name || 'Unnamed network')}</strong>
        <small>${escapeHtml(network.nwid)}</small>
      </span>
      <span class="pill ${network.private ? 'good' : 'warn'}">${network.private ? 'Private' : 'Public'}</span>
    </button>
  `).join('');
}

async function loadNetwork(nwid, options = {}) {
  state.selectedNetworkId = nwid;
  localStorage.setItem('ztp_selected_network', nwid);
  state.selectedBundle = await requestJson(`/api/controller/networks/${encodeURIComponent(nwid)}`);
  renderNetworkList();
  renderSelectedNetwork();
  if (!options.silent) {
    toast('Network loaded.');
  }
}

function renderSelectedNetwork() {
  const bundle = state.selectedBundle;
  if (!bundle || !bundle.network) {
    elements.networkEmpty.hidden = false;
    elements.networkDetail.hidden = true;
    return;
  }

  elements.networkEmpty.hidden = true;
  elements.networkDetail.hidden = false;
  const network = bundle.network;
  elements.selectedNetworkName.textContent = network.name || 'Unnamed network';
  elements.selectedNetworkId.textContent = network.nwid || state.selectedNetworkId;
  elements.networkNameInput.value = network.name || '';
  elements.networkPrivateInput.checked = Boolean(network.private);
  elements.v4AssignInput.checked = Boolean(network.v4AssignMode?.zt);
  elements.v6PlaneInput.checked = Boolean(network.v6AssignMode?.['6plane']);
  elements.v6RfcInput.checked = Boolean(network.v6AssignMode?.rfc4193);
  elements.v6ZtInput.checked = Boolean(network.v6AssignMode?.zt);
  elements.dnsDomain.value = network.dns?.domain || '';
  elements.dnsServers.value = Array.isArray(network.dns?.servers) ? network.dns.servers.join('\n') : '';
  elements.rawNetworkJson.textContent = JSON.stringify(network, null, 2);

  renderMembers(bundle.members || []);
  renderRoutes(network.routes || []);
  renderPools(network.ipAssignmentPools || []);
}

function renderMembers(members) {
  if (!members.length) {
    elements.membersTable.innerHTML = `
      <tr>
        <td colspan="7">
          <div class="empty-inline">No members have joined this network yet.</div>
        </td>
      </tr>
    `;
    return;
  }

  elements.membersTable.innerHTML = members.map((member) => {
    const id = member.id || member.address;
    const ips = Array.isArray(member.ipAssignments) ? member.ipAssignments : [];
    return `
      <tr data-member-id="${escapeHtml(id)}">
        <td>
          <input class="table-input member-name-input" value="${escapeAttr(member.name || '')}" placeholder="Friendly name" aria-label="Member name">
        </td>
        <td>
          <span class="mono">${escapeHtml(id)}</span>
        </td>
        <td>${renderPeerState(member)}</td>
        <td>
          <input class="member-authorized-input" type="checkbox" ${member.authorized ? 'checked' : ''} aria-label="Authorized">
        </td>
        <td>
          <input class="member-bridge-input" type="checkbox" ${member.activeBridge ? 'checked' : ''} aria-label="Active bridge">
        </td>
        <td>
          <div class="ip-stack">
            ${ips.map((ip, index) => `
              <span class="ip-chip">
                ${escapeHtml(ip)}
                <button data-action="delete-ip" data-index="${index}" type="button" aria-label="Delete IP assignment">x</button>
              </span>
            `).join('') || '<span class="muted">None</span>'}
            <form class="mini-form member-ip-form">
              <input type="text" placeholder="Add IP">
              <button class="icon-button" type="submit">+</button>
            </form>
          </div>
        </td>
        <td>
          <button class="button small danger" data-action="delete-member" type="button">Delete</button>
        </td>
      </tr>
    `;
  }).join('');
}

function renderPeerState(member) {
  if (member.peerState === 'controller') {
    return '<span class="status-dot good">Controller</span>';
  }
  if (member.peerState === 'online') {
    const latency = member.peer?.latency !== undefined ? ` ${member.peer.latency}ms` : '';
    return `<span class="status-dot good">Online${escapeHtml(latency)}</span>`;
  }
  if (member.peerState === 'relay') {
    return '<span class="status-dot warn">Relay</span>';
  }
  if (member.peerState === 'error') {
    return '<span class="status-dot danger">Error</span>';
  }
  return '<span class="status-dot muted-dot">Offline</span>';
}

function renderRoutes(routes) {
  if (!routes.length) {
    elements.routesList.innerHTML = '<div class="empty-inline">No routes configured.</div>';
    return;
  }
  elements.routesList.innerHTML = routes.map((route) => `
    <div class="config-row">
      <span>
        <strong>${escapeHtml(route.target)}</strong>
        <small>${route.via ? `via ${escapeHtml(route.via)}` : 'local ZeroTier route'}</small>
      </span>
      <button class="button small" data-route-target="${escapeAttr(route.target)}" type="button">Remove</button>
    </div>
  `).join('');
}

function renderPools(pools) {
  if (!pools.length) {
    elements.poolsList.innerHTML = '<div class="empty-inline">No assignment pools configured.</div>';
    return;
  }
  elements.poolsList.innerHTML = pools.map((pool) => `
    <div class="config-row">
      <span>
        <strong>${escapeHtml(pool.ipRangeStart)} - ${escapeHtml(pool.ipRangeEnd)}</strong>
        <small>managed assignment range</small>
      </span>
      <button class="button small" data-pool-start="${escapeAttr(pool.ipRangeStart)}" data-pool-end="${escapeAttr(pool.ipRangeEnd)}" type="button">Remove</button>
    </div>
  `).join('');
}

async function createNetwork(event) {
  event.preventDefault();
  const input = document.getElementById('newNetworkName');
  const name = input.value.trim();
  if (!name) {
    toast('Enter a network name.');
    input.focus();
    return;
  }
  const payload = await requestJson('/api/controller/networks', {
    method: 'POST',
    body: { name },
  });
  input.value = '';
  await fetchController();
  if (payload.network?.nwid) {
    await loadNetwork(payload.network.nwid, { silent: true });
  }
  toast('Network created.');
}

async function patchSelectedNetwork(body, message) {
  if (!state.selectedNetworkId) {
    toast('Select a network first.');
    return;
  }
  state.selectedBundle = await requestJson(`/api/controller/networks/${encodeURIComponent(state.selectedNetworkId)}`, {
    method: 'PATCH',
    body,
  });
  state.networks = state.networks.map((network) => (
    network.nwid === state.selectedNetworkId ? state.selectedBundle.network : network
  ));
  renderController();
  renderSelectedNetwork();
  toast(message);
}

async function submitBasics(event) {
  event.preventDefault();
  await patchSelectedNetwork({
    name: elements.networkNameInput.value.trim(),
    private: elements.networkPrivateInput.checked,
  }, 'Network basics saved.');
}

async function submitAssignModes(event) {
  event.preventDefault();
  await patchSelectedNetwork({
    v4AssignMode: { zt: elements.v4AssignInput.checked },
    v6AssignMode: {
      '6plane': elements.v6PlaneInput.checked,
      rfc4193: elements.v6RfcInput.checked,
      zt: elements.v6ZtInput.checked,
    },
  }, 'Assignment modes saved.');
}

async function submitDns(event) {
  event.preventDefault();
  await patchSelectedNetwork({
    dns: {
      domain: elements.dnsDomain.value.trim(),
      servers: elements.dnsServers.value.split('\n').map((item) => item.trim()).filter(Boolean),
    },
  }, 'DNS saved.');
}

async function submitEasySetup(event) {
  event.preventDefault();
  if (!state.selectedNetworkId) {
    toast('Select a network first.');
    return;
  }
  state.selectedBundle = await requestJson(`/api/controller/networks/${encodeURIComponent(state.selectedNetworkId)}/easy`, {
    method: 'POST',
    body: {
      networkCIDR: elements.easyCidr.value.trim(),
      poolStart: elements.easyPoolStart.value.trim(),
      poolEnd: elements.easyPoolEnd.value.trim(),
    },
  });
  renderSelectedNetwork();
  toast('Easy setup applied.');
}

async function submitRoute(event) {
  event.preventDefault();
  state.selectedBundle = await requestJson(`/api/controller/networks/${encodeURIComponent(state.selectedNetworkId)}/routes`, {
    method: 'POST',
    body: {
      target: document.getElementById('routeTarget').value.trim(),
      via: document.getElementById('routeVia').value.trim() || null,
    },
  });
  event.currentTarget.reset();
  renderSelectedNetwork();
  toast('Route added.');
}

async function submitPool(event) {
  event.preventDefault();
  state.selectedBundle = await requestJson(`/api/controller/networks/${encodeURIComponent(state.selectedNetworkId)}/ip-pools`, {
    method: 'POST',
    body: {
      ipRangeStart: document.getElementById('poolStart').value.trim(),
      ipRangeEnd: document.getElementById('poolEnd').value.trim(),
    },
  });
  event.currentTarget.reset();
  renderSelectedNetwork();
  toast('Assignment pool added.');
}

async function deleteSelectedNetwork() {
  if (!state.selectedNetworkId) {
    return;
  }
  const networkName = state.selectedBundle?.network?.name || state.selectedNetworkId;
  if (!window.confirm(`Delete network ${networkName}?`)) {
    return;
  }
  await requestJson(`/api/controller/networks/${encodeURIComponent(state.selectedNetworkId)}`, {
    method: 'DELETE',
  });
  state.selectedNetworkId = '';
  localStorage.removeItem('ztp_selected_network');
  await fetchController();
  toast('Network deleted.');
}

async function handleMemberInput(event) {
  const row = event.target.closest('tr[data-member-id]');
  if (!row) {
    return;
  }
  const memberId = row.dataset.memberId;
  const body = {};
  if (event.target.classList.contains('member-name-input')) {
    body.name = event.target.value.trim();
  } else if (event.target.classList.contains('member-authorized-input')) {
    body.authorized = event.target.checked;
  } else if (event.target.classList.contains('member-bridge-input')) {
    body.activeBridge = event.target.checked;
  } else {
    return;
  }
  await requestJson(`/api/controller/networks/${encodeURIComponent(state.selectedNetworkId)}/members/${encodeURIComponent(memberId)}`, {
    method: 'PATCH',
    body,
  });
  toast('Member updated.');
}

async function handleMembersClick(event) {
  const button = event.target.closest('button');
  if (!button) {
    return;
  }
  const row = button.closest('tr[data-member-id]');
  if (!row) {
    return;
  }
  const memberId = row.dataset.memberId;
  const action = button.dataset.action;
  if (action === 'delete-member') {
    if (!window.confirm(`Delete member ${memberId}?`)) {
      return;
    }
    await requestJson(`/api/controller/networks/${encodeURIComponent(state.selectedNetworkId)}/members/${encodeURIComponent(memberId)}`, {
      method: 'DELETE',
    });
    await loadNetwork(state.selectedNetworkId, { silent: true });
    toast('Member deleted.');
  }
  if (action === 'delete-ip') {
    state.selectedBundle = await requestJson(`/api/controller/networks/${encodeURIComponent(state.selectedNetworkId)}/members/${encodeURIComponent(memberId)}/ip-assignments?index=${encodeURIComponent(button.dataset.index)}`, {
      method: 'DELETE',
    });
    renderSelectedNetwork();
    toast('IP assignment removed.');
  }
}

async function handleMemberIpSubmit(event) {
  const form = event.target.closest('.member-ip-form');
  if (!form) {
    return;
  }
  event.preventDefault();
  const row = form.closest('tr[data-member-id]');
  const input = form.querySelector('input');
  const ipAddress = input.value.trim();
  if (!ipAddress) {
    return;
  }
  state.selectedBundle = await requestJson(`/api/controller/networks/${encodeURIComponent(state.selectedNetworkId)}/members/${encodeURIComponent(row.dataset.memberId)}/ip-assignments`, {
    method: 'POST',
    body: { ipAddress },
  });
  renderSelectedNetwork();
  toast('IP assignment added.');
}

async function removeRoute(target) {
  state.selectedBundle = await requestJson(`/api/controller/networks/${encodeURIComponent(state.selectedNetworkId)}/routes?target=${encodeURIComponent(target)}`, {
    method: 'DELETE',
  });
  renderSelectedNetwork();
  toast('Route removed.');
}

async function removePool(start, end) {
  state.selectedBundle = await requestJson(`/api/controller/networks/${encodeURIComponent(state.selectedNetworkId)}/ip-pools?start=${encodeURIComponent(start)}&end=${encodeURIComponent(end)}`, {
    method: 'DELETE',
  });
  renderSelectedNetwork();
  toast('Assignment pool removed.');
}

async function createLink(type, file) {
  const ttl = elements.ttl.value || '600';
  const params = new URLSearchParams({ type, file, ttl });
  const payload = await requestJson(`/api/link?${params.toString()}`);
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
    toast('Server key saved locally.');
    refreshAll().catch((error) => toast(error.message));
  } else {
    localStorage.removeItem('ztp_admin_key');
    renderLocked();
    toast('Local key cleared.');
  }
}

function clearKey() {
  elements.adminKey.value = '';
  saveKey();
}

function switchTab(tabName) {
  state.activeTab = tabName;
  document.querySelectorAll('.tab').forEach((tab) => {
    tab.classList.toggle('active', tab.dataset.tab === tabName);
  });
  document.querySelectorAll('.tab-panel').forEach((panel) => {
    panel.classList.toggle('active', panel.dataset.panel === tabName);
  });
}

function updateActiveNav() {
  const hash = (location.hash || '#overview').replace('#', '');
  document.querySelectorAll('[data-nav]').forEach((link) => {
    link.classList.toggle('active', link.dataset.nav === hash);
  });
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function escapeAttr(value) {
  return escapeHtml(value).replace(/`/g, '&#096;');
}

function bindEvents() {
  elements.adminKey.value = state.adminKey;
  updateActiveNav();

  window.addEventListener('hashchange', updateActiveNav);
  document.getElementById('refreshAllButton').addEventListener('click', () => refreshAll().catch((error) => toast(error.message)));
  document.getElementById('saveKeyButton').addEventListener('click', saveKey);
  document.getElementById('clearKeyButton').addEventListener('click', clearKey);
  document.getElementById('createNetworkForm').addEventListener('submit', (event) => createNetwork(event).catch((error) => toast(error.message)));
  document.getElementById('networkBasicsForm').addEventListener('submit', (event) => submitBasics(event).catch((error) => toast(error.message)));
  document.getElementById('assignModeForm').addEventListener('submit', (event) => submitAssignModes(event).catch((error) => toast(error.message)));
  document.getElementById('dnsForm').addEventListener('submit', (event) => submitDns(event).catch((error) => toast(error.message)));
  document.getElementById('easySetupForm').addEventListener('submit', (event) => submitEasySetup(event).catch((error) => toast(error.message)));
  document.getElementById('routeForm').addEventListener('submit', (event) => submitRoute(event).catch((error) => toast(error.message)));
  document.getElementById('poolForm').addEventListener('submit', (event) => submitPool(event).catch((error) => toast(error.message)));
  document.getElementById('deleteNetworkButton').addEventListener('click', () => deleteSelectedNetwork().catch((error) => toast(error.message)));
  document.getElementById('refreshNetworkButton').addEventListener('click', () => loadNetwork(state.selectedNetworkId).catch((error) => toast(error.message)));

  elements.networkList.addEventListener('click', (event) => {
    const item = event.target.closest('[data-network-id]');
    if (item) {
      loadNetwork(item.dataset.networkId).catch((error) => toast(error.message));
    }
  });

  elements.membersTable.addEventListener('change', (event) => handleMemberInput(event).catch((error) => toast(error.message)));
  elements.membersTable.addEventListener('click', (event) => handleMembersClick(event).catch((error) => toast(error.message)));
  elements.membersTable.addEventListener('submit', (event) => handleMemberIpSubmit(event).catch((error) => toast(error.message)));

  elements.routesList.addEventListener('click', (event) => {
    const button = event.target.closest('[data-route-target]');
    if (button) {
      removeRoute(button.dataset.routeTarget).catch((error) => toast(error.message));
    }
  });
  elements.poolsList.addEventListener('click', (event) => {
    const button = event.target.closest('[data-pool-start]');
    if (button) {
      removePool(button.dataset.poolStart, button.dataset.poolEnd).catch((error) => toast(error.message));
    }
  });

  document.querySelectorAll('.tab').forEach((tab) => {
    tab.addEventListener('click', () => switchTab(tab.dataset.tab));
  });

  document.getElementById('planetLinkButton').addEventListener('click', () => generatePlanetCommand().catch((error) => toast(error.message)));
  document.getElementById('linuxLinkButton').addEventListener('click', () => generateLinuxCommand().catch((error) => toast(error.message)));
  document.getElementById('macosLinkButton').addEventListener('click', () => generateMacosCommand().catch((error) => toast(error.message)));

  document.querySelectorAll('[data-copy-target]').forEach((button) => {
    button.addEventListener('click', () => copyFrom(button.dataset.copyTarget).catch((error) => toast(error.message)));
  });
}

bindEvents();
fetchStatus()
  .then(() => {
    if (state.adminKey) {
      return fetchController();
    }
    renderLocked();
    return null;
  })
  .catch((error) => toast(error.message));
