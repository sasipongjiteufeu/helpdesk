import { DataSource } from 'typeorm';
import { User } from './user/entities/user.entity';
import { Role } from './role/entities/role.entity';
import * as dotenv from 'dotenv';

dotenv.config();

const dataSource = new DataSource({
  type: 'mysql',
  host: process.env.DATABASE_HOST || 'localhost',
  port: parseInt(process.env.DATABASE_PORT || '3306'),
  username: process.env.DATABASE_USER || 'root',
  password: process.env.DATABASE_PASSWORD || '',
  database: process.env.DATABASE_NAME || 'helpdesk_db',
  entities: [__dirname + '/**/*.entity.{ts,js}'],
  migrations: ['dist/migrations/*.js'], // compiled migrations
  synchronize: false, // ❗ Never true in production
});

export default dataSource;