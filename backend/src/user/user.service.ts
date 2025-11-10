import { Injectable, NotFoundException } from '@nestjs/common';
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

  async findByIdWithRoles(id : string){
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
  private async getDefaultUserRole(): Promise<Role> {
    const role = await this.rolesRepository.findOne({ where: { name: RoleEnum.USER } });
    if (!role) {
      // If this throws, run your roles migration (or init SQL) to insert USER/AGENT/ADMIN.
      throw new NotFoundException(
        'Default role USER not found. Run DB migration/seed to create fixed roles.',
      );
    }
    return role;
  }

    private async getOrCreateDefaultRole(): Promise<Role> {
    let role = await this.rolesRepository.findOne({ where: { name: RoleEnum.USER } });
    if (!role) {
      role = this.rolesRepository.create({ name: RoleEnum.USER });
      role = await this.rolesRepository.save(role);
    }
    return role;
  }

  async findOrCreateGoogleUser(email: string, providerId: string) {
    if (!email?.endsWith('@sru.ac.th')) {
      throw new Error('Unauthorized domain');
    } //check if that use @sru.ac.th Doman?
    let user = await this.findByEmailWithRoles(email);

    if (user) {
      if (!user.providerId) {
        user.provider = 'google';
        user.providerId = providerId;

      } //this method is for check that user have user provider? if not servic will add provider


       if (!user.roles|| user.roles.length === 0) {
        const defaultRole = await this.getOrCreateDefaultRole();
        user.roles = [defaultRole];
      }
      return await this.usersRepository.save(user);
    }
     // if don't have user in database get it from google 

    const defaultRole = await this.getOrCreateDefaultRole();
    const newUser = this.usersRepository.create({
      email,
      provider: 'google',
      providerId,
      roles: [defaultRole],
    });
    return await this.usersRepository.save(newUser);
    
  }
}
