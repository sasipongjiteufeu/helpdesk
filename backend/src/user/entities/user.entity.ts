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
  @Column({ length: 40, default: 'google' })
  provider: 'google';

  @Index({ unique: true })
  @Column({ length: 128, nullable: true })
  providerId?: string | null; // Google sub

  @ManyToOne(() => Role, (r) => r.users, { eager: true, nullable: false })
  role: Role;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;
}