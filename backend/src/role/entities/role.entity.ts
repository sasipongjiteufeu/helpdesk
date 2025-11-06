import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { User } from 'src/user/entities/user.entity';

@Entity('roles')
export class Role {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 40, unique: true })
  name: string; // e.g., 'USER' | 'AGENT' | 'ADMIN'

  @OneToMany(() => User, (u) => u.role)
  users: User[];
}