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

@Entity('Ticket_Image')  // เปลี่ยนเป็นตัวเล็กทั้งหมด
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

  // File is stored on disk; keep path, not blob
  @Column({ name: 'Path', type: 'varchar', length: 512, nullable: true })
  path: string | null;

  // Legacy blob column (kept nullable for backward compatibility)
  @Column({ name: 'Data', type: 'longblob', nullable: true })
  data: Buffer | null;

  @CreateDateColumn({
    name: 'Created_at',
    type: 'timestamp',
    precision: 3,
    default: () => 'CURRENT_TIMESTAMP(3)',
  })
  createdAt: Date;
}
