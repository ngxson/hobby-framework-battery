# Framework Laptop battery tuning service on Linux (Intel 12th)

**IMPORTANT NOTICE**: This service is in very early development phase and can be unstable. Currently, I can only test it on Fedora 36.

Support only Framework Laptop with **Intel 12th gen** CPU.

## Install

**Install dependencies**:

Ubuntu: `sudo apt install devmem2 msr-tools libcgroup-tools powertop`

Fedora: `sudo dnf install devmem2 msr-tools libcgroup-tools powertop`

**Install the service**: You need NodeJS (v14 and up) installed on your system. Verify with `node --version`

```
npm i
./install.sh
```

Optionally, you can disable Secure Boot for changing power limit.

## Features

- **Limit to only E-cores on battery**: This is done by using `cpuset`. See in the POC section below.
- **Limit PL1 and PL2 on battery**: PL1 and PL2 can be set automatically on AC and on battery. These values can be configured via web interface.
- **Web interface**: Can be accessed via http://localhost:1515

## TODO

- ~~Add config file~~
- ~~(Maybe) add a GUI via web browser~~
- ~~Add notification on KDE~~ no need, since you can see the status via web interface
- ~~Add option for forcing AC mode on battery~~
- Limit charging (both start and end values)

## POCs

Scripts below are for development purpose:

### cpuset

```
mkdir /sys/fs/cgroup/cpuset
mount -t cgroup -o cpuset cpuset /sys/fs/cgroup/cpuset

cgcreate -g cpuset:p_cores
echo 0-7 > /sys/fs/cgroup/cpuset/p_cores/cpus
echo 0 > /sys/fs/cgroup/cpuset/p_cores/mems

cgcreate -g cpuset:e_cores
echo 8-15 > /sys/fs/cgroup/cpuset/e_cores/cpus
echo 0 > /sys/fs/cgroup/cpuset/e_cores/mems

for pid in $(ps -eLo pid) ; do cgclassify -g cpuset:e_cores $pid; done
```

## Thanks to

- setPL from horshack-dpreview: https://github.com/horshack-dpreview/setPL/blob/master/setPL.sh
