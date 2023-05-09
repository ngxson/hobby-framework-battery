const fs = require('fs');

// libraries can be called from custom script
const notification = require('../notification');
const exec = require('promised-exec');
const axios = require('axios').default;

const SCRIPT_ON_START = 'start.js';
const SCRIPT_ON_BATTERY = 'battery.js';
const SCRIPT_ON_AC = 'ac.js';

function run(name) {
  try {
    if (!fs.existsSync('/etc/frmw-scripts')) return;
    if (fs.existsSync(`/etc/frmw-scripts/${name}`)) {
      const _content = fs.readFileSync(`/etc/frmw-scripts/${name}`).toString();
      console.log('scripts.run', name);
      eval(_content);
    }
  } catch (e) {
    console.error(e);
  }
}

module.exports = {
  run,
  SCRIPT_ON_AC,
  SCRIPT_ON_BATTERY,
  SCRIPT_ON_START,
};