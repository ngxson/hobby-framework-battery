const config = require('../config');
const battery = require('../battery');
const exec = require('promised-exec');
const delay = (ms) => new Promise(r => setTimeout(r, ms));

const ALLOW_TIME_TO_REPLUG = 5 * 60000; // 5 minutes

let isAvailable = false;
let CONFIG = {
  chargingLimitEnd: 100,
  keyRemaps: [],
};
let battLastLimit = 100;

const applyChargingLimit = async (limitTo) => {
  if (limitTo != battLastLimit) {
    await exec(`/usr/sbin/frmw_ectool --interface=fwk fwchargelimit ${limitTo}`);
    if (limitTo >= 100) {
      // EC_CMD_CHARGE_LIMIT_CONTROL 0x3E03, CHG_LIMIT_DISABLE b0,b64,b0
      await exec(`/usr/sbin/frmw_ectool --interface=fwk raw 0x3E03 b0,b64,b0`);
    }
    battLastLimit = limitTo;
  }
};

function applySettings(cfg, save, opt={}) {
  CONFIG = { ...CONFIG, ...cfg };
  const { chargingLimitEnd, keyRemaps } = CONFIG;
  if (save) config.setConfig('ectool', CONFIG);

  applyChargingLimit(chargingLimitEnd);

  for (const remap of keyRemaps) {
    if (!remap.match(/b[a-f0-9],b[a-f0-9],w[a-f0-9]+/)) continue;
    exec(`/usr/sbin/frmw_ectool --interface=fwk raw 0x3E0C d1,d1,${remap}`)
      .catch(() => {/* ignored */});
  }
}

function handlePlugCharger() {
  // not used (yet)
}

function handleUnplugCharger() {
  // not used (yet)
}

async function getCurrentChargingLimit() {
  const res = await exec(`/usr/sbin/frmw_ectool --interface=fwk fwchargelimit`);
  return parseInt(res.trim());
}

function getConfig() {
  return CONFIG;
}

async function getECVersion() {
  return await exec('/usr/sbin/frmw_ectool --interface=fwk version');
}

// LED Dancing
let ledDancingEnable = false;
function funnyLEDDancing(isEnable) {
  const getRandom = (arr) => arr[Math.floor(Math.random()*arr.length)];
  const dancing = async (led, colors) => {
    while (true) {
      if (ledDancingEnable) {
        exec(`/usr/sbin/frmw_ectool --interface=fwk ${
          led === 'keyboard'
            ? `pwmsetkblight ${getRandom(colors)}`
            : `led ${led} ${getRandom(colors)}`
        }`);
        await delay(getRandom([200, 250, 300]));
      } else {
        exec(`/usr/sbin/frmw_ectool --interface=fwk ${
          led === 'keyboard' ? `pwmsetkblight 20` : `led ${led} auto`
        }`);
        return;
      }
    }
  };
  if (!ledDancingEnable && isEnable) {
    ledDancingEnable = true;
    dancing('power', ['red', 'green', 'yellow', 'white']);
    dancing('left', ['red', 'green', 'blue', 'yellow', 'white', 'amber']);
    dancing('right', ['red', 'green', 'blue', 'yellow', 'white', 'amber']);
    dancing('keyboard', [0, 50, 100]);
  }
  ledDancingEnable = isEnable;
}

function getFunnyLEDDancingStatus() {
  return ledDancingEnable;
}


// Fan control
function setFanDuty(duty) {
  exec(duty === null
    ? '/usr/sbin/frmw_ectool --interface=fwk autofanctrl'
    : `/usr/sbin/frmw_ectool --interface=fwk fanduty ${duty}`);
}


(async () => {
  try {
    const res = await getECVersion();
    isAvailable = res.match(/RO version/);
  } catch (e) {
    isAvailable = false;
  }
  
  if (isAvailable) {
    applySettings(config.getConfig('ectool', {}));
  } else {
    console.log('Error with ectool. Have you disabled Secure Boot?');
  }
  //setInterval(updateBatteryStatus, 60000);
  //setTimeout(updateBatteryStatus, 1000);
})();

function getIsAvailable() {
  return isAvailable;
}

module.exports = {
  getIsAvailable,
  applySettings,
  handlePlugCharger,
  handleUnplugCharger,
  getCurrentChargingLimit,
  getConfig,
  getECVersion,
  funnyLEDDancing,
  getFunnyLEDDancingStatus,
  setFanDuty,
};