import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, VerifyCallback } from 'passport-google-oauth20';
import { UserService } from 'src/user/user.service';

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(private users: UserService) {
    super({
      clientID: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      callbackURL: process.env.GOOGLE_CALLBACK_URL!,
      scope: ['email', 'profile'],
    });

    console.log(
      'GOOGLE_CLIENT_ID',
      (process.env.GOOGLE_CLIENT_ID || '').slice(0, 8),
    );
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
    const name: string | null =
      profile.displayName ??
      profile.name?.givenName ??
      profile.name?.familyName ??
      null;
    const avatarUrl: string | null = profile.photos?.[0]?.value ?? null;

    try {
      const user = await this.users.findOrCreateGoogleUser(
        email,
        providerId,
        name,
        avatarUrl,
      );

      // Return the full user so downstream handlers already have name/roles
      done(null, user);
    } catch (e: any) {
      // Domain check or other expected errors -> mark unauthorized for controller redirect
      if (e?.status === 401 || e?.name === 'UnauthorizedException') {
        return done(null, {
          unauthorized: true,
          reason: 'unauthorized_domain',
          email,
        } as any);
      }
      return done(e);
    }
  }
}
