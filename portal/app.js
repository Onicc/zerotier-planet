const state = {
  status: null,
  overview: null,
  controller: null,
  networks: [],
  selectedNetworkId: localStorage.getItem('ztp_selected_network') || '',
  selectedBundle: null,
  token: sessionStorage.getItem('ztp_session_token') || '',
  username: 'admin',
  activePage: 'overview',
  activeTab: 'members',
  networkFilter: '',
  easyPoolTouched: false,
};

const $ = (id) => document.getElementById(id);

const elements = {
  authShell: $('authShell'),
  appShell: $('appShell'),
  loginForm: $('loginForm'),
  firstPasswordForm: $('firstPasswordForm'),
  loginUsername: $('loginUsername'),
  loginPassword: $('loginPassword'),
  firstCurrentPassword: $('firstCurrentPassword'),
  firstNewPassword: $('firstNewPassword'),
  firstConfirmPassword: $('firstConfirmPassword'),
  toast: $('toast'),
  signedInUser: $('signedInUser'),
  sessionState: $('sessionState'),
  pageKicker: $('pageKicker'),
  pageTitle: $('pageTitle'),
  planetState: $('planetState'),
  controllerStatus: $('controllerStatus'),
  networkCount: $('networkCount'),
  ztAddress: $('ztAddress'),
  publicUrl: $('publicUrl'),
  ztPort: $('ztPort'),
  filePort: $('filePort'),
  ttlState: $('ttlState'),
  readinessPill: $('readinessPill'),
  fileCount: $('fileCount'),
  fileList: $('fileList'),
  networkList: $('networkList'),
  networkListCount: $('networkListCount'),
  networkSearch: $('networkSearch'),
  networkEmpty: $('networkEmpty'),
  networkEmptyTitle: $('networkEmptyTitle'),
  networkEmptyMessage: $('networkEmptyMessage'),
  networkDetail: $('networkDetail'),
  selectedNetworkName: $('selectedNetworkName'),
  selectedNetworkId: $('selectedNetworkId'),
  selectedNetworkPrivacy: $('selectedNetworkPrivacy'),
  membersTable: $('membersTable'),
  routesList: $('routesList'),
  poolsList: $('poolsList'),
  rawNetworkJson: $('rawNetworkJson'),
  networkNameInput: $('networkNameInput'),
  networkPrivateInput: $('networkPrivateInput'),
  easyCidr: $('easyCidr'),
  easyPoolStart: $('easyPoolStart'),
  easyPoolEnd: $('easyPoolEnd'),
  v4AssignInput: $('v4AssignInput'),
  v6PlaneInput: $('v6PlaneInput'),
  v6RfcInput: $('v6RfcInput'),
  v6ZtInput: $('v6ZtInput'),
  dnsDomain: $('dnsDomain'),
  dnsServers: $('dnsServers'),
  ttl: $('ttl'),
  deliveryNetwork: $('deliveryNetwork'),
  includeNetworkId: $('includeNetworkId'),
  wgetCommand: $('wgetCommand'),
  linuxCommand: $('linuxCommand'),
  macosCommand: $('macosCommand'),
};

const pageMeta = {
  overview: ['Operations', 'Overview'],
  networks: ['Controller', 'Networks'],
  delivery: ['Client rollout', 'Client delivery'],
  guide: ['Documentation', 'Guide'],
  settings: ['Security', 'Settings'],
};

const fallbackCidr = '10.147.17.0/24';

function toast(message) {
  elements.toast.textContent = message;
  elements.toast.classList.add('visible');
  window.clearTimeout(toast.timer);
  toast.timer = window.setTimeout(() => {
    elements.toast.classList.remove('visible');
  }, 3200);
}

