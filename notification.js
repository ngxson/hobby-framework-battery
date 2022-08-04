const exec = require('promised-exec');
const path = require('path');

const notifySend = (uid, title, desc) => `sudo -u "$(id -nu ${uid})" DBUS_SESSION_BUS_ADDRESS=unix:path=/run/user/${uid}/bus notify-send "${title}" "${desc}"`;

function send(text, subtitle) {
  exec(notifySend(1000, text, subtitle || (new Date).toISOString()))
    .catch(() => { /* ignored */ });
}

module.exports = {
  send,
};