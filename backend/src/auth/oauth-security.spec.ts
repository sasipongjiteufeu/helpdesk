import express from 'express';
import session from 'express-session';
import passport from 'passport';
import request from 'supertest';
import { GoogleStrategy } from '../google.strategy';

describe('Google OAuth state and PKCE', () => {
  let app: express.Express;
  const previous = { ...process.env };
  beforeAll(() => {
    process.env.GOOGLE_CLIENT_ID = 'test-only-client';
    process.env.GOOGLE_CLIENT_SECRET = 'test-only-secret';
    process.env.GOOGLE_CALLBACK_URL = 'http://localhost/callback';
    new GoogleStrategy({} as any);
    app = express();
    app.use(session({ secret: 'test-only-secret-not-for-production', resave: false, saveUninitialized: false }));
    app.use(passport.initialize());
    app.get('/login', passport.authenticate('google', { prompt: 'select_account' } as any));
    app.get('/callback', passport.authenticate('google'), (_req, res) => res.sendStatus(200));
  });
  afterAll(() => { process.env = previous; });
  it('sends state, S256 PKCE and account selection', async () => {
    const res = await request(app).get('/login').expect(302);
    const url = new URL(res.headers.location);
    expect(url.searchParams.get('state')).toBeTruthy();
    expect(url.searchParams.get('code_challenge')).toBeTruthy();
    expect(url.searchParams.get('code_challenge_method')).toBe('S256');
    expect(url.searchParams.get('prompt')).toBe('select_account');
  });
  it('rejects a callback without a matching browser session before token exchange', async () => {
    await request(app).get('/callback?code=fake-code&state=fake-state').expect(403);
  });
  it('rejects incorrect and missing state within a login session', async () => {
    const agent = request.agent(app);
    await agent.get('/login').expect(302);
    await agent.get('/callback?code=fake-code&state=wrong').expect(403);
    await agent.get('/login').expect(302);
    await agent.get('/callback?code=fake-code').expect(403);
  });
});
