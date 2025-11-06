import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AuthService } from './auth.service';

@Controller('auth')
export class AuthController {
  constructor(private auth: AuthService) {}

  // Test route
  @Get('ping')
  ping() {
    return { ok: true };
  }

  // Step 1: redirect user to Google
  @Get('google')
  @UseGuards(AuthGuard('google'))
  async googleAuth() {
    // Handled by passport
  }

  // Step 2: Google callback
  @Get('google/callback')
  @UseGuards(AuthGuard('google'))
  async googleCallback(@Req() req: any) {
    return { user: req.user }; // just return Google profile for now
  }
}