// auth.controller.ts
import { Controller, Get, Req, Res, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { UserService } from 'src/user/user.service';

@Controller('auth/')
export class AuthController {
  constructor(private readonly user: UserService) {}
  
  // GET /auth/google  -> start OAuth
  @Get('google')
  @UseGuards(AuthGuard('google'))
  googleAuth() {}

  // GET /auth/google/redirect  -> callback from Google
  @Get('google/redirect')
  @UseGuards(AuthGuard('google'))
  async googleRedirect(@Req() req, @Res() res) {
    const { email, providerId } = req.user ?? {};
    const user = await this.user.findOrCreateGoogleUser(email, providerId);
    return res.redirect(`${process.env.FRONTEND_URL}/logged-in`);
  }
}
