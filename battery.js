const fs = require('fs');
const exec = require('promised-exec');

const POWER_SUPPLY_PATH = '/tmp/power_supply';
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
  exec('udevadm trigger -s power_supply');

  const handler = async () => {
    if (fs.existsSync(POWER_SUPPLY_PATH)) {
      const status = getStatus();
      if (status !== lastStatus) callback(status);
      lastStatus = status;
    } else {
      exec('sleep 3; udevadm trigger -s power_supply');
    }
  };

  // wait until we can watch
  while (true) {
    await delay(5000);
    if (!fs.existsSync(POWER_SUPPLY_PATH)) continue;
    let intervalId = null;
    fs.watch(POWER_SUPPLY_PATH, () => {
      // to make sure that the status is up-to-date, we re-run the check twice
      setTimeout(handler, 2000);
      setTimeout(handler, 10000);
      if (intervalId !== null) {
        clearInterval(intervalId);
      }
      // check periodically, for the case after hibernation
      intervalId = setInterval(handler, 60000);
    });
    handler();
    return;
  }
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