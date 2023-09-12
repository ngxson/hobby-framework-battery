const fs = require('fs');

const CFG_PATH = '/etc/frmw-scripts/config.json';

if (!fs.existsSync('/etc/frmw-scripts')) {
  fs.mkdirSync('/etc/frmw-scripts');
}

// migrate from old version
if (fs.existsSync('/etc/frmw-service-config.json')) {
  fs.renameSync('/etc/frmw-service-config.json', CFG_PATH);
}

let config = {
  cpu: {
    // lowPowerCores: '8-15',
    // powerLimitsBattery: { PL1: 4, PL2: 20 },
    // powerLimitsAC: { PL1: 40, PL2: 65 },
  },
  ectool: {
    // chargingLimitEnd: 80,
    // keyRemaps: [ 'b1,bc,w58', 'b4,b4,76', ... ],
  },
};

const writeConfigToFile = () => {
  const json = JSON.stringify(config, null, 2);
  fs.writeFileSync(CFG_PATH, json);
};

if (fs.existsSync(CFG_PATH)) {
  try {
    config = JSON.parse(fs.readFileSync(CFG_PATH).toString());
  } catch (e) {
    console.error('Cannot read config file');
    process.exit(1);
  }
} else {
  writeConfigToFile();
}

function setConfig(key, value) {
  config[key] = value;
  writeConfigToFile();
}

function getConfig(key, defaultVal) {
  return config[key] || defaultVal;
}

module.exports = {
  CFG_PATH,
  setConfig,
  getConfig,
};