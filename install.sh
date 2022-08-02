#!/bin/sh

# install binary
npm run build
sudo cp frmw-service /usr/sbin/frmw-service
sudo chown root:root /usr/sbin/frmw-service
sudo chmod 744 /usr/sbin/frmw-service

# install systemd unit
sudo cp ./systemd/frmw.service /etc/systemd/system/frmw.service
sudo chmod 644 /etc/systemd/system/frmw.service
sudo chown root:root /etc/systemd/system/frmw.service
sudo systemctl --daemon-reload
sudo systemctl enable frmw.service
sudo systemctl start frmw.service
