
import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinTable,
  ManyToMany,
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

  // 👇 NEW: Google display name
  @Column({ name: 'FullName', type: 'varchar', length: 255, nullable: true })
  name: string | null;

  // 👇 NEW: Google profile picture url
  @Column({ name: 'AvatarUrl', type: 'text', nullable: true })
  avatarUrl: string | null;
  
  @ManyToMany(() => Role, (r) => r.users, { eager: true })
  @JoinTable({
    name: 'user_roles',
    joinColumn: { name: 'user_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'role_id', referencedColumnName: 'id' },
  })
  roles: Role[];

  @CreateDateColumn({ type: 'timestamp',                // ✅ MySQL
  precision: 3,                     // optional millis
  default: () => 'CURRENT_TIMESTAMP(3)',
})
createdAt: Date;
  //RoleEnum: any;

}