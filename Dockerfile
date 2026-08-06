# syntax=docker/dockerfile:1.7

FROM node:24-alpine3.22 AS frontend-builder

ENV CI=true \
    NPM_CONFIG_AUDIT=false \
    NPM_CONFIG_FUND=false \
    NPM_CONFIG_UPDATE_NOTIFIER=false

WORKDIR /src
COPY package.json package-lock.json tsconfig.json tsconfig.app.json tsconfig.node.json vite.config.ts eslint.config.js ./
RUN --mount=type=cache,target=/root/.npm npm ci --ignore-scripts
COPY frontend ./frontend
RUN npm run build

FROM alpine:3.22 AS builder

ENV TZ=Asia/Shanghai
# The integrated console requires ZeroTier's embedded controller routes.
# Newer upstream tags may build without /controller/network unless their
# controller-specific build chain is used, so keep this on a verified ref.
ARG TAG=actions
ARG ZEROTIER_REPO=https://github.com/zerotier/ZeroTierOne.git
ARG SOURCE_COMMIT=unknown
ARG ZEROTIER_REF=actions
ARG ZEROTIER_COMMIT=unknown
ENV TAG=${TAG}

WORKDIR /app

# Build dependencies
RUN --mount=type=cache,target=/var/cache/apk \
    set -eux; \
    apk add git python3 make g++ linux-headers curl pkgconfig openssl-dev jq build-base gcc cmake go; \
    echo "env prepare success!"

# Build ZeroTierOne
RUN --mount=type=cache,target=/root/.cargo/registry \
    --mount=type=cache,target=/root/.cargo/git \
    set -eux; \
    curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y; \
    . "$HOME/.cargo/env"; \
    git clone ${ZEROTIER_REPO}; \
    cd ZeroTierOne; \
    git checkout ${TAG}; \
    echo "checkout ZeroTierOne ref:${TAG}"; \
    make -j"$(getconf _NPROCESSORS_ONLN)"; \
    grep -a -q '/controller/network' zerotier-one; \
    echo "make success!"; \
    ln -sf /app/ZeroTierOne/zerotier-one /usr/sbin/zerotier-one; \
    (zerotier-one -d || true); \
    sleep 5s; \
    (pkill -9 zerotier-one || true); \
    mkdir -p /var/lib/zerotier-one; \
    cp /app/ZeroTierOne/zerotier-one /var/lib/zerotier-one/; \
    ln -sf zerotier-one /var/lib/zerotier-one/zerotier-idtool; \
    echo "zerotier-one init success!"

FROM alpine:3.22

ARG SOURCE_COMMIT=unknown
ARG ZEROTIER_REF=actions
ARG ZEROTIER_COMMIT=unknown

LABEL org.opencontainers.image.revision="${SOURCE_COMMIT}" \
      io.zerotier-planet.zerotier-ref="${ZEROTIER_REF}" \
      io.zerotier-planet.zerotier-commit="${ZEROTIER_COMMIT}"

WORKDIR /app

ENV ZT_PORT=9994
ENV FILE_SERVER_PORT=3000

ENV GH_MIRROR="https://mirror.ghproxy.com/"
ENV FILE_KEY=''
ENV TZ=Asia/Shanghai

COPY --from=builder /var/lib/zerotier-one /bak/zerotier-one

COPY --from=builder /app/ZeroTierOne/zerotier-one /usr/sbin/zerotier-one
COPY ./container/entrypoint.sh /app/entrypoint.sh
COPY ./container/portal_server.js /app/portal_server.js
COPY ./container/package.json /app/package.json
COPY ./portal/assets /app/portal/assets
COPY --from=frontend-builder /src/portal/dist /app/portal/dist

RUN --mount=type=cache,target=/var/cache/apk \
    set -eux; \
    apk add nodejs curl jq openssl; \
    ln -sf /usr/sbin/zerotier-one /usr/sbin/zerotier-cli; \
    ln -sf /usr/sbin/zerotier-one /usr/sbin/zerotier-idtool; \
    mkdir -p /app/config


VOLUME [ "/app/dist","/var/lib/zerotier-one","/app/config"]

CMD ["/bin/sh","/app/entrypoint.sh"]
