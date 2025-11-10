// src/role/role.service.ts
import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Role } from './entities/role.entity';
import { RoleEnum } from './entities/role.enum';
import { User } from 'src/user/entities/user.entity';

@Injectable()
export class RoleService {
  constructor(
    @InjectRepository(Role) private readonly rolesRepository: Repository<Role>,
    @InjectRepository(User) private readonly usersRepository: Repository<User>,
  ) {}

  async findByname(name : RoleEnum){
    const role = await this.rolesRepository.findOne({where:{name}})
  }
  /** Helper: load user with roles or throw */
  private async getUserWithRolesByEmail(email: string): Promise<User> {
    const user = await this.usersRepository.findOne({
      where: { email },
      relations: ['roles'], // <-- IMPORTANT for many-to-many
    });
    if (!user) throw new NotFoundException(`User not found: ${email}`);
    return user;
  }

  /** Helper: get a Role entity by enum or throw */
  private async getRoleEntity(name: RoleEnum): Promise<Role> {
    const role = await this.rolesRepository.findOne({ where: { name } });
    if (!role) throw new NotFoundException(`Role not found: ${name}`);
    return role;
  }

  /** ADD one role (keeps existing roles). Idempotent. */
  async addRoleToUserByEmail(email: string, roleName: RoleEnum) {
    const user = await this.getUserWithRolesByEmail(email);
    const role = await this.getRoleEntity(roleName);

    const has = (user.roles ?? []).some((r) => r.name === role.name);
    if (has) return user; // already has it

    user.roles = [...(user.roles ?? []), role];
    return this.usersRepository.save(user);
  }

  /** REPLACE all roles with exactly one role (e.g., switch to AGENT only). */
  async setSingleRoleForUserByEmail(email: string, roleName: RoleEnum) {
    const user = await this.getUserWithRolesByEmail(email);
    const role = await this.getRoleEntity(roleName);
    user.roles = [role];
    return this.usersRepository.save(user);
  }

  /** REPLACE all roles with a list of roles. */
  async setRolesForUserByEmail(email: string, roleNames: RoleEnum[]) {
    const user = await this.getUserWithRolesByEmail(email);
    const wanted = await this.rolesRepository.find({
      where: { name: In(roleNames) },
    });
    if (wanted.length !== roleNames.length) {
      const found = new Set(wanted.map((r) => r.name));
      const missing = roleNames.filter((n) => !found.has(n));
      throw new NotFoundException(`Missing roles: ${missing.join(', ')}`);
    }
    user.roles = wanted;
    return this.usersRepository.save(user);
  }

  /** REMOVE one role from user (keeps others). */
  async removeRoleFromUserByEmail(email: string, roleName: RoleEnum) {
    const user = await this.getUserWithRolesByEmail(email);
    const before = user.roles?.length ?? 0;
    user.roles = (user.roles ?? []).filter((r) => r.name !== roleName);
    if ((user.roles?.length ?? 0) === before) {
      // nothing changed; optional: throw or just return
      throw new ConflictException(`User did not have role: ${roleName}`);
    }
    return this.usersRepository.save(user);
  }
}
