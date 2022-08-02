const battery = require('./battery');
const cpu = require('./plugins/cpu');
const notification = require('./notification');

function start() {
  battery.onBatteryStatusChanged((status) => {
    const isBattery = status === battery.DISCHARGING;
    const noti = `FRMW: ${isBattery ? 'On battery' : 'Charging'}`;
    notification.send(noti);
    console.log(noti);
    cpu.setLowPowerMode(isBattery);
  });
  
  console.log('Service is running...');
  notification.send('Framework Laptop Service is running');
}

module.exports = {
  start,
};