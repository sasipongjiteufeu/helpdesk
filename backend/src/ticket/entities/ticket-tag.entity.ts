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

@Entity('Ticket_Tag')
@Index('IDX_Ticket_Tag_Ticket_Normalized', ['ticket', 'normalizedName'], {
  unique: true,
})
export class TicketTag {
  @PrimaryGeneratedColumn('uuid', { name: 'Tag_ID' })
  id: string;

  @ManyToOne(() => Ticket, (ticket) => ticket.tags, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'Ticket_ID' })
  ticket: Ticket;

  @Column({ name: 'Name', type: 'varchar', length: 80 })
  name: string;

  @Column({ name: 'Normalized_Name', type: 'varchar', length: 80 })
  normalizedName: string;

  @ManyToOne(() => User, (user) => user.ticketTags, { nullable: false })
  @JoinColumn({ name: 'Created_By' })
  createdBy: User;

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
