const config = require('../config');
const battery = require('../battery');
const exec = require('promised-exec');
const delay = (ms) => new Promise(r => setTimeout(r, ms));

const ALLOW_TIME_TO_REPLUG = 5 * 60000; // 5 minutes

let isAvailable = false;
let CONFIG = {
  chargingLimitEnable: false,
  chargingLimitStart: 20,
  chargingLimitEnd: 80,
  keyRemaps: [],
};
let battLastLimit = 100;

const applyChargingLimit = (limitTo) => {
  if (limitTo != battLastLimit) {
    exec(`/usr/sbin/frmw_ectool --interface=fwk fwchargelimit ${limitTo}`);
    battLastLimit = limitTo;
  }
};

function applySettings(cfg, save, opt={}) {
  CONFIG = { ...CONFIG, ...cfg };
  const { chargingLimitEnable, keyRemaps } = CONFIG;
  if (save) config.setConfig('ectool', cfg);

  if (!chargingLimitEnable)
    if (opt.chargeLimit) applyChargingLimit(opt.chargeLimit);
  else
    updateBatteryStatus();

  for (const remap of keyRemaps) {
    if (!remap.match(/b[a-f0-9],b[a-f0-9],w[a-f0-9]+/)) continue;
    exec(`/usr/sbin/frmw_ectool --interface=fwk raw 0x3E0C d1,d1,${remap}`)
      .catch(() => {/* ignored */});
  }
}

let allowRePlugUntil = 0;
let continueToCharge = false;
function updateBatteryStatus() {
  /*
  const {
    chargingLimitEnable,
    chargingLimitStart,
    chargingLimitEnd,
  } = CONFIG;
  if (!chargingLimitEnable) return;
  const battLevel = battery.getPercent();
  
  if (continueToCharge) {
    // if plugging and charing has started, we continue to the end
    applyChargingLimit(chargingLimitEnd);
  } else {
    if (battLevel > chargingLimitStart) {
      applyChargingLimit(chargingLimitStart);
    } else {
      applyChargingLimit(chargingLimitEnd);
      continueToCharge = true;
    }
  }
  */
}

function handlePlugCharger() {
  /*
  const {
    chargingLimitEnable,
    chargingLimitStart,
    chargingLimitEnd,
  } = CONFIG;
  const now = Date.now();
  if (!chargingLimitEnable) return;
  if (now < allowRePlugUntil) {
    // if we unplug charger for a short period and replug,
    // we should still be able to charge the battery
    applyChargingLimit(chargingLimitEnd);
    continueToCharge = true;
  } else {
    // else, we apply the start limit
    applyChargingLimit(chargingLimitStart);
  }
  */
}

function handleUnplugCharger() {
  /*
  allowRePlugUntil = Date.now() + ALLOW_TIME_TO_REPLUG;
  continueToCharge = false;
  */
}

function forceStartCharging() {
  if (!CONFIG.chargingLimitEnable) return;
  allowRePlugUntil = Date.now() + ALLOW_TIME_TO_REPLUG;
  applyChargingLimit(CONFIG.chargingLimitEnd);
  continueToCharge = true;
}

function disableCharging() {
  applySettings({ chargingLimitEnable: false }, true, { chargeLimit: 20 });
}

function enableCharging() {
  applySettings({ chargingLimitEnable: false }, true, { chargeLimit: 100 });
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
        exec(`/usr/sbin/frmw_ectool --interface=fwk led ${led} ${getRandom(colors)}`);
        await delay(getRandom([200, 250, 300]));
      } else {
        exec(`/usr/sbin/frmw_ectool --interface=fwk led ${led} auto`);
        return;
      }
    }
  };
  if (!ledDancingEnable && isEnable) {
    ledDancingEnable = true;
    dancing('power', ['red', 'white']);
    dancing('left', ['red', 'green', 'blue', 'yellow', 'white', 'amber']);
    dancing('right', ['red', 'green', 'blue', 'yellow', 'white', 'amber']);
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

module.exports = {
  applySettings,
  handlePlugCharger,
  handleUnplugCharger,
  forceStartCharging,
  disableCharging,
  enableCharging,
  getCurrentChargingLimit,
  getConfig,
  getECVersion,
  funnyLEDDancing,
  getFunnyLEDDancingStatus,
  setFanDuty,
};