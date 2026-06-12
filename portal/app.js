const supportedLanguages = ['en', 'zh-CN'];

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
  lang: getInitialLanguage(),
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
  sidebarToggle: $('sidebarToggle'),
  toast: $('toast'),
  signedInUser: $('signedInUser'),
  sessionState: $('sessionState'),
  authInstanceUrl: $('authInstanceUrl'),
  pageKicker: $('pageKicker'),
  pageTitle: $('pageTitle'),
  planetState: $('planetState'),
  controllerStatus: $('controllerStatus'),
  networkCount: $('networkCount'),
  overviewMemberCount: $('overviewMemberCount'),
  ztAddress: $('ztAddress'),
  publicUrl: $('publicUrl'),
  ztPort: $('ztPort'),
  filePort: $('filePort'),
  ttlState: $('ttlState'),
  readinessPill: $('readinessPill'),
  fileCount: $('fileCount'),
  fileList: $('fileList'),
  overviewEndpoint: $('overviewEndpoint'),
  overviewPlanetDetail: $('overviewPlanetDetail'),
  overviewNetworksDetail: $('overviewNetworksDetail'),
  authorizedMemberCount: $('authorizedMemberCount'),
  pendingMemberCount: $('pendingMemberCount'),
  routeCount: $('routeCount'),
  poolCount: $('poolCount'),
  activityHealthPill: $('activityHealthPill'),
  recentNetworkList: $('recentNetworkList'),
  planetStepDot: $('planetStepDot'),
  planetStepText: $('planetStepText'),
  controllerStepDot: $('controllerStepDot'),
  controllerStepText: $('controllerStepText'),
  networkStepDot: $('networkStepDot'),
  networkStepText: $('networkStepText'),
  flowPlanetStep: $('flowPlanetStep'),
  flowPlanetNode: $('flowPlanetNode'),
  flowPlanetText: $('flowPlanetText'),
  flowControllerStep: $('flowControllerStep'),
  flowControllerNode: $('flowControllerNode'),
  flowControllerText: $('flowControllerText'),
  flowNetworkStep: $('flowNetworkStep'),
  flowNetworkNode: $('flowNetworkNode'),
  flowNetworkText: $('flowNetworkText'),
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
  selectedMemberCount: $('selectedMemberCount'),
  selectedRouteCount: $('selectedRouteCount'),
  selectedPoolCount: $('selectedPoolCount'),
  selectedDnsState: $('selectedDnsState'),
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
  easyPoolPreview: $('easyPoolPreview'),
  deliveryReadinessNote: $('deliveryReadinessNote'),
  deliveryPlanetState: $('deliveryPlanetState'),
  deliveryPlanetNote: $('deliveryPlanetNote'),
  deliverySelectedNetworkState: $('deliverySelectedNetworkState'),
  deliveryTtlState: $('deliveryTtlState'),
  settingsPublicUrl: $('settingsPublicUrl'),
  settingsControllerState: $('settingsControllerState'),
  settingsPlanetState: $('settingsPlanetState'),
  settingsSessionState: $('settingsSessionState'),
  refreshAllButton: $('refreshAllButton'),
  refreshNetworkButton: $('refreshNetworkButton'),
  planetLinkButton: $('planetLinkButton'),
  linuxLinkButton: $('linuxLinkButton'),
  macosLinkButton: $('macosLinkButton'),
};

const pageMeta = {
  overview: ['Operations', 'Overview'],
  networks: ['Controller', 'Networks'],
  delivery: ['Client rollout', 'Client delivery'],
  guide: ['Documentation', 'Guide'],
  settings: ['Security', 'Settings'],
};

