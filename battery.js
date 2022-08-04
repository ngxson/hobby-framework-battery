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
const BATTERY_STATUS_PATH = `${getBatteryPath()}/status`;

function getStatus() {
  return fs.readFileSync(BATTERY_STATUS_PATH).toString().match(/disch/i)
    ? DISCHARGING : CHARGING;
}

function getPercent() {
  return parseInt(fs.readFileSync(`${getBatteryPath()}/capacity`));
}

async function onBatteryStatusChanged(callback) {
  let lastStatus = -1;
  exec('udevadm trigger -s power_supply');

  const handler = async () => {
    await delay(1000);
    if (fs.existsSync(POWER_SUPPLY_PATH)) {
      const status = getStatus();
      if (status !== lastStatus) callback(status);
      lastStatus = status;
    } else {
      exec('sleep 5; udevadm trigger -s power_supply');
    }
  };

  // wait until we can watch
  while (true) {
    await delay(5000);
    if (!fs.existsSync(POWER_SUPPLY_PATH)) continue;
    fs.watch(POWER_SUPPLY_PATH, handler);
    handler();
    return;
  }
}

module.exports = {
  CHARGING,
  DISCHARGING,
  onBatteryStatusChanged,
  getStatus,
  getPercent,
};