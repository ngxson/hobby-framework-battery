const fs = require('fs');
const notification = require('../notification');
const exec = require('promised-exec');

const CPU_MODELS = [
  {
    name: 'i5-1240P',
    regex: /12th Gen Intel\(R\) Core\(TM\) i5-1240P/,
    pCores: '0-7',
    eCores: '8-15',
    allCores: '0-15',
    lowPowerCores: '8-15',
    runOnBattery: '/usr/sbin/set_power_limit 2 10',
    runOnAC: '/usr/sbin/set_power_limit 40 65',
  },
  {
    name: 'i7-1260P',
    regex: /12th Gen Intel\(R\) Core\(TM\) i7-1260P/,
    pCores: '0-7',
    eCores: '8-15',
    allCores: '0-15',
    lowPowerCores: '8-15',
    runOnBattery: '/usr/sbin/set_power_limit 2 10',
    runOnAC: '/usr/sbin/set_power_limit 40 65',
  },
  {
    name: 'i7-1280P',
    regex: /12th Gen Intel\(R\) Core\(TM\) i7-1280P/,
    pCores: '0-11',
    eCores: '12-19',
    allCores: '0-19',
    lowPowerCores: '12-19',
    runOnBattery: '/usr/sbin/set_power_limit 2 10',
    runOnAC: '/usr/sbin/set_power_limit 40 65',
  },
];

let CPU_MODEL = CPU_MODELS[0];

function detectCPU() {
  const cpuinfo = fs.readFileSync('/proc/cpuinfo').toString();
  for (const model of Object.values(CPU_MODELS)) {
    if (cpuinfo.match(model.regex)) {
      console.log('Detected CPU', model.name);
      CPU_MODEL = model;
      setup();
      return;
    }
  }
  console.error('ERROR: Not supported CPU');
  notification.send('FRMW: ERR: Not supported CPU');
  process.exit(1);
}

function setup() {
  exec(`
    mkdir /sys/fs/cgroup/cpuset;
    mount -t cgroup -o cpuset cpuset /sys/fs/cgroup/cpuset;
    
    cgcreate -g cpuset:p_cores;
    echo ${CPU_MODEL.pCores} > /sys/fs/cgroup/cpuset/p_cores/cpus;
    echo 0 > /sys/fs/cgroup/cpuset/p_cores/mems;
    
    cgcreate -g cpuset:e_cores;
    echo ${CPU_MODEL.eCores} > /sys/fs/cgroup/cpuset/e_cores/cpus;
    echo 0 > /sys/fs/cgroup/cpuset/e_cores/mems;

    cgcreate -g cpuset:active_cores;
    echo ${CPU_MODEL.allCores} > /sys/fs/cgroup/cpuset/active_cores/cpus;
    echo 0 > /sys/fs/cgroup/cpuset/active_cores/mems;
  `).catch(() => {});

  /**
   * Since we cannot set cpu_exclusive for cpuset,
   * we need to re-assign process to active_cores set periodically
   */
  const REASSIGN_AFTER_MS = 10 * 60000; // 10 minutes
  setInterval(() => {
    exec(`
      for pid in $(ps -eLo pid) ; do cgclassify -g cpuset:active_cores $pid 2>/dev/null; done;
    `).catch(() => {});
  }, REASSIGN_AFTER_MS);
}

detectCPU();

function setLowPowerMode(enabled) {
  exec(`
    echo ${enabled ? CPU_MODEL.lowPowerCores : CPU_MODEL.allCores} > /sys/fs/cgroup/cpuset/active_cores/cpus;
    for pid in $(ps -eLo pid) ; do cgclassify -g cpuset:active_cores $pid 2>/dev/null; done;
  `).catch(() => {});

  exec(
    enabled ? CPU_MODEL.runOnBattery : CPU_MODEL.runOnAC
  ).catch(() => {});
}

module.exports = {
  setLowPowerMode,
};