const webServer = require('./web-server');
const ectool = require('./ectool');
const config = require('../config');
const battery = require('../battery');
const fs = require('fs');
const exec = require('promised-exec');
const { KB_MATRIX, SCANCODES } = require('../constants');

let lastFanSpeed = 90;

const KtoC = v => (+v) - 273;
const CtoK = v => (+v) + 273;
const TEMPERATURE_OPTIONS_START = 30;
const TEMPERATURE_OPTIONS = (new Array(60))
  .fill(null)
  .map((_, i) => `<option value="${CtoK(TEMPERATURE_OPTIONS_START + i)}">
    ${TEMPERATURE_OPTIONS_START + i}
  </option>`)
  .join('');

const escapeHTML = (text) => text
  .replace(/ /g, "&nbsp;")
  .replace(/"/g, "&quot;")
  .replace(/</g, "&lt;")
  .replace(/>/g, "&gt;")
  .replace(/\n/g, "<br />");

const getHTMLContent = async () => {
  if (!ectool.getIsAvailable()) {
    return 'Error with ectool. Have you disabled Secure Boot?';
  }

  const {
    isChargingPaused,
    keyRemaps,
  } = ectool.getConfig();
  const currentLimit = await ectool.getCurrentChargingLimit();
  const ecVersion = await ectool.getECVersion();
  const fanPoints = await getFanPoints();
  return `
    ${!isChargingPaused ? `
      <br />
      <b>Current charging limit:</b> ${currentLimit}%<br />
      <br />
      <br />

      <b>Set charging limit:</b> <br/>
      <small>This setting will be applied on boot</br><br/>
      <form method="POST" style="display: inline-block">
        <input type="hidden" name="action" value="enable_charging" />
        <input type="submit" value="Set charging limit to 100" />
      </form>
      &nbsp;&nbsp;
      <form method="POST" style="display: inline-block">
        <input type="hidden" name="action" value="disable_charging" />
        <input type="submit" value="Set charging limit to 20" />
      </form>
      <br />
      <form method="POST">
        Or custom value (min=20 and max=100):
        <input type="hidden" name="action" value="charging_set_custom" />
        <input type="number" name="value" value="${currentLimit}" />
        <input type="submit" value="Set custom value" />
      </form>

      <br />
      ------------------------
      <br />
    ` : ''}

    <b>Pause charging:</b> <br/>
    Enabling this will "disconnect" the charger from the battery, only use the current from the charger to run the computer.<br/>
    Status: <b>${isChargingPaused ? `CHARGING PAUSED AT ${currentLimit}%` : 'disable'}</b>
    &nbsp;&nbsp;&nbsp;
    <form method="POST" style="display: inline-block">
      <input type="hidden" name="action" value="toggle_pause_charging" />
      <input type="submit" value="Toggle" />
    </form>

    <br />
    ------------------------
    <br />

    <b>Fan control: </b>
    <form method="POST" style="display: inline-block">
      <input type="hidden" name="action" value="fan_auto" />
      <input type="submit" value="Set fan control to auto" />
    </form>
    <br />
    <form method="POST" style="display: inline-block">
      Or custom value (min=0 and max=100):
      <input type="number" name="value" value="${lastFanSpeed}" />
      <input type="hidden" name="action" value="fan_custom" />
      <input type="submit" value="Set custom fan duty value" />
    </form>

    <br />
    <b>Temperature:</b> (real-time, update every 5 seconds)<br />
    <pre id="temperature_view" style="font-size: 110%;"></pre>
    <script>
      var temperature_view_elem = document.getElementById('temperature_view');
      function update_temperature_view() {
        fetch('/ectool/temperature')
          .then(response => response.text())
          .then(text => {temperature_view_elem.innerHTML = text});
      }
      setInterval(update_temperature_view, 5000);
      update_temperature_view();
    </script>

    <b>Fan temperature points</b><br/>
    <pre>id - fanOff - fanMax - name<br/>${fanPoints.map(({id, fanOff, fanMax, name}) => 
      `${id}  ${KtoC(fanOff)}°C  ${KtoC(fanMax)}°C  ${name}`
    ).join('<br/>')}</pre>
    <form method="POST" style="display: inline-block">
      Change fan point:
      <select name="sensor">
        ${fanPoints.map(({id, warn, high, halt, name}) => 
          `<option value="${escapeHTML(JSON.stringify({ id, warn, high, halt }))}">${name}</option>`
        ).join('')}
      </select>
      &nbsp;&nbsp;
      fan_off = <select name="fan_off">${TEMPERATURE_OPTIONS}</select>
      &nbsp;&nbsp;
      fan_max = <select name="fan_max">${TEMPERATURE_OPTIONS}</select>
      &nbsp;&nbsp;&nbsp;&nbsp;
      <input type="hidden" name="action" value="fan_point" />
      <input type="submit" value="Set" />
    </form>

    <br />
    ------------------------
    <br />

    Key remap: <a href="/ectool/kb" target="_blank">Need more info?</a><br/>
    <small>This setting will be applied on boot.</small><br/>
    <br/>
    <form method="POST">
      ${[0, 1, 2, 3, 4, 5, 6, 7, 8].map(i => {
        selectedByte0 = 'NONE';
        selectedByte1 = 'NONE';
        selectedHex = 'NONE';
        try {
          const [e0, e1, e2] = keyRemaps[i].split(',');
          selectedByte0 = e0.replace('b', '');
          selectedByte1 = e1.replace('b', '');
          selectedHex = e2;
        } catch (e) {
          //console.error(e);
        }
        //console.log(selectedByte0, selectedByte1, selectedHex)
        return `
        from physical key &nbsp;
        <select name="value[${i}][0]" autocomplete="off" style="font-family: sans-serif; font-size: 110%; margin-bottom: 0.5em;">
          <option value="NONE" ${selectedByte0 === 'NONE' ? 'selected' : ''}>...</option>
          ${KB_MATRIX.map(({byte0, byte1, key}) =>
            `<option value="b${byte0},b${byte1}" ${byte0 === selectedByte0 && byte1 === selectedByte1 ? 'selected' : ''}>${escapeHTML(key)}</option>`
          ).join('')}
        </select>
        &nbsp; to &nbsp;
        <select name="value[${i}][1]" autocomplete="off" style="font-family: sans-serif; font-size: 110%; margin-bottom: 0.5em;">
          <option value="NONE" ${selectedHex === 'NONE' ? 'selected' : ''}>...</option>
          ${SCANCODES.map(({name, hex}) =>
            `<option value="${hex}" ${selectedHex === hex ? 'selected' : ''}>${name}</option>`
          ).join('')}
        </select>
      `;
      }).join('<br/>')}
      <br/><br/>
      <input type="hidden" name="action" value="key_remap" />
      <input type="submit" value="Save & apply key remap" />
    </form>
    <br/>
    Something goes wrong? Reset keyboard remap here:
    <form method="POST" style="display: inline-block">
      <input type="hidden" name="action" value="key_remap_reset" />
      <input type="submit" value="Reset" />
    </form>

    <br />
    <br />
    ------------------------
    <br />

    <form method="POST">
    <input type="hidden" name="action" value="led_funny" />
    <style>
    .rainbow-text {
      font-family: Arial;
      font-weight: bold;
      font-size: 20px;
    }
    .rainbow-text .block-line > span {
      display: inline-block;
    }
    </style>
    ${!ectool.getFunnyLEDDancingStatus()
      ? `<button type="submit"><div class="rainbow-text" style="text-align: center;">
      <span class="block-line"><span><span style="color:#ff0000;">E</span><span style="color:#ff7700;">n</span><span style="color:#ffee00;">a</span><span style="color:#99ff00;">b</span><span style="color:#26ff00;">l</span><span style="color:#00ff51;">e&nbsp;</span></span><span><span style="color:#00ffc8;">R</span><span style="color:#00c3ff;">G</span><span style="color:#004cff;">B&nbsp;</span></span><span><span style="color:#2a00ff;">M</span><span style="color:#9d00ff;">O</span><span style="color:#ff00ea;">D</span><span style="color:#ff0073;">E</span></span></span>
      </div></button>`
      : `RGB Mode is ON. Look at your LEDs (￣▽￣)/♫•*¨*•.¸¸♪ <button type="submit">Disable</button>`
    }
    </form>


    <br />
    ------------------------
    <br />

    EC version:
    <pre>${escapeHTML(ecVersion)}</pre>
  `;
};

const getHTMLContentKB = () => {
  return `
    Thanks to <a href="https://www.howett.net/data/framework_matrix" target="_blank">howett.net</a> for sharing the keyboard matrix.<br/>
    <br/><br/>
    Explaination: ectool allows user to remap a physical key (from the matrix) to a SCANCODE (a code that the program can understand). In the sections below, you can find a list of keys and scan codes. You can use Ctrl+F to quickly find a value.<br/><br/>
    If you are not using QWERTY layout, you can find a reference of QWERTY layout on google. The placement of keys will be the same. For example, on AZERTY keyboard, the 'A' key is the 'q' (b0,b2) in the list below.
    <br/><br/>
    <h3>Keyboard matrix (QWERTY layout)</h3>
    <pre>${
      KB_MATRIX.map(({byte0, byte1, key}) => `b${byte0},b${byte1}    ${escapeHTML(key)}<br/>`).join('')
    }</pre>
    <h3>Scan code</h3>
    <pre>${
      SCANCODES.map(({name, hex}) => `${name}    (hex=${hex})<br/>`).join('')
    }</pre>
  `;
};

const getHTMLContentTemperature = async () => {
  const [temps, fanSpeed] = await Promise.all([
    exec('/usr/sbin/frmw_ectool temps all'),
    exec('/usr/sbin/frmw_ectool pwmgetfanrpm all'),
  ]);
  return `${escapeHTML(temps)}<br/>${fanSpeed}<br/>`;
};

async function getFanPoints() {
  const fanPointsRaw = await exec('/usr/sbin/frmw_ectool thermalget');
  const REGEX = /[ ]+\d+\s+\d+[^\n]+/g;
  const fanPointsVals = (fanPointsRaw || '').match(REGEX);
  const fanPoints = [];
  if (fanPointsVals) {
    for (const valuesRaw of fanPointsVals) {
      const values = valuesRaw.trim().split(/\s+/);
      const [id, warn, high, halt, fanOff, fanMax, name] = values;
      if (+halt < 333 || +halt > 399) continue; // ignore (maybe) incorrect value
      fanPoints.push({
        id: +id, warn: +warn, high: +high, halt: +halt,
        fanOff: +fanOff, fanMax: +fanMax,
        name
      });
    } 
  }
  return fanPoints;
}

function start() {
  webServer.addMenuEntry('EC tool', '/ectool');
  webServer.app.get('/ectool', async (req, res) => {
    res.sendHtmlBody(await getHTMLContent(), { title: 'Framework EC Tool' });
  });
  webServer.app.get('/ectool/kb', async (req, res) => {
    res.sendHtmlBody(getHTMLContentKB(), { title: 'Framework Keyboard Info' });
  });
  webServer.app.get('/ectool/temperature', async (req, res) => {
    res.send(await getHTMLContentTemperature());
  });
  webServer.app.post('/ectool', (req, res) => {
    const { isChargingPaused } = ectool.getConfig();
    const {body} = req;
    let delay = 2000;
    if (body.action === 'enable_charging') {
      ectool.applySettings({ chargingLimitEnd: 100 }, true);
    } else if (body.action === 'disable_charging') {
      ectool.applySettings({ chargingLimitEnd: 20 }, true);
    } else if (body.action === 'charging_set_custom') {
      const chargingLimitEnd = parseInt(body.value);
      ectool.applySettings({ chargingLimitEnd }, true);
    } else if (body.action === 'fan_auto') {
      ectool.setFanDuty(null); delay = 1;
    } else if (body.action === 'fan_custom') {
      const val = parseInt(body.value);
      lastFanSpeed = val;
      ectool.setFanDuty(val); delay = 1;
    } else if (body.action === 'fan_point') {
      const { id, warn, high, halt } = JSON.parse(body.sensor);
      const fanOff = parseInt(body.fan_off);
      const fanMax = parseInt(body.fan_max);
      //console.log({ id, warn, high, halt, fanOff, fanMax });
      ectool.setFanPoint({ id, warn, high, halt, fanOff, fanMax });
    } else if (body.action === 'led_funny') {
      ectool.funnyLEDDancing(!ectool.getFunnyLEDDancingStatus());
      delay = 1;
    } else if (body.action === 'key_remap') {
      const keyRemaps = body.value.map(e => e.join(',')).filter(e => !e.match(/NONE/));
      ectool.applySettings({ keyRemaps }, true);
      delay = 1;
    } else if (body.action === 'key_remap_reset') {
      ectool.resetKeyboardMatrix();
    } else if (body.action === 'toggle_pause_charging') {
      ectool.applySettings({ isChargingPaused: !isChargingPaused }, true);
      delay = 500;
    }
    setTimeout(() => res.redirect(302, '/ectool'), delay);
  });
}

module.exports = { start };