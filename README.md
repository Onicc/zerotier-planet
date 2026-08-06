# ZeroTier Planet

ZeroTier Planet 是一个用于自建 ZeroTier 根服务器的 Docker 部署方案。它提供一个统一控制台，用于管理网络、授权成员、配置路由/DNS/IP 分配、生成临时 `planet` 下载链接，并为 Linux/macOS 客户端生成一键安装命令。

> 当前版本不支持将域名直接写入 `planet` 文件。请使用服务器公网 IPv4/IPv6 地址生成 `planet`。

## 功能

- 自建 ZeroTier Planet 根服务器
- 单一 Web 控制台管理网络和成员
- 支持创建、删除、重命名网络
- 支持成员授权、桥接模式、备注名、IP 分配和删除
- 支持路由、地址池、DNS、IPv4/IPv6 分配模式配置
- 支持 Easy Setup 快速配置常用 IPv4 网络
- 支持生成临时签名的 `planet` 下载链接
- 支持 Linux/macOS 自动安装 ZeroTier、替换 `planet`、重启服务并加入网络
- 支持 `amd64` 和 `arm64`

## 服务器要求

- 一台有公网 IPv4 或 IPv6 的 Linux 服务器
- 已安装 Docker
- 防火墙放行以下端口

| 端口 | 协议 | 用途 |
| --- | --- | --- |
| `9994` | TCP/UDP | ZeroTier 通信端口 |
| `3000` | TCP | 统一控制台、临时文件下载、客户端安装脚本 |

端口可以在部署脚本中自定义。

## 快速部署

```bash
git clone https://github.com/Onicc/zerotier-planet.git
cd zerotier-planet
./deploy.sh
```

脚本会提示输入：

- ZeroTier 通信端口，例如 `9994`
- 统一控制台端口，例如 `3000`
- 服务器公网 IPv4/IPv6 地址

部署完成后打开：

```text
http://服务器IP:3000
```

## 登录控制台

统一控制台使用账号密码登录。首次部署后的初始凭据为：

```text
用户名：admin
密码：password
```

首次登录会强制重置密码。后续可以在 `Settings` 中修改密码或重置密码。

## 创建网络

1. 打开统一控制台：`http://服务器IP:3000`
2. 进入 `Networks`
3. 输入网络名称并点击 `Create`
4. 选择新网络
5. 在 `Settings` 中使用 `Easy setup` 配置网段和地址池

示例：

| 配置项 | 示例 |
| --- | --- |
| Managed route CIDR | `10.147.17.0/24` |
| Pool start | `10.147.17.10` |
| Pool end | `10.147.17.250` |

创建完成后复制 Network ID，后续客户端加入网络时需要使用。

## 管理网络

在 `Networks` 中选择一个网络后，可以管理：

- `Members`：授权设备、设置桥接模式、设置备注名、添加/删除 IP 分配、删除成员
- `Settings`：修改网络名称、设置 MTU、切换私有网络、配置 Easy Setup、配置 IPv4/IPv6 分配模式
- `Routes`：添加/删除托管路由和地址池
- `DNS`：配置搜索域和 DNS 服务器
- `Raw detail`：查看 Controller 返回的原始网络 JSON

## 配置客户端

进入 `Client delivery`，选择链接有效期，然后生成对应命令。

### Linux 一键安装

在控制台生成 Linux 命令后，在客户端执行：

```bash
curl -fsSL '临时安装链接' | sudo bash
```

脚本会自动：

1. 安装 ZeroTier One
2. 下载临时签名的 `planet` 文件
3. 备份并替换 `/var/lib/zerotier-one/planet`
4. 重启 ZeroTier 服务
5. 提示输入 Network ID 并加入网络

也可以非交互式加入：

```bash
curl -fsSL '临时安装链接' | sudo NETWORK_ID=你的NetworkID bash
```

### macOS 一键安装

在控制台生成 macOS 命令后，在客户端执行：

```bash
curl -fsSL '临时安装链接' | bash
```

脚本会自动：

1. 检查是否已安装 ZeroTier
2. 优先使用 Homebrew 安装
3. 没有 Homebrew 时下载官方 PKG 安装包
4. 下载临时签名的 `planet` 文件
5. 备份并替换 `/Library/Application Support/ZeroTier/One/planet`
6. 重启 ZeroTier 服务
7. 提示输入 Network ID，并通过 `sudo zerotier-cli` 加入网络

也可以非交互式加入：

```bash
curl -fsSL '临时安装链接' | NETWORK_ID=你的NetworkID bash
```

macOS 脚本建议以普通用户执行。脚本内部会在安装官方 PKG、替换 `planet`、重启 ZeroTier、加入网络等需要权限的步骤自动调用 `sudo`。如果使用 Homebrew，不建议把整条命令改成 `sudo bash`。

### 仅下载 planet

如果客户端已经安装 ZeroTier，可以只下载 `planet`：

```bash
wget -O planet '临时planet下载链接'
```

然后手动替换客户端中的 `planet` 文件并重启 ZeroTier 服务。

## 授权设备

客户端执行加入命令后，需要在统一控制台授权：