function commandQuote(value) {
  return `'${String(value).replace(/'/g, `'\\''`)}'`;
}

function saveSession(payload) {
  state.token = payload.token || '';
  state.username = payload.username || state.username || 'admin';
  if (state.token) {
    sessionStorage.setItem('ztp_session_token', state.token);
  }
  elements.signedInUser.textContent = state.username;
  elements.sessionState.textContent = payload.mustChangePassword ? 'Password change required' : 'Session active';
}

function clearSession() {
  state.token = '';
  sessionStorage.removeItem('ztp_session_token');
}

function clearPasswordFields() {
  [
    elements.loginPassword,
    elements.firstCurrentPassword,
    elements.firstNewPassword,
    elements.firstConfirmPassword,
    $('resetNewPassword'),
    $('resetConfirmPassword'),
  ].filter(Boolean).forEach((input) => {
    input.value = '';
  });
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
  return { network, broadcast, prefix, normalized: `${formatIpv4(network)}/${prefix}` };
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
  return { network, prefix, normalized: `${formatIpv4(network)}/${prefix}` };
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

function currentManagedRoute(network) {
  const routes = Array.isArray(network?.routes) ? network.routes : [];
  const profile = state.selectedBundle?.profile || {};
  if (profile.managedRouteTarget || profile.managedPoolStart || profile.managedPoolEnd) {
    return routes.find((route) => route.target === profile.managedRouteTarget && !route.via) || null;
  }
  return routes.find((route) => !route.via && parseIpv4Cidr(route.target)) || null;
}

function currentManagedPool(network) {
  const pools = Array.isArray(network?.ipAssignmentPools) ? network.ipAssignmentPools : [];
  const profile = state.selectedBundle?.profile || {};
  if (profile.managedRouteTarget || profile.managedPoolStart || profile.managedPoolEnd) {
    return pools.find((pool) => (
      pool.ipRangeStart === profile.managedPoolStart
      && pool.ipRangeEnd === profile.managedPoolEnd
    )) || null;
  }
  return pools.find((pool) => parseIpv4(pool.ipRangeStart) !== null && parseIpv4(pool.ipRangeEnd) !== null) || null;
}

function poolRangeError(cidr, poolStart, poolEnd) {
  const parsed = parseIpv4Cidr(cidr);
  const start = parseIpv4(poolStart);
  const end = parseIpv4(poolEnd);
  if (!parsed || start === null || end === null) {
    return 'Pool start and end must be valid IPv4 addresses.';
  }
  if (start > end) {
    return 'Pool start must be lower than or equal to pool end.';
  }
  if (start <= parsed.network || end >= parsed.broadcast) {
    return 'Pool range must stay inside the managed route CIDR.';
  }
  return '';
}

async function withPending(form, pendingText, operation) {
  const submitButton = form?.querySelector('button[type="submit"]');
  const originalText = submitButton?.textContent || '';
  if (submitButton) {
    submitButton.disabled = true;
    submitButton.textContent = pendingText;
  }
  try {
    return await operation();
  } finally {
    if (submitButton) {
      submitButton.disabled = false;
      submitButton.textContent = originalText;
    }
  }
}

async function requestJson(path, options = {}) {
  const headers = {
    Accept: 'application/json',
    ...(options.headers || {}),
  };
  if (options.body !== undefined) {
    headers['Content-Type'] = 'application/json';
  }
  if (options.auth !== false && state.token) {
    headers.Authorization = `Bearer ${state.token}`;
  }

  const response = await fetch(path, {
    ...options,
    headers,
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
    cache: 'no-store',
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    if (response.status === 401) {
      if (payload.mustChangePassword) {
        showFirstPassword();
      } else if (options.auth !== false) {
        showLogin();
      }
    }
    throw new Error(payload.error || `Request failed: ${response.status}`);
  }
  return payload;
}

async function fetchPublicStatus() {
  state.status = await requestJson('/api/status', { auth: false });
  state.username = state.status?.auth?.username || 'admin';
  elements.signedInUser.textContent = state.username;
  return state.status;
}

async function login(event) {
  event.preventDefault();
  const username = elements.loginUsername.value.trim();
  const password = elements.loginPassword.value;
  const payload = await requestJson('/api/auth/login', {
    method: 'POST',
    auth: false,
    body: { username, password },
  });
  saveSession(payload);
  elements.loginPassword.value = '';
  if (payload.mustChangePassword) {
    elements.firstCurrentPassword.value = password;
    showFirstPassword();
    toast('Set a new password before continuing.');
    return;
  }
  await enterApp();
}

function validatePasswordPair(password, confirmPassword) {
  if (password !== confirmPassword) {
    throw new Error('Passwords do not match.');
  }
  if (password.length < 8 || !/[A-Za-z]/.test(password) || !/[0-9]/.test(password)) {
    throw new Error('Password must be at least 8 characters and include letters and numbers.');
  }
}

async function submitFirstPassword(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const currentPassword = elements.firstCurrentPassword.value;
  const newPassword = elements.firstNewPassword.value;
  validatePasswordPair(newPassword, elements.firstConfirmPassword.value);
  const payload = await withPending(form, 'Updating...', () => requestJson('/api/auth/password', {
    method: 'POST',
    body: { currentPassword, newPassword },
  }));
  saveSession(payload);
  clearPasswordFields();
  toast('Password updated.');
  await enterApp();
}

async function submitResetPassword(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const newPassword = $('resetNewPassword').value;
  validatePasswordPair(newPassword, $('resetConfirmPassword').value);
  if (!window.confirm('Reset the console password and invalidate existing sessions?')) {
    return;
  }
  const payload = await withPending(form, 'Resetting...', () => requestJson('/api/auth/reset', {
    method: 'POST',
    body: { newPassword },
  }));
  saveSession(payload);
  form.reset();
  clearPasswordFields();
  toast('Password reset.');
}

async function logout() {
  try {
    await requestJson('/api/auth/logout', { method: 'POST' });
  } catch (error) {
    // Session may already be expired.
  }
  clearSession();
  clearPasswordFields();
  showLogin();
}

function showLogin() {
  clearPasswordFields();
  elements.authShell.hidden = false;
  elements.appShell.hidden = true;
  elements.loginForm.classList.add('active');
  elements.firstPasswordForm.classList.remove('active');
  elements.loginUsername.value = state.username || 'admin';
  window.setTimeout(() => elements.loginPassword.focus(), 0);
}

function showFirstPassword() {
  elements.authShell.hidden = false;
  elements.appShell.hidden = true;
  elements.loginForm.classList.remove('active');
  elements.firstPasswordForm.classList.add('active');
  window.setTimeout(() => elements.firstNewPassword.focus(), 0);
}

async function enterApp() {
  elements.authShell.hidden = true;
  elements.appShell.hidden = false;
  setPage((location.hash || '#overview').replace('#', '') || 'overview', { push: false });
  await refreshAll();
}

async function fetchOverview() {
  state.overview = await requestJson('/api/overview');
  renderOverview();
}

async function fetchController() {
  try {
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
  } catch (error) {
    state.controller = null;
    state.networks = [];
    state.selectedBundle = null;
    renderControllerError(error.message);
    toast(error.message);
  }
}

async function refreshAll() {
  await fetchOverview();
  await fetchController();
}

function renderOverview() {
  const overview = state.overview || {};
  const files = overview.files || [];
  elements.planetState.textContent = overview.hasPlanet ? 'Ready' : 'Missing';
  elements.planetState.className = overview.hasPlanet ? 'ok' : 'danger-text';
  elements.publicUrl.textContent = overview.publicUrl || '--';
  elements.ztPort.textContent = overview.zeroTierPort || '--';
  elements.filePort.textContent = overview.fileServerPort || '--';
  elements.ttlState.textContent = `${Math.round((overview.linkTtlSeconds || 600) / 60)} min`;
  elements.readinessPill.textContent = overview.hasPlanet ? 'Ready' : 'Needs planet';
  elements.readinessPill.className = overview.hasPlanet ? 'pill good' : 'pill warn';
  elements.fileCount.textContent = String(files.length);
  elements.fileList.innerHTML = files.length ? files.map((file) => `
    <div class="file-row">
      <span><strong>${escapeHtml(file.name)}</strong><small>${escapeHtml(file.type)} file</small></span>
      <span>${formatBytes(file.size)}</span>
    </div>
  `).join('') : '<div class="empty-inline">No downloadable files are available yet.</div>';
}

function renderController() {
  const controllerStatus = state.controller?.status || {};
  elements.controllerStatus.textContent = controllerStatus.online ? 'Online' : 'Available';
  elements.controllerStatus.className = controllerStatus.online ? 'ok' : '';
  elements.networkCount.textContent = String(state.networks.length);
  elements.ztAddress.textContent = controllerStatus.address || '--';
  elements.networkListCount.textContent = String(filteredNetworks().length);
  renderNetworkList();
  renderDeliveryNetworks();
}

function renderControllerError(message) {
  elements.controllerStatus.textContent = 'Unavailable';
  elements.controllerStatus.className = 'danger-text';
  elements.networkCount.textContent = '0';
  elements.ztAddress.textContent = '--';
  elements.networkListCount.textContent = '0';
  elements.networkList.innerHTML = `<div class="empty-inline danger-text">${escapeHtml(message)}</div>`;
  elements.deliveryNetwork.innerHTML = '<option value="">Controller unavailable</option>';
  elements.networkEmpty.hidden = false;
  elements.networkDetail.hidden = true;
  elements.networkEmptyTitle.textContent = 'Controller unavailable';
  elements.networkEmptyMessage.textContent = message;
}

function filteredNetworks() {
  const query = state.networkFilter.trim().toLowerCase();
  if (!query) {
    return state.networks;
  }
  return state.networks.filter((network) => (
    String(network.name || '').toLowerCase().includes(query)
    || String(network.nwid || '').toLowerCase().includes(query)
  ));
}

function renderNetworkList() {
  const networks = filteredNetworks();
  elements.networkListCount.textContent = String(networks.length);
  if (!networks.length) {
    elements.networkList.innerHTML = '<div class="empty-inline">No matching networks.</div>';
    return;
  }

  elements.networkList.innerHTML = networks.map((network) => {
    const memberCount = network.authorizedMemberCount ?? network.memberCount ?? 0;
    return `
      <button class="list-item ${network.nwid === state.selectedNetworkId ? 'active' : ''}" data-network-id="${escapeHtml(network.nwid)}" type="button">
        <span>
          <strong>${escapeHtml(network.name || 'Unnamed network')}</strong>
          <small>${escapeHtml(network.nwid)}</small>
        </span>
        <span class="network-meta">
          <span class="pill ${network.private ? 'good' : 'warn'}">${network.private ? 'Private' : 'Public'}</span>
          <small>${escapeHtml(memberCount)} members</small>
        </span>
      </button>
    `;
  }).join('');
}

function renderDeliveryNetworks() {
  if (!state.networks.length) {
    elements.deliveryNetwork.innerHTML = '<option value="">No networks</option>';
    elements.deliveryNetwork.disabled = true;
    return;
  }
  elements.deliveryNetwork.disabled = false;
  elements.deliveryNetwork.innerHTML = state.networks.map((network) => (
    `<option value="${escapeAttr(network.nwid)}">${escapeHtml(network.name || network.nwid)} (${escapeHtml(network.nwid)})</option>`
  )).join('');
  if (state.selectedNetworkId) {
    elements.deliveryNetwork.value = state.selectedNetworkId;
  }
}

async function loadNetwork(nwid, options = {}) {
  if (!nwid) {
    return;
  }
  state.selectedNetworkId = nwid;
  localStorage.setItem('ztp_selected_network', nwid);
  state.selectedBundle = await requestJson(`/api/controller/networks/${encodeURIComponent(nwid)}`);
  renderNetworkList();
  renderDeliveryNetworks();
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
    elements.networkEmptyTitle.textContent = 'No network selected';
    elements.networkEmptyMessage.textContent = 'Select a network or create one to manage members, routes, DNS, and address allocation.';
    return;
  }

  elements.networkEmpty.hidden = true;
  elements.networkDetail.hidden = false;
  const network = bundle.network;
  elements.selectedNetworkName.textContent = network.name || 'Unnamed network';
  elements.selectedNetworkId.textContent = network.nwid || state.selectedNetworkId;
  elements.selectedNetworkPrivacy.textContent = network.private ? 'Private' : 'Public';
  elements.selectedNetworkPrivacy.className = network.private ? 'pill good' : 'pill warn';
  elements.rawNetworkJson.textContent = JSON.stringify(network, null, 2);
  syncNetworkForms(network);

  renderMembers(bundle.members || []);
  renderRoutes(network.routes || [], currentManagedRoute(network));
  renderPools(network.ipAssignmentPools || [], currentManagedPool(network));
}

function syncNetworkForms(network) {
  const route = currentManagedRoute(network);
  const pool = currentManagedPool(network);
  const cidr = route?.target || fallbackCidr;
  const defaults = defaultPoolForCidr(cidr) || defaultPoolForCidr(fallbackCidr);

  elements.networkNameInput.value = network.name || '';
  elements.networkPrivateInput.checked = Boolean(network.private);
  elements.v4AssignInput.checked = Boolean(network.v4AssignMode?.zt);
  elements.v6PlaneInput.checked = Boolean(network.v6AssignMode?.['6plane']);
  elements.v6RfcInput.checked = Boolean(network.v6AssignMode?.rfc4193);
  elements.v6ZtInput.checked = Boolean(network.v6AssignMode?.zt);
  elements.dnsDomain.value = network.dns?.domain || '';
  elements.dnsServers.value = Array.isArray(network.dns?.servers) ? network.dns.servers.join('\n') : '';
  elements.easyCidr.value = route?.target || defaults.cidr;
  elements.easyPoolStart.value = pool?.ipRangeStart || defaults.poolStart;
  elements.easyPoolEnd.value = pool?.ipRangeEnd || defaults.poolEnd;
  state.easyPoolTouched = false;
  $('routeTarget').value = '';
  $('routeVia').value = '';
  $('poolStart').value = '';
  $('poolEnd').value = '';
  $('routeTarget').placeholder = defaults.cidr;
  $('poolStart').placeholder = defaults.poolStart;
  $('poolEnd').placeholder = defaults.poolEnd;
}

function renderMembers(members) {
  if (!members.length) {
    elements.membersTable.innerHTML = `
      <tr>
        <td colspan="7"><div class="empty-inline">No members have joined this network yet.</div></td>
      </tr>
    `;
    return;
  }

  elements.membersTable.innerHTML = members.map((member) => {
    const id = member.id || member.address;
    const ips = Array.isArray(member.ipAssignments) ? member.ipAssignments : [];
    return `
      <tr data-member-id="${escapeHtml(id)}">
        <td><input class="table-input member-name-input" value="${escapeAttr(member.name || '')}" placeholder="Friendly name" aria-label="Member name"></td>
        <td><span class="mono">${escapeHtml(id)}</span></td>
        <td>${renderPeerState(member)}</td>
        <td><input class="member-authorized-input" type="checkbox" ${member.authorized ? 'checked' : ''} aria-label="Authorized"></td>
        <td><input class="member-bridge-input" type="checkbox" ${member.activeBridge ? 'checked' : ''} aria-label="Active bridge"></td>
        <td>
          <div class="ip-stack">
            ${ips.map((ip, index) => `
              <span class="ip-chip">${escapeHtml(ip)}<button data-action="delete-ip" data-index="${index}" type="button" aria-label="Delete IP assignment">x</button></span>
            `).join('') || '<span class="muted">None</span>'}
            <form class="mini-form member-ip-form">
              <input type="text" placeholder="Add IP">
              <button class="icon-button" type="submit">+</button>
            </form>
          </div>
        </td>
        <td><button class="button small danger" data-action="delete-member" type="button">Delete</button></td>
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

function renderRoutes(routes, managedRoute) {
  elements.routesList.innerHTML = routes.length ? routes.map((route) => {
    const managed = managedRoute && route.target === managedRoute.target && !route.via && !managedRoute.via;
    return `
    <div class="config-row">
      <span><strong>${escapeHtml(route.target)}</strong><small>${route.via ? `via ${escapeHtml(route.via)}` : managed ? 'managed local route' : 'local ZeroTier route'}</small></span>
      ${managed ? '<span class="pill good">Easy setup</span>' : ''}
      <button class="button small" data-route-target="${escapeAttr(route.target)}" type="button">Remove</button>
    </div>
  `;
  }).join('') : '<div class="empty-inline">No routes configured.</div>';
}

function renderPools(pools, managedPool) {
  elements.poolsList.innerHTML = pools.length ? pools.map((pool) => {
    const managed = managedPool
      && pool.ipRangeStart === managedPool.ipRangeStart
      && pool.ipRangeEnd === managedPool.ipRangeEnd;
    return `
    <div class="config-row">
      <span><strong>${escapeHtml(pool.ipRangeStart)} - ${escapeHtml(pool.ipRangeEnd)}</strong><small>managed assignment range</small></span>
      ${managed ? '<span class="pill good">Easy setup</span>' : ''}
      <button class="button small" data-pool-start="${escapeAttr(pool.ipRangeStart)}" data-pool-end="${escapeAttr(pool.ipRangeEnd)}" type="button">Remove</button>
    </div>
  `;
  }).join('') : '<div class="empty-inline">No assignment pools configured.</div>';
}

async function createNetwork(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const input = $('newNetworkName');
  const name = input.value.trim();
  if (!name) {
    toast('Enter a network name.');
    input.focus();
    return;
  }
  const payload = await withPending(form, 'Creating...', () => requestJson('/api/controller/networks', {
    method: 'POST',
    body: { name },
  }));
  input.value = '';
  await fetchController();
  if (payload.network?.nwid) {
    await loadNetwork(payload.network.nwid, { silent: true });
    setPage('networks');
    switchTab('settings');
  }
  toast('Network created.');
}

async function patchSelectedNetwork(body, message, form, pendingText = 'Saving...') {
  if (!state.selectedNetworkId) {
    toast('Select a network first.');
    return;
  }
  state.selectedBundle = await withPending(form, pendingText, () => requestJson(`/api/controller/networks/${encodeURIComponent(state.selectedNetworkId)}`, {
    method: 'PATCH',
    body,
  }));
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
  }, 'Network basics saved.', event.currentTarget);
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
  }, 'Assignment modes saved.', event.currentTarget);
}

