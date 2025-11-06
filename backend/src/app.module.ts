import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { TicketModule } from './ticket/ticket.module';
import { RoleModule } from './role/role.module';
import { UserModule } from './user/user.module';
import { AuthModule } from './auth/auth.module';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [ConfigModule.forRoot({
      isGlobal: true,
    }),TicketModule, RoleModule, UserModule, AuthModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
