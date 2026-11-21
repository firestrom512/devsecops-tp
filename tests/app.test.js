'use strict';

const request = require('supertest');
const app = require('../src/app');
const { createApp } = require('../src/app');

describe('API', () => {
  test('should return ok when calling /health', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: 'ok' });
  });

  test('should greet the user when name is given', async () => {
    const res = await request(app).get('/hello').query({ name: 'Lina' });
    expect(res.status).toBe(200);
    expect(res.text).toContain('Lina');
  });

  test('should greet unknown user when name missing', async () => {
    const res = await request(app).get('/hello');
    expect(res.text).toContain('inconnu');
  });

  test('should keep default prefs', async () => {
    const res = await request(app).get('/prefs');
    expect(res.body).toEqual({ theme: 'light', lang: 'fr' });
  });

  test('should update approved prefs', async () => {
    const res = await request(app).get('/prefs?theme=dark&lang=en');
    expect(res.body).toEqual({ theme: 'dark', lang: 'en' });
  });

  test('should reject ping without host', async () => {
    const res = await request(app).get('/ping');
    expect(res.status).toBe(400);
  });

  test('should invoke ping without using a shell', async () => {
    const pingRunner = jest.fn((_binary, _args, _opts, callback) => callback(null, 'PING OK'));
    const res = await request(createApp({ pingRunner })).get('/ping?host=example.com');
    expect(res.status).toBe(200);
    expect(res.text).toContain('PING OK');
    expect(pingRunner).toHaveBeenCalledTimes(1);
    expect(pingRunner.mock.calls[0][0]).toBe('ping');
    expect(pingRunner.mock.calls[0][1]).toContain('example.com');
    expect(pingRunner.mock.calls[0][2].shell).toBe(false);
  });

  test('should return controlled error when ping fails', async () => {
    const pingRunner = jest.fn((_bin, _args, _opts, callback) => callback(new Error('unavailable')));
    const res = await request(createApp({ pingRunner })).get('/ping?host=google.com');
    expect(res.status).toBe(502);
    expect(res.body).toEqual({ error: 'Ping indisponible' });
  });
});