async function submitDns(event) {
  event.preventDefault();
  await patchSelectedNetwork({
    dns: {
      domain: elements.dnsDomain.value.trim(),
      servers: elements.dnsServers.value.split('\n').map((item) => item.trim()).filter(Boolean),
    },
  }, 'DNS saved.', event.currentTarget);
}

async function submitEasySetup(event) {
  event.preventDefault();
  if (!state.selectedNetworkId) {
    toast('Select a network first.');
    return;
  }
  const cidr = elements.easyCidr.value.trim();
  const defaults = defaultPoolForCidr(cidr);
  if (!defaults) {
    toast('Enter a valid IPv4 CIDR, for example 10.147.17.0/24.');
    elements.easyCidr.focus();
    return;
  }
  const poolStart = elements.easyPoolStart.value.trim() || defaults.poolStart;
  const poolEnd = elements.easyPoolEnd.value.trim() || defaults.poolEnd;
  const poolError = poolRangeError(defaults.cidr, poolStart, poolEnd);
  if (poolError) {
    toast(poolError);
    elements.easyPoolStart.focus();
    return;
  }
  const form = event.currentTarget;
  state.selectedBundle = await withPending(form, 'Applying...', () => requestJson(`/api/controller/networks/${encodeURIComponent(state.selectedNetworkId)}/easy`, {
    method: 'POST',
    body: {
      networkCIDR: defaults.cidr,
      poolStart,
      poolEnd,
    },
  }));
  await loadNetwork(state.selectedNetworkId, { silent: true });
  renderSelectedNetwork();
  toast('Easy setup applied.');
}

