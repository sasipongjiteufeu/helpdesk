import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Role } from 'src/role/entities/role.entity';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index({ unique: true })
  @Column({ length: 160 })
  email: string;

  // OAuth fields (no passwords stored)
  @Column({ type: 'varchar', length: 40, default: 'google' })
  provider: string;

  // 👇 important: force varchar, not inferred Object
  @Index({ unique: true })
  @Column({ type: 'varchar', length: 128, nullable: true })
  providerId?: string | null;

  @ManyToOne(() => Role, (r) => r.users, { eager: true, nullable: false })
  role: Role;

  @CreateDateColumn({ type: 'timestamp',                // ✅ MySQL
  precision: 3,                     // optional millis
  default: () => 'CURRENT_TIMESTAMP(3)',
})
createdAt: Date;
}