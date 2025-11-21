import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { TicketModule } from './ticket/ticket.module';
import { RoleModule } from './role/role.module';
import { UserModule } from './user/user.module';
import { AuthModule } from './auth/auth.module';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminModule } from './admin/admin.module';
import { TelegramNotifyModule } from './telegram-notify/telegram-notify.module';

@Module({
  imports: [ConfigModule.forRoot({
      isGlobal: true,
    }),
    TypeOrmModule.forRoot({
      type: 'mysql',
      host: process.env.DATABASE_HOST,      // <- match compose
      port: Number(process.env.DATABASE_PORT ?? 3306),
      username: process.env.DATABASE_USER,
      password: process.env.DATABASE_PASSWORD,
      database: process.env.DATABASE_NAME,
      // Use class-based entities OR a safe glob
      // entities: [User, Role],
      entities: [__dirname + '/**/*.entity.{js,ts}'],
      synchronize: true, // dev only
    }), TicketModule, RoleModule, UserModule, AuthModule, AdminModule, TelegramNotifyModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