const zhCNText = {
  'ZeroTier Planet Console': 'ZeroTier Planet 控制台',
  'Language': '语言',
  'Private network control plane': '私有网络控制平面',
  'Private control plane': '私有控制平面',
  'Private ZeroTier control plane.': '私有 ZeroTier 控制平面。',
  'Manage networks, members, planet delivery, and onboarding from one self-hosted console.': '在一个自托管控制台中管理网络、成员、planet 分发和客户端接入。',
  'Self-hosted': '自托管',
  'Planet delivery': 'Planet 分发',
  'Member authorization': '成员授权',
  'Operator login': '管理员登录',
  'Sign in to the console': '登录控制台',
  'Use the initial credentials configured by the deployment. The first sign-in requires a new password.': '使用部署时配置的初始凭据。首次登录需要设置新密码。',
  'Username': '用户名',
  'Password': '密码',
  'Sign in': '登录',
  'First sign-in': '首次登录',
  'Set administrator password': '设置管理员密码',
  'Use at least 8 characters with letters and numbers. Existing sessions are replaced after the password changes.': '至少使用 8 个字符，并包含字母和数字。密码修改后现有会话会被替换。',
  'Current password': '当前密码',
  'New password': '新密码',
  'Confirm new password': '确认新密码',
  'Update password': '更新密码',
  'Overview': '总览',
  'Networks': '网络',
  'Client delivery': '客户端分发',
  'Guide': '教程',
  'Settings': '设置',
  'Collapse sidebar': '折叠侧边栏',
  'Expand sidebar': '展开侧边栏',
  'Control plane': '控制平面',
  'Signed in as': '当前用户',
  'Session active': '会话有效',
  'Active': '有效',
  'Password change required': '需要修改密码',
  'Signed out': '已退出',
  'Operations': '运维',
  'Controller': '控制器',
  'Client rollout': '客户端上线',
  'Documentation': '文档',
  'Security': '安全',
  'Refresh': '刷新',
  'Sign out': '退出',
  'Monitor controller health, planet delivery, and network readiness.': '监控控制器健康、planet 分发和网络就绪状态。',
  'Review operational status, resolve pending members, and open the next workflow from this dashboard.': '查看运行状态、处理待授权成员，并从仪表盘进入下一步工作流。',
  'Open delivery': '打开分发',
  'Open networks': '打开网络',
  'Planet file': 'Planet 文件',
  'Controller API': '控制器 API',
  'Members': '成员',
  'Deployment path': '部署链路',
  'Controller endpoint': '控制器端点',
  'Waiting for status': '等待状态',
  'Checking artifact': '检查文件',
  'Checking API': '检查 API',
  'Checking targets': '检查目标',
  'ZeroTier address': 'ZeroTier 地址',
  'Quick actions': '快捷操作',
  'Next operator steps': '下一步操作',
  'Create or tune networks': '创建或调整网络',
  'Routes, DNS, pools, and members': '路由、DNS、地址池和成员',
  'Generate installers': '生成安装器',
  'wget, Linux, and macOS rollout': 'wget、Linux 和 macOS 上线',
  'Open client guide': '打开客户端教程',
  'Operator workflow and onboarding': '管理员流程和接入说明',
  'Network activity': '网络活动',
  'Managed estate': '托管资产',
  'Live data': '实时数据',
  'Authorized members': '已授权成员',
  'Pending members': '待授权成员',
  'Routes': '路由',
  'Assignment pools': '地址池',
  'Access': '访问',
  'Console security': '控制台安全',
  'Reset password': '重置密码',
  'Use Settings to rotate the console password after deployment changes or operator handoff.': '部署变更或管理员交接后，可在设置中轮换控制台密码。',
  'Server readiness': '服务就绪状态',
  'Checking': '检查中',
  'Public console URL': '控制台公网 URL',
  'ZeroTier port': 'ZeroTier 端口',
  'Console port': '控制台端口',
  'Default link lifetime': '默认链接有效期',
  'Generated files': '已生成文件',
  'Recent networks': '最近网络',
  'Controller inventory': '控制器资源',
  'Manage': '管理',
  'Rollout readiness': '上线就绪状态',
  'Network target': '网络目标',
  'Network operations': '网络运维',
  'New network name': '新网络名称',
  'Create': '创建',
  'Search': '搜索',
  'Name or network ID': '名称或网络 ID',
  'No network selected': '未选择网络',
  'Select a network or create one to manage members, routes, DNS, and address allocation.': '选择或创建网络以管理成员、路由、DNS 和地址分配。',
  'Selected network': '当前网络',
  'Network summary': '网络摘要',
  'Pools': '地址池',
  'DNS': 'DNS',
  'Raw detail': '原始详情',
  'Authorize devices, set bridge mode, add labels, and manage assigned addresses.': '授权设备、设置桥接模式、添加标签并管理分配地址。',
  'Name': '名称',
  'Member ID': '成员 ID',
  'State': '状态',
  'Authorized': '已授权',
  'Bridge': '桥接',
  'IP assignments': 'IP 分配',
  'Delete member': '删除成员',
  'Network basics': '网络基础设置',
  'Private network': '私有网络',
  'Require explicit member authorization.': '需要显式授权成员。',
  'Save basics': '保存基础设置',
  'Easy setup': '快捷设置',
  'Set the managed route and IPv4 assignment range in one action.': '一次性设置托管路由和 IPv4 分配范围。',
  'Managed route CIDR': '托管路由 CIDR',
  'Pool start': '地址池起始',
  'Pool end': '地址池结束',
  'Pool start and end are calculated automatically from the CIDR when left unchanged.': '未修改时会根据 CIDR 自动计算地址池起止范围。',
  'Apply easy setup': '应用快捷设置',
  'Address assignment': '地址分配',
  'IPv4 auto assign': 'IPv4 自动分配',
  'Use configured IPv4 pools.': '使用已配置的 IPv4 地址池。',
  'IPv6 6plane': 'IPv6 6plane',
  'Enable 6plane addressing.': '启用 6plane 地址。',
  'IPv6 RFC4193': 'IPv6 RFC4193',
  'Enable unique local IPv6 addressing.': '启用唯一本地 IPv6 地址。',
  'IPv6 auto assign': 'IPv6 自动分配',
  'Use managed IPv6 modes.': '使用托管 IPv6 模式。',
  'Save assignment modes': '保存分配模式',
  'Danger zone': '危险操作',
  'Delete this network only when every client has been migrated or decommissioned.': '仅在所有客户端已迁移或下线后删除此网络。',
  'Delete selected network': '删除当前网络',
  'Add route': '添加路由',
  'Use this for additional routes. Manage the primary IPv4 route from Easy setup.': '用于添加额外路由。主 IPv4 路由请在快捷设置中管理。',
  'Target CIDR': '目标 CIDR',
  'Gateway': '网关',
  'Leave empty for this ZeroTier network': '此 ZeroTier 网络留空',
  'Add assignment pool': '添加地址池',
  'Use this for additional IPv4 ranges. Manage the primary pool from Easy setup.': '用于添加额外 IPv4 范围。主地址池请在快捷设置中管理。',
  'Range start': '范围起始',
  'Range end': '范围结束',
  'Add pool': '添加地址池',
  'DNS configuration': 'DNS 配置',
  'Search domain': '搜索域',
  'DNS servers': 'DNS 服务器',
  'One IP address per line': '每行一个 IP 地址',
  'Save DNS': '保存 DNS',
  'Controller JSON': '控制器 JSON',
  'Planet files and installers': 'Planet 文件和安装器',
  'Generate temporary download links, platform installers, and join commands for client rollout.': '为客户端上线生成临时下载链接、平台安装器和入网命令。',
  'Selected network': '当前网络',
  'Used by generated installer scripts': '用于生成安装脚本',
  'Temporary link TTL': '临时链接 TTL',
  'Signed links expire automatically': '签名链接会自动过期',
  'Link policy': '链接策略',
  'Lifetime': '有效期',
  '10 minutes': '10 分钟',
  '30 minutes': '30 分钟',
  '1 hour': '1 小时',
  'Network ID for installers': '安装器使用的网络 ID',
  'Include Network ID': '包含网络 ID',
  'Generate non-interactive join commands.': '生成免交互入网命令。',
  'Planet file readiness is checked after sign-in.': '登录后检查 Planet 文件就绪状态。',
  'wget download': 'wget 下载',
  'For clients that already have ZeroTier installed.': '适用于已安装 ZeroTier 的客户端。',
  'Generate a link first.': '请先生成链接。',
  'Generate': '生成',
  'Copy': '复制',
  'Linux': 'Linux',
  'Install and join': '安装并入网',
  'Installs ZeroTier, replaces planet, restarts the service, then joins a network.': '安装 ZeroTier、替换 planet、重启服务，然后加入网络。',
  'Generate an installer first.': '请先生成安装器。',
  'macOS': 'macOS',
  'Uses Homebrew or the official package, replaces planet, then joins a network.': '使用 Homebrew 或官方安装包，替换 planet 后加入网络。',
  'Operator quick start': '管理员快速开始',
  'Follow the deployment-to-client workflow and jump directly to the page that performs each action.': '按部署到客户端的流程操作，并可直接跳转到对应页面。',
  'Create network': '创建网络',
  'Download planet': '下载 planet',
  'Install clients': '安装客户端',
  'Authorize members': '授权成员',
  'Troubleshooting': '故障排查',
  'Open Networks, create a private network, then apply Easy setup for the managed IPv4 route.': '打开网络页面，创建私有网络，然后用快捷设置配置托管 IPv4 路由。',
  'Generate delivery links': '生成分发链接',
  'Open Client delivery to create temporary wget, Linux, or macOS commands.': '打开客户端分发，创建临时 wget、Linux 或 macOS 命令。',
  'Run the generated script. It installs ZeroTier, replaces the planet file, restarts the service, then joins a network.': '运行生成的脚本。它会安装 ZeroTier、替换 planet 文件、重启服务并加入网络。',
  'New clients appear in Members. Authorize trusted devices and add clear labels for operations.': '新客户端会出现在成员列表中。授权可信设备并添加清晰标签。',
  'Review members': '查看成员',
  'Troubleshoot rollout': '排查上线问题',
  'Check that the planet file exists, signed links are reachable, and the controller API is responding.': '检查 planet 文件是否存在、签名链接是否可访问、控制器 API 是否响应。',
  'Check health': '检查健康状态',
  'Account and session': '账号与会话',
  'Instance': '实例',
  'Console URL': '控制台 URL',
  'Session': '会话',
  'Use this after sign-in to replace the console password and invalidate existing sessions.': '登录后可使用此功能替换控制台密码并使现有会话失效。',
  'Ready': '就绪',
  'Needs planet': '需要 planet',
  'artifact': '文件',
  'No downloadable files are available yet.': '暂无可下载文件。',
  'Controller is unavailable. Installers can still replace the planet file, but automatic network selection is unavailable.': '控制器不可用。安装器仍可替换 planet 文件，但无法自动选择网络。',
  'Controller is unavailable and the planet file is not ready.': '控制器不可用，且 planet 文件尚未就绪。',
  'Missing': '缺失',
  'Online': '在线',
  'Relay': '中继',
  'Error': '错误',
  'Offline': '离线',
  'Member name': '成员名称',
  'Available': '可用',
  'Unavailable': '不可用',
  'Private': '私有',
  'Public': '公开',
  'On': '开启',
  'Off': '关闭',
  'None': '无',
  'Controller unavailable': '控制器不可用',
  'Waiting for embedded controller': '等待内置控制器',
  'this IP assignment': '此 IP 分配',
  'No networks': '无网络',
  'No networks yet': '暂无网络',
  'No networks match your search.': '没有匹配的网络。',
  'No networks yet. Create one to start managing members and routes.': '暂无网络。创建一个网络以开始管理成员和路由。',
  'Create a network to start managing members and client rollout.': '创建网络以开始管理成员和客户端上线。',
  'No members have joined this network yet.': '此网络还没有成员加入。',
  'No routes configured.': '未配置路由。',
  'No assignment pools configured.': '未配置地址池。',
  'Ready for signed downloads': '签名下载已就绪',
  'Planet file is missing': 'Planet 文件缺失',
  'Ready for temporary download links': '临时下载链接已就绪',
  'Generate the planet file before client rollout': '客户端上线前请先生成 planet 文件',
  'Embedded API is responding': '内置 API 正在响应',
  'Waiting for controller response': '等待控制器响应',
  'Create a network before generating join commands': '生成入网命令前请先创建网络',
  'artifact ready': '文件就绪',
  'artifact missing': '文件缺失',
  'API responding': 'API 响应中',
  'API unavailable': 'API 不可用',
  'no networks yet': '暂无网络',
  'Temporary wget and installer links can be generated': '可以生成临时 wget 和安装器链接',
  'Generate the planet file during container startup before distributing client commands.': '分发客户端命令前，请在容器启动时生成 planet 文件。',
  'Planet is ready. Create a network to prefill installer commands, or generate installers that prompt for a Network ID.': 'Planet 已就绪。创建网络可预填安装命令，也可以生成需要用户输入网络 ID 的安装器。',
  'Planet is ready. Select a network and choose whether installers should join it automatically.': 'Planet 已就绪。请选择网络，并决定安装器是否自动加入。',
  'Planet file is not ready yet.': 'Planet 文件尚未就绪。',
  'Planet file is required before generating installers.': '生成安装器前需要 Planet 文件。',
  'Friendly name': '友好名称',
  'Active bridge': '启用桥接',
  'Delete IP assignment': '删除 IP 分配',
  'Delete': '删除',
  'Remove': '移除',
  'managed local route': '托管本地路由',
  'local ZeroTier route': '本地 ZeroTier 路由',
  'managed assignment range': '托管分配范围',
  'Signing in...': '正在登录...',
  'Updating...': '正在更新...',
  'Resetting...': '正在重置...',
  'Refreshing...': '正在刷新...',
  'Creating...': '正在创建...',
  'Saving...': '正在保存...',
  'Applying...': '正在应用...',
  'Adding...': '正在添加...',
  'Deleting...': '正在删除...',
  'Removing...': '正在移除...',
  'Generating...': '正在生成...',
  'Refreshed.': '已刷新。',
  'Network refreshed.': '网络已刷新。',
  'Set a new password before continuing.': '继续前请设置新密码。',
  'Password updated.': '密码已更新。',
  'Password reset.': '密码已重置。',
  'Passwords do not match.': '两次输入的密码不一致。',
  'Password must be at least 8 characters and include letters and numbers.': '密码至少 8 个字符，并包含字母和数字。',
  'Network loaded.': '网络已加载。',
  'Network created.': '网络已创建。',
  'Network basics saved.': '网络基础设置已保存。',
  'Assignment modes saved.': '地址分配模式已保存。',
  'DNS saved.': 'DNS 已保存。',
  'Easy setup applied.': '快捷设置已应用。',
  'Route added.': '路由已添加。',
  'Assignment pool added.': '地址池已添加。',
  'Network deleted.': '网络已删除。',
  'Member updated.': '成员已更新。',
  'Member deleted.': '成员已删除。',
  'IP assignment removed.': 'IP 分配已移除。',
  'IP assignment added.': 'IP 分配已添加。',
  'Route removed.': '路由已移除。',
  'Assignment pool removed.': '地址池已移除。',
  'Temporary planet command generated.': '临时 planet 命令已生成。',
  'Linux installer command generated.': 'Linux 安装命令已生成。',
  'macOS installer command generated.': 'macOS 安装命令已生成。',
  'Generate a command first.': '请先生成命令。',
  'Copied.': '已复制。',
  'Enter a network name.': '请输入网络名称。',
  'Select a network first.': '请先选择网络。',
  'Enter a valid IPv4 CIDR, for example 10.147.17.0/24.': '请输入有效的 IPv4 CIDR，例如 10.147.17.0/24。',
  'Enter a valid target CIDR.': '请输入有效的目标 CIDR。',
  'Enter a valid IPv4 range start and end.': '请输入有效的 IPv4 起止范围。',
  'Range start must be lower than or equal to range end.': '范围起始必须小于或等于范围结束。',
  'Enter an IP address.': '请输入 IP 地址。',
  'Enter a valid IPv4 or IPv6 address.': '请输入有效的 IPv4 或 IPv6 地址。',
  'IP assignment already exists.': 'IP 分配已存在。',
  'Pool start and end must be valid IPv4 addresses.': '地址池起止必须是有效 IPv4 地址。',
  'Pool start must be lower than or equal to pool end.': '地址池起始必须小于或等于结束。',
  'Pool range must stay inside the managed route CIDR.': '地址池范围必须位于托管路由 CIDR 内。',
  'Enter a valid IPv4 CIDR to calculate the default pool.': '请输入有效 IPv4 CIDR 以计算默认地址池。',
  'Reset the console password and invalidate existing sessions?': '要重置控制台密码并使现有会话失效吗？',
};

