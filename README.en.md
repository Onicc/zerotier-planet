# ZeroTier Planet

A self-hosted ZeroTier Planet Docker image for private network deployments. The project provides planet generation, ztncui controller UI, a deployment portal, temporary signed download links, and Linux/macOS client installation scripts.

> Domain names are not written into planet files. This project keeps the standard ZeroTier world IP endpoint model.

## Features

- Multi-architecture image: `linux/amd64`, `linux/arm64`
- Docker deployment for a private Planet and ztncui controller
- Dedicated deployment portal with status, controller entry, and tutorial
- Temporary HMAC-signed download links for `wget`/`curl`
- Linux/macOS scripts that install ZeroTier, replace `planet`, restart the service, and join a network
- GitHub Actions workflow for Docker Hub publishing

## Architecture

```text
zerotier-planet
├── ZeroTierOne        # Cloned and built from zerotier/ZeroTierOne during image build
├── ztncui             # Cloned from key-networks/ztncui during image build
├── portal             # Deployment portal maintained by this project
└── portal_server.js   # File server, signed links, and client script API
```

Default ports:

| Port | Protocol | Purpose |
| --- | --- | --- |
| `9994` | TCP/UDP | ZeroTier transport |
| `3443` | TCP | ztncui controller |
| `3000` | TCP | Deployment portal and file server |

## Repository Layout

```text
.
├── .github/workflows/       # Docker Hub publishing workflow
├── container/               # Entrypoint, portal server, mkworld patch
├── portal/                  # Deployment portal frontend
│   └── assets/              # Portal static assets
├── Dockerfile
├── deploy.sh
├── README.md
└── README.en.md
```

## Quick Start

### 1. Publish your image

Configure these GitHub repository secrets:

- `DOCKERHUB_USERNAME`
- `DOCKERHUB_TOKEN`

After pushing to `main` or `master`, GitHub Actions publishes:

```bash
${DOCKERHUB_USERNAME}/zerotier-planet:latest
${DOCKERHUB_USERNAME}/zerotier-planet:<ZeroTierOne-version>
```

You can also build locally:

```bash
docker build -t your-dockerhub-username/zerotier-planet:dev .
```

### 2. Deploy

```bash
DOCKER_IMAGE=your-dockerhub-username/zerotier-planet:latest ./deploy.sh
```

The installer prompts for:

- ZeroTier transport port, for example `9994`
- Controller port, for example `3443`
- Deployment portal/file server port, for example `3000`
- IPv4/IPv6 addresses

After installation, it prints:

- Deployment portal: `http://SERVER_IP:FILE_SERVER_PORT`
- Controller UI: `http://SERVER_IP:API_PORT`
- File server admin key: `./data/zerotier/config/file_server.key`

### 3. Create a network

1. Open the ztncui controller
2. Sign in with the default account: `admin` / `password`
3. Change the default password immediately
4. Create a network and copy the Network ID
5. Configure address pools and routes

### 4. Enroll clients

Open the deployment portal, paste `file_server.key`, then generate temporary links or install commands.

Linux:

```bash
curl -fsSL '<temporary-installer-link>' | sudo bash
```

Non-interactive join:

```bash
curl -fsSL '<temporary-installer-link>' | sudo env NETWORK_ID=<NETWORK_ID> bash
```

macOS:

```bash
curl -fsSL '<temporary-installer-link>' | bash
```

Non-interactive join:

```bash
curl -fsSL '<temporary-installer-link>' | NETWORK_ID=<NETWORK_ID> bash
```

Download planet only:

```bash
wget -O planet '<temporary-planet-link>'
```

## Deployment Portal

The deployment portal runs on `FILE_SERVER_PORT` and provides:

- Planet readiness status
- ztncui controller entry
- Temporary `planet` download links
- `wget` command generation
- Linux/macOS installation command generation
- Operator and client tutorial

The long-lived admin key is not embedded in generated temporary links. The frontend sends it with a request header and stores it only in the current browser's localStorage.

## API

| Path | Description |
| --- | --- |
| `GET /api/status` | Service and file status |
| `GET /api/link` | Generate a temporary download or installer link; requires `X-File-Server-Key` |
| `GET /download/planet?...` | Download signed planet file |
| `GET /install/linux.sh?...` | Fetch signed Linux installer |
| `GET /install/macos.sh?...` | Fetch signed macOS installer |

Example:

```bash
curl -H "X-File-Server-Key: $(cat ./data/zerotier/config/file_server.key)" \
  "http://SERVER_IP:3000/api/link?type=download&file=planet&ttl=600"
```

## Environment Variables

| Variable | Default | Description |
| --- | --- | --- |
| `IP_ADDR4` | empty | IPv4 endpoint written into planet |
| `IP_ADDR6` | empty | IPv6 endpoint written into planet |
| `ZT_PORT` | `9994` | ZeroTier transport port |
| `API_PORT` | `3443` | ztncui port |
| `FILE_SERVER_PORT` | `3000` | Deployment portal and file server port |
| `PUBLIC_URL` | empty | External URL used behind reverse proxies |
| `LINK_TTL_SECONDS` | `600` | Default temporary link lifetime |
| `LINK_MAX_TTL_SECONDS` | `3600` | Maximum temporary link lifetime |

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

## Security Notes

- Change the default ztncui password immediately
- Do not publish `file_server.key`
- Put the deployment portal behind trusted network access or reverse-proxy authentication when possible
- Keep temporary link lifetimes short, for example 10 minutes
- Review firewall policy for `9994/tcp`, `9994/udp`, the controller port, and the portal port

## Development

Validation commands:

```bash
node --check container/portal_server.js
node --check portal/app.js
bash -n deploy.sh
sh -n container/entrypoint.sh
```

Local image build:

```bash
docker build -t zerotier-planet:dev .
```

Optional build arguments:

| Argument | Default | Description |
| --- | --- | --- |
| `TAG` | `actions` | ZeroTierOne build ref |
| `ZEROTIER_REPO` | `https://github.com/zerotier/ZeroTierOne.git` | ZeroTierOne repository |
| `ZTNCUI_REPO` | `https://github.com/key-networks/ztncui.git` | ztncui repository |
| `ZTNCUI_REF` | `master` | ztncui build ref |

## Upstream Projects

- ZeroTierOne: <https://github.com/zerotier/ZeroTierOne>
- ztncui: <https://github.com/key-networks/ztncui>

## License

This repository integrates builds and patches for GPL-licensed projects. When publishing images, ensure compliance with the license terms of ZeroTierOne, ztncui, and other upstream dependencies.
