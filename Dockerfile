FROM alpine:3.14 AS builder

ENV TZ=Asia/Shanghai
ARG TAG=actions
ARG ZEROTIER_REPO=https://github.com/zerotier/ZeroTierOne.git
ARG ZTNCUI_REPO=https://github.com/key-networks/ztncui.git
ARG ZTNCUI_REF=master
ENV TAG=${TAG}

WORKDIR /app
ADD ./container/entrypoint.sh /app/entrypoint.sh
ADD ./container/portal_server.js /app/portal_server.js
ADD ./container/mkworld_custom.cpp /app/container/mkworld_custom.cpp
ADD ./portal /app/portal

# Build dependencies
RUN set -x\
    && apk update\
    && apk add --no-cache git python3 npm make g++ linux-headers curl pkgconfig openssl-dev jq build-base gcc cmake go \
    && echo "env prepare success!"

# Build ZeroTierOne and custom mkworld
RUN set -x\
    && curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y\
    && . "$HOME/.cargo/env"\
    && git clone ${ZEROTIER_REPO}\
    && cd ZeroTierOne\
    && git checkout ${TAG}\
    && echo "checkout ZeroTierOne ref:${TAG}"\
    && make ZT_SYMLINK=1 \
    && make -j\
    && make install\
    && echo "make success!"\
    && zerotier-one -d || true\
    && sleep 5s\
    && (ps -ef |grep zerotier-one |grep -v grep |awk '{print $1}' |xargs kill -9 || true)\
    && echo "zerotier-one init success!"\
    && cd /app/ZeroTierOne/attic/world \
    && cp /app/container/mkworld_custom.cpp .\
    && mv mkworld.cpp mkworld.cpp.bak \
    && mv mkworld_custom.cpp mkworld.cpp \
    && sh build.sh \
    && mkdir -p /var/lib/zerotier-one \
    && mv mkworld /var/lib/zerotier-one\
    && echo "mkworld build success!"



# Install ztncui
RUN set -x \
    && mkdir /app -p \
    &&  cd /app \
    && git clone --progress ${ZTNCUI_REPO}\
    && cd /app/ztncui \
    && git checkout ${ZTNCUI_REF} \
    && cd /app/ztncui/src \
    && npm config set registry https://registry.npmmirror.com\
    && npm install -g node-gyp\
    && npm install 

FROM alpine:3.14

WORKDIR /app

ENV IP_ADDR4=''
ENV IP_ADDR6=''

ENV ZT_PORT=9994
ENV API_PORT=3443
ENV FILE_SERVER_PORT=3000

ENV GH_MIRROR="https://mirror.ghproxy.com/"
ENV FILE_KEY=''
ENV TZ=Asia/Shanghai

COPY --from=builder /app/ztncui /bak/ztncui
COPY --from=builder /var/lib/zerotier-one /bak/zerotier-one

COPY --from=builder /app/ZeroTierOne/zerotier-one /usr/sbin/zerotier-one
COPY --from=builder /app/entrypoint.sh /app/entrypoint.sh
COPY --from=builder /app/portal_server.js /app/portal_server.js
COPY --from=builder /app/portal /app/portal

RUN set -x \
    && apk update \
    && apk add --no-cache npm curl jq openssl\
    && mkdir /app/config -p 


VOLUME [ "/app/dist","/app/ztncui","/var/lib/zerotier-one","/app/config"]

CMD ["/bin/sh","/app/entrypoint.sh"]