function getInitialLanguage() {
  const saved = localStorage.getItem('ztp_lang');
  if (supportedLanguages.includes(saved)) {
    return saved;
  }
  return navigator.language.toLowerCase().startsWith('zh') ? 'zh-CN' : 'en';
}

function interpolate(template, vars = {}) {
  return String(template).replace(/\{(\w+)\}/g, (_, key) => vars[key] ?? '');
}

function translateText(text, vars = {}) {
  const value = interpolate(text, vars);
  if (state.lang === 'en') {
    return value;
  }
  const exact = zhCNText[value];
  if (exact) {
    return interpolate(exact, vars);
  }
  const dynamicRules = [
    [/^(\d+) members$/, '$1 个成员'],
    [/^(\d+) routes$/, '$1 条路由'],
    [/^(\d+) managed networks$/, '$1 个托管网络'],
    [/^(\d+) managed network$/, '$1 个托管网络'],
    [/^(\d+) managed targets$/, '$1 个托管目标'],
    [/^(\d+) managed target$/, '$1 个托管目标'],
    [/^(\d+) network targets available$/, '$1 个网络目标可用'],
    [/^(\d+) network target available$/, '$1 个网络目标可用'],
    [/^Online (.+)$/, '在线 $1'],
    [/^via (.+)$/, '经由 $1'],
    [/^Custom pool will use (.+) - (.+)\.$/, '将使用自定义地址池 $1 - $2。'],
    [/^Default pool will use (.+) - (.+)\.$/, '将使用默认地址池 $1 - $2。'],
    [/^Delete network (.+)\?$/, '要删除网络 $1 吗？'],
    [/^Delete member (.+)\?$/, '要删除成员 $1 吗？'],
    [/^Remove IP assignment (.+)\?$/, '要移除 IP 分配 $1 吗？'],
    [/^Remove route (.+)\?$/, '要移除路由 $1 吗？'],
    [/^Remove assignment pool (.+) - (.+)\?$/, '要移除地址池 $1 - $2 吗？'],
  ];
  for (const [pattern, replacement] of dynamicRules) {
    if (pattern.test(value)) {
      return value.replace(pattern, replacement);
    }
  }
  return value;
}

const t = translateText;

function shouldSkipI18nNode(node) {
  const element = node.nodeType === Node.TEXT_NODE ? node.parentElement : node;
  return !element || Boolean(element.closest('script, style, code, pre, textarea, .mono, [data-no-i18n]'));
}

function applyI18n(root = document) {
  document.documentElement.lang = state.lang === 'zh-CN' ? 'zh-CN' : 'en';
  document.title = t('ZeroTier Planet Console');
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      if (shouldSkipI18nNode(node)) {
        return NodeFilter.FILTER_REJECT;
      }
      return node.nodeValue.trim() ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_SKIP;
    },
  });
  const nodes = [];
  while (walker.nextNode()) {
    nodes.push(walker.currentNode);
  }
  nodes.forEach((node) => {
    const leading = node.nodeValue.match(/^\s*/)?.[0] || '';
    const trailing = node.nodeValue.match(/\s*$/)?.[0] || '';
    const source = node.__i18nSource || node.nodeValue.trim();
    node.__i18nSource = source;
    node.nodeValue = `${leading}${t(source)}${trailing}`;
  });

  root.querySelectorAll?.('[placeholder], [title], [aria-label]').forEach((element) => {
    if (shouldSkipI18nNode(element)) {
      return;
    }
    ['placeholder', 'title', 'aria-label'].forEach((attr) => {
      const value = element.getAttribute(attr);
      if (value) {
        const sourceAttr = `data-i18n-source-${attr}`;
        const source = element.getAttribute(sourceAttr) || value;
        element.setAttribute(sourceAttr, source);
        element.setAttribute(attr, t(source));
      }
    });
  });

  document.querySelectorAll('[data-lang]').forEach((button) => {
    const active = button.dataset.lang === state.lang;
    button.classList.toggle('active', active);
    button.setAttribute('aria-pressed', active ? 'true' : 'false');
  });
}

function rerenderLocalizedState() {
  setPage(state.activePage, { push: false });
  if (state.overview) {
    renderOverview();
  }
  if (state.controller) {
    renderController();
  } else if (state.activePage !== 'overview') {
    renderOverviewInsights();
  }
  if (state.selectedBundle) {
    renderSelectedNetwork();
  }
  updateEasyPoolPreview();
  updateDeliveryControls({ preserveCommands: true });
  applyI18n();
}

function setLanguage(lang) {
  if (!supportedLanguages.includes(lang) || state.lang === lang) {
    return;
  }
  state.lang = lang;
  localStorage.setItem('ztp_lang', lang);
  rerenderLocalizedState();
}

function cleanPageName(value) {
  return String(value || 'overview').replace(/^#/, '').split('?')[0].split('&')[0] || 'overview';
}

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
  elements.sessionState.textContent = t(payload.mustChangePassword ? 'Password change required' : 'Session active');
  if (elements.settingsSessionState) {
    elements.settingsSessionState.textContent = t(payload.mustChangePassword ? 'Password change required' : 'Active');
  }
}

function clearSession() {
  state.token = '';
  sessionStorage.removeItem('ztp_session_token');
  if (elements.settingsSessionState) {
    elements.settingsSessionState.textContent = t('Signed out');
  }
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
    return t('Pool start and end must be valid IPv4 addresses.');
  }
  if (start > end) {
    return t('Pool start must be lower than or equal to pool end.');
  }
  if (start <= parsed.network || end >= parsed.broadcast) {
    return t('Pool range must stay inside the managed route CIDR.');
  }
  return '';
}

async function withPending(form, pendingText, operation) {
  const submitButton = form?.querySelector('button[type="submit"]');
  return withButtonPending(submitButton, pendingText, operation);
}

