const fs = require('fs');
const notification = require('../notification');
const exec = require('promised-exec');

const SCRIPT_ON_START = 'start.js';
const SCRIPT_ON_BATTERY = 'battery.js';
const SCRIPT_ON_AC = 'ac.js';

function run(name) {
  try {
    if (!fs.existsSync('/etc/frmw-scripts')) return;
    if (fs.existsSync(`/etc/frmw-scripts/${name}`)) {
      const _content = fs.readFileSync(`/etc/frmw-scripts/${name}`).toString();
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