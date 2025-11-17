// src/ticket/entities/ticket-image.entity.ts
import {
  Column,
  CreateDateColumn,
  Entity,
  Generated,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Ticket } from './ticket.entity';

@Entity('Ticket_Image')
export class TicketImage {
  @PrimaryGeneratedColumn('uuid', { name: 'Picture_ID' })
  id: string;
  
  @ManyToOne(() => Ticket, t => t.images, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'Ticket_ID' })
  ticket: Ticket;

  @Column({ name: 'Filename', type: 'varchar', length: 255, nullable: true })
  filename: string | null;

  @Column({ name: 'MimeType', type: 'varchar', length: 100, nullable: true })
  mimeType: string | null;

  @Column({ name: 'Size', type: 'int', nullable: true })
  size: number | null;

  @Column({ name: 'Data', type: 'longblob' })
  data: Buffer;

  @CreateDateColumn({
    name: 'Created_at',
    type: 'timestamp',
    precision: 3,
    default: () => 'CURRENT_TIMESTAMP(3)',
  })
  createdAt: Date;
}
