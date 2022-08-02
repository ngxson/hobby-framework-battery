const battery = require('./battery');
const cpu = require('./cpu');
const notification = require('./notification');

function start() {
  battery.onBatteryStatusChanged((status) => {
    notification.send(`FRMW: ${status === battery.CHARGING ? 'Charging' : 'On battery'}`);

    const optionalCoresEnabled = status === battery.CHARGING;
    console.log('optionalCoresEnabled', optionalCoresEnabled);
    cpu.setOptionalCores(optionalCoresEnabled);
  });
  
  console.log('Service is running...');
  notification.send('Framework Laptop Service is running');
}

module.exports = {
  start,
};