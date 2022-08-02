const battery = require('./battery');
const cpu = require('./plugins/cpu');
const powertop = require('./plugins/powertop');
const notification = require('./notification');

function start() {
  battery.onBatteryStatusChanged((status) => {
    const isBattery = status === battery.DISCHARGING;
    const noti = `FRMW: ${isBattery ? 'On battery' : 'Charging'}`;
    notification.send(noti);
    console.log(noti);
    cpu.setLowPowerMode(isBattery);
    powertop.autoTune();
  });
  
  console.log('Service is running...');
  notification.send('Framework Laptop Service is running');
}

module.exports = {
  start,
};