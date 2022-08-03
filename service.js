const battery = require('./battery');
const cpu = require('./plugins/cpu');
const powertop = require('./plugins/powertop');
const scripts = require('./plugins/scripts');
const notification = require('./notification');

function start() {
  battery.onBatteryStatusChanged((status) => {
    const isBattery = status === battery.DISCHARGING;
    const noti = `FRMW: ${isBattery ? 'On battery' : 'Charging'}`;
    notification.send(noti);
    console.log(noti);
    cpu.setLowPowerMode(isBattery);
    powertop.autoTune();
    scripts.run(isBattery ? scripts.SCRIPT_ON_BATTERY : scripts.SCRIPT_ON_AC);
  });
  
  console.log('Service is running...');
  notification.send('Framework Laptop Service is running');
  scripts.run(scripts.SCRIPT_ON_START);
}

module.exports = {
  start,
};