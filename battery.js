const fs = require('fs');
const exec = require('promised-exec');
const { spawn } = require('child_process');

const UDEV_LISTEN_PYTHON_SCRIPT = `
import os
import socket

NETLINK_KOBJECT_UEVENT = 15
UEVENT_BUFFER_SIZE = 4096

sock = socket\\
    .socket(socket.AF_NETLINK, socket.SOCK_RAW, NETLINK_KOBJECT_UEVENT)
sock.bind((os.getpid(), -1))

print('READY', flush=True)

while True:
  data = sock.recv(UEVENT_BUFFER_SIZE)
  try:
    if data.startswith(b'libudev'):
      continue
    event = data.decode('utf-8').split('\\x00')
    if len(event) < 3 or not event[0].startswith('change@'):
      continue
    if any('POWER_SUPPLY_NAME=ACAD' in s for s in event):
      online = any('POWER_SUPPLY_ONLINE=1' in s for s in event)
      if online:
        print('POWER_SUPPLY_ONLINE=1', flush=True)
      else:
        print('POWER_SUPPLY_ONLINE=0', flush=True)
  except Exception:
    pass
`;
const PYTHON_EXEC_PATH = [
  '/usr/bin/python',
  '/usr/local/bin/python',
  '/usr/sbin/python',
  '/usr/local/sbin/python',
  '/sbin/python',
  '/bin/python',
  '/opt/python/bin/python',
].find(p => fs.existsSync(p));
const CHARGING = 0;
const DISCHARGING = 1;

const delay = (ms) => new Promise(r => setTimeout(r, ms));
const getBatteryPath = () => {
  // because Logitech mouse/kb can register itself as power_supply (because it can report its battery state), we cannot rely on udev event
  const files = fs.readdirSync('/sys/class/power_supply');
  for (const dir of files) {
    if (dir.match(/BAT/)) return `/sys/class/power_supply/${dir}`;
  }
};
const AC_ONLINE_PATH = '/sys/class/power_supply/ACAD/online';
const BATT_CAPACITY_PATH = `${getBatteryPath()}/capacity`;

function getStatus() {
  return fs.readFileSync(AC_ONLINE_PATH).toString().match(/1/i)
    ? CHARGING : DISCHARGING;
}

function getPercent() {
  return parseInt(fs.readFileSync(BATT_CAPACITY_PATH).toString());
}

async function onBatteryStatusChanged(callback) {
  let lastStatus = -1;

  const handler = async () => {
    try {
      const status = getStatus();
      if (status !== lastStatus) callback(status);
      lastStatus = status;
    } catch (e) {
      console.error(e);
    }
  };

  let pyProcess;
  if (PYTHON_EXEC_PATH) {
    pyProcess = spawn(PYTHON_EXEC_PATH, ['-c', UDEV_LISTEN_PYTHON_SCRIPT])
  } else {
    const FALLBACK_PY_FILE_DIR = '/tmp/_frmw_udev.py'
    fs.writeFileSync(FALLBACK_PY_FILE_DIR, UDEV_LISTEN_PYTHON_SCRIPT)
    pyProcess = spawn('/bin/sh', ['-c', `python ${FALLBACK_PY_FILE_DIR}`]);
  }

  pyProcess.stdout.on('data', (data) => {
    console.log('pyProcess', data.toString());
    setTimeout(handler, 2000);
  });

  pyProcess.stderr.on('data', (data) => {
    console.error('pyProcess ERR', data.toString());
  });
}


// battery level listener

const battLevelCallbacks = [];
function onBatteryLevelChanged(callback) {
  battLevelCallbacks.push(callback);
}
let lastBattLevel = -1;
const battLevelHandler = () => {
  try {
    const level = getPercent();
    if (level != lastBattLevel) {
      lastBattLevel = level;
      for (const cb of battLevelCallbacks) cb(level);
    }
  } catch (e) {
    // ignored
  }
};
setInterval(battLevelHandler, 60000);

module.exports = {
  CHARGING,
  DISCHARGING,
  onBatteryStatusChanged,
  onBatteryLevelChanged,
  getStatus,
  getPercent,
};