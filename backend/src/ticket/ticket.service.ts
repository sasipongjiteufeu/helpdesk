// src/ticket/ticket.service.ts
import {
  BadRequestException,
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindOptionsWhere } from 'typeorm';
import { Ticket, TicketStatus } from './entities/ticket.entity';
import { CreateTicketDto } from './dto/create-ticket.dto';
import { User } from 'src/user/entities/user.entity';
import { RoleEnum } from 'src/role/entities/role.enum';
import { hasAnyRole, hasRole } from 'src/auth/role.utile';
import { TicketImage } from './entities/ticket-image.entity';
import { TicketParticipant } from './entities/ticket-participant.entity';
import { TicketMessage } from './entities/ticket-message.entity';
import { TicketReadState } from './entities/ticket-read-state.entity';
import { EmailService } from 'src/email/email.service';
import { TelegramNotifyService } from 'src/telegram-notify/telegram-notify.service';
import * as fs from 'fs';
import * as path from 'path';
import { FilterTicketDto, TicketFilterName } from './dto/filter-ticket.dto';
import { LeaveTicketDto } from './dto/leave-ticket.dto';
import { ListTicketParticipantsDto } from './dto/list-ticket-participants.dto';
import {
  canAccessTicket,
  canJoinTicket,
  isTicketAssignedAgent,
} from './ticket-permissions';

@Injectable()
export class TicketService {
  constructor(
    @InjectRepository(Ticket) private readonly repo: Repository<Ticket>,
    @InjectRepository(TicketImage) private readonly images: Repository<TicketImage>,
    @InjectRepository(TicketParticipant)
    private readonly participants: Repository<TicketParticipant>,
    @InjectRepository(TicketMessage)
    private readonly messages: Repository<TicketMessage>,
    @InjectRepository(TicketReadState)
    private readonly readStates: Repository<TicketReadState>,
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

  private normalizePage(value: unknown, fallback: number) {
    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : fallback;
  }

  private normalizeLimit(value: unknown, fallback: number, max: number) {
    const parsed = Number(value);
    if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
    return Math.min(max, Math.floor(parsed));
  }

  private toUserSummary(user: User | null | undefined) {
    if (!user) return null;
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      avatarUrl: user.avatarUrl,
    };
  }

  private participantDto(participant: TicketParticipant) {
    return {
      id: participant.id,
      agent: this.toUserSummary(participant.agent),
      joinedAt: participant.joinedAt,
      isPrimary: false,
    };
  }

  private async getUnreadMessageMetaForTickets(user: User, ticketIds: number[]) {
    if (!ticketIds.length) return new Map<number, {
      unreadMessageCount: number;
      hasUnreadMessages: boolean;
      lastMessageAt: Date | null;
    }>();

    const rows = await this.messages
      .createQueryBuilder('message')
      .innerJoin('message.ticket', 'ticket')
      .innerJoin('message.sender', 'sender')
      .leftJoin(
        TicketReadState,
        'readState',
        'readState.Ticket_ID = ticket.Ticket_ID AND readState.User_ID = :userId',
        { userId: user.id },
      )
      .select('ticket.Ticket_ID', 'ticketId')
      .addSelect('COUNT(message.Message_ID)', 'unreadCount')
      .addSelect('MAX(message.Created_at)', 'lastMessageAt')
      .where('ticket.Ticket_ID IN (:...ticketIds)', { ticketIds })
      .andWhere('sender.id != :userId', { userId: user.id })
      .andWhere('(readState.Last_Read_At IS NULL OR message.Created_at > readState.Last_Read_At)')
      .groupBy('ticket.Ticket_ID')
      .getRawMany<{
        ticketId: string | number;
        unreadCount: string;
        lastMessageAt: Date | string | null;
      }>();

    const map = new Map<number, {
      unreadMessageCount: number;
      hasUnreadMessages: boolean;
      lastMessageAt: Date | null;
    }>();

    for (const row of rows) {
      const ticketId = Number(row.ticketId);
      const unreadMessageCount = Number(row.unreadCount) || 0;
      map.set(ticketId, {
        unreadMessageCount,
        hasUnreadMessages: unreadMessageCount > 0,
        lastMessageAt: row.lastMessageAt ? new Date(row.lastMessageAt) : null,
      });
    }

    return map;
  }