async function withButtonPending(button, pendingText, operation) {
  const originalText = button?.textContent || '';
  const wasDisabled = Boolean(button?.disabled);
  const originalBusy = button?.getAttribute('aria-busy');
  if (button) {
    button.disabled = true;
    button.textContent = pendingText;
    button.setAttribute('aria-busy', 'true');
  }
  try {
    return await operation();
  } finally {
    if (button) {
      button.textContent = originalText;
      button.disabled = wasDisabled;
      if (originalBusy === null) {
        button.removeAttribute('aria-busy');
      } else {
        button.setAttribute('aria-busy', originalBusy);
      }
    }
  }
}

function setButtonDisabled(button, disabled) {
  if (button) {
    button.disabled = Boolean(disabled);
  }
}

async function refreshAllWithFeedback() {
  await withButtonPending(elements.refreshAllButton, t('Refreshing...'), refreshAll);
  toast(t('Refreshed.'));
}

async function refreshSelectedNetworkWithFeedback() {
  if (!state.selectedNetworkId) {
    toast(t('Select a network first.'));
    return;
  }
  await withButtonPending(elements.refreshNetworkButton, t('Refreshing...'), () => loadNetwork(state.selectedNetworkId, { silent: true }));
  toast(t('Network refreshed.'));
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
  if (elements.authInstanceUrl) {
    elements.authInstanceUrl.textContent = state.status?.publicUrl || window.location.origin;
  }
  return state.status;
}

async function login(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const username = elements.loginUsername.value.trim();
  const password = elements.loginPassword.value;
  const payload = await withPending(form, t('Signing in...'), () => requestJson('/api/auth/login', {
    method: 'POST',
    auth: false,
    body: { username, password },
  }));
  saveSession(payload);
  elements.loginPassword.value = '';
  if (payload.mustChangePassword) {
    elements.firstCurrentPassword.value = password;
    showFirstPassword();
    toast(t('Set a new password before continuing.'));
    return;
  }
  await enterApp();
}

function validatePasswordPair(password, confirmPassword) {
  if (password !== confirmPassword) {
    throw new Error(t('Passwords do not match.'));
  }
  if (password.length < 8 || !/[A-Za-z]/.test(password) || !/[0-9]/.test(password)) {
    throw new Error(t('Password must be at least 8 characters and include letters and numbers.'));
  }
}

async function submitFirstPassword(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const currentPassword = elements.firstCurrentPassword.value;
  const newPassword = elements.firstNewPassword.value;
  validatePasswordPair(newPassword, elements.firstConfirmPassword.value);
  const payload = await withPending(form, t('Updating...'), () => requestJson('/api/auth/password', {
    method: 'POST',
    body: { currentPassword, newPassword },
  }));
  saveSession(payload);
  clearPasswordFields();
  toast(t('Password updated.'));
  await enterApp();
}

async function submitResetPassword(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const newPassword = $('resetNewPassword').value;
  validatePasswordPair(newPassword, $('resetConfirmPassword').value);
  if (!window.confirm(t('Reset the console password and invalidate existing sessions?'))) {
    return;
  }
  const payload = await withPending(form, t('Resetting...'), () => requestJson('/api/auth/reset', {
    method: 'POST',
    body: { newPassword },
  }));
  saveSession(payload);
  form.reset();
  clearPasswordFields();
  toast(t('Password reset.'));
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
  setPage(cleanPageName(location.hash || 'overview'), { push: false });
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
  const hasPlanet = Boolean(overview.hasPlanet);
  elements.planetState.textContent = t(overview.hasPlanet ? 'Ready' : 'Missing');
  elements.planetState.className = overview.hasPlanet ? 'ok' : 'danger-text';
  elements.publicUrl.textContent = overview.publicUrl || '--';
  elements.ztPort.textContent = overview.zeroTierPort || '--';
  elements.filePort.textContent = overview.fileServerPort || '--';
  elements.ttlState.textContent = `${Math.round((overview.linkTtlSeconds || 600) / 60)} min`;
  if (elements.deliveryTtlState) {
    elements.deliveryTtlState.textContent = `${Math.round((overview.linkTtlSeconds || 600) / 60)} min`;
  }
  elements.readinessPill.textContent = t(overview.hasPlanet ? 'Ready' : 'Needs planet');
  elements.readinessPill.className = overview.hasPlanet ? 'pill good' : 'pill warn';
  elements.fileCount.textContent = String(files.length);
  elements.fileList.innerHTML = files.length ? files.map((file) => `
    <div class="file-row">
      <span><strong>${escapeHtml(file.name)}</strong><small>${escapeHtml(file.type)} ${escapeHtml(t('artifact'))}</small></span>
      <span>${formatBytes(file.size)}</span>
    </div>
  `).join('') : `<div class="empty-inline">${escapeHtml(t('No downloadable files are available yet.'))}</div>`;
  if (elements.authInstanceUrl) {
    elements.authInstanceUrl.textContent = overview.publicUrl || window.location.origin;
  }
  if (elements.settingsPublicUrl) {
    elements.settingsPublicUrl.textContent = overview.publicUrl || '--';
  }
  if (elements.settingsPlanetState) {
    elements.settingsPlanetState.textContent = t(overview.hasPlanet ? 'Ready' : 'Missing');
    elements.settingsPlanetState.className = overview.hasPlanet ? 'ok' : 'danger-text';
  }
  if (elements.deliveryPlanetState) {
    elements.deliveryPlanetState.textContent = t(overview.hasPlanet ? 'Ready' : 'Missing');
    elements.deliveryPlanetState.className = overview.hasPlanet ? 'ok' : 'danger-text';
  }
  if (elements.deliveryPlanetNote) {
    elements.deliveryPlanetNote.textContent = t(overview.hasPlanet
      ? 'Temporary wget and installer links can be generated'
      : 'Generate the planet file before client rollout');
  }
  renderOverviewInsights();
  setButtonDisabled(elements.planetLinkButton, !hasPlanet);
  setButtonDisabled(elements.linuxLinkButton, !hasPlanet);
  setButtonDisabled(elements.macosLinkButton, !hasPlanet);
  updateDeliveryControls();
}

function renderController() {
  const controllerStatus = state.controller?.status || {};
  elements.controllerStatus.textContent = t(controllerStatus.online ? 'Online' : 'Available');
  elements.controllerStatus.className = controllerStatus.online ? 'ok' : '';
  elements.networkCount.textContent = String(state.networks.length);
  elements.ztAddress.textContent = controllerStatus.address || '--';
  elements.networkListCount.textContent = String(filteredNetworks().length);
  if (elements.settingsControllerState) {
    elements.settingsControllerState.textContent = t(controllerStatus.online ? 'Online' : 'Available');
    elements.settingsControllerState.className = controllerStatus.online ? 'ok' : '';
  }
  renderOverviewInsights();
  renderNetworkList();
  renderDeliveryNetworks();
}

function renderControllerError(message) {
  elements.controllerStatus.textContent = t('Unavailable');
  elements.controllerStatus.className = 'danger-text';
  elements.networkCount.textContent = '0';
  if (elements.overviewMemberCount) {
    elements.overviewMemberCount.textContent = '0';
  }
  elements.ztAddress.textContent = '--';
  elements.networkListCount.textContent = '0';
  if (elements.settingsControllerState) {
    elements.settingsControllerState.textContent = t('Unavailable');
    elements.settingsControllerState.className = 'danger-text';
  }
  renderOverviewInsights({ controllerError: message });
  elements.networkList.innerHTML = `<div class="empty-inline danger-text">${escapeHtml(message)}</div>`;
  elements.deliveryNetwork.innerHTML = `<option value="">${escapeHtml(t('Controller unavailable'))}</option>`;
  elements.deliveryNetwork.disabled = true;
  elements.includeNetworkId.checked = false;
  elements.includeNetworkId.disabled = true;
  resetDeliveryCommands();
  updateDeliveryControls();
  elements.deliveryReadinessNote.textContent = state.overview?.hasPlanet
    ? t('Controller is unavailable. Installers can still replace the planet file, but automatic network selection is unavailable.')
    : t('Controller is unavailable and the planet file is not ready.');
  elements.networkEmpty.hidden = false;
  elements.networkDetail.hidden = true;
  elements.networkEmptyTitle.textContent = t('Controller unavailable');
  elements.networkEmptyMessage.textContent = message;
}

function summarizeNetworkEstate() {
  return state.networks.reduce((summary, network) => {
    const authorized = Number(network.authorizedMemberCount ?? 0);
    const members = Number(network.memberCount ?? authorized);
    return {
      authorizedMembers: summary.authorizedMembers + authorized,
      pendingMembers: summary.pendingMembers + Math.max(members - authorized, 0),
      routes: summary.routes + (Array.isArray(network.routes) ? network.routes.length : 0),
      pools: summary.pools + (Array.isArray(network.ipAssignmentPools) ? network.ipAssignmentPools.length : 0),
    };
  }, {
    authorizedMembers: 0,
    pendingMembers: 0,
    routes: 0,
    pools: 0,
  });
}

