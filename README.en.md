# ZeroTier Planet

ZeroTier Planet is a Docker-based deployment package for running a self-hosted ZeroTier root server. It provides one unified console for managing networks, authorizing members, configuring routes/DNS/IP assignment, generating temporary `planet` download links, and creating one-command Linux/macOS client installers.

> Domain names are not supported inside the `planet` file. Use the server's public IPv4/IPv6 address when generating `planet`.

## Features

- Self-hosted ZeroTier Planet root server
- Single web console for network and member management
- Create, delete, and rename networks
- Authorize members, configure bridge mode, save member labels, add/remove IP assignments
- Manage routes, assignment pools, DNS, and IPv4/IPv6 assignment modes
- Easy Setup for common IPv4 networks
- Temporary signed `planet` download links
- Linux/macOS scripts that install ZeroTier, replace `planet`, restart the service, and join a network
- `amd64` and `arm64` support

## Requirements

- A Linux server with a public IPv4 or IPv6 address
- Docker
- Firewall access for the following ports

| Port | Protocol | Purpose |
| --- | --- | --- |
| `9994` | TCP/UDP | ZeroTier traffic |
| `3000` | TCP | Unified console, temporary downloads, client installers |

Ports can be customized during deployment.

## Quick Start

```bash
git clone https://github.com/Onicc/zerotier-planet.git
cd zerotier-planet
./deploy.sh
```

The script asks for:

- ZeroTier traffic port, for example `9994`
- Unified console port, for example `3000`
- Server public IPv4/IPv6 address

After deployment, open:

```text
http://SERVER_IP:3000
```

## Sign In

The unified console uses username and password authentication. Initial credentials after a fresh deployment are:

```text
Username: admin
Password: password
```

The first sign-in requires a password reset. You can later change or reset the password in `Settings`.

## Create A Network

1. Open the unified console: `http://SERVER_IP:3000`
2. Go to `Networks`
3. Enter a network name and click `Create`
4. Select the new network
5. Use `Easy setup` under `Settings` to configure the managed route and assignment pool

Example:

| Field | Example |
| --- | --- |
| Managed route CIDR | `10.147.17.0/24` |
| Pool start | `10.147.17.10` |
| Pool end | `10.147.17.250` |

Copy the Network ID after creation. Clients need it when joining the network.

## Manage Networks

After selecting a network in `Networks`, you can manage:

- `Members`: authorize devices, set bridge mode, save labels, add/remove IP assignments, delete members
- `Settings`: rename the network, set MTU, switch private mode, apply Easy Setup, configure IPv4/IPv6 assignment modes
- `Routes`: add/remove managed routes and assignment pools
- `DNS`: configure the search domain and DNS servers
- `Raw detail`: inspect the raw network JSON returned by the controller

## Configure Clients

Go to `Client delivery`, choose a link lifetime, then generate the required command.

### Linux Installer

Generate a Linux command in the console, then run it on the client:

```bash
curl -fsSL 'temporary-installer-link' | sudo bash
```

The script:

1. Installs ZeroTier One
2. Downloads the temporary signed `planet` file
3. Backs up and replaces `/var/lib/zerotier-one/planet`
4. Restarts ZeroTier
5. Prompts for the Network ID and joins the network

Non-interactive join:

```bash
curl -fsSL 'temporary-installer-link' | sudo NETWORK_ID=YOUR_NETWORK_ID bash
```

### macOS Installer

Generate a macOS command in the console, then run it on the client:

```bash
curl -fsSL 'temporary-installer-link' | bash
```

The script:

1. Checks whether ZeroTier is already installed
2. Uses Homebrew when available
3. Otherwise downloads the official macOS PKG installer
4. Downloads the temporary signed `planet` file
5. Backs up and replaces `/Library/Application Support/ZeroTier/One/planet`
6. Restarts ZeroTier
7. Prompts for the Network ID and joins the network with `sudo zerotier-cli`

Non-interactive join:

```bash
curl -fsSL 'temporary-installer-link' | NETWORK_ID=YOUR_NETWORK_ID bash
```

The macOS script is intended to run as a normal user. It calls `sudo` only for privileged operations such as installing the PKG, replacing `planet`, restarting ZeroTier, and joining the network. Do not pipe it to `sudo bash` when using Homebrew.

### Download Planet Only

If ZeroTier is already installed, you can download only the `planet` file:

```bash
wget -O planet 'temporary-planet-link'
```

Then manually replace the client's `planet` file and restart ZeroTier.

## Authorize Devices

After a client joins the network, authorize it in the unified console:

1. Open `http://SERVER_IP:3000`
2. Go to `Networks`
3. Select the target network
4. Find the new device in `Members`
5. Check `Authorized`

Clients can verify connectivity with:

```bash
zerotier-cli peers
zerotier-cli listnetworks
```

## Docker Compose

