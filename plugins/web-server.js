const express = require('express');
const app = express();
const bodyParser = require('body-parser');
const { LOGO_192 } = require('../constants');

const powertop = require('./powertop');

const PORT = process.env.PORT || 1515;
const LISTEN_HOST = process.env.LISTEN_HOST || '127.0.0.1';

const menu = [
  {name: 'powertop --auto-tune', url: '/powertop-auto-tune'},
];

function start() {
  const sendHtmlBodyMiddleware = (req, res, next) => {
    res.sendHtmlBody = (html, options = {}) => {
      res.send(`
        <html>
        <head>
          <title>${options.title || 'Framework Battery Tuning'}</title>
          <link rel="icon" type="image/png" sizes="192x192" href="${LOGO_192}" />
          <style>
            html {
              background: #222;
              color: #eee;
            }
            body {
              font-family: sans-serif;
              margin: 2em;
            }
            a:active, a:visited, a:link, a:hover { color: #eee }
          </style>
        </head>
        <body>
            ${options.noTitle ? '' : `<h1>${options.title || 'Framework Battery Tuning'}</h1>`}
            ${html}
        </body>
        </html>
      `.trim());
    };
    next();
  };
  
  app.use(bodyParser.urlencoded({extended: true}));
  app.use(bodyParser.json({limit: '24mb'}));
  app.use(sendHtmlBodyMiddleware);
  app.get('/', (req, res) => {
    res.sendHtmlBody(`
      <ul>
        ${menu.map(({name, url}) => `<li><a href="${url}">${name}</a></li>`).join('\n')}
      </ul>
    `);
  });
  app.get('/powertop-auto-tune', (req, res) => {
    powertop.autoTune();
    res.sendHtmlBody('Complete', { title: 'powertop auto tune' });
  });
  app.listen(PORT, LISTEN_HOST, () => console.log(`Web server is up on port ${PORT}`));
}

function addMenuEntry(name, url) {
  menu.push({name, url});
}

const escapeHTML = (text) => text.replace(/ /g, "&nbsp;")
  .replace(/</g, "&lt;")
  .replace(/>/g, "&gt;")
  .replace(/\n/g, "<br />");

module.exports = {
  start,
  app,
  addMenuEntry,
  escapeHTML,
  PORT,
};