function setStepState(dot, text, stateName, message) {
  if (dot) {
    dot.className = `step-dot ${stateName}`;
  }
  if (text) {
    text.textContent = message;
  }
}

function setFlowState(step, node, text, stateName, message) {
  if (step) {
    step.className = `flow-step ${stateName}`;
  }
  if (node) {
    node.className = `flow-node ${stateName}`;
  }
  if (text) {
    text.textContent = message;
  }
}

function renderOverviewInsights(options = {}) {
  const overview = state.overview || {};
  const controllerStatus = state.controller?.status || {};
  const summary = summarizeNetworkEstate();
  const hasPlanet = Boolean(overview.hasPlanet);
  const controllerAvailable = Boolean(state.controller && !options.controllerError);
  const networkCount = state.networks.length;

  if (elements.overviewEndpoint) {
    elements.overviewEndpoint.textContent = controllerStatus.address
      ? `ZT ${controllerStatus.address}`
      : (options.controllerError || t('Waiting for embedded controller'));
  }
  if (elements.overviewPlanetDetail) {
    elements.overviewPlanetDetail.textContent = t(hasPlanet ? 'Ready for signed downloads' : 'Planet file is missing');
  }
  if (elements.overviewNetworksDetail) {
    elements.overviewNetworksDetail.textContent = t(`${networkCount} managed ${networkCount === 1 ? 'network' : 'networks'}`);
  }
  if (elements.authorizedMemberCount) {
    elements.authorizedMemberCount.textContent = String(summary.authorizedMembers);
  }
  if (elements.pendingMemberCount) {
    elements.pendingMemberCount.textContent = String(summary.pendingMembers);
  }
  if (elements.routeCount) {
    elements.routeCount.textContent = String(summary.routes);
  }
  if (elements.poolCount) {
    elements.poolCount.textContent = String(summary.pools);
  }
  if (elements.overviewMemberCount) {
    elements.overviewMemberCount.textContent = String(summary.authorizedMembers + summary.pendingMembers);
  }
  if (elements.activityHealthPill) {
    elements.activityHealthPill.textContent = t(controllerAvailable ? 'Live data' : 'Controller unavailable');
    elements.activityHealthPill.className = controllerAvailable ? 'pill good' : 'pill warn';
  }
  if (elements.recentNetworkList) {
    elements.recentNetworkList.innerHTML = state.networks.length ? state.networks.slice(0, 5).map((network) => {
      const members = network.memberCount ?? network.authorizedMemberCount ?? 0;
      const routes = Array.isArray(network.routes) ? network.routes.length : 0;
      return `
        <button class="recent-network-item" data-network-id="${escapeAttr(network.nwid)}" type="button">
          <span>
            <strong>${escapeHtml(network.name || 'Unnamed network')}</strong>
            <small class="mono">${escapeHtml(network.nwid)}</small>
          </span>
          <span class="recent-network-meta">
            <small>${escapeHtml(t(`${members} members`))}</small>
            <small>${escapeHtml(t(`${routes} routes`))}</small>
            <span class="pill ${network.private ? 'good' : 'warn'}">${escapeHtml(t(network.private ? 'Private' : 'Public'))}</span>
          </span>
        </button>
      `;
    }).join('') : `<div class="empty-inline">${escapeHtml(t('Create a network to start managing members and client rollout.'))}</div>`;
  }
  setStepState(
    elements.planetStepDot,
    elements.planetStepText,
    hasPlanet ? 'good' : 'warn',
    t(hasPlanet ? 'Ready for temporary download links' : 'Generate the planet file before client rollout'),
  );
  setStepState(
    elements.controllerStepDot,
    elements.controllerStepText,
    controllerAvailable ? 'good' : 'warn',
    controllerAvailable ? t('Embedded API is responding') : (options.controllerError || t('Waiting for controller response')),
  );
  setStepState(
    elements.networkStepDot,
    elements.networkStepText,
    networkCount ? 'good' : 'neutral',
    networkCount ? t(`${networkCount} network target${networkCount === 1 ? '' : 's'} available`) : t('Create a network before generating join commands'),
  );
  setFlowState(
    elements.flowPlanetStep,
    elements.flowPlanetNode,
    elements.flowPlanetText,
    hasPlanet ? 'good' : 'warn',
    t(hasPlanet ? 'artifact ready' : 'artifact missing'),
  );
  setFlowState(
    elements.flowControllerStep,
    elements.flowControllerNode,
    elements.flowControllerText,
    controllerAvailable ? 'good' : 'warn',
    t(controllerAvailable ? 'API responding' : 'API unavailable'),
  );
  setFlowState(
    elements.flowNetworkStep,
    elements.flowNetworkNode,
    elements.flowNetworkText,
    networkCount ? 'good' : 'neutral',
    networkCount ? t(`${networkCount} managed target${networkCount === 1 ? '' : 's'}`) : t('no networks yet'),
  );
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
    const message = state.networks.length ? t('No networks match your search.') : t('No networks yet. Create one to start managing members and routes.');
    elements.networkList.innerHTML = `<div class="empty-inline">${escapeHtml(message)}</div>`;
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
          <span class="pill ${network.private ? 'good' : 'warn'}">${escapeHtml(t(network.private ? 'Private' : 'Public'))}</span>
          <small>${escapeHtml(t(`${memberCount} members`))}</small>
        </span>
      </button>
    `;
  }).join('');
}

function renderDeliveryNetworks() {
  const previousValue = elements.deliveryNetwork.value;
  if (!state.networks.length) {
    elements.deliveryNetwork.innerHTML = `<option value="">${escapeHtml(t('No networks'))}</option>`;
    elements.deliveryNetwork.disabled = true;
    elements.includeNetworkId.checked = false;
    elements.includeNetworkId.disabled = true;
    if (previousValue) {
      resetInstallerCommands();
    }
    updateDeliveryControls();
    if (elements.deliverySelectedNetworkState) {
      elements.deliverySelectedNetworkState.textContent = t('No networks');
      elements.deliverySelectedNetworkState.className = 'warn-text';
    }
    return;
  }
  elements.deliveryNetwork.disabled = false;
  elements.includeNetworkId.disabled = false;
  elements.deliveryNetwork.innerHTML = state.networks.map((network) => (
    `<option value="${escapeAttr(network.nwid)}">${escapeHtml(network.name || network.nwid)} (${escapeHtml(network.nwid)})</option>`
  )).join('');
  if (state.selectedNetworkId && state.networks.some((network) => network.nwid === state.selectedNetworkId)) {
    elements.deliveryNetwork.value = state.selectedNetworkId;
  } else {
    elements.deliveryNetwork.value = state.networks[0].nwid;
  }
  if (previousValue && previousValue !== elements.deliveryNetwork.value) {
    resetInstallerCommands();
  }
  if (elements.deliverySelectedNetworkState) {
    const selected = state.networks.find((network) => network.nwid === elements.deliveryNetwork.value);
    elements.deliverySelectedNetworkState.textContent = selected?.name || elements.deliveryNetwork.value || '--';
    elements.deliverySelectedNetworkState.className = '';
  }
  updateDeliveryControls();
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
    toast(t('Network loaded.'));
  }
}

function renderSelectedNetwork() {
  const bundle = state.selectedBundle;
  if (!bundle || !bundle.network) {
    elements.networkEmpty.hidden = false;
    elements.networkDetail.hidden = true;
    elements.networkEmptyTitle.textContent = t(state.networks.length ? 'No network selected' : 'No networks yet');
    elements.networkEmptyMessage.textContent = state.networks.length
      ? t('Select a network to manage members, routes, DNS, and address allocation.')
      : t('Create a network to start managing members, routes, DNS, and address allocation.');
    return;
  }

  elements.networkEmpty.hidden = true;
  elements.networkDetail.hidden = false;
  const network = bundle.network;
  elements.selectedNetworkName.textContent = network.name || 'Unnamed network';
  elements.selectedNetworkId.textContent = network.nwid || state.selectedNetworkId;
  elements.selectedNetworkPrivacy.textContent = t(network.private ? 'Private' : 'Public');
  elements.selectedNetworkPrivacy.className = network.private ? 'pill good' : 'pill warn';
  elements.rawNetworkJson.textContent = JSON.stringify(network, null, 2);
  const members = bundle.members || [];
  const routes = Array.isArray(network.routes) ? network.routes : [];
  const pools = Array.isArray(network.ipAssignmentPools) ? network.ipAssignmentPools : [];
  if (elements.selectedMemberCount) {
    elements.selectedMemberCount.textContent = String(members.length);
  }
  if (elements.selectedRouteCount) {
    elements.selectedRouteCount.textContent = String(routes.length);
  }
  if (elements.selectedPoolCount) {
    elements.selectedPoolCount.textContent = String(pools.length);
  }
  if (elements.selectedDnsState) {
    elements.selectedDnsState.textContent = t(Array.isArray(network.dns?.servers) && network.dns.servers.length ? 'On' : 'Off');
  }
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
  updateEasyPoolPreview();
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
        <td class="members-empty-cell" colspan="7"><div class="empty-inline">${escapeHtml(t('No members have joined this network yet.'))}</div></td>
      </tr>
    `;
    return;
  }

  elements.membersTable.innerHTML = members.map((member) => {
    const id = member.id || member.address;
    const ips = Array.isArray(member.ipAssignments) ? member.ipAssignments : [];
    return `
      <tr data-member-id="${escapeHtml(id)}">
        <td data-label="${escapeAttr(t('Name'))}"><input class="table-input member-name-input" value="${escapeAttr(member.name || '')}" placeholder="${escapeAttr(t('Friendly name'))}" aria-label="${escapeAttr(t('Member name'))}"></td>
        <td data-label="${escapeAttr(t('Member ID'))}"><span class="mono member-id">${escapeHtml(id)}</span></td>
        <td data-label="${escapeAttr(t('State'))}">${renderPeerState(member)}</td>
        <td data-label="${escapeAttr(t('Authorized'))}"><input class="member-authorized-input" type="checkbox" ${member.authorized ? 'checked' : ''} aria-label="${escapeAttr(t('Authorized'))}"></td>
        <td data-label="${escapeAttr(t('Bridge'))}"><input class="member-bridge-input" type="checkbox" ${member.activeBridge ? 'checked' : ''} aria-label="${escapeAttr(t('Active bridge'))}"></td>
        <td class="ip-assignments-cell" data-label="${escapeAttr(t('IP assignments'))}">
          <div class="ip-stack">
            <div class="ip-chip-list">
              ${ips.map((ip, index) => `
                <span class="ip-chip" data-ip="${escapeAttr(ip)}"><span>${escapeHtml(ip)}</span><button data-action="delete-ip" data-index="${index}" data-ip="${escapeAttr(ip)}" type="button" aria-label="${escapeAttr(t('Delete IP assignment'))}">x</button></span>
              `).join('') || `<span class="muted">${escapeHtml(t('None'))}</span>`}
            </div>
            <form class="mini-form member-ip-form">
              <input type="text" placeholder="IP">
              <button class="icon-button" type="submit">+</button>
            </form>
          </div>
        </td>
        <td class="actions-cell" data-label="${escapeAttr(t('Delete'))}">
          <button class="delete-icon-button" data-action="delete-member" type="button" aria-label="${escapeAttr(t('Delete member'))} ${escapeAttr(id)}" title="${escapeAttr(t('Delete member'))}">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 4h6"></path><path d="M4 7h16"></path><path d="M10 11v6"></path><path d="M14 11v6"></path><path d="M6 7l1 14h10l1-14"></path></svg>
          </button>
        </td>
      </tr>
    `;
  }).join('');
}

