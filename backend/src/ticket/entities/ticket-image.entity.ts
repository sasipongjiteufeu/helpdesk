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

@Entity('ticket_image')  // เปลี่ยนเป็นตัวเล็กทั้งหมด
export class TicketImage {
  @PrimaryGeneratedColumn('uuid', { name: 'Picture_ID' })
  id: string;
  
  @ManyToOne(() => Ticket, t => t.images, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'ticket_ID' })
  ticket: Ticket;

  @Column({ name: 'filename', type: 'varchar', length: 255, nullable: true })
  filename: string | null;

  @Column({ name: 'mimeType', type: 'varchar', length: 100, nullable: true })
  mimeType: string | null;

  @Column({ name: 'size', type: 'int', nullable: true })
  size: number | null;

  @Column({ name: 'data', type: 'longblob' })
  data: Buffer;

  @CreateDateColumn({
    name: 'created_at',
    type: 'timestamp',
    precision: 3,
    default: () => 'CURRENT_TIMESTAMP(3)',
  })
  createdAt: Date;
}