async function submitRoute(event) {
  event.preventDefault();
  if (!state.selectedNetworkId) {
    toast('Select a network first.');
    return;
  }
  const form = event.currentTarget;
  const target = $('routeTarget').value.trim();
  const route = parseIpv4RouteCidr(target);
  if (!route) {
    toast('Enter a valid target CIDR.');
    $('routeTarget').focus();
    return;
  }
  state.selectedBundle = await withPending(form, 'Adding...', () => requestJson(`/api/controller/networks/${encodeURIComponent(state.selectedNetworkId)}/routes`, {
    method: 'POST',
    body: {
      target: route.normalized,
      via: $('routeVia').value.trim() || null,
    },
  }));
  form.reset();
  await loadNetwork(state.selectedNetworkId, { silent: true });
  toast('Route added.');
}

async function submitPool(event) {
  event.preventDefault();
  if (!state.selectedNetworkId) {
    toast('Select a network first.');
    return;
  }
  const form = event.currentTarget;
  const ipRangeStart = $('poolStart').value.trim();
  const ipRangeEnd = $('poolEnd').value.trim();
  if (parseIpv4(ipRangeStart) === null || parseIpv4(ipRangeEnd) === null) {
    toast('Enter a valid IPv4 range start and end.');
    $('poolStart').focus();
    return;
  }
  if (parseIpv4(ipRangeStart) > parseIpv4(ipRangeEnd)) {
    toast('Range start must be lower than or equal to range end.');
    $('poolStart').focus();
    return;
  }
  state.selectedBundle = await withPending(form, 'Adding...', () => requestJson(`/api/controller/networks/${encodeURIComponent(state.selectedNetworkId)}/ip-pools`, {
    method: 'POST',
    body: {
      ipRangeStart,
      ipRangeEnd,
    },
  }));
  form.reset();
  await loadNetwork(state.selectedNetworkId, { silent: true });
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
  await requestJson(`/api/controller/networks/${encodeURIComponent(state.selectedNetworkId)}`, { method: 'DELETE' });
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
  state.selectedBundle = await requestJson(`/api/controller/networks/${encodeURIComponent(state.selectedNetworkId)}/routes?target=${encodeURIComponent(target)}`, { method: 'DELETE' });
  await loadNetwork(state.selectedNetworkId, { silent: true });
  toast('Route removed.');
}

