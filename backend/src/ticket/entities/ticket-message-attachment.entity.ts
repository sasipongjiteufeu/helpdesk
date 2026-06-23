import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { TicketMessage } from './ticket-message.entity';

@Entity('Ticket_Message_Attachment')
export class TicketMessageAttachment {
  @PrimaryGeneratedColumn('uuid', { name: 'Attachment_ID' })
  id: string;

  @ManyToOne(() => TicketMessage, (message) => message.attachments, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'Message_ID' })
  message: TicketMessage;

  @Column({ name: 'Original_Name', type: 'varchar', length: 255 })
  originalName: string;

  @Column({ name: 'Filename', type: 'varchar', length: 255 })
  filename: string;

  @Column({ name: 'MimeType', type: 'varchar', length: 100 })
  mimeType: string;

  @Column({ name: 'Size', type: 'int' })
  size: number;

  @Column({ name: 'Path', type: 'varchar', length: 512 })
  path: string;

  @CreateDateColumn({
    name: 'Created_at',
    type: 'timestamp',
    precision: 3,
    default: () => 'CURRENT_TIMESTAMP(3)',
  })
  createdAt: Date;
}
