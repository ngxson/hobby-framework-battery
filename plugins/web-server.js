const express = require('express');
const app = express();
const bodyParser = require('body-parser');

const powertop = require('./powertop');

const PORT = 1515;
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
          <style>
            body {
              font-family: sans-serif;
              margin: 2em;
            }
          </style>
        </head>
        <body>
            <h1>${options.title || 'Framework Battery Tuning'}</h1>
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
  app.listen(PORT, () => console.log(`Web server is up on port ${PORT}`));
}

function addMenuEntry(name, url) {
  menu.push({name, url});
}

module.exports = {
  start,
  app,
  addMenuEntry,
};