async function removePool(start, end) {
  state.selectedBundle = await requestJson(`/api/controller/networks/${encodeURIComponent(state.selectedNetworkId)}/ip-pools?start=${encodeURIComponent(start)}&end=${encodeURIComponent(end)}`, { method: 'DELETE' });
  await loadNetwork(state.selectedNetworkId, { silent: true });
  toast('Assignment pool removed.');
}

async function createLink(type, file) {
  const ttl = elements.ttl.value || '600';
  const params = new URLSearchParams({ type, file, ttl });
  return (await requestJson(`/api/link?${params.toString()}`)).url;
}

function selectedDeliveryNetworkId() {
  const networkId = elements.deliveryNetwork.value;
  if (!elements.includeNetworkId.checked || !networkId) {
    return '';
  }
  return networkId;
}

function resetDeliveryCommands() {
  elements.wgetCommand.textContent = 'Generate a link first.';
  elements.linuxCommand.textContent = 'Generate an installer first.';
  elements.macosCommand.textContent = 'Generate an installer first.';
}

async function generatePlanetCommand() {
  const link = await createLink('download', 'planet');
  elements.wgetCommand.textContent = `wget -O planet ${commandQuote(link)}`;
  toast('Temporary planet command generated.');
}

async function generateLinuxCommand() {
  const link = await createLink('install', 'linux.sh');
  const networkId = selectedDeliveryNetworkId();
  const runner = networkId ? `sudo env NETWORK_ID=${networkId} bash` : 'sudo bash';
  elements.linuxCommand.textContent = `curl -fsSL ${commandQuote(link)} | ${runner}`;
  toast('Linux installer command generated.');
}