You can also deploy with Docker Compose:

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
      - IP_ADDR4=<SERVER_PUBLIC_IPV4>
      - IP_ADDR6=
      - ZT_PORT=9994
      - FILE_SERVER_PORT=3000
    volumes:
      - ./data/zerotier/dist:/app/dist
      - ./data/zerotier/one:/var/lib/zerotier-one
      - ./data/zerotier/config:/app/config
```

Start it:

```bash
docker compose up -d
```

## Common Commands

List containers:

```bash
docker ps
```

View logs:

```bash
docker logs -f myztplanet
```

View deployment information:

```bash
./deploy.sh
# choose 4. View information
```

Update the image:

```bash
docker pull onicc/zerotier-planet:latest
./deploy.sh
# choose 3. Update
```

Restart the container:

```bash
docker restart myztplanet
```

## Frontend Development

The unified console has been rebuilt with React, TypeScript, Vite, Ant Design, and TanStack Query. The production bundle is generated automatically by the Docker multi-stage build, so normal deployment commands are unchanged.

Local development requires Node.js 22+ and npm 10+:

```bash
npm install
```

Start the mock API with sample data (terminal 1):

```bash
npm run mock
```

Start the Vite development server (terminal 2):

```bash
npm run dev
```

Open `http://127.0.0.1:5173` and sign in with `admin / mock123456`.

Quality checks:

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

`npm run build` writes static assets to `portal/dist/`. Both the mock and production Node servers provide SPA fallback for deep routes while keeping `/api/*`, download, and installer routes separate.

## CI/CD and Image Publishing

A push to `master` or `main` runs `.github/workflows/image-build.yml` in this order:

1. Use Node.js 24 to run frontend linting, type checks, unit tests, and the production build
2. Build an amd64 production image and start it as a real container, checking the console API, React SPA, deep-route fallback, logo, and generated Planet file
3. Publish the `linux/amd64` and `linux/arm64` multi-platform image to Docker Hub only after both checks pass

Configure these values in the GitHub repository:

- Repository Variable or Secret: `DOCKERHUB_USERNAME`
- Repository Secret: `DOCKERHUB_TOKEN` (prefer a Docker Hub access token limited to read/write access for this repository)

Every successful publication creates:

| Tag | Purpose |
| --- | --- |
| `latest` | Default stable deployment tag, published as a multi-platform manifest |
| `actions` | Compatibility tag for the current ZeroTier `actions` source channel |
| `sha-<commit>` | Immutable rollback tag for this repository commit |

The workflow can also be started manually from GitHub Actions and limited to `linux/amd64`, `linux/arm64`, or the default dual-platform build. To prevent a single-platform build from replacing stable tags, `latest` and `actions` are updated only by the default dual-platform publication; a manual single-platform diagnostic run publishes only its `sha-*` tag. The job summary records the platforms, resolved upstream ZeroTier commit, and final image digest.

The scheduled workflow checks once per day (`19:17 UTC`, approximately `03:17` the next day in GMT+8; GitHub may start it later) to follow ZeroTier's `actions` branch. At the start of the run it resolves that branch to a concrete commit and reads OCI labels from the Docker Hub `latest` image. When both the repository commit and the upstream ZeroTier commit already match the published image, the run records a “no rebuild required” summary and skips dependency installation, ZeroTier compilation, and Docker Hub publication. A changed commit or a missing `latest` image triggers the complete quality, amd64 smoke, and dual-platform publish flow. Push and manual `workflow_dispatch` events always run the complete flow so they can be used for validation or a deliberate rebuild.

Published images record `org.opencontainers.image.revision`, `io.zerotier-planet.zerotier-ref`, and `io.zerotier-planet.zerotier-commit` for scheduled comparisons and troubleshooting. The smoke and publish stages always use the same resolved ZeroTier commit, so an upstream branch update cannot change image contents midway through one workflow run.

## Security Recommendations

- Complete the forced password reset after the first sign-in
- Do not use weak passwords or reuse passwords from other systems
- Expose the unified console only to trusted users
- Restrict `3000/tcp` with a firewall when possible
- Back up `./data/zerotier` regularly
- Use short lifetimes for temporary download links
- Remove members that are no longer used

## FAQ

### Why is there no 3443 controller UI?

Network management has been integrated into the `3000` unified console. A separate ztncui backend is no longer required.

### Clients joined the network but cannot communicate. What should I check?

Check:

- `9994/tcp` and `9994/udp` are open on the server
- The client replaced the correct `planet` file
- The client joined the correct Network ID
- The device is authorized in the unified console
- Routes and assignment pools are configured correctly

### The console cannot generate links. What should I check?

Check:

- The `planet` file has been generated
- Your signed-in session has not expired
- You are visiting the correct console port

### Does it support Windows scripts?

Not currently. The console provides Linux and macOS scripts. Windows users need to install ZeroTier manually, replace the `planet` file, and restart the service.

### Does it support domain names in planet?

Not currently. Use the server's public IP address.
