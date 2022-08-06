const webServer = require('./web-server');
const ectool = require('./ectool');
const config = require('../config');
const battery = require('../battery');
const fs = require('fs');

const escapeHTML = (text) => text.replace(/ /g, "&nbsp;")
  .replace(/</g, "&lt;")
  .replace(/>/g, "&gt;")
  .replace(/\n/g, "<br />");

const getHTMLContent = async () => {
  if (!ectool.getIsAvailable()) {
    return 'Error with ectool. Have you disabled Secure Boot?';
  }

  const {
    keyRemaps,
  } = ectool.getConfig();
  const currentLimit = await ectool.getCurrentChargingLimit();
  const ecVersion = await ectool.getECVersion();
  return `
    <br />
    <b>Current charging limit:</b> ${currentLimit}%<br />
    <br />
    <br />

    Set charging limit: <br/>
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

    Fan control:
    <form method="POST" style="display: inline-block">
      <input type="hidden" name="action" value="fan_auto" />
      <input type="submit" value="Set fan control to auto" />
    </form>
    <br />
    <form method="POST" style="display: inline-block">
      Or custom value (min=0 and max=100):
      <input type="number" name="value" value="${currentLimit}" />
      <input type="hidden" name="action" value="fan_custom" />
      <input type="submit" value="Set custom fan duty value" />
    </form>

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

    Key remap: <a href="/ectool/kb" target="_blank">Need more info?</a><br/>
    <small>This setting will be applied on boot. To reset all remaps, unset all fields below (set to "...") and reboot your computer.</small><br/>
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

    <br />
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

function start() {
  webServer.addMenuEntry('EC tool', '/ectool');
  webServer.app.get('/ectool', async (req, res) => {
    res.sendHtmlBody(await getHTMLContent(), { title: 'Framework EC Tool' });
  });
  webServer.app.get('/ectool/kb', async (req, res) => {
    res.sendHtmlBody(getHTMLContentKB(), { title: 'Framework Keyboard Info' });
  });
  webServer.app.post('/ectool', (req, res) => {
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
      ectool.setFanDuty(val); delay = 1;
    } else if (body.action === 'led_funny') {
      ectool.funnyLEDDancing(!ectool.getFunnyLEDDancingStatus());
      delay = 1;
    } else if (body.action === 'key_remap') {
      const keyRemaps = body.value.map(e => e.join(',')).filter(e => !e.match(/NONE/));
      ectool.applySettings({ keyRemaps }, true);
      //console.log(keyRemaps);
      delay = 1;
    }
    setTimeout(() => res.redirect(302, '/ectool'), delay);
  });
}

// https://www.howett.net/data/framework_matrix
const KB_MATRIX = [
  {byte0: '0', byte1: '0', key: 'c'},
  {byte0: '1', byte1: '0', key: 'KP-'},
  {byte0: '2', byte1: '0', key: 'KP+'},
  {byte0: '3', byte1: '0', key: 'KP2'},
  {byte0: '4', byte1: '0', key: 'KP3'},
  {byte0: '5', byte1: '0', key: 'KP.'},
  {byte0: '6', byte1: '0', key: 'KP1'},
  {byte0: '7', byte1: '0', key: 'KP/'},
  {byte0: '0', byte1: '1', key: 'Delete'},
  {byte0: '1', byte1: '1', key: 'KP Ins'},
  {byte0: '2', byte1: '1', key: 'KP9'},
  {byte0: '3', byte1: '1', key: 'LMeta'},
  {byte0: '4', byte1: '1', key: 'KP7'},
  {byte0: '5', byte1: '1', key: 'Home'},
  {byte0: '6', byte1: '1', key: 'Page Up'},
  {byte0: '7', byte1: '1', key: 'Num Lock'},
  {byte0: '0', byte1: '2', key: 'q'},
  {byte0: '1', byte1: '2', key: 'KP0'},
  {byte0: '2', byte1: '2', key: 'Fn'},
  {byte0: '3', byte1: '2', key: 'Tab'},
  {byte0: '4', byte1: '2', key: '`'},
  {byte0: '5', byte1: '2', key: '1'},
  {byte0: '6', byte1: '2', key: 'Muhenkan'},
  {byte0: '7', byte1: '2', key: 'a'},
  {byte0: '0', byte1: '3', key: 'RAlt'},
  {byte0: '1', byte1: '3', key: 'LAlt'},
  {byte0: '2', byte1: '3', key: ''},
  {byte0: '3', byte1: '3', key: ''},
  {byte0: '4', byte1: '3', key: ''},
  {byte0: '5', byte1: '3', key: ''},
  {byte0: '6', byte1: '3', key: ''},
  {byte0: '7', byte1: '3', key: ''},
  {byte0: '0', byte1: '4', key: 'KP Enter'},
  {byte0: '1', byte1: '4', key: 'Space'},
  {byte0: '2', byte1: '4', key: 'e'},
  {byte0: '3', byte1: '4', key: 'Audio Prev  F4'},
  {byte0: '4', byte1: '4', key: 'Caps Lock'},
  {byte0: '5', byte1: '4', key: '3'},
  {byte0: '6', byte1: '4', key: 'Vol. Up  F3'},
  {byte0: '7', byte1: '4', key: 'Page Down'},
  {byte0: '0', byte1: '5', key: 'x'},
  {byte0: '1', byte1: '5', key: 'z'},
  {byte0: '2', byte1: '5', key: 'Vol. Down  F2'},
  {byte0: '3', byte1: '5', key: 'Mute  F1'},
  {byte0: '4', byte1: '5', key: 's'},
  {byte0: '5', byte1: '5', key: '2'},
  {byte0: '6', byte1: '5', key: 'w'},
  {byte0: '7', byte1: '5', key: 'Escape'},
  {byte0: '0', byte1: '6', key: 'v'},
  {byte0: '1', byte1: '6', key: 'b'},
  {byte0: '2', byte1: '6', key: 'g'},
  {byte0: '3', byte1: '6', key: 't'},
  {byte0: '4', byte1: '6', key: '5'},
  {byte0: '5', byte1: '6', key: '4'},
  {byte0: '6', byte1: '6', key: 'r'},
  {byte0: '7', byte1: '6', key: 'f'},
  {byte0: '0', byte1: '7', key: 'm'},
  {byte0: '1', byte1: '7', key: 'n'},
  {byte0: '2', byte1: '7', key: 'h'},
  {byte0: '3', byte1: '7', key: 'y'},
  {byte0: '4', byte1: '7', key: '6'},
  {byte0: '5', byte1: '7', key: '7'},
  {byte0: '6', byte1: '7', key: 'u'},
  {byte0: '7', byte1: '7', key: 'j'},
  {byte0: '0', byte1: '8', key: '.'},
  {byte0: '1', byte1: '8', key: 'Down'},
  {byte0: '2', byte1: '8', key: '\\'},
  {byte0: '3', byte1: '8', key: 'o'},
  {byte0: '4', byte1: '8', key: 'RF Kill  F10'},
  {byte0: '5', byte1: '8', key: '9'},
  {byte0: '6', byte1: '8', key: 'PrtScr  F11'},
  {byte0: '7', byte1: '8', key: 'l'},
  {byte0: '0', byte1: '9', key: 'RShift'},
  {byte0: '1', byte1: '9', key: 'LShift'},
  {byte0: '2', byte1: '9', key: ''},
  {byte0: '3', byte1: '9', key: ''},
  {byte0: '4', byte1: '9', key: ''},
  {byte0: '5', byte1: '9', key: ''},
  {byte0: '6', byte1: '9', key: ''},
  {byte0: '7', byte1: '9', key: ''},
  {byte0: '0', byte1: 'a', key: ','},
  {byte0: '1', byte1: 'a', key: 'KP*'},
  {byte0: '2', byte1: 'a', key: 'Bright. Down  F7'},
  {byte0: '3', byte1: 'a', key: 'Audio Next  F6'},
  {byte0: '4', byte1: 'a', key: 'Play Pause  F5'},
  {byte0: '5', byte1: 'a', key: '8'},
  {byte0: '6', byte1: 'a', key: 'i'},
  {byte0: '7', byte1: 'a', key: 'k'},
  {byte0: '0', byte1: 'b', key: 'Katakana Hiragana'},
  {byte0: '1', byte1: 'b', key: 'Henkan'},
  {byte0: '2', byte1: 'b', key: 'KP8'},
  {byte0: '3', byte1: 'b', key: 'Project  F9'},
  {byte0: '4', byte1: 'b', key: 'Ro Kana'},
  {byte0: '5', byte1: 'b', key: '102nd'},
  {byte0: '6', byte1: 'b', key: 'Left'},
  {byte0: '7', byte1: 'b', key: 'Menu'},
  {byte0: '0', byte1: 'c', key: 'RCtrl'},
  {byte0: '1', byte1: 'c', key: 'LCtrl'},
  {byte0: '2', byte1: 'c', key: ''},
  {byte0: '3', byte1: 'c', key: ''},
  {byte0: '4', byte1: 'c', key: ''},
  {byte0: '5', byte1: 'c', key: ''},
  {byte0: '6', byte1: 'c', key: ''},
  {byte0: '7', byte1: 'c', key: ''},
  {byte0: '0', byte1: 'd', key: '/'},
  {byte0: '1', byte1: 'd', key: 'Up'},
  {byte0: '2', byte1: 'd', key: '-'},
  {byte0: '3', byte1: 'd', key: 'Framework  F12'},
  {byte0: '4', byte1: 'd', key: '0'},
  {byte0: '5', byte1: 'd', key: 'p'},
  {byte0: '6', byte1: 'd', key: '['},
  {byte0: '7', byte1: 'd', key: ';'},
  {byte0: '0', byte1: 'e', key: ''},
  {byte0: '1', byte1: 'e', key: 'Enter'},
  {byte0: '2', byte1: 'e', key: 'Scan Code e016'},
  {byte0: '3', byte1: 'e', key: 'End'},
  {byte0: '4', byte1: 'e', key: '='},
  {byte0: '5', byte1: 'e', key: 'BS'},
  {byte0: '6', byte1: 'e', key: ']'},
  {byte0: '7', byte1: 'e', key: 'd'},
  {byte0: '0', byte1: 'f', key: 'Yen'},
  {byte0: '1', byte1: 'f', key: 'Bright. Up  F8'},
  {byte0: '2', byte1: 'f', key: 'Right'},
  {byte0: '3', byte1: 'f', key: 'Scan Code e01a'},
  {byte0: '4', byte1: 'f', key: ''},
  {byte0: '5', byte1: 'f', key: 'KP4'},
  {byte0: '6', byte1: 'f', key: 'KP5'},
  {byte0: '7', byte1: 'f', key: 'KP6'},
].filter(
  // skip blank keys and keypad
  ({key}) => key.length > 0 && !key.startsWith('KP')
);

