#!/bin/sh

# uninstall binary
sudo systemctl stop frmw.service
sudo systemctl disable frmw.service
sudo rm /usr/sbin/frmw-service

# uninstall set_power_limit
sudo rm /usr/sbin/set_power_limit

# uninstall systemd unit
sudo rm /etc/systemd/system/frmw.service

echo "Done. Please reboot your computer"