function renderPeerState(member) {
  if (member.peerState === 'controller') {
    return `<span class="status-dot good">${escapeHtml(t('Controller'))}</span>`;
  }
  if (member.peerState === 'online') {
    const latency = member.peer?.latency !== undefined ? ` ${member.peer.latency}ms` : '';
    return `<span class="status-dot good">${escapeHtml(t('Online'))}${escapeHtml(latency)}</span>`;
  }
  if (member.peerState === 'relay') {
    return `<span class="status-dot warn">${escapeHtml(t('Relay'))}</span>`;
  }
  if (member.peerState === 'error') {
    return `<span class="status-dot danger">${escapeHtml(t('Error'))}</span>`;
  }
  return `<span class="status-dot muted-dot">${escapeHtml(t('Offline'))}</span>`;
}

function renderRoutes(routes, managedRoute) {
  elements.routesList.innerHTML = routes.length ? routes.map((route) => {
    const managed = managedRoute && route.target === managedRoute.target && !route.via && !managedRoute.via;
    return `
    <div class="config-row">
      <span><strong>${escapeHtml(route.target)}</strong><small>${route.via ? escapeHtml(t(`via ${route.via}`)) : escapeHtml(t(managed ? 'managed local route' : 'local ZeroTier route'))}</small></span>
      ${managed ? `<span class="pill good">${escapeHtml(t('Easy setup'))}</span>` : ''}
      <button class="button small" data-route-target="${escapeAttr(route.target)}" type="button">${escapeHtml(t('Remove'))}</button>
    </div>
  `;
  }).join('') : `<div class="empty-inline">${escapeHtml(t('No routes configured.'))}</div>`;
}

function renderPools(pools, managedPool) {
  elements.poolsList.innerHTML = pools.length ? pools.map((pool) => {
    const managed = managedPool
      && pool.ipRangeStart === managedPool.ipRangeStart
      && pool.ipRangeEnd === managedPool.ipRangeEnd;
    return `
    <div class="config-row">
      <span><strong>${escapeHtml(pool.ipRangeStart)} - ${escapeHtml(pool.ipRangeEnd)}</strong><small>${escapeHtml(t('managed assignment range'))}</small></span>
      ${managed ? `<span class="pill good">${escapeHtml(t('Easy setup'))}</span>` : ''}
      <button class="button small" data-pool-start="${escapeAttr(pool.ipRangeStart)}" data-pool-end="${escapeAttr(pool.ipRangeEnd)}" type="button">${escapeHtml(t('Remove'))}</button>
    </div>
  `;
  }).join('') : `<div class="empty-inline">${escapeHtml(t('No assignment pools configured.'))}</div>`;
}

async function createNetwork(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const input = $('newNetworkName');
  const name = input.value.trim();
  if (!name) {
    toast(t('Enter a network name.'));
    input.focus();
    return;
  }
  const payload = await withPending(form, t('Creating...'), () => requestJson('/api/controller/networks', {
    method: 'POST',
    body: { name },
  }));
  input.value = '';
  state.networkFilter = '';
  elements.networkSearch.value = '';
  await fetchController();
  if (payload.network?.nwid) {
    await loadNetwork(payload.network.nwid, { silent: true });
    setPage('networks');
    switchTab('settings');
  }
  toast(t('Network created.'));
}

async function patchSelectedNetwork(body, message, form, pendingText = 'Saving...') {
  if (!state.selectedNetworkId) {
    toast(t('Select a network first.'));
    return;
  }
  state.selectedBundle = await withPending(form, t(pendingText), () => requestJson(`/api/controller/networks/${encodeURIComponent(state.selectedNetworkId)}`, {
    method: 'PATCH',
    body,
  }));
  state.networks = state.networks.map((network) => (
    network.nwid === state.selectedNetworkId ? state.selectedBundle.network : network
  ));
  renderController();
  renderSelectedNetwork();
  toast(t(message));
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
    toast(t('Select a network first.'));
    return;
  }
  const cidr = elements.easyCidr.value.trim();
  const defaults = defaultPoolForCidr(cidr);
  if (!defaults) {
    toast(t('Enter a valid IPv4 CIDR, for example 10.147.17.0/24.'));
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
  state.selectedBundle = await withPending(form, t('Applying...'), () => requestJson(`/api/controller/networks/${encodeURIComponent(state.selectedNetworkId)}/easy`, {
    method: 'POST',
    body: {
      networkCIDR: defaults.cidr,
      poolStart,
      poolEnd,
    },
  }));
  await loadNetwork(state.selectedNetworkId, { silent: true });
  renderSelectedNetwork();
  toast(t('Easy setup applied.'));
}

async function submitRoute(event) {
  event.preventDefault();
  if (!state.selectedNetworkId) {
    toast(t('Select a network first.'));
    return;
  }
  const form = event.currentTarget;
  const target = $('routeTarget').value.trim();
  const route = parseIpv4RouteCidr(target);
  if (!route) {
    toast(t('Enter a valid target CIDR.'));
    $('routeTarget').focus();
    return;
  }
  state.selectedBundle = await withPending(form, t('Adding...'), () => requestJson(`/api/controller/networks/${encodeURIComponent(state.selectedNetworkId)}/routes`, {
    method: 'POST',
    body: {
      target: route.normalized,
      via: $('routeVia').value.trim() || null,
    },
  }));
  form.reset();
  await loadNetwork(state.selectedNetworkId, { silent: true });
  toast(t('Route added.'));
}

