const fs = require('fs');
const notification = require('./notification');

const CPU_MODELS = [
  {
    name: 'i5-1240P',
    regex: /12th Gen Intel\(R\) Core\(TM\) i5-1240P/,
    optionalCores: [2, 3, 4, 5, 6, 7],
  },
  {
    name: 'i7-1260P',
    regex: /12th Gen Intel\(R\) Core\(TM\) i7-1260P/,
    optionalCores: [2, 3, 4, 5, 6, 7],
  },
  {
    name: 'i7-1280P',
    regex: /12th Gen Intel\(R\) Core\(TM\) i7-1280P/,
    optionalCores: [2, 3, 4, 5, 6, 7],
  },
];

let CPU_MODEL = CPU_MODELS[0];

function detectCPU() {
  const cpuinfo = fs.readFileSync('/proc/cpuinfo').toString();
  for (const model of Object.values(CPU_MODELS)) {
    if (cpuinfo.match(model.regex)) {
      console.log('Detected CPU', model.name);
      CPU_MODEL = model;
      return;
    }
  }
  console.error('ERROR: Not supported CPU');
  notification.send('FRMW: ERR: Not supported CPU');
  process.exit(1);
}
detectCPU();

function setOptionalCores(enabled) {
  for (const core of CPU_MODEL.optionalCores) {
    fs.writeFileSync(
      `/sys/devices/system/cpu/cpu${core}/online`,
      enabled ? '1' : '0'
    );
  }
}

module.exports = {
  setOptionalCores,
};