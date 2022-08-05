const webServer = require('./web-server');
const config = require('../config');
const fs = require('fs');

const getHTMLContent = () => {
  const cfgJSON = fs.readFileSync(config.CFG_PATH).toString();
  return `
    In case you experience problems or need some helps, please create an issue or a discussion on github: <a href="https://github.com/ngxson/hobby-framework-battery" target="_blank">https://github.com/ngxson/hobby-framework-battery</a><br/>
    <br/>
    Please also include your config file:<br/>
    <pre>${cfgJSON}</pre>
    <br/><br/>
  `;
};

function start() {
  webServer.addMenuEntry('Debug', '/debug');
  webServer.app.get('/debug', (req, res) => {
    res.sendHtmlBody(getHTMLContent(), { title: 'Debug' });
  });
}

module.exports = { start };