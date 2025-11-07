import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { User } from 'src/user/entities/user.entity';
import { RoleEnum } from './role.enum';

@Entity('roles')
export class Role {
  @PrimaryGeneratedColumn('uuid')
  id: string;

    @Column({
    type: 'enum',
    enum: RoleEnum,
    unique: true,
  })
  name: RoleEnum;

  @OneToMany(() => User, (u) => u.role)
  users: User[];
}