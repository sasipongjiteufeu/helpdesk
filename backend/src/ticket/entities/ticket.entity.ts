// ticket.entity.ts
import {
  Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne,
  PrimaryGeneratedColumn, UpdateDateColumn, OneToMany,   // 👈 add OneToMany
  Generated
} from 'typeorm';
import { User } from 'src/user/entities/user.entity';
import { TicketStatus } from './ticket-state.enum';
import { TicketImage } from './ticket-image.entity';     // 👈 import

@Entity('ticket')
export class Ticket {
   @PrimaryGeneratedColumn({
    name: 'ticket_ID',
    type: 'int',
    unsigned: true,
  })
  id: number;  

  @Index()
  @Column({ name: 'title', type: 'varchar', length: 200 })
  title: string;

  @Column({ name: 'detail', type: 'text' })
  detail: string;

  // ⛔️ you can delete the old single-picture column if you don't need it:
  // @Column({ name: 'Picture', type: 'longblob', nullable: true })
  // picture: Buffer | null;

  @ManyToOne(() => User, { eager: true, nullable: false })
  @JoinColumn({ name: 'byUser' })
  createdBy: User;

  @ManyToOne(() => User, { eager: true, nullable: true })
  @JoinColumn({ name: 'commit_By' })
  assignedTo: User | null;

  @Column({ name: 'tal', type: 'varchar', length: 20, nullable: true })
  tel: string | null;

  @Column({ name: 'stat', type: 'enum', enum: TicketStatus, default: TicketStatus.OPEN })
  status: TicketStatus;

  @CreateDateColumn({
    name: 'create_at',
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
  @ManyToOne(() => User, { eager: true, nullable: true })
@JoinColumn({ name: 'lastStatusChangedBy' })
lastStatusChangedBy?: User | null;

  // 👇 MULTI-IMAGE RELATION
  @OneToMany(() => TicketImage, img => img.ticket, { cascade: true })
  images: TicketImage[];
}

export { TicketStatus };
