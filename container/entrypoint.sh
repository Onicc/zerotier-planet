#!/bin/sh

set -x 

# 配置路径和端口
ZEROTIER_PATH="/var/lib/zerotier-one"
APP_PATH="/app"
CONFIG_PATH="${APP_PATH}/config"
BACKUP_PATH="/bak"

# 启动 ZeroTier 和统一控制台
start() {
    echo "Start zerotier and console"
    cd $ZEROTIER_PATH && ./zerotier-one -p$(cat ${CONFIG_PATH}/zerotier-one.port) -d || exit 1
    node ${APP_PATH}/portal_server.js || exit 1
}

refresh_zerotier_binary() {
    cp ${BACKUP_PATH}/zerotier-one/zerotier-one ${ZEROTIER_PATH}/zerotier-one
    chmod +x ${ZEROTIER_PATH}/zerotier-one
    ln -sf zerotier-one ${ZEROTIER_PATH}/zerotier-idtool
    ln -sf zerotier-one ${ZEROTIER_PATH}/zerotier-cli
}

ensure_controller_storage() {
    mkdir -p ${ZEROTIER_PATH}/controller.d
}

ensure_zerotier_runtime() {
    mkdir -p ${CONFIG_PATH}
    if [ ! -f "${CONFIG_PATH}/zerotier-one.port" ]; then
        echo "${ZT_PORT}" > ${CONFIG_PATH}/zerotier-one.port
    fi

    refresh_zerotier_binary
    ensure_controller_storage
}

# 检查文件服务器端口配置文件
check_file_server() {
    if [ ! -f "${CONFIG_PATH}/file_server.port" ]; then
        echo "file_server.port does not exist, generating it"
        echo "${FILE_SERVER_PORT}" > ${CONFIG_PATH}/file_server.port
    else
        echo "file_server.port exists, reading it"
        FILE_SERVER_PORT=$(cat ${CONFIG_PATH}/file_server.port)
    fi
    echo "${FILE_SERVER_PORT}"
}

# 初始化 ZeroTier 数据
init_zerotier_data() {
    echo "Initializing ZeroTier data"
    echo "${ZT_PORT}" > ${CONFIG_PATH}/zerotier-one.port
    cp -r ${BACKUP_PATH}/zerotier-one/* $ZEROTIER_PATH
    refresh_zerotier_binary
    ensure_controller_storage

    cd $ZEROTIER_PATH
    openssl rand -hex 16 > authtoken.secret
    ./zerotier-idtool generate identity.secret identity.public
    ./zerotier-idtool initmoon identity.public > moon.json

    if [ "${AUTO_DETECT_IP:-false}" = "true" ]; then
        IP_ADDR4=${IP_ADDR4:-$(curl -fsS --max-time 5 https://ipv4.icanhazip.com/ || true)}
        IP_ADDR6=${IP_ADDR6:-$(curl -fsS --max-time 5 https://ipv6.icanhazip.com/ || true)}
    fi

    echo "IP_ADDR4=$IP_ADDR4"
    echo "IP_ADDR6=$IP_ADDR6"
    ZT_PORT=$(cat ${CONFIG_PATH}/zerotier-one.port)
    echo "ZT_PORT=$ZT_PORT"

    if [ -n "$IP_ADDR4" ] && [ -n "$IP_ADDR6" ]; then
        stableEndpoints="[\"$IP_ADDR4/${ZT_PORT}\",\"$IP_ADDR6/${ZT_PORT}\"]"
    elif [ -n "$IP_ADDR4" ]; then
        stableEndpoints="[\"$IP_ADDR4/${ZT_PORT}\"]"
    elif [ -n "$IP_ADDR6" ]; then
        stableEndpoints="[\"$IP_ADDR6/${ZT_PORT}\"]"
    else
        echo "IP_ADDR4 and IP_ADDR6 are both empty!"
        exit 1
    fi

    echo "$IP_ADDR4" > ${CONFIG_PATH}/ip_addr4
    echo "$IP_ADDR6" > ${CONFIG_PATH}/ip_addr6
    echo "stableEndpoints=$stableEndpoints"

    mkdir -p ${APP_PATH}/dist/
    mkdir -p moons.d

    jq --argjson newEndpoints "$stableEndpoints" '.roots[0].stableEndpoints = $newEndpoints' moon.json > temp.json && mv temp.json moon.json
    ./zerotier-idtool genmoon moon.json || {
        echo "moon generation failed!"
        exit 1
    }
    MOON_FILE=$(ls ./*.moon | head -n 1)
    cp "$MOON_FILE" ./moons.d/
    cp "$MOON_FILE" ${APP_PATH}/dist/

    jq --argjson newEndpoints "$stableEndpoints" \
        '.worldType = "planet" | .id = "8eac90a" | .roots[0].stableEndpoints = $newEndpoints' \
        moon.json > planet.json
    rm -f 0000000008eac90a.moon
    ./zerotier-idtool genmoon planet.json || {
        echo "planet generation failed!"
        exit 1
    }
    cp 0000000008eac90a.moon ${APP_PATH}/dist/planet
    echo "world generation success!"
}

# 检查并初始化 ZeroTier
check_zerotier() {
    mkdir -p $ZEROTIER_PATH
    if [ "$(ls -A $ZEROTIER_PATH)" ]; then
        echo "$ZEROTIER_PATH is not empty, starting directly"
        ensure_zerotier_runtime
    else
        init_zerotier_data
    fi
}

check_file_server
check_zerotier
start
