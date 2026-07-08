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

@Entity('ticket_ratings')
@Index('UQ_ticket_ratings_ticket_user', ['ticket', 'user'], { unique: true })
export class TicketRating {
  @PrimaryGeneratedColumn({
    name: 'Rating_ID',
    type: 'int',
    unsigned: true,
  })
  id: number;

  @ManyToOne(() => Ticket, (ticket) => ticket.ratings, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'Ticket_ID' })
  ticket: Ticket;

  @ManyToOne(() => User, (user) => user.ticketRatings, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'User_ID' })
  user: User;

  @Column({ name: 'Rating', type: 'tinyint', unsigned: true })
  rating: number;

  @Column({ name: 'Comment', type: 'text', nullable: true })
  comment: string | null;

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
