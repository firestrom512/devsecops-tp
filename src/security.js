'use strict';

// Encodage de sortie pour éviter qu'une entrée utilisateur devienne du HTML actif.
function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (char) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  })[char]);
}

// Une allowlist réduit aussi le risque de reconnaissance du réseau interne.
const ALLOWED_PING_HOSTS = Object.freeze(new Set([
  'example.com', 'google.com', 'cloudflare.com',
]));

function isAllowedPingHost(host) {
  return typeof host === 'string'
    && host.length <= 253
    && /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/i.test(host)
    && ALLOWED_PING_HOSTS.has(host.toLowerCase());
}

// Aucune fusion profonde d'objet fourni par l'utilisateur.
function sanitizePrefs(input = {}) {
  const prefs = { theme: 'light', lang: 'fr' };
  if (input && typeof input.theme === 'string' && ['light', 'dark'].includes(input.theme)) {
    prefs.theme = input.theme;
  }
  if (input && typeof input.lang === 'string' && ['fr', 'en'].includes(input.lang)) {
    prefs.lang = input.lang;
  }
  return prefs;
}

module.exports = { escapeHtml, isAllowedPingHost, sanitizePrefs };
