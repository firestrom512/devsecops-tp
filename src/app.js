'use strict';

const { execFile } = require('node:child_process');
const express = require('express');
const { escapeHtml, isAllowedPingHost, sanitizePrefs } = require('./security');

function createApp({ pingRunner = execFile } = {}) {
  const app = express();
  app.disable('x-powered-by');

  app.get('/health', (_req, res) => res.json({ status: 'ok' }));

  // Corrige la XSS : le nom est échappé avant insertion dans le HTML.
  app.get('/hello', (req, res) => {
    const name = (typeof req.query.name === 'string' && req.query.name)
      ? req.query.name.slice(0, 200) : 'inconnu';
    res.type('html').send(`<h1>Bonjour ${escapeHtml(name)}</h1>`);
  });

  // Corrige la command injection : validation + arguments séparés, shell désactivé.
  app.get('/ping', (req, res) => {
    const host = req.query.host;
    if (!isAllowedPingHost(host)) {
      return res.status(400).json({ error: 'Hôte interdit ou invalide' });
    }
    const args = process.platform === 'win32' ? ['-n', '1', host] : ['-c', '1', host];
    return pingRunner('ping', args, {
      timeout: 3000,
      maxBuffer: 4096,
      windowsHide: true,
      shell: false,
    }, (error, stdout) => {
      if (error) return res.status(502).json({ error: 'Ping indisponible' });
      return res.type('text/plain').send(stdout);
    });
  });

  // Corrige la prototype pollution : seulement 2 clés explicitement autorisées.
  app.get('/prefs', (req, res) => res.json(sanitizePrefs(req.query)));
  return app;
}

const app = createApp();
module.exports = app;
module.exports.createApp = createApp;
