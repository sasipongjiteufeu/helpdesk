import { PassportStrategy } from '@nestjs/passport';
import { Strategy, VerifyCallback } from 'passport-google-oauth20';
import { Injectable } from '@nestjs/common';
import { UserService } from 'src/user/user.service';

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(private users: UserService) {
    super({
      clientID: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      callbackURL: process.env.GOOGLE_CALLBACK_URL!,
      scope: ['email','profile'],
    });
    console.log('GOOGLE_CLIENT_ID', (process.env.GOOGLE_CLIENT_ID || '').slice(0, 8));
    console.log('GOOGLE_CALLBACK_URL', process.env.GOOGLE_CALLBACK_URL);
  }

  async validate(
    accessToken: string,
    refreshToken: string,
    profile: any,
    done: VerifyCallback,
  ) {
    const email = profile.emails?.[0]?.value;
    const providerId = profile?.id;

    done(null, { email, providerId });
  }
}