1. 打开 `http://服务器IP:3000`
2. 进入 `Networks`
3. 选择对应网络
4. 在 `Members` 中找到新设备
5. 勾选 `Authorized`

客户端可以执行以下命令验证连接：

```bash
zerotier-cli peers
zerotier-cli listnetworks
```

## Docker Compose

也可以使用 Docker Compose 部署：

```yaml
services:
  zerotier-planet:
    image: onicc/zerotier-planet:latest
    container_name: zerotier-planet
    restart: unless-stopped
    ports:
      - "9994:9994"
      - "9994:9994/udp"
      - "3000:3000"
    environment:
      - IP_ADDR4=<服务器公网IPv4>
      - IP_ADDR6=
      - ZT_PORT=9994
      - FILE_SERVER_PORT=3000
    volumes:
      - ./data/zerotier/dist:/app/dist
      - ./data/zerotier/one:/var/lib/zerotier-one
      - ./data/zerotier/config:/app/config
```

启动：

```bash
docker compose up -d
```

## 常用命令

查看容器：

```bash
docker ps
```

查看日志：

```bash
docker logs -f myztplanet
```

查看部署信息：

```bash
./deploy.sh
# 选择 4. 查看信息
```

更新镜像：

```bash
docker pull onicc/zerotier-planet:latest
./deploy.sh
# 选择 3. 更新
```

重启容器：

```bash
docker restart myztplanet
```

## 前端开发

统一控制台已使用 React、TypeScript、Vite、Ant Design 和 TanStack Query 重构。生产构建由 Docker 多阶段构建自动完成，普通部署命令保持不变。

本地开发要求 Node.js 22+ 和 npm 10+：

```bash
npm install
```

启动带示例数据的 Mock API（终端 1）：

```bash
npm run mock
```

启动 Vite 开发服务器（终端 2）：

```bash
npm run dev
```

然后访问 `http://127.0.0.1:5173`，使用 `admin / mock123456` 登录。

常用质量检查：

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

`npm run build` 将静态资源输出到 `portal/dist/`。Mock 与生产 Node 服务都支持 SPA 深层路由回退，同时保持 `/api/*`、下载和安装脚本路由独立。

## CI/CD 与镜像发布

推送到 `master` 或 `main` 后，`.github/workflows/image-build.yml` 会按以下顺序执行：

1. 使用 Node.js 24 运行前端 lint、类型检查、单元测试和生产构建
2. 构建 `linux/amd64` 成品镜像并实际启动容器，检查控制台 API、React SPA、深层路由、Logo 和 Planet 文件
3. 只有前两步成功后，才向 Docker Hub 发布 `linux/amd64` 与 `linux/arm64` 多架构镜像

需要在 GitHub 仓库中配置：

- Repository Variable 或 Secret：`DOCKERHUB_USERNAME`
- Repository Secret：`DOCKERHUB_TOKEN`（建议使用仅允许读写对应仓库的 Docker Hub Access Token）

每次成功发布会生成以下标签：

| 标签 | 用途 |
| --- | --- |
| `latest` | 默认稳定部署标签，多架构 |
| `actions` | 与当前 ZeroTier `actions` 源码通道兼容的标签 |
| `sha-<commit>` | 对应本仓库提交的不可变回滚标签 |

可以从 GitHub Actions 手动运行工作流，并选择只发布 `linux/amd64`、只发布 `linux/arm64` 或默认双架构。为防止单架构构建破坏稳定标签，`latest` 和 `actions` 只在默认双架构发布时更新；手动单架构排障仅发布对应的 `sha-*` 标签。发布摘要会记录实际平台、解析后的 ZeroTier 上游 commit 和镜像 digest。

定时任务约每 6 小时运行一次，用于跟进 ZeroTier `actions` 分支。工作流会在开始时将该分支解析为具体 commit，并在冒烟和发布阶段使用同一个 commit，避免一次运行中上游分支移动造成不同镜像内容。

## 安全建议

- 首次登录后立即完成强制改密
- 不要使用弱密码或重复使用其他系统密码
- 只向可信用户开放统一控制台
- 建议通过防火墙限制 `3000/tcp` 的访问来源
- 定期备份 `./data/zerotier`
- 临时下载链接应设置较短有效期
- 删除不再使用的成员

## 常见问题

### 为什么没有 3443 管理后台？

当前版本已经将网络管理能力整合到 `3000` 统一控制台中，不再需要单独使用 ztncui 后台。

### 客户端加入网络后无法通信怎么办？

检查以下项目：

- 服务器 `9994/tcp` 和 `9994/udp` 已放行
- 客户端已经替换了正确的 `planet`
- 客户端已经加入正确的 Network ID
- 设备已在统一控制台中授权
- 网络中配置了正确的路由和地址池

### 控制台无法生成链接怎么办？

检查以下项目：

- `planet` 文件已经生成
- 当前登录会话未过期
- 正在访问正确的控制台端口

### 支持 Windows 自动脚本吗？

当前控制台只提供 Linux 和 macOS 自动脚本。Windows 客户端需要手动安装 ZeroTier、替换 `planet` 文件并重启服务。

### 支持域名作为 planet 地址吗？

暂不支持将域名直接写入 `planet`。请使用服务器公网 IP。
