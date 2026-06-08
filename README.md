# ZeroTier Planet

面向自托管场景的 ZeroTier Planet Docker 镜像。项目提供 Planet 生成、ztncui 控制器、部署门户、临时签名下载链接，以及 Linux/macOS 客户端一键安装脚本。

> 域名写入 planet 暂不支持。本项目仍使用 ZeroTier world 的标准 IP endpoint 机制。

## 功能

- 多架构镜像：`linux/amd64`、`linux/arm64`
- Docker 一键部署私有 Planet 和 ztncui 控制器
- 独立部署门户，提供状态检查、控制台入口和教程页
- 临时 HMAC 签名下载链接，支持 `wget`/`curl` 获取 `planet`
- Linux/macOS 客户端脚本：安装 ZeroTier、替换 `planet`、重启服务、输入 Network ID 加入网络
- GitHub Actions 自动构建并推送 Docker Hub 镜像

## 架构

```text
zerotier-planet
├── ZeroTierOne        # 构建阶段从 zerotier/ZeroTierOne 拉取并编译
├── ztncui             # 构建阶段从 key-networks/ztncui 拉取，作为控制器 UI
├── portal             # 本项目维护的部署门户
└── portal_server.js   # 文件服务、签名链接、客户端脚本 API
```

默认端口：

| 端口 | 协议 | 用途 |
| --- | --- | --- |
| `9994` | TCP/UDP | ZeroTier 通信 |
| `3443` | TCP | ztncui 控制器 |
| `3000` | TCP | 部署门户和文件服务 |

## 目录结构

```text
.
├── .github/workflows/       # Docker Hub 自动发布
├── container/               # 容器入口和 Portal 服务
├── portal/                  # 部署门户前端
│   └── assets/              # 门户静态资源
├── Dockerfile
├── deploy.sh
├── README.md
└── README.en.md
```

## 快速开始

### 1. 发布自己的镜像

在 GitHub 仓库 Secrets 中配置：

- `DOCKERHUB_USERNAME`
- `DOCKERHUB_TOKEN`

推送到 `main` 或 `master` 后，GitHub Actions 会自动发布：

```bash
${DOCKERHUB_USERNAME}/zerotier-planet:latest
${DOCKERHUB_USERNAME}/zerotier-planet:<ZeroTierOne版本>
```

也可以本地构建：

```bash
docker build -t your-dockerhub-username/zerotier-planet:dev .
```

### 2. 部署服务

```bash
DOCKER_IMAGE=your-dockerhub-username/zerotier-planet:latest ./deploy.sh
```

脚本会提示输入：

- ZeroTier 通信端口，例如 `9994`
- 控制器端口，例如 `3443`
- 部署门户/文件服务端口，例如 `3000`
- IPv4/IPv6 地址

安装完成后会输出：

- 部署门户：`http://服务器IP:文件服务端口`
- 管理后台：`http://服务器IP:控制器端口`
- 文件服务管理密钥：`./data/zerotier/config/file_server.key`

### 3. 创建网络

1. 打开 ztncui 管理后台
2. 使用默认账号登录：`admin` / `password`
3. 立即修改默认密码
4. 创建网络并记录 Network ID
5. 配置 IP 地址池和路由

### 4. 分发客户端

打开部署门户，填入 `file_server.key`，生成临时链接或安装命令。

Linux：

```bash
curl -fsSL '<temporary-installer-link>' | sudo bash
```

非交互加入网络：

```bash
curl -fsSL '<temporary-installer-link>' | sudo env NETWORK_ID=<NETWORK_ID> bash
```

macOS：

```bash
curl -fsSL '<temporary-installer-link>' | bash
```

非交互加入网络：

```bash
curl -fsSL '<temporary-installer-link>' | NETWORK_ID=<NETWORK_ID> bash
```

仅下载 planet：

```bash
wget -O planet '<temporary-planet-link>'
```

## 部署门户

部署门户运行在 `FILE_SERVER_PORT`，提供：

