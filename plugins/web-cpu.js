const webServer = require('./web-server');
const cpu = require('./cpu');
const config = require('../config');
const battery = require('../battery');
const fs = require('fs');
const readFloat = (p) => parseFloat(fs.readFileSync(p).toString());

const getHTMLContent = () => {
  // TODO: add config UI for lowPowerCores
  const { name, powerLimitsBattery, powerLimitsAC } = cpu.getCPUModelConfig();
  const currPL1 = readFloat('/sys/class/powercap/intel-rapl:0/constraint_0_power_limit_uw') / 1000000;
  const currPL2 = readFloat('/sys/class/powercap/intel-rapl:0/constraint_1_power_limit_uw') / 1000000;
  const enableCores = fs.readFileSync('/sys/fs/cgroup/cpuset/active_cores/cpuset.cpus').toString();
  return `
    </br>
    <b>CPU model:</b> ${name}</br>
    <b>Current PL1:</b> ${Math.round(currPL1)} W<br/>
    <b>Current PL2:</b> ${Math.round(currPL2)} W<br/>
    <b>Enabled cores:</b> from cpu${enableCores.replace('-', ' to cpu')}<br/>
    <button onclick="window.location.reload()">Reload</button><br/>
    </br>
    
    <form method="POST">
    <b>On AC:</b></br>
    <p style="margin-left: 0.5em">
      PL1 (in Watt): <input type="number" name="powerLimitsAC[PL1]" value="${powerLimitsAC.PL1}" />
      PL2 (in Watt): <input type="number" name="powerLimitsAC[PL2]" value="${powerLimitsAC.PL2}" />
    </p>
    </br>

    <b>On Battery:</b></br>
    <p style="margin-left: 0.5em">
      PL1 (in Watt): <input type="number" name="powerLimitsBattery[PL1]" value="${powerLimitsBattery.PL1}" />
      PL2 (in Watt): <input type="number" name="powerLimitsBattery[PL2]" value="${powerLimitsBattery.PL2}" />
    </p>
    </br>
    <input type="submit" value="Save and apply" />
    </form>

    <br/>
    <form method="POST" style="display: inline-block">
      <input type="hidden" name="action" value="lp_on" />
      <input type="submit" value="Force apply low power (battery) mode" />
    </form>
    &nbsp;&nbsp;
    <form method="POST" style="display: inline-block">
      <input type="hidden" name="action" value="lp_off" />
      <input type="submit" value="Force apply AC mode" />
    </form>
  `;
};

function start() {
  webServer.addMenuEntry('CPU Tuning', '/cpu');
  webServer.app.get('/cpu', (req, res) => {
    res.sendHtmlBody(getHTMLContent());
  });
  webServer.app.post('/cpu', (req, res) => {
    const {body} = req;
    if (body.action === 'lp_on') {
      cpu.setLowPowerMode(true);
    } else if (body.action === 'lp_off') {
      cpu.setLowPowerMode(false);
    } else {
      const { powerLimitsAC, powerLimitsBattery } = body;
      const newConfig = {
        powerLimitsAC: {
          PL1: Math.max(1, parseInt(powerLimitsAC.PL1)),
          PL2: Math.max(1, parseInt(powerLimitsAC.PL2)),
        },
        powerLimitsBattery: {
          PL1: Math.max(1, parseInt(powerLimitsBattery.PL1)),
          PL2: Math.max(1, parseInt(powerLimitsBattery.PL2)),
        },
      };
      //console.log(newConfig)
      config.setConfig('cpu', newConfig);
      cpu.patchCPUModelConfig(newConfig);
      cpu.setLowPowerMode(battery.getStatus() === battery.DISCHARGING);
    }
    res.redirect(302, '/cpu');
  });
}

module.exports = { start };