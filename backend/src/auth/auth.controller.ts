// auth.controller.ts
import { Controller, Get, Req, Res, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { UserService } from 'src/user/user.service';

@Controller('auth')
export class AuthController {
  constructor(private readonly user: UserService) { }

  // GET /auth/google  -> start OAuth
  @Get('google')
  @UseGuards(AuthGuard('google'))
  googleAuth() { }
  
  
  @Get('me')
  getMe(@Req() req: any) {
    if (!req.user) {
      return { authenticated: false };
    }

    const { id, email, roles, name, avatarUrl } = req.user;

    return {
      authenticated: true,
      id,
      email,
      name: name ?? null,
      avatarUrl: avatarUrl ?? null,
      roles,
    };
  }

  @Get('debug/session')
  debugSession(@Req() req) {
    return {
      isAuthenticated: !!req.isAuthenticated?.() && !!req.user,
      session: req.session,
      user: req.user,
    };
  }
  // GET /auth/google/redirect  -> callback from Google
  // auth.controller.ts
  @Get('google/redirect')
  @UseGuards(AuthGuard('google'))
  async googleRedirect(@Req() req, @Res() res) {
    try {
      const { email, providerId } = req.user ?? {};
      const user = await this.user.findOrCreateGoogleUser(email, providerId);  // Will throw on non-@sru.ac.th (your service already enforces)
      if (!email || !providerId) {
        // If Google didn’t give us what we need
        return res.redirect(`${process.env.FRONTEND_URL}/forbidden?reason=missing_profile`);
      }



      // If you're using sessions, make sure the user is logged into the session:
      // (Only needed if your Google strategy didn't already call req.logIn)
      await new Promise<void>((resolve, reject) =>
        req.logIn(user, (err) => (err ? reject(err) : resolve()))
      );

      const roleToPath = {
        ADMIN: '/admin',
        AGENT: '/agent',
        USER: '/user',
      } as const;

      const names = (user.roles || []).map(r => r.name).filter(Boolean);

      if (names.length === 0) {
        return res.redirect(`${process.env.FRONTEND_URL}/forbidden?reason=no-role`);
      }

      // if multiple roles → let user choose
      if (names.length > 1) {
        return res.redirect(`${process.env.FRONTEND_URL}/choose-role`);
      }

      // single role → straight redirect
      const only = names[0] as keyof typeof roleToPath;
      const path = roleToPath[only] ?? '/user';
      return res.redirect(`${process.env.FRONTEND_URL}${path}`);
    } catch (e) {
      return res.redirect(`${process.env.FRONTEND_URL}/forbidden?reason=unauthorized`);
    }
  }
  @Get('logout')
  logout(@Req() req, @Res() res) {
    req.logout?.(() => { });
    req.session?.destroy?.(() => { });
    res.clearCookie('__host.sid');
    return res.redirect(process.env.FRONTEND_URL + '/');
  }

}