- Planet 状态检查
- ztncui 控制台入口
- `planet` 临时下载链接生成
- `wget` 命令生成
- Linux/macOS 安装命令生成
- 部署者和客户端教程

长期管理密钥不会写入生成的临时链接。门户前端通过请求头发送 key，并仅存储在当前浏览器 localStorage。

## API

| 路径 | 说明 |
| --- | --- |
| `GET /api/status` | 查看服务状态和文件状态 |
| `GET /api/link` | 生成临时下载或安装链接，需要 `X-File-Server-Key` |
| `GET /download/planet?...` | 下载签名的 planet 文件 |
| `GET /install/linux.sh?...` | 获取签名的 Linux 安装脚本 |
| `GET /install/macos.sh?...` | 获取签名的 macOS 安装脚本 |

示例：

```bash
curl -H "X-File-Server-Key: $(cat ./data/zerotier/config/file_server.key)" \
  "http://服务器IP:3000/api/link?type=download&file=planet&ttl=600"
```

## 环境变量

| 变量 | 默认值 | 说明 |
| --- | --- | --- |
| `IP_ADDR4` | 空 | 写入 planet 的 IPv4 endpoint |
| `IP_ADDR6` | 空 | 写入 planet 的 IPv6 endpoint |
| `ZT_PORT` | `9994` | ZeroTier 通信端口 |
| `API_PORT` | `3443` | ztncui 端口 |
| `FILE_SERVER_PORT` | `3000` | 部署门户和文件服务端口 |
| `PUBLIC_URL` | 空 | 反向代理场景下生成外部链接使用 |
| `LINK_TTL_SECONDS` | `600` | 临时链接默认有效期 |
| `LINK_MAX_TTL_SECONDS` | `3600` | 临时链接最大有效期 |

## docker-compose

```yaml
version: "3"

services:
  zerotier-planet:
    image: your-dockerhub-username/zerotier-planet:latest
    container_name: zerotier-planet
    restart: unless-stopped
    ports:
      - "9994:9994"
      - "9994:9994/udp"
      - "3443:3443"
      - "3000:3000"
    environment:
      - IP_ADDR4=<PUBLIC_IPV4>
      - IP_ADDR6=
      - ZT_PORT=9994
      - API_PORT=3443
      - FILE_SERVER_PORT=3000
    volumes:
      - ./data/zerotier/dist:/app/dist
      - ./data/zerotier/ztncui:/app/ztncui
      - ./data/zerotier/one:/var/lib/zerotier-one
      - ./data/zerotier/config:/app/config
```

## 安全建议

- 首次登录 ztncui 后立即修改默认密码
- 不要公开 `file_server.key`
- 部署门户建议放在可信网络或反向代理鉴权之后
- 临时链接有效期建议保持在 10 分钟左右
- 对外开放前确认 `9994/tcp`、`9994/udp`、控制器端口和门户端口的防火墙策略

## 开发

常用验证命令：

```bash
node --check container/portal_server.js
node --check portal/app.js
bash -n deploy.sh
sh -n container/entrypoint.sh
```

本地镜像构建：

```bash
docker build -t zerotier-planet:dev .
```

可选构建参数：

| 参数 | 默认值 | 说明 |
| --- | --- | --- |
| `TAG` | `actions` | ZeroTierOne 构建 ref |
| `ZEROTIER_REPO` | `https://github.com/zerotier/ZeroTierOne.git` | ZeroTierOne 仓库 |
| `ZTNCUI_REPO` | `https://github.com/key-networks/ztncui.git` | ztncui 仓库 |
| `ZTNCUI_REF` | `master` | ztncui 构建 ref |

## 上游项目

- ZeroTierOne: <https://github.com/zerotier/ZeroTierOne>
- ztncui: <https://github.com/key-networks/ztncui>

## 许可证

本仓库包含对 GPL 项目构建和补丁的集成。发布镜像时请确保遵守 ZeroTierOne、ztncui 及其他上游依赖的许可证要求。
