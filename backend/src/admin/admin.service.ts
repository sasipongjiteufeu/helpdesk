// src/admin/admin.service.ts
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, Brackets, Repository } from 'typeorm';
import { User } from 'src/user/entities/user.entity';
import { Ticket, TicketStatus } from 'src/ticket/entities/ticket.entity';
import { Role } from 'src/role/entities/role.entity';
import { RoleEnum } from 'src/role/entities/role.enum';
import { AppCacheService } from 'src/cache/app-cache.service';

export interface AdminRangeStats {
  range: { from: string; to: string };
  totalTickets: number;
  resolvedTickets: number;
  avgTimeToFirstActionSeconds: number | null;
  avgTimeToResolveSeconds: number | null;
  resolvedWithinTargetCount: number;
  resolvedWithinTargetPercent: number | null;
}
@Injectable()
export class AdminService {
  constructor(
    @InjectRepository(User) private readonly usersRepo: Repository<User>,
    @InjectRepository(Ticket) private readonly ticketsRepo: Repository<Ticket>,
    @InjectRepository(Role) private readonly rolesRepo: Repository<Role>,
    private readonly cache: AppCacheService,
  ) { }

  // === USERS + ROLES ===
  async getStatsForRange(fromStr: string, toStr: string, targetDays = 3): Promise<AdminRangeStats> {
    if (!fromStr || !toStr) {
      throw new BadRequestException('from and to are required (YYYY-MM-DD)');
    }

    const from = new Date(fromStr);
    const to = new Date(toStr);

    if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) {
      throw new BadRequestException('Invalid date format, use YYYY-MM-DD');
    }
    if (from > to) {
      throw new BadRequestException('"from" must be before "to"');
    }

    // normalize to full days
    const fromStart = new Date(from);
    fromStart.setHours(0, 0, 0, 0);
    const toEnd = new Date(to);
    toEnd.setHours(23, 59, 59, 999);
    const cacheKey = `admin:stats:range:${fromStr}:${toStr}:target=${targetDays}`;

