import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Ticket } from './ticket.entity';
import { User } from 'src/user/entities/user.entity';
import { TicketMessageAttachment } from './ticket-message-attachment.entity';

@Entity('Ticket_Message')
export class TicketMessage {
  @PrimaryGeneratedColumn('uuid', { name: 'Message_ID' })
  id: string;

  @ManyToOne(() => Ticket, (ticket) => ticket.messages, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'Ticket_ID' })
  ticket: Ticket;

  @ManyToOne(() => User, (user) => user.ticketMessages, { nullable: false })
  @JoinColumn({ name: 'Sender_ID' })
  sender: User;

  @Column({ name: 'Message', type: 'text', nullable: true })
  message: string | null;

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

  @OneToMany(() => TicketMessageAttachment, (attachment) => attachment.message, {
    cascade: true,
  })
  attachments: TicketMessageAttachment[];
}
