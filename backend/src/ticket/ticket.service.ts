// src/ticket/ticket.service.ts
import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindOptionsWhere } from 'typeorm';
import { Ticket, TicketStatus } from './entities/ticket.entity';
import { CreateTicketDto } from './dto/create-ticket.dto';
import { User } from 'src/user/entities/user.entity';
import { RoleEnum } from 'src/role/entities/role.enum';
import { hasAnyRole, hasRole } from 'src/auth/role.utile';
import { TicketImage } from './entities/ticket-image.entity';
import { EmailService } from 'src/email/email.service';
import { TelegramNotifyService } from 'src/telegram-notify/telegram-notify.service';
import * as fs from 'fs';
import * as path from 'path';
import { FilterTicketDto, TicketFilterName } from './dto/filter-ticket.dto';

@Injectable()
export class TicketService {
  constructor(
    @InjectRepository(Ticket) private readonly repo: Repository<Ticket>,
    @InjectRepository(TicketImage) private readonly images: Repository<TicketImage>,
    @InjectRepository(User) private readonly users: Repository<User>,
    private readonly email: EmailService,
    private readonly telegramNotify: TelegramNotifyService,
  ) {}

  private relativePath(absPath: string | undefined | null): string | null {
    if (!absPath) return null;
    return path.relative(process.cwd(), absPath).replace(/\\/g, '/');
  }