  private async attachUnreadCountsToTickets<T extends Ticket>(user: User, tickets: T[]) {
    const unreadMap = await this.getUnreadMessageMetaForTickets(
      user,
      tickets.map((ticket) => ticket.id),
    );

    return tickets.map((ticket) => {
      const unread = unreadMap.get(ticket.id);
      return {
        ...ticket,
        unreadMessageCount: unread?.unreadMessageCount ?? 0,
        hasUnreadMessages: unread?.hasUnreadMessages ?? false,
        lastMessageAt: unread?.lastMessageAt ?? null,
      };
    });
  }

  async getAllImagesFor(user: User, id: number) {
    const t = await this.repo.findOne({
      where: { id },
      relations: ['images', 'createdBy', 'assignedTo', 'participants', 'participants.agent'],
    });

    if (!t) throw new NotFoundException('Ticket not found');

    if (!canAccessTicket(user, t)) {
      throw new ForbiddenException('Not your ticket or You are not staff');
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
    relations: [
      'assignedTo',
      'createdBy',
      'lastStatusChangedBy',
      'participants',
      'participants.agent',
    ],
  });

  return {
    items: await this.attachUnreadCountsToTickets(user, items),
    total,
    page,
    limit,
  };
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
      relations: [
        'assignedTo',
        'createdBy',
        'lastStatusChangedBy',
        'participants',
        'participants.agent',
      ],
    });

    return {
      items: await this.attachUnreadCountsToTickets(user, items),
      total,
      page,
      limit,
    };
  }

  private normalizeFilters(filters?: TicketFilterName | TicketFilterName[]) {
    const rawFilters = Array.isArray(filters) ? filters : filters ? [filters] : [];
    const normalized = new Set<TicketFilterName>();

    for (const filter of rawFilters) {
      switch (filter) {
        case 'ACTIVE':
          normalized.add('OPEN');
          normalized.add('IN_PROGRESS');
          break;
        case 'FINISHED_BY_ME':
          normalized.add('FINISHED_BY_ME');
          break;
        case 'COMMIT':
          normalized.add('COMMIT');
          break;
        case 'IN_PROGRESS_BY_ME':
          normalized.add('IN_PROGRESS_BY_ME');
          break;
        case 'ALL':
        case undefined:
          break;
        default:
          normalized.add(filter);
          break;
      }
    }

    return [...normalized];
  }

  private applyFilters(qb: any, filters: TicketFilterName[], user?: User) {
    const normalized = this.normalizeFilters(filters);
    if (!normalized.length) return;

    const clauses: string[] = [];
    const params: Record<string, any> = {};
    let paramCounter = 0;

    if (normalized.includes('OPEN')) {
      const key = `openStatus${paramCounter++}`;
      clauses.push(`t.status = :${key}`);
      params[key] = TicketStatus.OPEN;
    }

    if (normalized.includes('IN_PROGRESS')) {
      const key = `inProgressStatus${paramCounter++}`;
      clauses.push(`t.status = :${key}`);
      params[key] = TicketStatus.IN_PROGRESS;
    }

    if (normalized.includes('RESOLVED')) {
      const key = `resolvedStatus${paramCounter++}`;
      clauses.push(`t.status = :${key}`);
      params[key] = TicketStatus.RESOLVED;
    }

    if (normalized.includes('COMMIT')) {
      if (user?.id) {
        const statusKey = `commitStatus${paramCounter}`;
        const userKey = `commitUser${paramCounter}`;
        paramCounter++;
        clauses.push(
          `(t.status = :${statusKey} AND (assignedTo.id = :${userKey} OR (participantAgent.id = :${userKey} AND participants.isActive = true)))`,
        );
        params[statusKey] = TicketStatus.IN_PROGRESS;
        params[userKey] = user.id;
      } else {
        clauses.push('1 = 0');
      }
    }

    if (normalized.includes('IN_PROGRESS_BY_ME')) {
      if (user?.id) {
        const statusKey = `inProgressByMeStatus${paramCounter}`;
        const userKey = `inProgressByMeUser${paramCounter}`;
        paramCounter++;
        clauses.push(
          `(t.status = :${statusKey} AND (assignedTo.id = :${userKey} OR (participantAgent.id = :${userKey} AND participants.isActive = true)))`,
        );
        params[statusKey] = TicketStatus.IN_PROGRESS;
        params[userKey] = user.id;
      } else {
        clauses.push('1 = 0');
      }
    }

    if (normalized.includes('FINISHED_BY_ME')) {
      if (user?.id) {
        const statusKey = `finishedByMeStatus${paramCounter}`;
        const userKey = `finishedByMeUser${paramCounter}`;
        paramCounter++;
        clauses.push(
          `(t.status = :${statusKey} AND lastStatusChangedBy.id = :${userKey})`,
        );
        params[statusKey] = TicketStatus.RESOLVED;
        params[userKey] = user.id;
      } else {
        clauses.push('1 = 0');
      }
    }

    if (clauses.length > 0) {
      qb.andWhere(`(${clauses.join(' OR ')})`, params);
    }
  }

  private applySearch(qb: any, search?: string) {
    if (!search) return;
    const s = search.trim();
    if (!s) return;

    const numericId = /^\d+$/.test(s) ? Number(s) : null;
    const like = `%${s.toLowerCase()}%`;
    const digits = s.replace(/\D/g, '');
    const clauses = [
      'LOWER(t.title) LIKE :like',
      'LOWER(t.detail) LIKE :like',
      'LOWER(createdBy.name) LIKE :like',
      'LOWER(createdBy.email) LIKE :like',
      'LOWER(assignedTo.name) LIKE :like',
      'LOWER(assignedTo.email) LIKE :like',
    ];
    const params: Record<string, string | number> = { like };

    if (digits) {
      clauses.push('t.tel LIKE :tel');
      params.tel = `%${digits}%`;
    }

    if (numericId !== null) {
      clauses.push('t.id = :tid');
      params.tid = numericId;
    }

    qb.andWhere(`(${clauses.join(' OR ')})`, params);
  }
  
  async filterFor(user: User, dto: FilterTicketDto) {
    const page = Math.max(1, dto.page ?? 1);
    const limit = Math.min(100, Math.max(1, dto.limit ?? 20));
    const filters = this.normalizeFilters(
      dto.filters?.length ? dto.filters : dto.filter,
    );
    const search = dto.search;

    const isStaff = hasAnyRole(user, [RoleEnum.AGENT, RoleEnum.ADMIN]);

    const baseQb = this.repo
      .createQueryBuilder('t')
      .leftJoinAndSelect('t.assignedTo', 'assignedTo')
      .leftJoinAndSelect('t.createdBy', 'createdBy')
      .leftJoinAndSelect('t.participants', 'participants')
      .leftJoinAndSelect('participants.agent', 'participantAgent')
      .leftJoin('t.lastStatusChangedBy', 'lastStatusChangedBy')
      .orderBy('t.createdAt', 'DESC');

    if (!isStaff) {
      baseQb.andWhere('createdBy.id = :uid', { uid: user.id });
    }

    // apply search once to base query
    this.applySearch(baseQb, search);

    // items query = base + selected filter
    const itemsQb = baseQb.clone();
    this.applyFilters(itemsQb, filters, user);
    const [items, total] = await itemsQb
      .take(limit)
      .skip((page - 1) * limit)
      .getManyAndCount();

    // counts: always start from base (search + scope), then apply each filter
    const countFor = async (f: TicketFilterName) => {
      const qb = this.repo
        .createQueryBuilder('t')
        .leftJoinAndSelect('t.assignedTo', 'assignedTo')
        .leftJoinAndSelect('t.createdBy', 'createdBy')
        .leftJoinAndSelect('t.participants', 'participants')
        .leftJoinAndSelect('participants.agent', 'participantAgent')
        .leftJoin('t.lastStatusChangedBy', 'lastStatusChangedBy');
      
      if (!isStaff) {
        qb.andWhere('createdBy.id = :uid', { uid: user.id });
      }
      
      this.applySearch(qb, search);
      this.applyFilters(qb, [f], user);
      return qb.getCount();
    };

    const [active, open, inProgress, resolved, finishedByMe, commit, inProgressByMe, all] = await Promise.all([
      countFor('ACTIVE'),
      countFor('OPEN'),
      countFor('IN_PROGRESS'),
      countFor('RESOLVED'),
      countFor('FINISHED_BY_ME'),
      countFor('COMMIT'),
      countFor('IN_PROGRESS_BY_ME'),
      countFor('ALL'),
    ]);

    return {
      items: await this.attachUnreadCountsToTickets(user, items),
      total,
      page,
      limit,
      counts: { active, open, inProgress, resolved, finishedByMe, commit, inProgressByMe, all },
    };
  }

  async findOneFor(user: User, id: number) {
    const t = await this.repo.findOne({
      where: { id },
      relations: [
        'createdBy',
        'assignedTo',
        'images',
        'lastStatusChangedBy',
        'participants',
        'participants.agent',
      ],
    });
    if (!t) throw new NotFoundException('Ticket not found');

    if (!canAccessTicket(user, t)) {
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

  async joinTicket(ticketId: number, user: User) {
    const ticket = await this.repo.findOne({
      where: { id: ticketId },
      relations: ['assignedTo', 'participants', 'participants.agent'],
    });

    if (!ticket) throw new NotFoundException('Ticket not found');

    if (!canJoinTicket(user, ticket)) {
      throw new BadRequestException('Ticket must be IN_PROGRESS to join');
    }

    if (isTicketAssignedAgent(user, ticket)) {
      return {
        success: true,
        message: 'Already primary assigned agent',
        ticketId: ticket.id,
        agentId: user.id,
        joinedAt: new Date(),
      };
    }

    const activeParticipant = (ticket.participants ?? []).find(
      (participant) => participant.isActive && participant.agent?.id === user.id,
    );

    if (activeParticipant) {
      return {
        success: true,
        message: 'Already joined ticket',
        ticketId: ticket.id,
        agentId: user.id,
        joinedAt: activeParticipant.joinedAt,
      };
    }

    const participant = await this.participants.save(
      this.participants.create({
        ticket,
        agent: user,
        joinedBy: user,
        joinedAt: new Date(),
        isActive: true,
      }),
    );

    return {
      success: true,
      message: 'Joined ticket successfully',
      ticketId: ticket.id,
      agentId: user.id,
      joinedAt: participant.joinedAt,
    };
  }

  async leaveTicket(ticketId: number, user: User, dto: LeaveTicketDto = {}) {
    const ticket = await this.repo.findOne({
      where: { id: ticketId },
      relations: ['assignedTo'],
    });

    if (!ticket) throw new NotFoundException('Ticket not found');

    const isAdmin = hasRole(user, RoleEnum.ADMIN);
    const targetAgentId = isAdmin && dto.agentId ? dto.agentId : user.id;

    if (!isAdmin && dto.agentId && dto.agentId !== user.id) {
      throw new ForbiddenException('Only admin can remove another agent');
    }

    if (ticket.assignedTo?.id === targetAgentId) {
      throw new BadRequestException('Primary assigned agent cannot leave');
    }

    const participant = await this.participants.findOne({
      where: {
        ticket: { id: ticket.id },
        agent: { id: targetAgentId },
        isActive: true,
      },
      relations: ['agent'],
    });

    if (!participant) {
      return {
        success: true,
        message: 'Agent is not an active participant',
      };
    }

    participant.isActive = false;
    await this.participants.save(participant);

    return {
      success: true,
      message: 'Left ticket successfully',
    };
  }

  async listParticipantsForTicket(
    user: User,
    ticketId: number,
    dto: ListTicketParticipantsDto = {},
  ) {
    const ticket = await this.repo.findOne({
      where: { id: ticketId },
      relations: [
        'createdBy',
        'assignedTo',
        'participants',
        'participants.agent',
      ],
    });

    if (!ticket) throw new NotFoundException('Ticket not found');

    if (!canAccessTicket(user, ticket)) {
      throw new ForbiddenException('Not your ticket');
    }

    const page = this.normalizePage(dto.page, 1);
    const limit = this.normalizeLimit(dto.limit, 50, 100);
    const [items, total] = await this.participants.findAndCount({
      where: {
        ticket: { id: ticket.id },
        isActive: true,
      },
      relations: ['agent'],
      order: { joinedAt: 'ASC' },
      take: limit,
      skip: (page - 1) * limit,
    });

    return {
      items: items.map((participant) => this.participantDto(participant)),
      primaryAgent: this.toUserSummary(ticket.assignedTo),
      page,
      limit,
      total,
      totalPages: total > 0 ? Math.ceil(total / limit) : 0,
    };
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
      relations: ['createdBy', 'assignedTo', 'images'],
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
