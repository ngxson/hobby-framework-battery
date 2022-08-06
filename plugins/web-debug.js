const webServer = require('./web-server');
const cpu = require('./cpu');
const config = require('../config');
const exec = require('promised-exec');
const fs = require('fs');

const getHTMLContent = async ({ showProcessCgroup }) => {
  const cfgJSON = fs.readFileSync(config.CFG_PATH).toString();
  let processes, limitedCoresPID;
  if (showProcessCgroup) {
    processes = (await exec('ps -eLo pid,command'))
      .trim().split('\n')
      .map(line => line.trim().match(/([0-9]+) (.*)/))
      .filter(matched => !!matched);
    limitedCoresPID = fs.readFileSync('/sys/fs/cgroup/cpuset/active_cores/cgroup.procs').toString()
      .trim().split('\n')
      .reduce((prev, pid) => { prev[pid] = true; return prev }, {});
  }

  return `
    In case you experience problems or need some helps, please create an issue or a discussion on github: <a href="https://github.com/ngxson/hobby-framework-battery" target="_blank">https://github.com/ngxson/hobby-framework-battery</a><br/>
    <br/>
    Please also include your config file:<br/>
    <pre>${cfgJSON}</pre>
    <br/><br/>

    -------------<br/>
    More information:<br/>
    <b>CPU</b><br/>
    <pre>${JSON.stringify(cpu.getCPUModelConfig(), null, 2)}</pre>
    <br/><br/>

    <b>Processes and cpu group</b><br/>
    ${showProcessCgroup
      ? `
      Note: "limited" meaning the process can be limited to E-core only (on Intel 12th CPU)
      <br/><br/>
      <table>
        <tr>
          <th>cgroup</th>
          <th>pid</th>
          <th>command</th>
        </tr>
        ${processes.map(([_, pid, cmd]) => `
          <tr>
            <td>${limitedCoresPID[pid] ? 'limited' : ''}</td>
            <td>${pid}</td>
            <td>${webServer.escapeHTML(cmd)}</td>
          </tr>
        `).join('')}
      </table>`
      : '<a href="?process_cgroup=1">Show</a>'
    }

    <br/><br/>
  `;
};

function start() {
  webServer.addMenuEntry('Debug', '/debug');
  webServer.app.get('/debug', async (req, res) => {
    res.sendHtmlBody(await getHTMLContent({
      showProcessCgroup: req.query.process_cgroup,
    }), { title: 'Debug' });
  });
}

module.exports = { start };