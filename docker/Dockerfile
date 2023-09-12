FROM sitespeedio/node:ubuntu-22.04-nodejs-18.16.0

RUN apt update && \
  apt install -y devmem2 msr-tools cgroup-tools powertop linux-tools-common pciutils udev sudo python3 libftdi1-2 && \
  ln -s /usr/bin/python3 /usr/bin/python

WORKDIR /app

COPY package.json .
COPY package-lock.json .
RUN npm ci

USER root

COPY . .
RUN mkdir -p /usr/sbin && \
  ./install.sh && \
  rm -rf ./*

CMD [ "/usr/sbin/frmw-service" ]
