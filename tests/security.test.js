'use strict';

const request = require('supertest');
const { createApp } = require('../src/app');
const { escapeHtml, isAllowedPingHost, sanitizePrefs } = require('../src/security');

const app = createApp();

describe('Security regression', () => {
  test('should escape HTML/script payload injected into /hello (XSS)', async () => {
    const res = await request(app).get('/hello').query({ name: '<script>alert(1)</script>' });
    expect(res.status).toBe(200);
    expect(res.text).not.toContain('<script>');
    expect(res.text).toContain('&lt;script&gt;alert(1)&lt;/script&gt;');
  });

  test('should escape a quote, angle brackets and ampersand', () => {
    expect(escapeHtml(`<&>"'`)).toBe('&lt;&amp;&gt;&quot;&#39;');
  });

  test('should reject shell metacharacters in /ping (command injection)', async () => {
    const pingRunner = jest.fn();
    const res = await request(createApp({ pingRunner }))
      .get('/ping').query({ host: 'google.com;whoami' });
    expect(res.status).toBe(400);
    expect(pingRunner).not.toHaveBeenCalled();
  });

  test('should reject private or local hosts in /ping', () => {
    for (const host of ['127.0.0.1', 'localhost', '169.254.169.254', 'internal.local', 'example.com && id']) {
      expect(isAllowedPingHost(host)).toBe(false);
    }
  });

  test('should accept only explicitly allowed public domain names', () => {
    expect(isAllowedPingHost('google.com')).toBe(true);
    expect(isAllowedPingHost('example.com')).toBe(true);
    expect(isAllowedPingHost('not-allowed.example.com')).toBe(false);
  });

  test('should ignore __proto__ injection in /prefs (prototype pollution)', async () => {
    const res = await request(app).get('/prefs?__proto__[admin]=true&theme=dark');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ theme: 'dark', lang: 'fr' });
    expect(({}).admin).toBeUndefined();
  });

  test('should accept only whitelist keys and values', () => {
    const input = Object.create(null);
    input.theme = 'evil';
    input.lang = { exploit: true };
    input.constructor = { prototype: { admin: true } };
    expect(sanitizePrefs(input)).toEqual({ theme: 'light', lang: 'fr' });
    expect(({}).admin).toBeUndefined();
  });

  test('should not leak framework identification', async () => {
    const res = await request(app).get('/health');
    expect(res.headers['x-powered-by']).toBeUndefined();
  });
});