    return this.cache.remember(cacheKey, 60, async () => {
    const tickets = await this.ticketsRepo.find({
      where: { createdAt: Between(fromStart, toEnd) },
      order: { createdAt: 'ASC' },
    });

    if (!tickets.length) {
      return {
        range: { from: fromStart.toISOString(), to: toEnd.toISOString() },
        totalTickets: 0,
        resolvedTickets: 0,
        avgTimeToFirstActionSeconds: null,
        avgTimeToResolveSeconds: null,
        resolvedWithinTargetCount: 0,
        resolvedWithinTargetPercent: null,
      };
    }

    let sumFirstAction = 0;
    let countFirstAction = 0;
    let sumResolve = 0;
    let countResolve = 0;
    let resolvedWithinTarget = 0;

    const targetMs = targetDays * 24 * 60 * 60 * 1000;

    for (const t of tickets) {
      // You probably already have firstActionAt / resolvedAt columns.
      // If not, you can temporarily fall back to updatedAt.
      const createdAt = t.createdAt;
      const firstActionAt: Date | undefined =
        (t as any).firstActionAt || undefined;
      const resolvedAt: Date | undefined =
        (t as any).resolvedAt || (t.status === TicketStatus.RESOLVED ? t.updatedAt : undefined);

      if (createdAt && firstActionAt) {
        sumFirstAction += firstActionAt.getTime() - createdAt.getTime();
        countFirstAction++;
      }

      if (createdAt && resolvedAt) {
        const diff = resolvedAt.getTime() - createdAt.getTime();
        sumResolve += diff;
        countResolve++;
        if (diff <= targetMs) {
          resolvedWithinTarget++;
        }
      }
    }

    const avgFirst =
      countFirstAction > 0 ? Math.round(sumFirstAction / 1000 / countFirstAction) : null;
    const avgResolve =
      countResolve > 0 ? Math.round(sumResolve / 1000 / countResolve) : null;

    const resolvedTickets = countResolve;
    const resolvedWithinTargetPercent =
      resolvedTickets > 0
        ? Math.round((resolvedWithinTarget / resolvedTickets) * 1000) / 10 // 1 decimal
        : null;

    return {
      range: { from: fromStart.toISOString(), to: toEnd.toISOString() },
      totalTickets: tickets.length,
      resolvedTickets,
      avgTimeToFirstActionSeconds: avgFirst,
      avgTimeToResolveSeconds: avgResolve,
      resolvedWithinTargetCount: resolvedWithinTarget,
      resolvedWithinTargetPercent,
    };
    });
  }
  async getUsersWithTicketCounts() {
    const [users, tickets] = await Promise.all([
      this.usersRepo.find({ relations: ['roles'] }),
      this.ticketsRepo.find({ relations: ['createdBy'] }),
    ]);

    const counts = new Map<string, number>();
    for (const t of tickets) {
      if (!t.createdBy?.id) continue;
      counts.set(t.createdBy.id, (counts.get(t.createdBy.id) ?? 0) + 1);
    }

    return users.map(u => ({
      id: u.id,
      email: u.email,
      roles: (u.roles ?? []).map(r => r.name),
      ticketCount: counts.get(u.id) ?? 0,
    }));
  }

  async updateUserRoles(userId: string, roleNames: RoleEnum[]) {
    const user = await this.usersRepo.findOne({ where: { id: userId }, relations: ['roles'] });
    if (!user) throw new NotFoundException('User not found');

    // find all required roles
    const roles = await this.rolesRepo.find({
      where: roleNames.map(name => ({ name })),
    });

    user.roles = roles;
    await this.usersRepo.save(user);
    this.cache.delByPrefix('admin:stats:');

    return {
      id: user.id,
      email: user.email,
      roles: user.roles.map(r => r.name),
    };
  }

  // === STATS ===

  async getYearStats(year: number) {
    const cacheKey = `admin:stats:year:${year}`;

    return this.cache.remember(cacheKey, 180, async () => {
    const from = new Date(year, 0, 1);
    const to = new Date(year + 1, 0, 1);

    const tickets = await this.ticketsRepo.find({
      where: { createdAt: Between(from, to) },
    });

    const monthly = Array.from({ length: 12 }, (_, i) => ({ month: i + 1, count: 0 }));

    for (const t of tickets) {
      const m = t.createdAt.getMonth(); // 0-11
      monthly[m].count++;
    }

    return { year, monthly };
    });
  }
  async getAgentStatusStatsForRange(fromStr: string, toStr: string) {
    const from = new Date(fromStr);
    from.setHours(0, 0, 0, 0);
    const to = new Date(toStr);
    to.setHours(23, 59, 59, 999);

    if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) {
      throw new BadRequestException('Invalid date format, use YYYY-MM-DD');
    }
    if (from > to) {
      throw new BadRequestException('"from" must be before "to"');
    }
    const cacheKey = `admin:stats:agents-range:${fromStr}:${toStr}`;

    return this.cache.remember(cacheKey, 60, async () => {
    const tickets = await this.ticketsRepo
      .createQueryBuilder('t')
      .leftJoinAndSelect('t.assignedTo', 'assignedTo')
      .leftJoinAndSelect('assignedTo.roles', 'assignedToRoles')
      .leftJoinAndSelect('t.participants', 'participants')
      .leftJoinAndSelect('participants.agent', 'participantAgent')
      .leftJoinAndSelect('participantAgent.roles', 'participantAgentRoles')
      .where(
        new Brackets((qb) => {
          qb.where(
            `t.status = :inProgressStatus
             AND COALESCE(t.firstInProgressAt, t.createdAt) BETWEEN :from AND :to`,
            {
              inProgressStatus: TicketStatus.IN_PROGRESS,
              from,
              to,
            },
          ).orWhere(
            `t.status = :resolvedStatus
             AND COALESCE(t.resolvedAt, t.updatedAt) BETWEEN :from AND :to`,
            {
              resolvedStatus: TicketStatus.RESOLVED,
              from,
              to,
            },
          );
        }),
      )
      .getMany();

    const hasAgentRole = (user: User | null | undefined) =>
      Boolean(user?.id && (user.roles ?? []).some((role) => role.name === RoleEnum.AGENT));

    const stats = new Map<
      string,
      {
        agentId: string;
        email: string;
        name: string | null;
        inProgress: number;
        resolved: number;
      }
    >();

    const ensureAgentStats = (agent: User) => {
      const existing = stats.get(agent.id);
      if (existing) return existing;

      const next = {
        agentId: agent.id,
        email: agent.email,
        name: agent.name ?? null,
        inProgress: 0,
        resolved: 0,
      };
      stats.set(agent.id, next);
      return next;
    };

    for (const ticket of tickets) {
      const involvedAgents = new Map<string, User>();

      const assignedAgent = ticket.assignedTo;
      if (hasAgentRole(assignedAgent) && assignedAgent) {
        involvedAgents.set(assignedAgent.id, assignedAgent);
      }

      for (const participant of ticket.participants ?? []) {
        const agent = participant.agent;
        if (!hasAgentRole(agent)) continue;

        if (ticket.status === TicketStatus.IN_PROGRESS && participant.isActive) {
          involvedAgents.set(agent.id, agent);
        }

        if (ticket.status === TicketStatus.RESOLVED) {
          involvedAgents.set(agent.id, agent);
        }
      }

      for (const agent of involvedAgents.values()) {
        const row = ensureAgentStats(agent);
        if (ticket.status === TicketStatus.IN_PROGRESS) {
          row.inProgress += 1;
        }
        if (ticket.status === TicketStatus.RESOLVED) {
          row.resolved += 1;
        }
      }
    }

    return [...stats.values()].sort((a, b) => {
      const aKey = (a.name || a.email || '').toLowerCase();
      const bKey = (b.name || b.email || '').toLowerCase();
      return aKey.localeCompare(bKey);
    });
    });
  }
  async getMonthStatusStats(year: number, month: number) {
    const cacheKey = `admin:stats:month:${year}:${month}`;

    return this.cache.remember(cacheKey, 180, async () => {
    const from = new Date(year, month - 1, 1);
    const to = new Date(year, month, 1);

    const tickets = await this.ticketsRepo.find({
      where: { createdAt: Between(from, to) },
    });

    const stats = {
      OPEN: 0,
      IN_PROGRESS: 0,
      RESOLVED: 0,
    };

    for (const t of tickets) {
      if (stats[t.status] !== undefined) {
        stats[t.status]++;
      }
    }

    return stats;
    });
  }
}