async function submitPool(event) {
  event.preventDefault();
  if (!state.selectedNetworkId) {
    toast(t('Select a network first.'));
    return;
  }
  const form = event.currentTarget;
  const ipRangeStart = $('poolStart').value.trim();
  const ipRangeEnd = $('poolEnd').value.trim();
  if (parseIpv4(ipRangeStart) === null || parseIpv4(ipRangeEnd) === null) {
    toast(t('Enter a valid IPv4 range start and end.'));
    $('poolStart').focus();
    return;
  }
  if (parseIpv4(ipRangeStart) > parseIpv4(ipRangeEnd)) {
    toast(t('Range start must be lower than or equal to range end.'));
    $('poolStart').focus();
    return;
  }
  state.selectedBundle = await withPending(form, t('Adding...'), () => requestJson(`/api/controller/networks/${encodeURIComponent(state.selectedNetworkId)}/ip-pools`, {
    method: 'POST',
    body: {
      ipRangeStart,
      ipRangeEnd,
    },
  }));
  form.reset();
  await loadNetwork(state.selectedNetworkId, { silent: true });
  toast(t('Assignment pool added.'));
}

async function deleteSelectedNetwork() {
  if (!state.selectedNetworkId) {
    return;
  }
  const networkName = state.selectedBundle?.network?.name || state.selectedNetworkId;
  if (!window.confirm(t(`Delete network ${networkName}?`))) {
    return;
  }
  await withButtonPending($('deleteNetworkButton'), t('Deleting...'), () => requestJson(`/api/controller/networks/${encodeURIComponent(state.selectedNetworkId)}`, { method: 'DELETE' }));
  state.selectedNetworkId = '';
  localStorage.removeItem('ztp_selected_network');
  await fetchController();
  toast(t('Network deleted.'));
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
  const payload = await requestJson(`/api/controller/networks/${encodeURIComponent(state.selectedNetworkId)}/members/${encodeURIComponent(memberId)}`, {
    method: 'PATCH',
    body,
  }).catch(async (error) => {
    await loadNetwork(state.selectedNetworkId, { silent: true }).catch(() => {});
    throw error;
  });
  if (payload.member && Array.isArray(state.selectedBundle?.members)) {
    state.selectedBundle.members = state.selectedBundle.members.map((member) => (
      (member.id || member.address) === memberId
        ? { ...member, ...payload.member, peer: member.peer, peerState: member.peerState }
        : member
    ));
    renderMembers(state.selectedBundle.members);
  }
  toast(t('Member updated.'));
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
    if (!window.confirm(t(`Delete member ${memberId}?`))) {
      return;
    }
    await withButtonPending(button, t('Deleting...'), () => requestJson(`/api/controller/networks/${encodeURIComponent(state.selectedNetworkId)}/members/${encodeURIComponent(memberId)}`, {
      method: 'DELETE',
    }));
    await loadNetwork(state.selectedNetworkId, { silent: true });
    toast(t('Member deleted.'));
  }
  if (action === 'delete-ip') {
    const ipAddress = button.dataset.ip || button.closest('.ip-chip')?.dataset.ip || 'this IP assignment';
    if (!window.confirm(t(`Remove IP assignment ${ipAddress}?`))) {
      return;
    }
    state.selectedBundle = await withButtonPending(button, '...', () => requestJson(`/api/controller/networks/${encodeURIComponent(state.selectedNetworkId)}/members/${encodeURIComponent(memberId)}/ip-assignments?index=${encodeURIComponent(button.dataset.index)}`, {
      method: 'DELETE',
    }));
    renderSelectedNetwork();
    toast(t('IP assignment removed.'));
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
  const submitButton = form.querySelector('button[type="submit"]');
  const ipAddress = input.value.trim();
  if (!ipAddress) {
    toast(t('Enter an IP address.'));
    input.focus();
    return;
  }
  if (!isLikelyIpAddress(ipAddress)) {
    toast(t('Enter a valid IPv4 or IPv6 address.'));
    input.focus();
    return;
  }
  const existing = Array.from(row.querySelectorAll('.ip-chip'))
    .map((chip) => chip.dataset.ip || chip.textContent?.trim())
    .filter(Boolean);
  if (existing.includes(ipAddress)) {
    toast(t('IP assignment already exists.'));
    input.focus();
    return;
  }
  state.selectedBundle = await withButtonPending(submitButton, submitButton?.textContent || '+', () => requestJson(`/api/controller/networks/${encodeURIComponent(state.selectedNetworkId)}/members/${encodeURIComponent(row.dataset.memberId)}/ip-assignments`, {
    method: 'POST',
    body: { ipAddress },
  }));
  renderSelectedNetwork();
  toast(t('IP assignment added.'));
}

async function removeRoute(target, button) {
  if (!window.confirm(t(`Remove route ${target}?`))) {
    return;
  }
  await withButtonPending(button, t('Removing...'), async () => {
    state.selectedBundle = await requestJson(`/api/controller/networks/${encodeURIComponent(state.selectedNetworkId)}/routes?target=${encodeURIComponent(target)}`, { method: 'DELETE' });
    await loadNetwork(state.selectedNetworkId, { silent: true });
  });
  toast(t('Route removed.'));
}

async function removePool(start, end, button) {
  if (!window.confirm(t(`Remove assignment pool ${start} - ${end}?`))) {
    return;
  }
  await withButtonPending(button, t('Removing...'), async () => {
    state.selectedBundle = await requestJson(`/api/controller/networks/${encodeURIComponent(state.selectedNetworkId)}/ip-pools?start=${encodeURIComponent(start)}&end=${encodeURIComponent(end)}`, { method: 'DELETE' });
    await loadNetwork(state.selectedNetworkId, { silent: true });
  });
  toast(t('Assignment pool removed.'));
}

async function createLink(type, file) {
  if (file === 'planet' && !state.overview?.hasPlanet) {
    throw new Error(t('Planet file is not ready yet.'));
  }
  if (type === 'install' && !state.overview?.hasPlanet) {
    throw new Error(t('Planet file is required before generating installers.'));
  }
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
  elements.wgetCommand.textContent = t('Generate a link first.');
  elements.linuxCommand.textContent = t('Generate an installer first.');
  elements.macosCommand.textContent = t('Generate an installer first.');
  updateDeliveryControls({ preserveCommands: true });
}

function resetInstallerCommands() {
  elements.linuxCommand.textContent = t('Generate an installer first.');
  elements.macosCommand.textContent = t('Generate an installer first.');
  updateDeliveryControls({ preserveCommands: true });
}

function updateDeliveryControls(options = {}) {
  const hasPlanet = Boolean(state.overview?.hasPlanet);
  const hasNetworks = state.networks.length > 0;
  setButtonDisabled(elements.planetLinkButton, !hasPlanet);
  setButtonDisabled(elements.linuxLinkButton, !hasPlanet);
  setButtonDisabled(elements.macosLinkButton, !hasPlanet);

  if (!hasNetworks) {
    elements.includeNetworkId.checked = false;
    elements.includeNetworkId.disabled = true;
  } else {
    elements.includeNetworkId.disabled = false;
  }

  if (!hasPlanet) {
    elements.wgetCommand.textContent = t('Planet file is not ready yet.');
    elements.linuxCommand.textContent = t('Planet file is required before generating installers.');
    elements.macosCommand.textContent = t('Planet file is required before generating installers.');
    elements.deliveryReadinessNote.textContent = t('Generate the planet file during container startup before distributing client commands.');
    return;
  }

  if (!hasNetworks) {
    elements.deliveryReadinessNote.textContent = t('Planet is ready. Create a network to prefill installer commands, or generate installers that prompt for a Network ID.');
    return;
  }

  elements.deliveryReadinessNote.textContent = t('Planet is ready. Select a network and choose whether installers should join it automatically.');
}

async function generatePlanetCommand() {
  const link = await withButtonPending(elements.planetLinkButton, t('Generating...'), () => createLink('download', 'planet'));
  elements.wgetCommand.textContent = `wget -O planet ${commandQuote(link)}`;
  toast(t('Temporary planet command generated.'));
}

async function generateLinuxCommand() {
  const link = await withButtonPending(elements.linuxLinkButton, t('Generating...'), () => createLink('install', 'linux.sh'));
  const networkId = selectedDeliveryNetworkId();
  const runner = networkId ? `sudo env NETWORK_ID=${networkId} bash` : 'sudo bash';
  elements.linuxCommand.textContent = `curl -fsSL ${commandQuote(link)} | ${runner}`;
  toast(t('Linux installer command generated.'));
}

async function generateMacosCommand() {
  const link = await withButtonPending(elements.macosLinkButton, t('Generating...'), () => createLink('install', 'macos.sh'));
  const networkId = selectedDeliveryNetworkId();
  const runner = networkId ? `NETWORK_ID=${networkId} bash` : 'bash';
  elements.macosCommand.textContent = `curl -fsSL ${commandQuote(link)} | ${runner}`;
  toast(t('macOS installer command generated.'));
}

