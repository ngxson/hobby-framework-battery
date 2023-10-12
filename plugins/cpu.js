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
    powerLimitsBattery: { PL1: 8, PL2: 20 },
    powerLimitsAC: { PL1: 40, PL2: 65 },
    autoPowerLimit: false, // to be changed by user
    autoCoreLimit: false, // to be changed by user
  },
  {
    name: 'i7-1260P',
    regex: /12th Gen Intel\(R\) Core\(TM\) i7-1260P/,
    pCores: '0-7',
    eCores: '8-15',
    allCores: '0-15',
    lowPowerCores: '8-15',
    powerLimitsBattery: { PL1: 8, PL2: 20 },
    powerLimitsAC: { PL1: 40, PL2: 65 },
    autoPowerLimit: false, // to be changed by user
    autoCoreLimit: false, // to be changed by user
  },
  {
    name: 'i7-1280P',
    regex: /12th Gen Intel\(R\) Core\(TM\) i7-1280P/,
    pCores: '0-11',
    eCores: '12-19',
    allCores: '0-19',
    lowPowerCores: '12-19',
    powerLimitsBattery: { PL1: 8, PL2: 20 },
    powerLimitsAC: { PL1: 40, PL2: 65 },
    autoPowerLimit: false, // to be changed by user
    autoCoreLimit: false, // to be changed by user
  },
  {
    name: '11th Gen Intel',
    regex: /i[357]-11/,
    pCores: null,
    eCores: null,
    allCores: null,
    lowPowerCores: null,
    powerLimitsBattery: { PL1: 8, PL2: 20 },
    powerLimitsAC: { PL1: 40, PL2: 65 },
    autoPowerLimit: false, // to be changed by user
    autoCoreLimit: false, // not possible on 11th gen Intel
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
  if (CPU.pCores) {
    if (!fs.existsSync('/sys/fs/cgroup/cpuset')) {
      console.error('/sys/fs/cgroup/cpuset does not exist, creating');
      exec(`
        mkdir /sys/fs/cgroup/cpuset;
        mount -t cgroup -o cpuset cpuset /sys/fs/cgroup/cpuset;
      `).then(
        makeCgroup()
      ).catch((e) => {
        console.error(e);
      });
    } else {
      console.error('/sys/fs/cgroup/cpuset exist');
      makeCgroup();
    }

    /**
     * Since we cannot set cpu_exclusive for cpuset,
     * we need to re-assign process to active_cores set periodically
     */
    const REASSIGN_AFTER_MS = 60000; // every minute
    setInterval(reassignNewProcesses, REASSIGN_AFTER_MS);
  }

  // detect if we're inside docker ; if that's the case, use host's turbostat package
  if (fs.existsSync('/host/usr/bin/turbostat')) {
    fs.copyFileSync('/host/usr/bin/turbostat', '/usr/bin/turbostat')
  }
}

function makeCgroup() {
  if (!fs.existsSync('/sys/fs/cgroup/cpuset/active_cores')) {
    console.log('Creating cgroup active_cores');
    return exec(`
      cgcreate -g cpuset:active_cores;
      echo ${CPU.allCores} > /sys/fs/cgroup/cpuset/active_cores/cpuset.cpus;
      echo 0 > /sys/fs/cgroup/cpuset/active_cores/cpuset.mems;
      echo 1 > /sys/fs/cgroup/cpuset/active_cores/cgroup.clone_children;
      for pid in $(ps -eLo pid); do
        cgclassify -g cpuset:active_cores $pid 2>/dev/null;
      done;
    `).catch((e) => {
      // console.error(e);
    });
  } else {
    return Promise.resolve();
  } 
}

let lastReassignedPID = 1;
let maxPID = null;
const STORED_LAST_PID_PATH = '/tmp/frmw_last_reassigned_pid';
async function reassignNewProcesses() {
  if (!CPU.pCores) return;
  // This function reassign newly created processes to active_cores cpuset
  // The idea is that, we try generating a PID and reassign all processes from lastReassignedPID to the latest PID
  // See more: https://www.baeldung.com/linux/process-id
  if (fs.existsSync(STORED_LAST_PID_PATH)) // what if we restart the service?
    lastReassignedPID = parseInt(fs.readFileSync(STORED_LAST_PID_PATH).toString());
  if (!maxPID) // read the max PID possible. usually be 2^22
    maxPID = parseInt(fs.readFileSync('/proc/sys/kernel/pid_max').toString());
  const latestPID = parseInt((await exec('echo $$')).trim());
  const isWrapAround = latestPID < lastReassignedPID;
  const fromPID = lastReassignedPID;
  lastReassignedPID = latestPID + 1;
  // reassign to active_cores
  try { await exec(
    `for pid in $(ps -eLo pid); do
      ${isWrapAround ? '' : `if (($pid >= ${fromPID} && $pid < ${latestPID})); then`}
        cgclassify -g cpuset:active_cores $pid 2>/dev/null;
      ${isWrapAround ? '' : 'fi;'}  
      done;`
  ); } catch (e) { /* ignored */ }
  fs.writeFileSync(STORED_LAST_PID_PATH, lastReassignedPID.toString());
}

detectCPU();

async function setLowPowerMode(enabled) {
  let shouldLimitCores = null;
  // change cpuset cpus
  if (CPU.pCores) {
    shouldLimitCores = enabled && CPU.autoCoreLimit;
    await exec(`
      echo ${shouldLimitCores ? CPU.lowPowerCores : CPU.allCores} > /sys/fs/cgroup/cpuset/active_cores/cpuset.cpus;
    `).catch(() => {});
    reassignNewProcesses();
  }

  // power limit
  const { PL1, PL2 } = enabled ? CPU.powerLimitsBattery : CPU.powerLimitsAC;
  exec(
    `/usr/sbin/set_power_limit ${PL1} ${PL2}`
  ).catch(() => {});

  notification.send(
    `FRMW: ${enabled ? 'On battery' : 'Charging'}`,
    `${enabled ? 'Limited CPU performance' : 'Full CPU performance'} PL1=${PL1} PL2=${PL2}\n`
      + ((CPU.pCores && shouldLimitCores) ? 'Limited to E-cores' : '')
  );
}

module.exports = {
  setLowPowerMode,
  patchCPUModelConfig,
  getCPUModelConfig,
};