// https://github.com/FrameworkComputer/EmbeddedController/blob/hx30/include/keyboard_8042_sharedlib.h
const SCANCODES = [
  {name: 'SCANCODE_1', hex: '0x0016'},
  {name: 'SCANCODE_2', hex: '0x001e'},
  {name: 'SCANCODE_3', hex: '0x0026'},
  {name: 'SCANCODE_4', hex: '0x0025'},
  {name: 'SCANCODE_5', hex: '0x002e'},
  {name: 'SCANCODE_6', hex: '0x0036'},
  {name: 'SCANCODE_7', hex: '0x003d'},
  {name: 'SCANCODE_8', hex: '0x003e'},
  {name: 'SCANCODE_A', hex: '0x001c'},
  {name: 'SCANCODE_B', hex: '0x0032'},
  {name: 'SCANCODE_T', hex: '0x002c'},
  {name: 'SCANCODE_F1', hex: '0x0005'},
  {name: 'SCANCODE_F2', hex: '0x0006'},
  {name: 'SCANCODE_F3', hex: '0x0004'},
  {name: 'SCANCODE_F4', hex: '0x000c'},
  {name: 'SCANCODE_F5', hex: '0x0003'},
  {name: 'SCANCODE_F6', hex: '0x000b'},
  {name: 'SCANCODE_F7', hex: '0x0083'},
  {name: 'SCANCODE_F8', hex: '0x000a'},
  {name: 'SCANCODE_F9', hex: '0x0001'},
  {name: 'SCANCODE_F10', hex: '0x0009'},
  {name: 'SCANCODE_F11', hex: '0x0078'},
  {name: 'SCANCODE_F12', hex: '0x0007'},
  {name: 'SCANCODE_F13', hex: '0x000f'},
  {name: 'SCANCODE_F14', hex: '0x0017'},
  {name: 'SCANCODE_F15', hex: '0x001f'},
  {name: 'SCANCODE_BACK =', hex: '0xe038'},
  {name: 'SCANCODE_REFRESH', hex: '0xe020'},
  {name: 'SCANCODE_FORWARD', hex: '0xe030'},
  {name: 'SCANCODE_FULLSCREEN', hex: '0xe01d'},
  {name: 'SCANCODE_OVERVIEW', hex: '0xe024'},
  {name: 'SCANCODE_SNAPSHOT', hex: '0xe02d'},
  {name: 'SCANCODE_BRIGHTNESS_DOWN', hex: '0xe02c'},
  {name: 'SCANCODE_BRIGHTNESS_UP', hex: '0xe035'},
  {name: 'SCANCODE_PRIVACY_SCRN_TOGGLE', hex: '0xe03c'},
  {name: 'SCANCODE_VOLUME_MUTE', hex: '0xe023'},
  {name: 'SCANCODE_VOLUME_DOWN', hex: '0xe021'},
  {name: 'SCANCODE_VOLUME_UP', hex: '0xe032'},
  {name: 'SCANCODE_KBD_BKLIGHT_DOWN', hex: '0xe043'},
  {name: 'SCANCODE_KBD_BKLIGHT_UP', hex: '0xe044'},
  {name: 'SCANCODE_NEXT_TRACK', hex: '0xe04d'},
  {name: 'SCANCODE_PREV_TRACK', hex: '0xe015'},
  {name: 'SCANCODE_PLAY_PAUSE', hex: '0xe054'},
  {name: 'SCANCODE_UP', hex: '0xe075'},
  {name: 'SCANCODE_DOWN', hex: '0xe072'},
  {name: 'SCANCODE_LEFT', hex: '0xe06b'},
  {name: 'SCANCODE_RIGHT', hex: '0xe074'},
  {name: 'SCANCODE_LEFT_CTRL', hex: '0x0014'},
  {name: 'SCANCODE_RIGHT_CTRL', hex: '0xe014'},
  {name: 'SCANCODE_LEFT_ALT', hex: '0x0011'},
  {name: 'SCANCODE_RIGHT_ALT', hex: '0xe011'},
  {name: 'SCANCODE_LEFT_WIN', hex: '0xe01f'},
  {name: 'SCANCODE_RIGHT_WIN', hex: '0xe027'},
  {name: 'SCANCODE_MENU', hex: '0xe02f'},
  {name: 'SCANCODE_POWER', hex: '0xe037'},
  {name: 'SCANCODE_NUMLOCK', hex: '0x0077'},
  {name: 'SCANCODE_CAPSLOCK', hex: '0x0058'},
  {name: 'SCANCODE_SCROLL_LOCK', hex: '0x007e'},
  {name: 'SCANCODE_CTRL_BREAK', hex: '0xe07e'},
  {name: 'SCANCODE_RECOVERY', hex: '0xe076'},
  {name: 'SCANCODE_FN', hex: '0x00ff'},
  {name: 'SCANCODE_ESC', hex: '0x0076'},
  {name: 'SCANCODE_DELETE', hex: '0xe071'},
  {name: 'SCANCODE_K', hex: '0x0042'},
  {name: 'SCANCODE_P', hex: '0x004D'},
  {name: 'SCANCODE_S', hex: '0x001B'},
  {name: 'SCANCODE_SPACE', hex: '0x0029'},
].map(({name, hex}) => ({
  name,
  hex: hex.replace(/0x[0]{0,3}/, 'w'),
}));

module.exports = { start };