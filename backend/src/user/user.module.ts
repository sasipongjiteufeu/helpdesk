import { Module } from '@nestjs/common';
import { UserService } from './user.service';
import { UserController } from './user.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { Role } from 'src/role/entities/role.entity';
import { AuthModule } from 'src/auth/auth.module';

@Module({
  imports: [ 
      TypeOrmModule.forFeature([User, Role])], // <-- provides UserRepository & RoleRepository
  providers: [UserService],
  exports: [UserService, TypeOrmModule],
})
export class UserModule {}
