import { Entity, PrimaryGeneratedColumn, Column, Index, ManyToOne, CreateDateColumn } from 'typeorm';
import { TicketState } from './ticket-state.enum';
import { User } from 'src/user/entities/user.entity';
export class Ticket {
@PrimaryGeneratedColumn('uuid')
Ticket_id: number;

@Column()
@Index()
Title: string;

@Column({ type: 'text', nullable: true })
detail?: string | null;

@Column({ type: 'text', array: true, nullable: true })
picture?: string[] | null;

@ManyToOne(() => User, (u) => u.email, { nullable: false, eager: true })
createdBy: User;

@ManyToOne(() => User, (u) => u.email, { nullable: true, eager: true })
CommitBy?: User | null;

@CreateDateColumn({ type: 'timestamptz' })
createdAt: Date;

@Column({ length: 20, nullable: true })
telephone?: string | null;

@Column({
    type: 'enum',
    enum: TicketState,
    enumName: 'ticket_state',     // Postgres enum name
    default: TicketState.WAITING, // "รอรับงาน"
  })
  state: TicketState;
}
