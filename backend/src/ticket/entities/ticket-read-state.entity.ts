import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Ticket } from './ticket.entity';
import { User } from 'src/user/entities/user.entity';

@Entity('Ticket_Read_State')
@Index('IDX_ticket_read_state_ticket_user', ['ticket', 'user'], { unique: true })
export class TicketReadState {
  @PrimaryGeneratedColumn('uuid', { name: 'Read_State_ID' })
  id: string;

  @ManyToOne(() => Ticket, { onDelete: 'CASCADE', nullable: false })
  @JoinColumn({ name: 'Ticket_ID' })
  ticket: Ticket;

  @ManyToOne(() => User, { onDelete: 'CASCADE', nullable: false })
  @JoinColumn({ name: 'User_ID' })
  user: User;

  @Column({
    name: 'Last_Read_At',
    type: 'timestamp',
    precision: 3,
    nullable: true,
  })
  lastReadAt: Date | null;

  @Column({
    name: 'Last_Read_Message_ID',
    type: 'varchar',
    length: 36,
    nullable: true,
  })
  lastReadMessageId: string | null;

  @CreateDateColumn({
    name: 'Created_at',
    type: 'timestamp',
    precision: 3,
    default: () => 'CURRENT_TIMESTAMP(3)',
  })
  createdAt: Date;

  @UpdateDateColumn({
    name: 'Updated_at',
    type: 'timestamp',
    precision: 3,
    default: () => 'CURRENT_TIMESTAMP(3)',
    onUpdate: 'CURRENT_TIMESTAMP(3)',
  })
  updatedAt: Date;
}
