const exec = require('promised-exec');

function autoTune() {
  exec('powertop --auto-tune');
}

module.exports = {
  autoTune,
};