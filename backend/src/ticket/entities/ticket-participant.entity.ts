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

@Entity('Ticket_Participant')
@Index('IDX_Ticket_Participant_Ticket_Agent_Active', ['ticket', 'agent', 'isActive'])
export class TicketParticipant {
  @PrimaryGeneratedColumn('uuid', { name: 'Participant_ID' })
  id: string;

  @ManyToOne(() => Ticket, (ticket) => ticket.participants, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'Ticket_ID' })
  ticket: Ticket;

  @ManyToOne(() => User, (user) => user.ticketParticipants, {
    nullable: false,
  })
  @JoinColumn({ name: 'Agent_ID' })
  agent: User;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'Joined_By' })
  joinedBy: User | null;

  @Column({
    name: 'Joined_At',
    type: 'timestamp',
    precision: 3,
    default: () => 'CURRENT_TIMESTAMP(3)',
  })
  joinedAt: Date;

  @Column({ name: 'Is_Active', type: 'boolean', default: true })
  isActive: boolean;

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
