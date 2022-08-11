const config = require('../config');
const battery = require('../battery');
const exec = require('promised-exec');
const delay = (ms) => new Promise(r => setTimeout(r, ms));

let isAvailable = false;
let CONFIG = {
  chargingLimitEnd: 100,
  isChargingPaused: false,
  keyRemaps: [],
};
let battLastLimit = 100;

const applyChargingLimit = async (limitTo) => {
  try {
    if (limitTo != battLastLimit) {
      await exec(`/usr/sbin/frmw_ectool --interface=fwk fwchargelimit ${limitTo}`);
      battLastLimit = limitTo;
    }
  } catch (e) {
    console.error(e);
  }
};

function applySettings(cfg, save, opt={}) {
  CONFIG = { ...CONFIG, ...cfg };
  const { chargingLimitEnd, isChargingPaused, keyRemaps } = CONFIG;
  if (save) config.setConfig('ectool', CONFIG);

  if (!isChargingPaused) {
    applyChargingLimit(chargingLimitEnd);
  } else {
    pauseChargingHandler(battery.getPercent());
  }

  for (const remap of keyRemaps) {
    if (!remap.match(/b[a-f0-9],b[a-f0-9],w[a-f0-9]+/)) continue;
    exec(`/usr/sbin/frmw_ectool --interface=fwk raw 0x3E0C d1,d1,${remap}`)
      .catch(() => {/* ignored */});
  }
}

async function resetKeyboardMatrix() {
  const DEFAULT_MAP = [
    ['0021', '007B', '0079', '0072', '007A', '0071', '0069', 'e04A'],
    ['e071', 'e070', '007D', 'e01f', '006c', 'e06c', 'e07d', '0077'],
    ['0015', '0070', '00ff', '000D', '000E', '0016', '0067', '001c'],
    ['e011', '0011', '0000', '0000', '0000', '0000', '0000', '0000'],
    ['e05a', '0029', '0024', '000c', '0058', '0026', '0004', 'e07a'],
    ['0022', '001a', '0006', '0005', '001b', '001e', '001d', '0076'],
    ['002A', '0032', '0034', '002c', '002e', '0025', '002d', '002b'],
    ['003a', '0031', '0033', '0035', '0036', '003d', '003c', '003b'],
    ['0049', 'e072', '005d', '0044', '0009', '0046', '0078', '004b'],
    ['0059', '0012', '0000', '0000', '0000', '0000', '0000', '0000'],
    ['0041', '007c', '0083', '000b', '0003', '003e', '0043', '0042'],
    ['0013', '0064', '0075', '0001', '0051', '0061', 'e06b', 'e02f'],
    ['e014', '0014', '0000', '0000', '0000', '0000', '0000', '0000'],
    ['004a', 'e075', '004e', '0007', '0045', '004d', '0054', '004c'],
    ['0052', '005a', 'e03c', 'e069', '0055', '0066', '005b', '0023'],
    ['006a', '000a', 'e074', 'e054', '0000', '006b', '0073', '0074'],
  ];
  applySettings({ keyRemaps: [] }, true);
  const hex = n => n.toString(16);
  for (const [byte1, codes] of DEFAULT_MAP.entries()) {
    await exec(
      `/usr/sbin/frmw_ectool --interface=fwk raw 0x3E0C d${hex(codes.length)},d1,${
        codes.map((code, byte0) =>
          `b${hex(byte0)},b${hex(byte1)},w${code}`
        ).join(',')
      }`
    ).catch(() => {/* ignored */});
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


// pause charging
const pauseChargingHandler = (level) => {
  if (CONFIG.isChargingPaused) {
    applyChargingLimit(level);
  }
};
battery.onBatteryLevelChanged(pauseChargingHandler);


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
  resetKeyboardMatrix,
};