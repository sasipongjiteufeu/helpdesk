// src/ticket/ticket.service.ts
import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindOptionsWhere } from 'typeorm';
import { Ticket, TicketStatus } from './entities/ticket.entity';
import { CreateTicketDto } from './dto/create-ticket.dto';
import { User } from 'src/user/entities/user.entity';
import { RoleEnum } from 'src/role/entities/role.enum';
import { hasAnyRole, hasRole } from 'src/auth/role.utile';  // 👈 add

@Injectable()
export class TicketService {
  constructor(
    @InjectRepository(Ticket) private readonly repo: Repository<Ticket>,
    @InjectRepository(User) private readonly users: Repository<User>,
  ) {}

  async create(dto: CreateTicketDto, creator: User, file?: { buffer: Buffer }) {
    const t = this.repo.create({
      title: dto.title,
      detail: dto.detail,
      tel: dto.telephone ?? null,
      createdBy: creator,
      picture: file ? file.buffer : null,
      status: TicketStatus.OPEN,
    });
    return this.repo.save(t);
  }

  async findAllFor(user: User, opts?: { page?: number; limit?: number }) {
    const page = Math.max(1, opts?.page ?? 1);
    const limit = Math.min(100, Math.max(1, opts?.limit ?? 20));

    const isStaff = hasAnyRole(user, [RoleEnum.AGENT, RoleEnum.ADMIN]); // 👈 fix

    const where: FindOptionsWhere<Ticket> | {} = isStaff
      ? {}
      : { createdBy: { id: user.id } };

    const [items, total] = await this.repo.findAndCount({
      where,
      order: { createdAt: 'DESC' },
      take: limit,
      skip: (page - 1) * limit,
    });
    return { items, total, page, limit };
  }

  async findOneFor(user: User, id: string) {
    const t = await this.repo.findOne({ where: { id } });
    if (!t) throw new NotFoundException('Ticket not found');

    const isStaff = hasAnyRole(user, [RoleEnum.AGENT, RoleEnum.ADMIN]); // 👈 fix
    if (!isStaff && t.createdBy.id !== user.id) {
      throw new ForbiddenException('Not your ticket');
    }
    return t;
  }

  async updateFor(user: User, id: string, dto: CreateTicketDto, file?: { buffer: Buffer }) {
    const t = await this.repo.findOne({ where: { id } });
    if (!t) throw new NotFoundException('Ticket not found');

    const isStaff = hasAnyRole(user, [RoleEnum.AGENT, RoleEnum.ADMIN]); // 👈 fix
    const isOwner = t.createdBy.id === user.id;
    if (!isOwner && !isStaff) throw new ForbiddenException();

    if (dto.title !== undefined) t.title = dto.title;
    if (dto.detail !== undefined) t.detail = dto.detail;
    if (dto.telephone !== undefined) t.tel = dto.telephone ?? null;
    if (file) t.picture = file.buffer;

    return this.repo.save(t);
  }

  async assign(id: string, dto: CreateTicketDto) {
    const t = await this.repo.findOne({ where: { id } });
    if (!t) throw new NotFoundException('Ticket not found');

    if (!dto.userId) throw new NotFoundException('userId is required');
    const assignee = await this.users.findOne({ where: { id: dto.userId } });
    if (!assignee) throw new NotFoundException('Assignee not found');

    t.assignedTo = assignee;
    return this.repo.save(t);
  }

  async changeStatus(id: string, dto: CreateTicketDto) {
    const t = await this.repo.findOne({ where: { id } });
    if (!t) throw new NotFoundException('Ticket not found');
    if (!dto.status) throw new NotFoundException('status is required');

    t.status = dto.status;
    return this.repo.save(t);
  }

  async removeFor(user: User, id: string) {
    const t = await this.repo.findOne({ where: { id } });
    if (!t) throw new NotFoundException('Ticket not found');

    const isAdmin = hasRole(user, RoleEnum.ADMIN); // 👈 fix
    const isOwner = t.createdBy.id === user.id;

    if (!isAdmin && !(isOwner && t.status === TicketStatus.OPEN && !t.assignedTo)) {
      throw new ForbiddenException();
    }
    await this.repo.remove(t);
    return { ok: true };
  }
}
