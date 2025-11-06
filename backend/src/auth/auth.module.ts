import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { GoogleStrategy } from 'src/google.strategy';
import { User } from 'src/user/entities/user.entity';
import { Role } from 'src/role/entities/role.entity';
import { UserService } from 'src/user/user.service';
import { ConfigModule, ConfigService } from '@nestjs/config';

@Module({
  imports: [
    PassportModule.register({ session: false }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
        signOptions: { 
          expiresIn: configService.get<number>('JWT_EXPIRES_IN', 60 * 60 * 24 * 7),
        },
      }),
      inject: [ConfigService],
    }),
    TypeOrmModule.forFeature([User, Role]),
  ],
  controllers: [AuthController],
  providers: [AuthService, UserService, GoogleStrategy],
})
export class AuthModule {}
