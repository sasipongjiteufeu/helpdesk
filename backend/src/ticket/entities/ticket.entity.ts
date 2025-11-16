// ticket.entity.ts
import {
  Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne,
  PrimaryGeneratedColumn, UpdateDateColumn, OneToMany   // 👈 add OneToMany
} from 'typeorm';
import { User } from 'src/user/entities/user.entity';
import { TicketStatus } from './ticket-state.enum';
import { TicketImage } from './ticket-image.entity';     // 👈 import

@Entity('Ticket')
export class Ticket {
  @PrimaryGeneratedColumn('uuid', { name: 'Ticket_ID' })
  id: string;

  @Index()
  @Column({ name: 'Title', type: 'varchar', length: 200 })
  title: string;

  @Column({ name: 'Detail', type: 'text' })
  detail: string;

  // ⛔️ you can delete the old single-picture column if you don't need it:
  // @Column({ name: 'Picture', type: 'longblob', nullable: true })
  // picture: Buffer | null;

  @ManyToOne(() => User, { eager: true, nullable: false })
  @JoinColumn({ name: 'ByUser' })
  createdBy: User;

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

  // 👇 MULTI-IMAGE RELATION
  @OneToMany(() => TicketImage, img => img.ticket, { cascade: true })
  images: TicketImage[];
}

export { TicketStatus };
