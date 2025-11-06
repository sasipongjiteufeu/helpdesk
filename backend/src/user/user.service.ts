import { Injectable } from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { Role } from 'src/role/entities/role.entity';
import { Repository } from 'typeorm';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User) private usersRepository: Repository<User>,
    @InjectRepository(Role) private rolesRepository: Repository<Role>,
  ) { }
  async findByEmail(email: string) {
    return this.usersRepository.findOne({ where: { email } });
  }



  async findOrCreateGoogleUser(email: string, providerId: string) {
    if (!email?.endsWith('@sru.ac.th')) {
      throw new Error('Unauthorized domain');
    } //check if that use @sru.ac.th Doman?
    let user = await this.usersRepository.findOne({ where: { email }, relations: ['role'] }); // find email and role

    if (user) {
      if (!user.providerId) {
        user.provider = 'google';
        user.providerId = providerId;
        await this.usersRepository.save(user);
      } //this method is for check that user have user provider? if not servic will add provider


      if (user.role) return user; //if user have role return user

      if (!user) {
        user = this.usersRepository.create({
          email,
          provider: 'google',
          providerId,
        });
      } // if don't have user in database get it from google 

      let defaultRole = await this.rolesRepository.findOne({ where: { name: 'USER' } });
      if (!defaultRole) {
        defaultRole = await this.rolesRepository.save(this.rolesRepository.create({ name: 'USER' }));
      } // set default Role to User
      user.role = defaultRole;
      return await this.usersRepository.save(user);
    }
  }
}
