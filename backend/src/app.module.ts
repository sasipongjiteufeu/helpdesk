import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { TicketModule } from './ticket/ticket.module';
import { RoleModule } from './role/role.module';
import { UserModule } from './user/user.module';

@Module({
  imports: [TicketModule, RoleModule, UserModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
