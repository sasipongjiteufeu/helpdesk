// src/auth/guards/roles.guard.ts
import {
  CanActivate, ExecutionContext, Injectable, ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { RoleEnum } from 'src/role/entities/role.enum';
import { Role } from 'src/role/entities/role.entity';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(ctx: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<RoleEnum[]>(ROLES_KEY, [
      ctx.getHandler(), ctx.getClass(),
    ]);
    if (!required || required.length === 0) return true;

    const req = ctx.switchToHttp().getRequest();
    const roles: Role[] | undefined = req.user?.roles;
    if (!roles || roles.length === 0) throw new ForbiddenException('Missing roles');

    const userRoleNames = new Set(roles.map((r) => r.name));
    const ok = required.some((r) => userRoleNames.has(r)); // ANY match
    if (!ok) throw new ForbiddenException('Insufficient role');
    return true;
  }
}
