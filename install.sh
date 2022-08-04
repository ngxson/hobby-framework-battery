#!/bin/sh

verifyAppInstalled() {
  toolName=$1
  if ! command -v "$toolName" &> /dev/null; then
    echo "Required app '${toolName}' is not installed"
    exit 1
  fi
}

# verification
verifyAppInstalled 'devmem2'
verifyAppInstalled 'rdmsr'
verifyAppInstalled 'wrmsr'
verifyAppInstalled 'turbostat'
verifyAppInstalled 'setpci'
verifyAppInstalled 'powertop'
verifyAppInstalled 'cgcreate'
verifyAppInstalled 'udevadm'

# install binary
npm run build
sudo systemctl stop frmw.service 2>/dev/null
sudo cp frmw-service /usr/sbin/frmw-service
sudo chown root:root /usr/sbin/frmw-service
sudo chmod 744 /usr/sbin/frmw-service

# install set_power_limit
sudo cp ./bin/set_power_limit /usr/sbin/set_power_limit
sudo chmod +x /usr/sbin/set_power_limit

# install frmw_ectool
sudo cp ./bin/frmw_ectool /usr/sbin/frmw_ectool
sudo chmod +x /usr/sbin/frmw_ectool

# install rule
sudo cp ./systemd/90-frmw.rules /etc/udev/rules.d/90-frmw.rules
sudo chmod 644 ./systemd/90-frmw.rules /etc/udev/rules.d/90-frmw.rules
sudo chown root:root ./systemd/90-frmw.rules /etc/udev/rules.d/90-frmw.rules

# install systemd unit
sudo cp ./systemd/frmw.service /etc/systemd/system/frmw.service
sudo chmod 644 /etc/systemd/system/frmw.service
sudo chown root:root /etc/systemd/system/frmw.service
sudo systemctl daemon-reload
sudo systemctl enable frmw.service
sudo systemctl restart frmw.service
