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
  }

  async validate(
    accessToken: string,
    refreshToken: string,
    profile: any,
    done: VerifyCallback,
  ) {
    const email = profile.emails?.[0]?.value;
    const providerId = profile.id;

    const user = await this.users.findOrCreateGoogleUser(email, providerId);
    done(user);
  }
}
