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

## Unlock The Console

The unified console uses the file server key to authorize management actions. After deployment, run this on the server:

```bash
docker exec myztplanet cat /app/config/file_server.key
```

If you need to read the mounted directory directly, run `sudo cat ./data/zerotier/config/file_server.key`.

Open the console, go to `Access`, paste the key, and save it. The key is stored only in this browser's `localStorage`.

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
- `Settings`: rename the network, switch private mode, apply Easy Setup, configure IPv4/IPv6 assignment modes
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
7. Prompts for the Network ID and joins the network

Non-interactive join:

```bash
curl -fsSL 'temporary-installer-link' | NETWORK_ID=YOUR_NETWORK_ID bash
```

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

## Security Recommendations

- Do not share the management key. Prefer `docker exec myztplanet cat /app/config/file_server.key` when reading it.
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
- `Server key` contains the output of `docker exec myztplanet cat /app/config/file_server.key`
- You are visiting the correct console port

### Does it support Windows scripts?

Not currently. The console provides Linux and macOS scripts. Windows users need to install ZeroTier manually, replace the `planet` file, and restart the service.

### Does it support domain names in planet?

Not currently. Use the server's public IP address.
