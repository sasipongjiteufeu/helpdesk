// backend/src/seeds/seed-roles.ts
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Role } from '../role/entities/role.entity';
import { RoleEnum } from '../role/entities/role.enum';

async function bootstrap() {
  // ใช้ ApplicationContext แทน HTTP server
  const app = await NestFactory.createApplicationContext(AppModule);

  const roleRepo = app.get<Repository<Role>>(getRepositoryToken(Role));

  const baseRoles: RoleEnum[] = [
    RoleEnum.USER,
    RoleEnum.AGENT,
    RoleEnum.ADMIN,
  ];

  for (const name of baseRoles) {
    const existing = await roleRepo.findOne({ where: { name } });
    if (!existing) {
      const role = roleRepo.create({ name });
      await roleRepo.save(role);
      console.log(`✅ Created role: ${name}`);
    } else {
      console.log(`ℹ️ Role already exists: ${name}`);
    }
  }

  await app.close();
  process.exit(0);
}

bootstrap().catch((err) => {
  console.error('❌ Seed roles failed:', err);
  process.exit(1);
});
