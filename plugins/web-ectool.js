const webServer = require('./web-server');
const ectool = require('./ectool');
const config = require('../config');
const battery = require('../battery');
const fs = require('fs');

const getHTMLContent = async () => {
  const {
    chargingLimitEnable,
    chargingLimitStart,
    chargingLimitEnd,
    keyRemaps,
  } = ectool.getConfig();
  return `
    </br>
    <b>Current charging limit:</b> ${await ectool.getCurrentChargingLimit()}%</br>
    <b>Smart charging limit:</b> ${chargingLimitEnable ? '<span style="color: green">ON</span>' : '<span style="color: gray">OFF</span>'}<br/>
    </br>
    
    <form method="POST">
    <b>Smart charging limit:</b></br>
    </br>

    <p style="margin-left: 0.5em">
      <b>Note:</b> This function is in development and may results bugs (i.e. not charging after a reboot). If you experience a bug, you can use "force start charging" button below.<br/>
      If you unplug when the charging above start limit, you still have 5 minutes to re-plug and to continue the charging.<br/>
      <br/>

      Status: <select value="${chargingLimitEnable ? 1 : 0}" name="chargingLimitEnable">
                <option value="1">ON</option>
                <option value="0">OFF</option>
              </select>
      Start charging from (%): <input type="number" name="chargingLimitStart" value="${chargingLimitStart}" />
      Stop charging at (%): <input type="number" name="chargingLimitEnd" value="${chargingLimitEnd}" />
    </p>
    </br>

    <input type="submit" value="Save and apply" />
    </form>
    <form method="POST" style="display: inline-block">
      <input type="hidden" name="action" value="force_start_charging" />
      <input type="submit" value="Force start charging" />
    </form>

    <br/>
    <form method="POST" style="display: inline-block">
      <input type="hidden" name="action" value="enable_charging" />
      <input type="submit" value="Force ENABLE charging (set limit=100 & disable smart limit)" />
    </form>
    &nbsp;&nbsp;
    <form method="POST" style="display: inline-block">
      <input type="hidden" name="action" value="disable_charging" />
      <input type="submit" value="Force DISABLE charging (set limit=5 & disable smart limit)" />
    </form>
  `;
};

function start() {
  webServer.addMenuEntry('EC tool', '/ectool');
  webServer.app.get('/ectool', async (req, res) => {
    res.sendHtmlBody(await getHTMLContent());
  });
  webServer.app.post('/ectool', (req, res) => {
    const {body} = req;
    if (body.action === 'force_start_charging') {
      ectool.forceStartCharging();
    } else if (body.action === 'enable_charging') {
      ectool.enableCharging();
    } else if (body.action === 'disable_charging') {
      ectool.disableCharging();
    } else {
      const { chargingLimitEnable, chargingLimitStart, chargingLimitEnd } = body;
      const newConfig = {
        chargingLimitEnable: parseInt(chargingLimitEnable) === 1,
        chargingLimitStart: Math.max(parseInt(chargingLimitStart), 5),
        chargingLimitEnd: Math.min(parseInt(chargingLimitEnd), 100),
      };
      ectool.applySettings(newConfig, true);
    }
    setTimeout(() => res.redirect(302, '/ectool'), 5000);
  });
}

module.exports = { start };