const os = require('os');
const service = require('./service');

if (os.userInfo().username !== 'root') {
  console.error('Script is not running as root');
  process.exit(1);
}

service.start();