async function generateMacosCommand() {
  const link = await createLink('install', 'macos.sh');
  const networkId = selectedDeliveryNetworkId();
  const runner = networkId ? `NETWORK_ID=${networkId} bash` : 'bash';
  elements.macosCommand.textContent = `curl -fsSL ${commandQuote(link)} | ${runner}`;
  toast('macOS installer command generated.');
}

async function copyFrom(targetId) {
  const target = $(targetId);
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

function setPage(pageName, options = {}) {
  const normalized = pageMeta[pageName] ? pageName : 'overview';
  if (state.activePage !== normalized && state.selectedBundle?.network) {
    syncNetworkForms(state.selectedBundle.network);
  }
  state.activePage = normalized;
  document.querySelectorAll('.page').forEach((page) => {
    page.classList.toggle('active', page.dataset.page === normalized);
  });
  document.querySelectorAll('[data-nav]').forEach((link) => {
    link.classList.toggle('active', link.dataset.nav === normalized);
  });
  elements.pageKicker.textContent = pageMeta[normalized][0];
  elements.pageTitle.textContent = pageMeta[normalized][1];
  if (options.push !== false && location.hash !== `#${normalized}`) {
    location.hash = normalized;
  }
}

function switchTab(tabName) {
  if (state.activeTab !== tabName && state.selectedBundle?.network) {
    syncNetworkForms(state.selectedBundle.network);
  }
  state.activeTab = tabName;
  document.querySelectorAll('.tab').forEach((tab) => {
    tab.classList.toggle('active', tab.dataset.tab === tabName);
  });
  document.querySelectorAll('.tab-panel').forEach((panel) => {
    panel.classList.toggle('active', panel.dataset.panel === tabName);
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

function formatBytes(value) {
  const bytes = Number(value || 0);
  if (bytes < 1024) {
    return `${bytes} B`;
  }
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function bindEvents() {
  elements.loginForm.addEventListener('submit', (event) => login(event).catch((error) => toast(error.message)));
  elements.firstPasswordForm.addEventListener('submit', (event) => submitFirstPassword(event).catch((error) => toast(error.message)));
  $('resetPasswordForm').addEventListener('submit', (event) => submitResetPassword(event).catch((error) => toast(error.message)));
  $('logoutButton').addEventListener('click', () => logout());
  $('refreshAllButton').addEventListener('click', () => refreshAll().catch((error) => toast(error.message)));
  $('createNetworkForm').addEventListener('submit', (event) => createNetwork(event).catch((error) => toast(error.message)));
  $('networkBasicsForm').addEventListener('submit', (event) => submitBasics(event).catch((error) => toast(error.message)));
  $('assignModeForm').addEventListener('submit', (event) => submitAssignModes(event).catch((error) => toast(error.message)));
  $('dnsForm').addEventListener('submit', (event) => submitDns(event).catch((error) => toast(error.message)));
  $('easySetupForm').addEventListener('submit', (event) => submitEasySetup(event).catch((error) => toast(error.message)));
  $('routeForm').addEventListener('submit', (event) => submitRoute(event).catch((error) => toast(error.message)));
  $('poolForm').addEventListener('submit', (event) => submitPool(event).catch((error) => toast(error.message)));
  $('deleteNetworkButton').addEventListener('click', () => deleteSelectedNetwork().catch((error) => toast(error.message)));
  $('refreshNetworkButton').addEventListener('click', () => loadNetwork(state.selectedNetworkId).catch((error) => toast(error.message)));

  elements.easyCidr.addEventListener('input', () => {
    const defaults = defaultPoolForCidr(elements.easyCidr.value.trim());
    if (!defaults) {
      return;
    }
    if (!state.easyPoolTouched) {
      elements.easyPoolStart.value = defaults.poolStart;
      elements.easyPoolEnd.value = defaults.poolEnd;
    }
    $('routeTarget').placeholder = defaults.cidr;
    $('poolStart').placeholder = defaults.poolStart;
    $('poolEnd').placeholder = defaults.poolEnd;
  });
  [elements.easyPoolStart, elements.easyPoolEnd].forEach((input) => {
    input.addEventListener('input', () => {
      state.easyPoolTouched = true;
    });
  });

  elements.networkSearch.addEventListener('input', () => {
    state.networkFilter = elements.networkSearch.value;
    renderNetworkList();
  });
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
  document.querySelectorAll('[data-nav]').forEach((link) => {
    link.addEventListener('click', (event) => {
      event.preventDefault();
      setPage(link.dataset.nav);
    });
  });
  window.addEventListener('hashchange', () => setPage((location.hash || '#overview').replace('#', ''), { push: false }));

  $('planetLinkButton').addEventListener('click', () => generatePlanetCommand().catch((error) => toast(error.message)));
  $('linuxLinkButton').addEventListener('click', () => generateLinuxCommand().catch((error) => toast(error.message)));
  $('macosLinkButton').addEventListener('click', () => generateMacosCommand().catch((error) => toast(error.message)));
  elements.ttl.addEventListener('change', resetDeliveryCommands);
  elements.deliveryNetwork.addEventListener('change', resetDeliveryCommands);
  elements.includeNetworkId.addEventListener('change', resetDeliveryCommands);
  document.querySelectorAll('[data-copy-target]').forEach((button) => {
    button.addEventListener('click', () => copyFrom(button.dataset.copyTarget).catch((error) => toast(error.message)));
  });
}

bindEvents();
fetchPublicStatus()
  .then(async (status) => {
    if (!state.token) {
      showLogin();
      return;
    }
    const auth = await requestJson('/api/auth/status');
    if (!auth.authenticated) {
      showLogin();
      return;
    }
    saveSession({ token: state.token, username: auth.username, mustChangePassword: auth.mustChangePassword });
    if (auth.mustChangePassword) {
      showFirstPassword();
      return;
    }
    await enterApp();
  })
  .catch((error) => {
    toast(error.message);
    showLogin();
  });
