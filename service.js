const config = require('./config'); // preloaded
const battery = require('./battery');
const cpu = require('./plugins/cpu');
const powertop = require('./plugins/powertop');
const ectool = require('./plugins/ectool');
const scripts = require('./plugins/scripts');
const webServer = require('./plugins/web-server');
const webServerCPU = require('./plugins/web-cpu');
const webServerECTool = require('./plugins/web-ectool');
const webServerDebug = require('./plugins/web-debug');
const notification = require('./notification');

function start() {
  webServer.start();
  battery.onBatteryStatusChanged((status) => {
    const isBattery = status === battery.DISCHARGING;
    console.log(`FRMW: ${isBattery ? 'On battery' : 'Charging'}`);

    if (cpu.getCPUModelConfig().autoPowerLimit)
      cpu.setLowPowerMode(isBattery);

    scripts.run(isBattery ? scripts.SCRIPT_ON_BATTERY : scripts.SCRIPT_ON_AC);
    // ectool
    if (isBattery) ectool.handleUnplugCharger();
    else ectool.handlePlugCharger();
  });
  
  console.log('Service is running...');
  notification.send(
    'Framework Laptop Service is running',
    'On browser: http://localhost:1515'
  );
  scripts.run(scripts.SCRIPT_ON_START);
  webServerCPU.start();
  webServerECTool.start();
  webServerDebug.start();
}

module.exports = {
  start,
};