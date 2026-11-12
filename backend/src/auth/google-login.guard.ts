import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class GoogleLoginGuard extends AuthGuard('google') {
  getAuthenticateOptions() {
    // Ask Google to show its account picker even when Google has an active session.
    return { prompt: 'select_account' };
  }
}
