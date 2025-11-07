import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import passport from 'passport';
import session from 'express-session';


async function bootstrap() {
  const app = await NestFactory.create(AppModule, {cors: true});
  app.use(
    session({
      name: '__host.sid',
      secret: process.env.SESSION_SECRET || 'keyboard cat',
      resave: false,
      saveUninitialized: false,
      cookie: {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      },
    }),
  );

  app.use(passport.initialize());
  app.use(passport.session());
  
  await app.listen(process.env.PORT ?? 3000);  
}


bootstrap();
