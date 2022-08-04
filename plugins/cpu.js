const fs = require('fs');
const notification = require('../notification');
const exec = require('promised-exec');
const config = require('../config');

const SUPPORTED_CPU_MODELS = [
  {
    name: 'i5-1240P',
    regex: /12th Gen Intel\(R\) Core\(TM\) i5-1240P/,
    pCores: '0-7',
    eCores: '8-15',
    allCores: '0-15',
    lowPowerCores: '8-15',
    powerLimitsBattery: { PL1: 4, PL2: 20 },
    powerLimitsAC: { PL1: 40, PL2: 65 },
  },
  {
    name: 'i7-1260P',
    regex: /12th Gen Intel\(R\) Core\(TM\) i7-1260P/,
    pCores: '0-7',
    eCores: '8-15',
    allCores: '0-15',
    lowPowerCores: '8-15',
    powerLimitsBattery: { PL1: 4, PL2: 20 },
    powerLimitsAC: { PL1: 40, PL2: 65 },
  },
  {
    name: 'i7-1280P',
    regex: /12th Gen Intel\(R\) Core\(TM\) i7-1280P/,
    pCores: '0-11',
    eCores: '12-19',
    allCores: '0-19',
    lowPowerCores: '12-19',
    powerLimitsBattery: { PL1: 4, PL2: 20 },
    powerLimitsAC: { PL1: 40, PL2: 65 },
  },
];

let CPU = SUPPORTED_CPU_MODELS[0];

function detectCPU() {
  const cpuinfo = fs.readFileSync('/proc/cpuinfo').toString();
  for (const model of Object.values(SUPPORTED_CPU_MODELS)) {
    if (cpuinfo.match(model.regex)) {
      console.log('Detected CPU', model.name);
      CPU = {
        ...model,
        ...config.getConfig('cpu', {})
      };
      setup();
      return;
    }
  }
  console.error('ERROR: Not supported CPU');
  notification.send('FRMW: ERR: Not supported CPU');
  process.exit(1);
}

function patchCPUModelConfig(config) {
  CPU = { ...CPU, ...config };
};

function getCPUModelConfig() {
  return CPU;
}

function setup() {
  exec(`
    mkdir /sys/fs/cgroup/cpuset;
    mount -t cgroup -o cpuset cpuset /sys/fs/cgroup/cpuset;
    
    cgcreate -g cpuset:p_cores;
    echo ${CPU.pCores} > /sys/fs/cgroup/cpuset/p_cores/cpuset.cpus;
    echo 0 > /sys/fs/cgroup/cpuset/p_cores/cpuset.mems;
    
    cgcreate -g cpuset:e_cores;
    echo ${CPU.eCores} > /sys/fs/cgroup/cpuset/e_cores/cpuset.cpus;
    echo 0 > /sys/fs/cgroup/cpuset/e_cores/cpuset.mems;

    cgcreate -g cpuset:active_cores;
    echo ${CPU.allCores} > /sys/fs/cgroup/cpuset/active_cores/cpuset.cpus;
    echo 0 > /sys/fs/cgroup/cpuset/active_cores/cpuset.mems;
  `).catch(() => {});

  /**
   * Since we cannot set cpu_exclusive for cpuset,
   * we need to re-assign process to active_cores set periodically
   */
  const REASSIGN_AFTER_MS = 60000; // every 1 minute
  setInterval(reassignNewProcesses, REASSIGN_AFTER_MS);
}

let lastReassignedPID = 1;
let maxPID = null;
const generateArray = (start, end) => Array.from(Array(end - start).keys()).map(i => i + start);
const STORED_LAST_PID_PATH = '/tmp/frmw_last_reassigned_pid';
function makeChunks(arr, len) {
  let chunks = [], i = 0, n = arr.length;
  while (i < n) chunks.push(arr.slice(i, i += len));
  return chunks;
}
async function reassignNewProcesses() {
  // This function reassign newly created processes to active_cores cpuset
  // The idea is that, we try generating a PID and reassign all processes from lastReassignedPID to the latest PID
  // See more: https://www.baeldung.com/linux/process-id
  if (fs.existsSync(STORED_LAST_PID_PATH)) // what if we restart the service?
    lastReassignedPID = parseInt(fs.readFileSync(STORED_LAST_PID_PATH).toString());
  if (!maxPID) // read the max PID possible. usually be 2^22
    maxPID = parseInt(fs.readFileSync('/proc/sys/kernel/pid_max').toString());
  const latestPID = parseInt((await exec('echo $$')).trim());
  let pids = [];
  if (lastReassignedPID < latestPID) {
    // all processes from last to current
    pids = generateArray(lastReassignedPID, latestPID);
  } else if (latestPID < lastReassignedPID) {
    // in case the system already reached maxPID and wrap the number around
    pids = [...generateArray(1, latestPID), ...generateArray(lastReassignedPID, maxPID)];
  }
  //console.log('reassignNewProcesses', lastReassignedPID, latestPID);
  lastReassignedPID = latestPID + 1;
  // reassign to active_cores
  if (pids.length < 1000) {
    try { await exec(
      pids.map(p => `cgclassify -g cpuset:active_cores ${p} 2>/dev/null`).join(';')
    ); } catch (e) { /* ignored */ }
  } else {
    try { await exec(
      'for pid in $(ps -eLo pid) ; do cgclassify -g cpuset:active_cores $pid 2>/dev/null; done;'
    ); } catch (e) { /* ignored */ }
  }
  fs.writeFileSync(STORED_LAST_PID_PATH, lastReassignedPID.toString());
}

detectCPU();

async function setLowPowerMode(enabled) {
  // change cpuset cpus
  await exec(`
    echo ${enabled ? CPU.lowPowerCores : CPU.allCores} > /sys/fs/cgroup/cpuset/active_cores/cpuset.cpus;
  `);
  reassignNewProcesses();

  // power limit
  const { PL1, PL2 } = enabled ? CPU.powerLimitsBattery : CPU.powerLimitsAC;
  exec(
    `/usr/sbin/set_power_limit ${PL1} ${PL2}`
  );
}

module.exports = {
  setLowPowerMode,
  patchCPUModelConfig,
  getCPUModelConfig,
};