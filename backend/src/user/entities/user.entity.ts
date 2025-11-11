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