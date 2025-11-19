// src/ticket/ticket.service.ts
import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindOptionsWhere } from 'typeorm';
import { Ticket, TicketStatus } from './entities/ticket.entity';
import { CreateTicketDto } from './dto/create-ticket.dto';
import { User } from 'src/user/entities/user.entity';
import { RoleEnum } from 'src/role/entities/role.enum';
import { hasAnyRole, hasRole } from 'src/auth/role.utile';  // 👈 add
import { TicketImage } from './entities/ticket-image.entity';

@Injectable()
export class TicketService {
  constructor(
    @InjectRepository(Ticket) private readonly repo: Repository<Ticket>,
    @InjectRepository(TicketImage) private readonly images: Repository<TicketImage>,
    @InjectRepository(User) private readonly users: Repository<User>,
  ) {}

    async getAllImagesFor(user: User, id: number) {
    const t = await this.repo.findOne({
      where: { id },
      relations: ['images', 'createdBy', 'assignedTo'],
    });

    if (!t) throw new NotFoundException('Ticket not found');

    const isStaff = hasAnyRole(user, [RoleEnum.AGENT, RoleEnum.ADMIN]);
    const isOwner = t.createdBy.id === user.id;

    if (!isStaff && !isOwner) {
      throw new ForbiddenException('Not your ticket');
    }

    // return lightweight DTOs with base64 data
    return (t.images ?? []).map(img => ({
      id: img.id,
      filename: img.filename,
      mimeType: img.mimeType,
      size: img.size,
      base64: img.data.toString('base64'),
    }));
  }
    async listImagesFor(user: User, ticketId: number) {
    // Re-use your existing permission logic
    const ticket = await this.findOneFor(user, ticketId);

    return this.images.find({
      where: { ticket: { id: ticket.id } },
      order: { createdAt: 'ASC' },
      select: {
        id: true,
        filename: true,
        size: true,
        mimeType: true,
      },
    });
  }
   async getImageFor(user: User, ticketId: number, imageId: string) {
    // ensure user can see this ticket
    const ticket = await this.findOneFor(user, ticketId);

    const img = await this.images.findOne({
      where: {
        id: imageId,
        ticket: { id: ticket.id },
      },
    });

    if (!img) throw new NotFoundException('Image not found');

    return img;
  }
  async create(dto: CreateTicketDto, creator: User, files?: Express.Multer.File[],) {
    const t = this.repo.create({
      title: dto.title,
      detail: dto.detail,
      tel: dto.telephone ?? null,
      createdBy: creator,
      status: TicketStatus.OPEN,
    });
    const savedTicket = await this.repo.save(t);

    if (files?.length) {
      const imgs = files.map(f =>
        this.images.create({
          ticket: savedTicket,
          filename: f.originalname,
          mimeType: f.mimetype,
          size: f.size,
          data: f.buffer,
        }),
      );
      await this.images.save(imgs);
      savedTicket.images = imgs;
    }

    return savedTicket;
  
  }

  async findAllFor(user: User, opts?: { page?: number; limit?: number }) {
  const page = Math.max(1, opts?.page ?? 1);
  const limit = Math.min(100, Math.max(1, opts?.limit ?? 20));

  const isStaff = hasAnyRole(user, [RoleEnum.AGENT, RoleEnum.ADMIN]);

  const where: FindOptionsWhere<Ticket> | {} = isStaff
    ? {}
    : { createdBy: { id: user.id } };

  const [items, total] = await this.repo.findAndCount({
    where,
    order: { createdAt: 'DESC' },
    take: limit,
    skip: (page - 1) * limit,
    relations: ['assignedTo', 'createdBy', 'lastStatusChangedBy'],  
  });

  return { items, total, page, limit };
}


async findOneFor(user: User, id: number) {
  const t = await this.repo.findOne({
    where: { id },
    relations: ['createdBy', 'assignedTo', 'images', 'lastStatusChangedBy'],  
  });
  if (!t) throw new NotFoundException('Ticket not found');

  const isStaff = hasAnyRole(user, [RoleEnum.AGENT, RoleEnum.ADMIN]);
  if (!isStaff && t.createdBy.id !== user.id) {
    throw new ForbiddenException('Not your ticket');
  }
  return t;
}


  async updateFor(
  user: User,
  id: number,
  dto: CreateTicketDto,
  files?: Express.Multer.File[],
) {
  const t = await this.repo.findOne({
    where: { id },
    relations: ['createdBy', 'images'],   // 👈 load images so we can delete
  });
  if (!t) throw new NotFoundException('Ticket not found');

  const isStaff = hasAnyRole(user, [RoleEnum.AGENT, RoleEnum.ADMIN]);
  const isOwner = t.createdBy.id === user.id;
  if (!isOwner && !isStaff) throw new ForbiddenException();

  if (dto.title !== undefined) t.title = dto.title;
  if (dto.detail !== undefined) t.detail = dto.detail;
  if (dto.telephone !== undefined) t.tel = dto.telephone ?? null;

  if (files && files.length) {
    if (t.images?.length) {
      await this.images.remove(t.images);
    }

    const imgs = files.map(f =>
      this.images.create({
        ticket: t,
        filename: f.originalname,
        mimeType: f.mimetype,
        size: f.size,
        data: f.buffer,
      }),
    );
    await this.images.save(imgs);
    t.images = imgs;
  }

  return this.repo.save(t);
}

  async assign(id: number, dto: CreateTicketDto) {
    const t = await this.repo.findOne({ where: { id } });
    if (!t) throw new NotFoundException('Ticket not found');

    if (!dto.userId) throw new NotFoundException('userId is required');
    const assignee = await this.users.findOne({ where: { id: dto.userId } });
    if (!assignee) throw new NotFoundException('Assignee not found');

    t.assignedTo = assignee;
    return this.repo.save(t);
  }

   async changeStatusFor(
    id: number,
    user: User,
    dto: CreateTicketDto,
  ) {
    const t = await this.repo.findOne({
      where: { id },
      relations: ['assignedTo'],
    });

    if (!t) throw new NotFoundException('Ticket not found');
    if (!dto.status) throw new NotFoundException('status is required');

    // only AGENT / ADMIN can change status
    const isStaff = hasAnyRole(user, [RoleEnum.AGENT, RoleEnum.ADMIN]);
    if (!isStaff) {
      throw new ForbiddenException('Only staff can change status');
    }

    const nextStatus = dto.status;

    // 💡 first time someone moves it away from OPEN → remember that person
    const isLeavingOpen = t.status === TicketStatus.OPEN && nextStatus !== TicketStatus.OPEN;
    if (isLeavingOpen && !t.assignedTo) {
      t.assignedTo = user;
    }
    t.lastStatusChangedBy = user;
    t.status = nextStatus;
    return this.repo.save(t);
  }

  async removeFor(user: User, id: number) {
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
