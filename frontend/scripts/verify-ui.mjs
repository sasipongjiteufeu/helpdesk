import { build } from 'esbuild';
import { createRequire } from 'node:module';

// Render the shared UI without requiring a live backend or a signed-in account.
const result = await build({
  stdin: {
    contents: `
      import React from 'react';
      import { renderToStaticMarkup } from 'react-dom/server';
      import { MemoryRouter } from 'react-router-dom';
      import assert from 'node:assert/strict';
      import Sidebar from './src/components/AppSidebar';
      import Notice from './src/components/ServiceAnnouncement';
      const render = (roles, path = '/') => renderToStaticMarkup(
        <MemoryRouter initialEntries={[path]}><Sidebar user={roles === null ? null : {
          email: 'test@sru.ac.th', roles: roles.map(name => ({ name }))
        }} /></MemoryRouter>
      );
      assert(!render(null).includes('/admin/roles'));
      assert(render(['USER']).includes('/user/create'));
      assert(!render(['USER']).includes('href="/agent"'));
      assert(render(['AGENT']).includes('href="/agent"'));
      assert(render(['ADMIN']).includes('/admin/stats'));
      const allRoles = render(['USER', 'AGENT', 'ADMIN']);
      assert(!allRoles.includes('/choose-role'));
      for (const path of ['/user/create', '/agent', '/admin/roles', '/admin/stats']) {
        assert(allRoles.includes('href="' + path + '"'));
      }
      assert(render(['USER'], '/user/ticket/1').includes('sidebar-link is-active'));
      const notice = renderToStaticMarkup(<Notice />);
      assert(notice.includes('tel:0876898672'));
      assert(notice.includes('3 วัน'));
      assert(notice.includes('ปิดงาน'));
      assert(notice.includes('น้องโมจิ'));
      console.log('PASS: navigation by role, direct multi-role navigation, announcement and phone link');
    `,
    resolveDir: process.cwd(),
    loader: 'tsx',
  },
  bundle: true,
  platform: 'node',
  format: 'cjs',
  write: false,
  loader: { '.png': 'dataurl' },
});
new Function('require', result.outputFiles[0].text)(createRequire(import.meta.url));
