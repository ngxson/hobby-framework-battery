const fs = require('fs');

const CFG_PATH = '/etc/frmw-service-config.json';
let config = {
  cpu: {
    // lowPowerCores: '8-15',
    // powerLimitsBattery: { PL1: 4, PL2: 20 },
    // powerLimitsAC: { PL1: 40, PL2: 65 },
  },
  ectool: {
    // chargingLimitEnable: true,
    // chargingLimitStart: 20,
    // chargingLimitEnd: 80,
    // keyRemaps: [ { from: '', to: '' } ],
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
  setConfig,
  getConfig,
};