async function copyFrom(targetId) {
  const target = $(targetId);
  const text = target.textContent.trim();
  if (!text || /Generate|生成|not ready|尚未就绪|required|需要/.test(text)) {
    toast(t('Generate a command first.'));
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
  toast(t('Copied.'));
}

function setPage(pageName, options = {}) {
  const requested = cleanPageName(pageName);
  const normalized = pageMeta[requested] ? requested : 'overview';
  const settingsVisibilityChanged = state.activePage === 'settings'
    ? normalized !== 'settings'
    : normalized === 'settings';
  if (settingsVisibilityChanged) {
    clearPasswordFields();
  }
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
  elements.pageKicker.textContent = t(pageMeta[normalized][0]);
  elements.pageTitle.textContent = t(pageMeta[normalized][1]);
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

function isLikelyIpAddress(value) {
  const normalized = String(value || '').trim();
  if (parseIpv4(normalized) !== null) {
    return true;
  }
  if (!normalized.includes(':')) {
    return false;
  }
  try {
    new URL(`http://[${normalized}]/`);
    return true;
  } catch (error) {
    return false;
  }
}

function updateEasyPoolPreview() {
  if (!elements.easyPoolPreview) {
    return;
  }
  const defaults = defaultPoolForCidr(elements.easyCidr.value.trim());
  if (!defaults) {
    elements.easyPoolPreview.textContent = t('Enter a valid IPv4 CIDR to calculate the default pool.');
    elements.easyPoolPreview.classList.add('warn-text');
    return;
  }
  elements.easyPoolPreview.classList.remove('warn-text');
  const poolStart = elements.easyPoolStart.value.trim() || defaults.poolStart;
  const poolEnd = elements.easyPoolEnd.value.trim() || defaults.poolEnd;
  const poolError = poolRangeError(defaults.cidr, poolStart, poolEnd);
  if (poolError) {
    elements.easyPoolPreview.textContent = poolError;
    elements.easyPoolPreview.classList.add('warn-text');
    return;
  }
  const custom = poolStart !== defaults.poolStart || poolEnd !== defaults.poolEnd;
  elements.easyPoolPreview.textContent = custom
    ? `Custom pool will use ${poolStart} - ${poolEnd}.`
    : `Default pool will use ${defaults.poolStart} - ${defaults.poolEnd}.`;
}

function setSidebarCollapsed(collapsed) {
  const shouldCollapse = Boolean(collapsed);
  document.body.classList.toggle('sidebar-collapsed', shouldCollapse);
  localStorage.setItem('ztp_sidebar_collapsed', shouldCollapse ? '1' : '0');
  const brandLink = document.querySelector('.sidebar .brand');
  if (elements.sidebarToggle) {
    elements.sidebarToggle.setAttribute('aria-expanded', shouldCollapse ? 'false' : 'true');
    elements.sidebarToggle.setAttribute('aria-label', t(shouldCollapse ? 'Expand sidebar' : 'Collapse sidebar'));
  }
  if (brandLink) {
    brandLink.setAttribute('aria-label', t(shouldCollapse ? 'Expand sidebar' : 'ZeroTier Planet Console'));
    brandLink.setAttribute('title', t(shouldCollapse ? 'Expand sidebar' : 'ZeroTier Planet Console'));
  }
}

function scrollGuideTarget(targetId) {
  const target = document.getElementById(targetId);
  if (!target) {
    return;
  }
  setPage('guide');
  target.scrollIntoView({ behavior: 'smooth', block: 'start', inline: 'nearest' });
}

function bindEvents() {
  elements.loginForm.addEventListener('submit', (event) => login(event).catch((error) => toast(error.message)));
  elements.firstPasswordForm.addEventListener('submit', (event) => submitFirstPassword(event).catch((error) => toast(error.message)));
  $('resetPasswordForm').addEventListener('submit', (event) => submitResetPassword(event).catch((error) => toast(error.message)));
  $('logoutButton').addEventListener('click', () => logout());
  $('refreshAllButton').addEventListener('click', () => refreshAllWithFeedback().catch((error) => toast(error.message)));
  elements.sidebarToggle?.addEventListener('click', () => {
    setSidebarCollapsed(!document.body.classList.contains('sidebar-collapsed'));
  });
  document.querySelector('.sidebar .brand')?.addEventListener('click', (event) => {
    if (document.body.classList.contains('sidebar-collapsed')) {
      event.preventDefault();
      setSidebarCollapsed(false);
    }
  });
  document.querySelectorAll('[data-lang]').forEach((button) => {
    button.addEventListener('click', () => setLanguage(button.dataset.lang));
  });
  $('createNetworkForm').addEventListener('submit', (event) => createNetwork(event).catch((error) => toast(error.message)));
  $('networkBasicsForm').addEventListener('submit', (event) => submitBasics(event).catch((error) => toast(error.message)));
  $('assignModeForm').addEventListener('submit', (event) => submitAssignModes(event).catch((error) => toast(error.message)));
  $('dnsForm').addEventListener('submit', (event) => submitDns(event).catch((error) => toast(error.message)));
  $('easySetupForm').addEventListener('submit', (event) => submitEasySetup(event).catch((error) => toast(error.message)));
  $('routeForm').addEventListener('submit', (event) => submitRoute(event).catch((error) => toast(error.message)));
  $('poolForm').addEventListener('submit', (event) => submitPool(event).catch((error) => toast(error.message)));
  $('deleteNetworkButton').addEventListener('click', () => deleteSelectedNetwork().catch((error) => toast(error.message)));
  $('refreshNetworkButton').addEventListener('click', () => refreshSelectedNetworkWithFeedback().catch((error) => toast(error.message)));

  elements.easyCidr.addEventListener('input', () => {
    const defaults = defaultPoolForCidr(elements.easyCidr.value.trim());
    if (!defaults) {
      updateEasyPoolPreview();
      return;
    }
    if (!state.easyPoolTouched) {
      elements.easyPoolStart.value = defaults.poolStart;
      elements.easyPoolEnd.value = defaults.poolEnd;
    }
    $('routeTarget').placeholder = defaults.cidr;
    $('poolStart').placeholder = defaults.poolStart;
    $('poolEnd').placeholder = defaults.poolEnd;
    updateEasyPoolPreview();
  });
  [elements.easyPoolStart, elements.easyPoolEnd].forEach((input) => {
    input.addEventListener('input', () => {
      state.easyPoolTouched = true;
      updateEasyPoolPreview();
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
  elements.recentNetworkList?.addEventListener('click', (event) => {
    const item = event.target.closest('[data-network-id]');
    if (item) {
      setPage('networks');
      loadNetwork(item.dataset.networkId).catch((error) => toast(error.message));
    }
  });

  elements.membersTable.addEventListener('change', (event) => handleMemberInput(event).catch((error) => toast(error.message)));
  elements.membersTable.addEventListener('click', (event) => handleMembersClick(event).catch((error) => toast(error.message)));
  elements.membersTable.addEventListener('submit', (event) => handleMemberIpSubmit(event).catch((error) => toast(error.message)));

  elements.routesList.addEventListener('click', (event) => {
    const button = event.target.closest('[data-route-target]');
    if (button) {
      removeRoute(button.dataset.routeTarget, button).catch((error) => toast(error.message));
    }
  });
  elements.poolsList.addEventListener('click', (event) => {
    const button = event.target.closest('[data-pool-start]');
    if (button) {
      removePool(button.dataset.poolStart, button.dataset.poolEnd, button).catch((error) => toast(error.message));
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
  document.querySelectorAll('[data-guide-target]').forEach((link) => {
    link.addEventListener('click', (event) => {
      event.preventDefault();
      scrollGuideTarget(link.dataset.guideTarget);
    });
  });
  window.addEventListener('hashchange', () => setPage(cleanPageName(location.hash || 'overview'), { push: false }));

  $('planetLinkButton').addEventListener('click', () => generatePlanetCommand().catch((error) => toast(error.message)));
  $('linuxLinkButton').addEventListener('click', () => generateLinuxCommand().catch((error) => toast(error.message)));
  $('macosLinkButton').addEventListener('click', () => generateMacosCommand().catch((error) => toast(error.message)));
  elements.ttl.addEventListener('change', resetDeliveryCommands);
  elements.deliveryNetwork.addEventListener('change', resetInstallerCommands);
  elements.includeNetworkId.addEventListener('change', resetInstallerCommands);
  document.querySelectorAll('[data-copy-target]').forEach((button) => {
    button.addEventListener('click', () => copyFrom(button.dataset.copyTarget).catch((error) => toast(error.message)));
  });
}

setSidebarCollapsed(localStorage.getItem('ztp_sidebar_collapsed') === '1');
applyI18n();
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
