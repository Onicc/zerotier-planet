FROM alpine:3.14 AS builder

ENV TZ=Asia/Shanghai
ARG TAG=actions
ARG ZEROTIER_REPO=https://github.com/zerotier/ZeroTierOne.git
ENV TAG=${TAG}

WORKDIR /app

# Build dependencies
RUN set -x\
    && apk update\
    && apk add --no-cache git python3 make g++ linux-headers curl pkgconfig openssl-dev jq build-base gcc cmake go \
    && echo "env prepare success!"

# Build ZeroTierOne
RUN set -x\
    && curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y\
    && . "$HOME/.cargo/env"\
    && git clone ${ZEROTIER_REPO}\
    && cd ZeroTierOne\
    && git checkout ${TAG}\
    && echo "checkout ZeroTierOne ref:${TAG}"\
    && make -j\
    && echo "make success!"\
    && ln -sf /app/ZeroTierOne/zerotier-one /usr/sbin/zerotier-one \
    && (zerotier-one -d || true)\
    && sleep 5s\
    && (ps -ef |grep zerotier-one |grep -v grep |awk '{print $1}' |xargs kill -9 || true)\
    && mkdir -p /var/lib/zerotier-one \
    && cp /app/ZeroTierOne/zerotier-one /var/lib/zerotier-one/ \
    && ln -sf zerotier-one /var/lib/zerotier-one/zerotier-idtool \
    && echo "zerotier-one init success!"

FROM alpine:3.14

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
COPY ./portal /app/portal

RUN set -x \
    && apk update \
    && apk add --no-cache nodejs curl jq openssl\
    && ln -sf /usr/sbin/zerotier-one /usr/sbin/zerotier-cli \
    && ln -sf /usr/sbin/zerotier-one /usr/sbin/zerotier-idtool \
    && mkdir /app/config -p 


VOLUME [ "/app/dist","/var/lib/zerotier-one","/app/config"]

CMD ["/bin/sh","/app/entrypoint.sh"]
