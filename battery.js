const fs = require('fs');

function getBatteryPath() {
  const files = fs.readdirSync('/sys/class/power_supply');
  for (const dir of files) {
    if (dir.match(/BAT/)) return `/sys/class/power_supply/${dir}`;
  }
}

const CHARGING = 0;
const DISCHARGING = 1;
function onBatteryStatusChanged(callback) {
  let lastStatus = -1;
  const batteryStatusPath = `${getBatteryPath()}/status`;
  const fn = () => {
    const status = fs.readFileSync(batteryStatusPath).toString().match(/disch/i)
      ? DISCHARGING : CHARGING;
    if (status !== lastStatus) callback(status);
    lastStatus = status;
  };
  setInterval(fn, 10000);
  setTimeout(fn, 1000);
}

module.exports = {
  CHARGING,
  DISCHARGING,
  onBatteryStatusChanged,
};