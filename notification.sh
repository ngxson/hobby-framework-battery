#!/bin/sh

sudo -u "$(id -nu $1)" DBUS_SESSION_BUS_ADDRESS=unix:path=/run/user/$1/bus notify-send "$2" "$3"