import { Controller, Get, Post, Header, Req, Res, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { UserService } from 'src/user/user.service';
import { GoogleLoginGuard } from './google-login.guard';
import { SESSION_COOKIE_NAME, sessionCookieOptions } from './session-cookie';

@Controller('auth')
export class AuthController {
  constructor(private readonly user: UserService) {}

  // GET /auth/google  -> start OAuth
  @Get('google')
  @UseGuards(GoogleLoginGuard)
  googleAuth() {}

  @Get('me')
  @Header('Cache-Control', 'no-store')
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

  // GET /api/auth/google/redirect  -> callback from Google
  @Get('google/redirect')
  @UseGuards(AuthGuard('google'))
  async googleRedirect(@Req() req, @Res() res) {
    try {
      const user = req.user;
      if (user?.unauthorized) {
        return res.redirect(
          `${process.env.FRONTEND_URL}/forbidden?reason=unauthorized`,
        );
      }
      const { email, providerId } = user ?? {};

      if (!email || !providerId) {
        return res.redirect(
          `${process.env.FRONTEND_URL}/forbidden?reason=missing_profile`,
        );
      }

      // Persisted in strategy already; just ensure session is set
      await new Promise<void>((resolve, reject) =>
        req.logIn(user, (err) => (err ? reject(err) : resolve())),
      );

      const roleToPath = {
        ADMIN: '/admin',
        AGENT: '/agent',
        USER: '/user',
      } as const;

      const names = (user.roles || []).map((r) => r.name).filter(Boolean);

      if (names.length === 0) {
        return res.redirect(
          `${process.env.FRONTEND_URL}/forbidden?reason=no-role`,
        );
      }

      // if multiple roles => let user choose
      if (names.length > 1) {
        return res.redirect(`${process.env.FRONTEND_URL}/choose-role`);
      }

      // single role => straight redirect
      const only = names[0] as keyof typeof roleToPath;
      const path = roleToPath[only] ?? '/user';
      return res.redirect(`${process.env.FRONTEND_URL}${path}`);
    } catch (e) {
      return res.redirect(
        `${process.env.FRONTEND_URL}/forbidden?reason=unauthorized`,
      );
    }
  }

  @Post('logout')
  @Header('Cache-Control', 'no-store')
  logout(@Req() req, @Res() res) {
    req.logout((err) => {
      if (err) {
        return res.status(500).json({ error: 'ไม่สามารถออกจากระบบได้ กรุณาลองใหม่' });
      }

      req.session.destroy((destroyError) => {
        res.clearCookie(SESSION_COOKIE_NAME, sessionCookieOptions());

        if (destroyError) {
          return res.status(500).json({ error: 'ไม่สามารถล้างเซสชันได้ กรุณาลองใหม่' });
        }

        return res.json({ message: 'ออกจากระบบสำเร็จ' });
      });
    });
  }
}