  private deleteFileIfExists(filePath: string | null | undefined) {
    if (!filePath) return;
    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    } catch {
      // ignore cleanup errors
    }
  }

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

    // return lightweight DTOs with file paths (no base64 to avoid overload)
    return (t.images ?? []).map((img) => ({
      id: img.id,
      filename: img.filename,
      mimeType: img.mimeType,
      size: img.size,
      path: this.relativePath(img.path || undefined),
      url: `/tickets/${t.id}/images/${img.id}`,
    }));
  }

  async listImagesFor(user: User, ticketId: number) {
    const ticket = await this.findOneFor(user, ticketId);

    return this.images.find({
      where: { ticket: { id: ticket.id } },
      order: { createdAt: 'ASC' },
      select: {
        id: true,
        filename: true,
        size: true,
        mimeType: true,
        path: true,
      },
    });
  }

  async getImageFor(user: User, ticketId: number, imageId: string) {
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

  async create(
    dto: CreateTicketDto,
    creator: User,
    files?: Express.Multer.File[],
  ) {
    const t = this.repo.create({
      title: dto.title,
      detail: dto.detail,
      tel: dto.telephone ?? null,
      createdBy: creator,
      status: TicketStatus.OPEN,
    });
    const savedTicket = await this.repo.save(t);

    if (files?.length) {
      const imgs = files.map((f) =>
        this.images.create({
          ticket: savedTicket,
          filename: f.originalname,
          mimeType: f.mimetype,
          size: f.size,
          path: f.path,
          data: null,
        }),
      );
      await this.images.save(imgs);
      savedTicket.images = imgs;
    }
    await this.notifyAgentsAboutNewTicket(savedTicket);
    try {
      await this.telegramNotify.notifyNewTicket(savedTicket);
    } catch {
      // ignore notify errors
    }
    return savedTicket;
  }
  
  private async notifyAgentsAboutNewTicket(ticket: Ticket) {
    const agents = await this.users
      .createQueryBuilder('u')
      .innerJoin('u.roles', 'r')
      .where('r.name = :role', { role: RoleEnum.AGENT })
      .getMany();

    const emails = agents.map((a) => a.email).filter((e): e is string => !!e);
    if (!emails.length) return;

    await this.email.notifyAgentsNewTicket(emails, ticket);
  }
  
  async findAllPublicPost(opts?: { page?: number; limit?: number }) {
  const page = Math.max(1, opts?.page ?? 1);
  const limit = Math.min(100, Math.max(1, opts?.limit ?? 20));

  // 🕒 today range [start, end)
  const start = new Date();
  start.setHours(0, 0, 0, 0);

  const end = new Date(start);
  end.setDate(end.getDate() + 1); // exclusive next day

  const qb = this.repo
    .createQueryBuilder('t')
    .select([
      't.id',
      't.title',
      't.detail',
      't.status',
      't.createdAt',
      't.updatedAt',
      't.resolvedAt',
    ])
    // OPEN + IN_PROGRESS → always show
    .where('t.status IN (:...active)', {
      active: [TicketStatus.OPEN, TicketStatus.IN_PROGRESS],
    })
    // OR RESOLVED but only if resolvedAt is today
    .orWhere(
      `t.status = :resolved
       AND t.resolvedAt IS NOT NULL
       AND t.resolvedAt >= :start
       AND t.resolvedAt < :end`,
      {
        resolved: TicketStatus.RESOLVED,
        start,
        end,
      },
    )
    .orderBy('t.createdAt', 'DESC')
    .take(limit)
    .skip((page - 1) * limit);

  const [items, total] = await qb.getManyAndCount();

  return { items, total, page, limit };

}
/*Note it not use anymore because it was GET. it will slow that facth data*/
  async findAllPublic(opts?: { page?: number; limit?: number }) {
    const page = Math.max(1, opts?.page ?? 1);
    const limit = Math.min(100, Math.max(1, opts?.limit ?? 20));

    const qb = this.repo
      .createQueryBuilder('t')
      .select([
        't.id',
        't.title',
        't.detail',
        't.status',
        't.createdAt',
        't.updatedAt',
      ])
      .orderBy('t.createdAt', 'DESC')
      .take(limit)
      .skip((page - 1) * limit);

    const [items, total] = await qb.getManyAndCount();

    return { items, total, page, limit };
  }
/*end here*/

async findAllMine(user: User, opts?: { page?: number; limit?: number }) {
  const page = Math.max(1, opts?.page ?? 1);
  const limit = Math.min(100, Math.max(1, opts?.limit ?? 20));

  const [items, total] = await this.repo.findAndCount({
    where: { createdBy: { id: user.id } },   // 👈 always only the owner
    order: { createdAt: 'DESC' },
    take: limit,
    skip: (page - 1) * limit,
    relations: ['assignedTo', 'createdBy', 'lastStatusChangedBy'],
  });

  return { items, total, page, limit };
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

  private applyFilter(qb: any, filter: TicketFilterName, user?: User) {
    switch (filter) {
      case 'ACTIVE':
        qb.andWhere('t.status IN (:...active)', {
          active: [TicketStatus.OPEN, TicketStatus.IN_PROGRESS],
        });
        break;
      case 'OPEN':
        qb.andWhere('t.status = :open', { open: TicketStatus.OPEN });
        break;
      case 'IN_PROGRESS':
        qb.andWhere('t.status = :prog', { prog: TicketStatus.IN_PROGRESS });
        break;
      case 'COMMIT':
        qb.andWhere('t.status != :res', { res: TicketStatus.RESOLVED });
        if (user?.id) {
          qb.andWhere('assignedTo.id = :me', { me: user.id });
        }
        break;
      case 'ALL':
      default:
        break;
    }
  }

  private applySearch(qb: any, search?: string) {
    if (!search) return;
    const s = search.trim();
    if (!s) return;

    const numericId = Number(s);
    const like = `%${s.toLowerCase()}%`;

    qb.andWhere(
      `(t.title LIKE :like OR t.detail LIKE :like OR LOWER(createdBy.name) LIKE :like OR LOWER(assignedTo.name) LIKE :like OR t.tel LIKE :tel${
        Number.isFinite(numericId) ? ' OR t.id = :tid' : ''
      })`,
      {
        like,
        tel: `%${s.replace(/\D/g, '')}%`,
        tid: numericId,
      },
    );
  }

  async filterFor(user: User, dto: FilterTicketDto) {
    const page = Math.max(1, dto.page ?? 1);
    const limit = Math.min(100, Math.max(1, dto.limit ?? 20));
    const filter = dto.filter ?? 'ALL';
    const search = dto.search;

    const isStaff = hasAnyRole(user, [RoleEnum.AGENT, RoleEnum.ADMIN]);

    const baseQb = this.repo
      .createQueryBuilder('t')
      .leftJoinAndSelect('t.assignedTo', 'assignedTo')
      .leftJoinAndSelect('t.createdBy', 'createdBy')
      .orderBy('t.createdAt', 'DESC');

    if (!isStaff) {
      baseQb.andWhere('createdBy.id = :uid', { uid: user.id });
    }

    // apply search once to base query
    this.applySearch(baseQb, search);

    // items query = base + selected filter
    const itemsQb = baseQb.clone();
    this.applyFilter(itemsQb, filter, user);
    const [items, total] = await itemsQb
      .take(limit)
      .skip((page - 1) * limit)
      .getManyAndCount();

    // counts: always start from base (search + scope), then apply each filter
    const countFor = async (f: TicketFilterName) => {
      const qb = baseQb.clone();
      qb.skip(undefined).take(undefined);
      qb.expressionMap.parameters = { ...baseQb.expressionMap.parameters };
      this.applyFilter(qb, f, user);
      return qb.getCount();
    };

    const [active, open, inProgress, commit, all] = await Promise.all([
      countFor('ACTIVE'),
      countFor('OPEN'),
      countFor('IN_PROGRESS'),
      countFor('COMMIT'),
      countFor('ALL'),
    ]);

    return {
      items,
      total,
      page,
      limit,
      counts: { active, open, inProgress, commit, all },
    };
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
      relations: ['createdBy', 'images'],
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
        for (const img of t.images) {
          this.deleteFileIfExists(img.path);
        }
        await this.images.remove(t.images);
      }

      const imgs = files.map((f) =>
        this.images.create({
          ticket: t,
          filename: f.originalname,
          mimeType: f.mimetype,
          size: f.size,
          path: f.path,
          data: null,
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

    if (!t.firstInProgressAt && isLeavingOpen) {
      t.firstInProgressAt = now;
    }

    if (!t.resolvedAt && nextStatus === TicketStatus.RESOLVED) {
      t.resolvedAt = now;
    }

    if (t.assignedTo && t.assignedTo.id !== user.id) {
      throw new ForbiddenException('Only the assigned agent can change status');
    }

    if (t.status !== 'OPEN' && nextStatus === 'OPEN') {
      throw new ForbiddenException('Cannot move ticket back to OPEN');
    }

    if (isLeavingOpen && !t.assignedTo) {
      t.assignedTo = user;
    }
    t.lastStatusChangedBy = user;

    t.status = nextStatus;
    return this.repo.save(t);
  }

  async getSlaMetricsForYear(
    year: number,
    thresholdDays: number,
  ) {
    const start = new Date(year, 0, 1);
    const end = new Date(year + 1, 0, 1);

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

    const totalResolvedRow = await this.repo
      .createQueryBuilder('t')
      .select('COUNT(*)', 'cnt')
      .where('t.createdAt >= :start AND t.createdAt < :end', { start, end })
      .andWhere('t.resolvedAt IS NOT NULL')
      .getRawOne<{ cnt: string }>();

    const totalResolved = totalResolvedRow ? Number(totalResolvedRow.cnt) : 0;

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
    const t = await this.repo.findOne({
      where: { id },
      relations: ['images'],
    });
    if (!t) throw new NotFoundException('Ticket not found');

    const isAdmin = hasRole(user, RoleEnum.ADMIN);
    const isOwner = t.createdBy.id === user.id;

    if (!isAdmin && !(isOwner && t.status === TicketStatus.OPEN && !t.assignedTo)) {
      throw new ForbiddenException();
    }

    if (t.images?.length) {
      for (const img of t.images) {
        this.deleteFileIfExists(img.path);
      }
    }

    await this.repo.remove(t);
    return { ok: true };
  }
}
