const fs = require('fs');
const exec = require('promised-exec');

const POWER_SUPPLY_PATH = '/tmp/power_supply';
const CHARGING = 0;
const DISCHARGING = 1;

const delay = (ms) => new Promise(r => setTimeout(r, ms));

async function onBatteryStatusChanged(callback) {
  let lastStatus = -1;
  const handler = () => {
    if (fs.existsSync(POWER_SUPPLY_PATH)) {
      const status = fs.readFileSync(POWER_SUPPLY_PATH).toString().match(/1/)
        ? CHARGING : DISCHARGING;
      if (status !== lastStatus) callback(status);
      lastStatus = status;
    } else {
      exec('sleep 5; udevadm trigger -s power_supply');
    }
  };

  handler();
  // wait until we can watch
  while (true) {
    await delay(6000);
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
};