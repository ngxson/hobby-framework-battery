# Framework Laptop battery tuning service on Linux

Tested on Fedora 36. It should also work on Ubuntu.

## FAQs

- Will it works with `tlp`?  
Yes. This isn't a replacement for `tlp`. It is recommended to use this service with `tlp`.
- Why using nodejs / systemd service?  
In short, I want to do many things in only one process: monitoring battery, GUI via web server,...

## Install

1. **Install dependencies**:  
**Ubuntu**: `sudo apt install devmem2 msr-tools cgroup-tools powertop linux-tools-common`  
.    
If `devmem2` package is not found, enable universe and multiverse repository. See: https://askubuntu.com/questions/378558  
.  
**Fedora**: `sudo dnf install devmem2 msr-tools libcgroup-tools powertop`  

2. **Install nodejs**: Depends on which distribution you're using, please search on Google. You can install any version from v14 (v16.10.0 is recommended). Verify with `node --version`

3. **Install python**: Most Linux distributions already come with python. All python version from 3.8 should work fine.

4. **Install the service**:  
```
npm i
./install.sh
```

Optionally, you can disable Secure Boot for changing power limit.  
After having installed, you can access the web interface via http://localhost:1515
It is recommended to enable **CPU Tuning** from the web interface after the installation. You may want to change the default `PL1=4W` to something higher for better performance on battery.

To uninstall, simply run `./uninstall.sh` then reboot your laptop.

## Features

- **Web interface**: Can be accessed via http://localhost:1515
- **Limit to only E-cores on battery**: This is done by using `cpuset`. Currently only supported on **12th gen Intel** (See more in the POC section below.)
- **Limit PL1 and PL2 on battery**: PL1 and PL2 can be set automatically on AC and on battery. These values can be configured via web interface.
- **EC Tool GUI**: allow you to remap keys, change charging limit and enable a colorful RGB mode (￣▽￣)/♫•*¨*•.¸¸♪

## Development

1. Make sure you have NodeJS (v14 and up) installed on your system
2. Use `which node` to get the path of node executable
3. `sudo ln -s /sbin/node (your node path)`
4. Go to the project directory, `npm i` to install dependencies
5. `sudo node index.js`

## TODO

- ~~Add config file~~
- ~~(Maybe) add a GUI via web browser~~
- ~~Add notification on KDE~~ no need, since you can see the status via web interface
- ~~Add option for forcing AC mode on battery~~
- ~~Better algorithm for moving processes among cores~~
- ~~Pause charging~~
- ~~Fan curve control~~
- Docker version (simplify installation process)

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
