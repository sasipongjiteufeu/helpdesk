import {
  Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne,
  PrimaryGeneratedColumn, UpdateDateColumn
} from 'typeorm';
import { User } from 'src/user/entities/user.entity';
import { TicketStatus } from './ticket-state.enum';

@Entity('Ticket') // table name to match your diagram (optional)
export class Ticket {
  @PrimaryGeneratedColumn('uuid', { name: 'Ticket_ID' })
  id: string;

  @Index()
  @Column({ name: 'Title', type: 'varchar', length: 200 })
  title: string;

  @Column({ name: 'Detail', type: 'text' })
  detail: string;

  // single BLOB, as requested
  @Column({ name: 'Picture', type: 'longblob', nullable: true })
  picture: Buffer | null;

  // creator (ByUser)
  @ManyToOne(() => User, { eager: true, nullable: false })
  @JoinColumn({ name: 'ByUser' })
  createdBy: User;

  // assignee (Commit_By)
  @ManyToOne(() => User, { eager: true, nullable: true })
  @JoinColumn({ name: 'Commit_By' })
  assignedTo: User | null;

  @Column({ name: 'Tal', type: 'varchar', length: 20, nullable: true })
  tel: string | null;

  @Column({ name: 'Stat', type: 'enum', enum: TicketStatus, default: TicketStatus.OPEN })
  status: TicketStatus;

  @CreateDateColumn({
    name: 'Create_at',
    type: 'timestamp',
    precision: 3,
    default: () => 'CURRENT_TIMESTAMP(3)',
  })
  createdAt: Date;

  @UpdateDateColumn({
    type: 'timestamp',
    precision: 3,
    default: () => 'CURRENT_TIMESTAMP(3)',
    onUpdate: 'CURRENT_TIMESTAMP(3)',
  })
  updatedAt: Date;
}
export { TicketStatus };

