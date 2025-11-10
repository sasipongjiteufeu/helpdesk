// src/auth/session.serializer.ts
import { Injectable } from '@nestjs/common';
import { PassportSerializer } from '@nestjs/passport';
import { UserService } from 'src/user/user.service';
import { User } from 'src/user/entities/user.entity';
import { UUID } from 'crypto';

@Injectable()
export class SessionSerializer extends PassportSerializer {
  constructor(private readonly usersService: UserService) {
    super();
  }

  /**
   * Called once after successful login.
   * Return a small piece of data to store in the session (usually the user id).
   */
  serializeUser(user: User, done: Function) {
    done(null, user.id);
  }

  /**
   * Called on every request that uses a session cookie.
   * Reconstruct the full user object from the id in the session.
   */

  async deserializeUser(userId: string, done: Function) {
    try {
      // ✅ important: load roles too, for your Guards
      const user = await this.usersService.findByIdWithRoles(userId);
      done(null, user || null);
    } catch (err) {
      done(err, null);
    }
  }

}
