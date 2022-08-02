const exec = require('promised-exec');
const path = require('path');

const binaryPath = path.join(__dirname, './notification.sh');

function send(text) {
  exec(`${binaryPath} 1000 "${text}" "${(new Date).toISOString()}"`)
    .catch(() => { /* ignored */ });
}

module.exports = {
  send,
};