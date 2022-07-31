const battery = require('./battery');
const cpu = require('./cpu');

function start() {
  battery.onBatteryStatusChanged((status) => {
    const pCoresEnabled = status === battery.CHARGING;
    console.log('pCoresEnabled', pCoresEnabled);
    cpu.setPCores(pCoresEnabled);
  });
  
  console.log('Service is running...');
}

module.exports = {
  start,
};