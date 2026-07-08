import { Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { Role } from 'src/role/entities/role.entity';
import { Repository } from 'typeorm';
import { RoleEnum } from 'src/role/entities/role.enum';
import { UUID } from 'crypto';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User) private usersRepository: Repository<User>,
    @InjectRepository(Role) private rolesRepository: Repository<Role>,
  ) { }

  async findByIdWithRoles(id: string) {
    return this.usersRepository.findOne({
      where: { id },
      relations: ['roles'],
    })
  }
  async findByEmail(email: string) {
    return this.usersRepository.findOne({ where: { email } });
  }

  async findByEmailWithRoles(email: string) {
    return this.usersRepository.findOne({
      where: { email },
      relations: ['roles'], // IMPORTANT: many-to-many
    });
  }

  private async getOrCreateDefaultRole(): Promise<Role> {
    let role = await this.rolesRepository.findOne({ where: { name: RoleEnum.USER } });
    if (!role) {
      role = this.rolesRepository.create({ name: RoleEnum.USER });
      role = await this.rolesRepository.save(role);
    }
    return role;
  }

  async findOrCreateGoogleUser(
    email: string,
    providerId: string,
    name?: string | null,
    avatarUrl?: string | null,
  ) {
  
  const allowed =
    email?.endsWith('@sru.ac.th') ||
    email?.endsWith('@student.sru.ac.th')||
    email?.endsWith('@creditbank.sru.ac.th');

  if (!allowed) {
    throw new UnauthorizedException('Unauthorized domain');
  } //check if that use @sru.ac.th Doman?
    let user = await this.findByEmailWithRoles(email);

    if (user) {
      if (!user.providerId) {
        user.provider = 'google';
        user.providerId = providerId;

      } //this method is for check that user have user provider? if not servic will add provider

      if (name && user.name !== name) {
        user.name = name;
      }
      if (avatarUrl && user.avatarUrl !== avatarUrl) {
        user.avatarUrl = avatarUrl;
      }

      // ensure USER role at least
      if (!user.roles || user.roles.length === 0) {
        const defaultRole = await this.getOrCreateDefaultRole();
        user.roles = [defaultRole];
      }

      return await this.usersRepository.save(user);
    }

    // no user yet → create from Google info
    const defaultRole = await this.getOrCreateDefaultRole();
    const newUser = this.usersRepository.create({
      email,
      provider: 'google',
      providerId,
      name: name ?? null,          // 👈 NEW
      avatarUrl: avatarUrl ?? null, // 👈 NEW
      roles: [defaultRole],
    });
    return await this.usersRepository.save(newUser);
  }

  async listAgents(search?: string) {
    const qb = this.usersRepository
      .createQueryBuilder('user')
      .innerJoinAndSelect('user.roles', 'role')
      .where('role.name = :agentRole', { agentRole: RoleEnum.AGENT })
      .orderBy('user.name', 'ASC')
      .addOrderBy('user.email', 'ASC');

    const term = search?.trim();
    if (term) {
      qb.andWhere('(LOWER(user.name) LIKE :q OR LOWER(user.email) LIKE :q)', {
        q: `%${term.toLowerCase()}%`,
      });
    }

    const users = await qb.getMany();

    return users.map((user) => ({
      id: user.id,
      email: user.email,
      name: user.name,
      roles: (user.roles ?? []).map((role) => role.name),
    }));
  }
}
