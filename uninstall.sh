#!/bin/sh

# uninstall binary
sudo systemctl stop frmw.service
sudo systemctl disable frmw.service
sudo rm /usr/sbin/frmw-service

# uninstall binaries
sudo rm /usr/sbin/set_power_limit
sudo rm /usr/sbin/frmw_ectool

# uninstall systemd unit
sudo rm /etc/systemd/system/frmw.service

echo ""
echo "Done. Please reboot your computer"
echo ""
echo "Optionally, you can delete those files:"
echo "/etc/frmw-scripts/*"
echo "/etc/frmw-service-config.json"
