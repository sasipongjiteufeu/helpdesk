import assert from 'node:assert/strict';

// Non-destructive smoke checks against local services only. Never print cookies.
const api = 'http://localhost:3000/api';
const origin = 'http://localhost:8080';
const login = await fetch(`${api}/auth/google`, { redirect: 'manual' });
assert.equal(login.status, 302);
const authorization = new URL(login.headers.get('location'));
assert(authorization.searchParams.get('state'));
assert(authorization.searchParams.get('code_challenge'));
assert.equal(authorization.searchParams.get('code_challenge_method'), 'S256');
assert.equal(authorization.searchParams.get('prompt'), 'select_account');
const cookie = login.headers.getSetCookie().map(value => value.split(';')[0]).join('; ');
assert(cookie);
const callback = await fetch(`${api}/auth/google/redirect?code=not-a-real-code&state=invalid`, { redirect: 'manual', headers: { Cookie: cookie } });
assert([401, 403].includes(callback.status), 'Invalid OAuth state must be rejected');

for (const endpoint of ['assign', 'removeRoleFromUserByEmail']) {
  const response = await fetch(`${api}/roles/${endpoint}`, {
    method: 'PATCH', headers: { Origin: origin, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'security-check@example.invalid', name: 'ADMIN' }),
  });
  assert.equal(response.status, 403, `Anonymous ${endpoint} must be forbidden`);
}
assert.equal((await fetch(`${api}/auth/debug/session`)).status, 404);
assert.equal((await fetch(`${api}/auth/logout`)).status, 404);
assert.equal((await fetch(`${api}/auth/logout`, { method: 'POST' })).status, 403);
assert.equal((await fetch(`${api}/auth/logout`, { method: 'POST', headers: { Origin: 'https://untrusted.example' } })).status, 403);
const logout = await fetch(`${api}/auth/logout`, { method: 'POST', headers: { Origin: origin, Cookie: cookie } });
assert.equal(logout.status, 201);
assert(logout.headers.getSetCookie().some(value => value.includes('Expires=Thu, 01 Jan 1970')));
const me = await fetch(`${api}/auth/me`, { headers: { Cookie: cookie } });
assert.equal((await me.json()).authenticated, false);
assert.equal(me.headers.get('cache-control'), 'no-store');

for (const method of ['GET', 'POST']) {
  const response = await fetch(`${api}/tickets/public${method === 'GET' ? '?limit=1' : ''}`, {
    method,
    ...(method === 'POST' ? { headers: { Origin: origin, 'Content-Type': 'application/json' }, body: JSON.stringify({ limit: 1 }) } : {}),
  });
  assert(response.ok);
  const data = await response.json();
  for (const item of data.items) {
    assert.equal(typeof item.title, 'string');
    assert.equal(typeof item.detail, 'string');
    assert(!('createdBy' in item));
    assert(!('tel' in item));
    assert(!('images' in item));
  }
}
assert.equal((await fetch(`${api}/tickets/public?limit=invalid`)).status, 400);
const page = await fetch(origin);
assert.equal(page.status, 200);
for (const header of ['content-security-policy', 'x-frame-options', 'x-content-type-options', 'referrer-policy']) assert(page.headers.has(header), header);
console.log('PASS: OAuth state/PKCE, anonymous role protection, CSRF, logout/cookie expiry, public data, validation, frontend headers.');
