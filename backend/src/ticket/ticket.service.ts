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
import { EmailService } from 'src/email/email.service';

@Injectable()
export class TicketService {
  constructor(
    @InjectRepository(Ticket) private readonly repo: Repository<Ticket>,
    @InjectRepository(TicketImage) private readonly images: Repository<TicketImage>,
    @InjectRepository(User) private readonly users: Repository<User>,
    private readonly email: EmailService,
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
    await this.notifyAgentsAboutNewTicket(savedTicket);
    return savedTicket;
  
  }
  private async notifyAgentsAboutNewTicket(ticket: Ticket) {
    // ดึง AGENT ทั้งหมดจากฐานข้อมูล
    const agents = await this.users
      .createQueryBuilder('u')
      .innerJoin('u.roles', 'r')
      .where('r.name = :role', { role: RoleEnum.AGENT })
      .getMany();

    const emails = agents
      .map(a => a.email)
      .filter((e): e is string => !!e);

    if (!emails.length) {
      return;
    }

    await this.email.notifyAgentsNewTicket(emails, ticket);
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
    
    const prevStatus = t.status;
    const nextStatus = dto.status as TicketStatus;
    const now = new Date();
    const isLeavingOpen = prevStatus === TicketStatus.OPEN && nextStatus !== TicketStatus.OPEN;

    if (isLeavingOpen && !t.assignedTo) {
      t.assignedTo = user;
    }

    // 💡 NEW: first time action (time to first action)
    // define "first action" = first time leaving OPEN
    if (!t.firstInProgressAt && isLeavingOpen) {
      t.firstInProgressAt = now;
    }

    // 💡 NEW: first time resolved
    if (!t.resolvedAt && nextStatus === TicketStatus.RESOLVED) {
      t.resolvedAt = now;
    }
    
    // ✅ If ticket already has an assigned agent,
    //    ONLY that agent (or ADMIN) can change status.
    if (t.assignedTo && t.assignedTo.id !== user.id) {
      throw new ForbiddenException('Only the assigned agent can change status');
    }

    if (t.status !== 'OPEN' && nextStatus === 'OPEN') {
    throw new ForbiddenException('Cannot move ticket back to OPEN');
    } 
    
    // 💡 first time someone moves it away from OPEN → remember that person
    

    if (isLeavingOpen && !t.assignedTo) {
      t.assignedTo = user;
    }
    t.lastStatusChangedBy = user;

    t.status = nextStatus;
    return this.repo.save(t);
  }
  /**
   * SLA metrics:
   * - average time to first action (createdAt -> firstInProgressAt)
   * - average time to resolve (createdAt -> resolvedAt)
   * - % of resolved tickets resolved within `thresholdDays`
   */
  async getSlaMetricsForYear(
    year: number,
    thresholdDays: number,
  ) {
    const start = new Date(year, 0, 1);        // Jan 1
    const end = new Date(year + 1, 0, 1);      // Jan 1 next year

    // --- avg time to first action (sec) ---
    const firstActionRow = await this.repo
      .createQueryBuilder('t')
      .select(
        'AVG(TIMESTAMPDIFF(SECOND, t.createdAt, t.firstInProgressAt))',
        'avgSeconds',
      )
      .where('t.createdAt >= :start AND t.createdAt < :end', { start, end })
      .andWhere('t.firstInProgressAt IS NOT NULL')
      .getRawOne<{ avgSeconds: string | null }>();

    const avgFirstActionSeconds = firstActionRow?.avgSeconds
      ? Number(firstActionRow.avgSeconds)
      : null;

    // --- avg time to resolve (sec) ---
    const resolveRow = await this.repo
      .createQueryBuilder('t')
      .select(
        'AVG(TIMESTAMPDIFF(SECOND, t.createdAt, t.resolvedAt))',
        'avgSeconds',
      )
      .where('t.createdAt >= :start AND t.createdAt < :end', { start, end })
      .andWhere('t.resolvedAt IS NOT NULL')
      .getRawOne<{ avgSeconds: string | null }>();

    const avgResolveSeconds = resolveRow?.avgSeconds
      ? Number(resolveRow.avgSeconds)
      : null;

    // --- total resolved in that year ---
    const totalResolvedRow = await this.repo
      .createQueryBuilder('t')
      .select('COUNT(*)', 'cnt')
      .where('t.createdAt >= :start AND t.createdAt < :end', { start, end })
      .andWhere('t.resolvedAt IS NOT NULL')
      .getRawOne<{ cnt: string }>();

    const totalResolved = totalResolvedRow ? Number(totalResolvedRow.cnt) : 0;

    // --- resolved within threshold days ---
    const withinRow = await this.repo
      .createQueryBuilder('t')
      .select('COUNT(*)', 'cnt')
      .where('t.createdAt >= :start AND t.createdAt < :end', { start, end })
      .andWhere('t.resolvedAt IS NOT NULL')
      .andWhere(
        'TIMESTAMPDIFF(DAY, t.createdAt, t.resolvedAt) <= :days',
        { days: thresholdDays },
      )
      .getRawOne<{ cnt: string }>();

    const resolvedWithin = withinRow ? Number(withinRow.cnt) : 0;

    const percentWithin =
      totalResolved > 0 ? (resolvedWithin / totalResolved) * 100 : null;

    return {
      year,
      thresholdDays,
      averageTimeToFirstActionSeconds: avgFirstActionSeconds,
      averageTimeToResolveSeconds: avgResolveSeconds,
      totalResolved,
      resolvedWithinThreshold: resolvedWithin,
      percentResolvedWithinThreshold: percentWithin,
    };
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
