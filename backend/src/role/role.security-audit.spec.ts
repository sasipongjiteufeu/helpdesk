import { Test } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { RoleController } from './role.controller';
import { RoleService } from './role.service';

// Authorization regression tests. No database or real accounts are accessed.
describe('Security: legacy role routes require ADMIN', () => {
  let app: INestApplication;
  const service = {
    addRoleToUserByEmail: jest.fn().mockResolvedValue({ auditOnly: true }),
    removeRoleFromUserByEmail: jest.fn().mockResolvedValue({ auditOnly: true }),
  };

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      controllers: [RoleController],
      providers: [{ provide: RoleService, useValue: service }],
    }).compile();
    app = module.createNestApplication();
    app.use((req, _res, next) => {
      // Test-only identity fixture; never installed in the application.
      const role = req.headers['x-test-role'];
      req.isAuthenticated = () => Boolean(role);
      if (role) req.user = { id: 'fixture', roles: [{ name: role }] };
      next();
    });
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    app.setGlobalPrefix('api');
    await app.init();
  });
  afterAll(async () => { await app.close(); });

  beforeEach(() => jest.clearAllMocks());

  it('blocks anonymous assignment before the service', async () => {
    await request(app.getHttpServer()).patch('/api/roles/assign')
      .send({ email: 'audit-only@example.invalid', name: 'ADMIN' }).expect(403);
    expect(service.addRoleToUserByEmail).not.toHaveBeenCalled();
  });

  it('blocks anonymous removal before the service', async () => {
    await request(app.getHttpServer()).patch('/api/roles/removeRoleFromUserByEmail')
      .send({ email: 'audit-only@example.invalid', name: 'ADMIN' }).expect(403);
    expect(service.removeRoleFromUserByEmail).not.toHaveBeenCalled();
  });

  it.each(['USER', 'AGENT'])('blocks %s on both role endpoints', async role => {
    for (const endpoint of ['assign', 'removeRoleFromUserByEmail']) {
      await request(app.getHttpServer()).patch('/api/roles/' + endpoint).set('x-test-role', role)
        .send({ email: 'audit-only@example.invalid', name: 'ADMIN' }).expect(403);
    }
    expect(service.addRoleToUserByEmail).not.toHaveBeenCalled();
    expect(service.removeRoleFromUserByEmail).not.toHaveBeenCalled();
  });

  it('allows ADMIN to manage roles', async () => {
    await request(app.getHttpServer()).patch('/api/roles/assign').set('x-test-role', 'ADMIN')
      .send({ email: 'audit-only@example.invalid', name: 'AGENT' }).expect(200);
    expect(service.addRoleToUserByEmail).toHaveBeenCalledWith('audit-only@example.invalid', 'AGENT');
    await request(app.getHttpServer()).patch('/api/roles/removeRoleFromUserByEmail').set('x-test-role', 'ADMIN')
      .send({ email: 'audit-only@example.invalid', name: 'ADMIN' }).expect(200);
    expect(service.removeRoleFromUserByEmail).toHaveBeenCalledWith('audit-only@example.invalid', 'ADMIN');
  });

  it('rejects invalid role names even from ADMIN', async () => {
    await request(app.getHttpServer()).patch('/api/roles/assign').set('x-test-role', 'ADMIN')
      .send({ email: 'audit-only@example.invalid', name: 'SUPERUSER' }).expect(400);
    expect(service.addRoleToUserByEmail).not.toHaveBeenCalled();
  });
});
