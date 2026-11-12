import express from 'express';
import request from 'supertest';
import { originProtection, sessionSecret } from './security';
import { AppCacheService } from '../cache/app-cache.service';

describe('request security', () => {
  const app = express();
  app.use(originProtection('https://helpdesk.example'));
  app.post('/write', (_req, res) => res.json({ ok: true }));
  app.get('/read', (_req, res) => res.json({ ok: true }));
  it.each([undefined, 'null', 'https://evil.example', 'https://helpdesk.example.evil.example'])('rejects mutation origin %s', async origin => {
    const req = request(app).post('/write');
    if (origin) req.set('Origin', origin);
    await req.expect(403);
  });
  it('accepts the exact frontend origin and read-only requests', async () => {
    await request(app).post('/write').set('Origin', 'https://helpdesk.example').expect(200);
    await request(app).get('/read').expect(200);
  });
  it('uses a valid same-origin Referer fallback', async () => {
    await request(app).post('/write').set('Referer', 'https://helpdesk.example/user').expect(200);
    await request(app).post('/write').set('Referer', 'https://helpdesk.example.evil.example/user').expect(403);
  });
  it('fails closed without a strong production session secret', () => {
    const saved = { ...process.env };
    try {
      process.env.NODE_ENV = 'production';
      delete process.env.SESSION_SECRET;
      expect(sessionSecret).toThrow();
      process.env.SESSION_SECRET = 'x'.repeat(48);
      expect(sessionSecret()).toBe('x'.repeat(48));
    } finally { process.env = saved; }
  });
  it('bounds cache entries and removes expired entries', () => {
    const cache = new AppCacheService();
    for (let i = 0; i < 600; i++) cache.set('key' + i, i, 10);
    expect((cache as any).store.size).toBe(500);
    expect(cache.get('key0')).toBeUndefined();
    expect(cache.get('key599')).toBe(599);
    jest.spyOn(Date, 'now').mockReturnValue(Date.now() + 11000);
    cache.set('new', 1, 10);
    expect((cache as any).store.size).toBe(1);
    jest.restoreAllMocks();
  });
});
