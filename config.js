const fs = require('fs');

const CFG_PATH = '/etc/frmw-service-config.json';
let config = {
  cpu: {},
  ectool: {},
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