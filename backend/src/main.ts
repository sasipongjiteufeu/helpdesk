import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import helmet from 'helmet';
import { rateLimit } from 'express-rate-limit';
import { AppModule } from './app.module';
import passport from 'passport';
import session from 'express-session';
import { SESSION_COOKIE_NAME, sessionCookieOptions } from './auth/session-cookie';
import { originProtection, sessionSecret } from './auth/security';
import { MysqlSessionStore } from './auth/mysql-session.store';


async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  app.setGlobalPrefix('api');
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:8080';
  const secret = sessionSecret();
  if (process.env.TRUST_PROXY) app.set('trust proxy', process.env.TRUST_PROXY.split(',').map(value => value.trim()));
  app.use(helmet({
    strictTransportSecurity: sessionCookieOptions().secure ? undefined : false,
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    contentSecurityPolicy: { directives: { defaultSrc: ["'none'"], frameAncestors: ["'none'"], sandbox: [] } },
  }));
  app.use('/api', rateLimit({ windowMs: 60_000, limit: 240, standardHeaders: 'draft-8', legacyHeaders: false }));
  app.use('/api/auth/google', rateLimit({ windowMs: 15 * 60_000, limit: 30, standardHeaders: 'draft-8', legacyHeaders: false }));
  app.use(originProtection(frontendUrl));
  app.use('/api', (_req, res, next) => { res.setHeader('Cache-Control', 'no-store'); next(); });
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  const store = new MysqlSessionStore();
  await store.initialize();
  app.enableShutdownHooks();
  app.getHttpServer().on('close', () => { void store.close(); });

  app.enableCors({
    origin: frontendUrl,
    credentials: true,
  });
  app.use(
    session({
      name: SESSION_COOKIE_NAME,
      secret,
      store,
      resave: false,
      saveUninitialized: false,
      cookie: {
        ...sessionCookieOptions(),
        maxAge: 8 * 60 * 60 * 1000, // Absolute session expiry; do not refresh on reads.
      },
    }),
  );

  app.use(passport.initialize());
  app.use(passport.session());

  await app.listen(process.env.PORT ?? 3000, process.env.HOST || '0.0.0.0');
}


bootstrap();
