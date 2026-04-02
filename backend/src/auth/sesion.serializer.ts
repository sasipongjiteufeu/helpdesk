// src/auth/session.serializer.ts
import { Injectable } from '@nestjs/common';
import { PassportSerializer } from '@nestjs/passport';
import { UserService } from 'src/user/user.service';
import { User } from 'src/user/entities/user.entity';

@Injectable()
export class SessionSerializer extends PassportSerializer {
  constructor(private readonly users: UserService) {
    super();
  }

  // store minimal data in session
  serializeUser(user: User, done: (err: any, id?: any) => void) {
    done(null, user.id);
  }

  // rebuild full user (with roles) from id for each request
  async deserializeUser(id: string, done: (err: any, user?: any) => void) {
    try {
      const user = await this.users.findByIdWithRoles(id);
      done(null, user || null);
    } catch (e) {
      done(e);
    }
  }
}
