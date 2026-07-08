// src/admin/admin.service.ts
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, Repository } from 'typeorm';
import { User } from 'src/user/entities/user.entity';
import { Ticket, TicketStatus } from 'src/ticket/entities/ticket.entity';
import { Role } from 'src/role/entities/role.entity';
import { RoleEnum } from 'src/role/entities/role.enum';
import { AppCacheService } from 'src/cache/app-cache.service';
import { TicketRating } from 'src/ticket/entities/ticket-rating.entity';

export interface AdminRangeStats {
  range: { from: string; to: string };
  totalTickets: number;
  openTickets: number;
  inProgressTickets: number;
  resolvedTickets: number;
  avgTimeToFirstActionSeconds: number | null;
  avgTimeToResolveSeconds: number | null;
  resolvedWithinTargetCount: number;
  resolvedWithinTargetPercent: number;
  ratedTickets: number;
  unratedResolvedTickets: number;
  avgRating: number | null;
}

export interface AdminRatingDistributionStats {
  averageRating: number | null;
  totalRated: number;
  distribution: Array<{ rating: number; count: number }>;
}

export interface AdminAgentStatsRow {
  agentId: string;
  email: string;
  name: string | null;
  inProgress: number;
  resolved: number;
  avgResolveSeconds: number | null;
  avgRating: number | null;
}

export interface AdminAgentStatsResponse {
  agents: AdminAgentStatsRow[];
}

@Injectable()
export class AdminService {
  constructor(
    @InjectRepository(User) private readonly usersRepo: Repository<User>,
    @InjectRepository(Ticket) private readonly ticketsRepo: Repository<Ticket>,
    @InjectRepository(Role) private readonly rolesRepo: Repository<Role>,
    @InjectRepository(TicketRating) private readonly ratingsRepo: Repository<TicketRating>,
    private readonly cache: AppCacheService,
  ) {}

  /**
   * Effective close time for reporting.
   * Older RESOLVED tickets may have null resolvedAt — fall back to updatedAt.
   */
  private effectiveResolvedAtExpr = 'COALESCE(t.resolvedAt, t.updatedAt)';

  private parseDateRange(fromStr: string, toStr: string) {
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

    const fromStart = new Date(from);
    fromStart.setHours(0, 0, 0, 0);
    const toEnd = new Date(to);
    toEnd.setHours(23, 59, 59, 999);

    return { fromStart, toEnd };
  }

  private emptyRangeStats(fromStart: Date, toEnd: Date): AdminRangeStats {
    return {
      range: { from: fromStart.toISOString(), to: toEnd.toISOString() },
      totalTickets: 0,
      openTickets: 0,
      inProgressTickets: 0,
      resolvedTickets: 0,
      avgTimeToFirstActionSeconds: null,
      avgTimeToResolveSeconds: null,
      resolvedWithinTargetCount: 0,
      resolvedWithinTargetPercent: 0,
      ratedTickets: 0,
      unratedResolvedTickets: 0,
      avgRating: null,
    };
  }

  /**
   * Range summary:
   * - total/open/in_progress: tickets created in range (current status)
   * - resolvedTickets & SLA: tickets closed in range (resolvedAt in range)
   */
  async getStatsForRange(fromStr: string, toStr: string, targetDays = 3): Promise<AdminRangeStats> {
    const { fromStart, toEnd } = this.parseDateRange(fromStr, toStr);
    const cacheKey = `admin:stats:range:v2:${fromStr}:${toStr}:target=${targetDays}`;

    return this.cache.remember(cacheKey, 60, async () => {
      const createdInRange = await this.ticketsRepo.find({
        where: { createdAt: Between(fromStart, toEnd) },
        order: { createdAt: 'ASC' },
      });

      const resolvedInRange = await this.ticketsRepo
        .createQueryBuilder('t')
        .where('t.status = :resolved', { resolved: TicketStatus.RESOLVED })
        .andWhere(`${this.effectiveResolvedAtExpr} >= :from`, { from: fromStart })
        .andWhere(`${this.effectiveResolvedAtExpr} <= :to`, { to: toEnd })
        .getMany();

      if (!createdInRange.length && !resolvedInRange.length) {
        return this.emptyRangeStats(fromStart, toEnd);
      }

      let openTickets = 0;
      let inProgressTickets = 0;

      for (const ticket of createdInRange) {
        if (ticket.status === TicketStatus.OPEN) openTickets++;
        if (ticket.status === TicketStatus.IN_PROGRESS) inProgressTickets++;
      }

      const resolvedTickets = resolvedInRange.length;

      let sumFirstAction = 0;
      let countFirstAction = 0;
      let sumResolve = 0;
      let countResolve = 0;
      let resolvedWithinTarget = 0;
      const targetMs = targetDays * 24 * 60 * 60 * 1000;

      for (const ticket of createdInRange) {
        if (ticket.firstInProgressAt && ticket.createdAt) {
          sumFirstAction += ticket.firstInProgressAt.getTime() - ticket.createdAt.getTime();
          countFirstAction++;
        }
      }

      for (const ticket of resolvedInRange) {
        const createdAt = ticket.createdAt;
        const resolvedAt = ticket.resolvedAt ?? ticket.updatedAt;

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

      const resolvedWithinTargetPercent =
        resolvedTickets > 0
          ? Math.round((resolvedWithinTarget / resolvedTickets) * 1000) / 10
          : 0;

      // Ratings submitted within the selected date range (rating.createdAt).
      const ratingSummary = await this.ratingsRepo
        .createQueryBuilder('rating')
        .select('COUNT(*)', 'ratedTickets')
        .addSelect('AVG(rating.rating)', 'avgRating')
        .where('rating.createdAt >= :from AND rating.createdAt <= :to', {
          from: fromStart,
          to: toEnd,
        })
        .getRawOne<{ ratedTickets: string | null; avgRating: string | null }>();

      const ratedTickets = ratingSummary?.ratedTickets
        ? Number(ratingSummary.ratedTickets)
        : 0;
      const avgRating = ratingSummary?.avgRating
        ? Math.round(Number(ratingSummary.avgRating) * 10) / 10
        : null;

      // Resolved in range but never rated (regardless of when rating would be given).
      let unratedResolvedTickets = resolvedTickets;
      if (resolvedTickets > 0) {
        const resolvedTicketIds = resolvedInRange.map((t) => t.id);
        const ratedAmongResolved = await this.ratingsRepo
          .createQueryBuilder('rating')
          .innerJoin('rating.ticket', 'ticket')
          .where('ticket.id IN (:...ticketIds)', { ticketIds: resolvedTicketIds })
          .getCount();
        unratedResolvedTickets = Math.max(0, resolvedTickets - ratedAmongResolved);
      }

      return {
        range: { from: fromStart.toISOString(), to: toEnd.toISOString() },
        totalTickets: createdInRange.length,
        openTickets,
        inProgressTickets,
        resolvedTickets,
        avgTimeToFirstActionSeconds: avgFirst,
        avgTimeToResolveSeconds: avgResolve,
        resolvedWithinTargetCount: resolvedWithinTarget,
        resolvedWithinTargetPercent,
        ratedTickets,
        unratedResolvedTickets,
        avgRating,
      };
    });
  }

  /**
   * Rating distribution for dashboard.
   * Filters by rating.createdAt — counts ratings submitted in the selected range.
   */
  async getRatingStatsForRange(fromStr: string, toStr: string): Promise<AdminRatingDistributionStats> {
    const { fromStart, toEnd } = this.parseDateRange(fromStr, toStr);
    const cacheKey = `admin:stats:ratings:v2:${fromStr}:${toStr}`;

    return this.cache.remember(cacheKey, 60, async () => {
      const distribution = Array.from({ length: 5 }, (_, index) => ({
        rating: index + 1,
        count: 0,
      }));

      const rows = await this.ratingsRepo
        .createQueryBuilder('rating')
        .select('rating.rating', 'ratingValue')
        .addSelect('COUNT(*)', 'count')
        .where('rating.createdAt >= :from AND rating.createdAt <= :to', {
          from: fromStart,
          to: toEnd,
        })
        .groupBy('rating.rating')
        .getRawMany<{ ratingValue: string; count: string }>();

      let totalRated = 0;
      let sumRating = 0;

      for (const row of rows) {
        const value = Number(row.ratingValue);
        const count = Number(row.count) || 0;
        if (value >= 1 && value <= 5) {
          distribution[value - 1].count = count;
          totalRated += count;
          sumRating += value * count;
        }
      }

      return {
        averageRating: totalRated > 0 ? Math.round((sumRating / totalRated) * 10) / 10 : null,
        totalRated,
        distribution,
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

    return users.map((u) => ({
      id: u.id,
      email: u.email,
      roles: (u.roles ?? []).map((r) => r.name),
      ticketCount: counts.get(u.id) ?? 0,
    }));
  }

  async updateUserRoles(userId: string, roleNames: RoleEnum[]) {
    const user = await this.usersRepo.findOne({ where: { id: userId }, relations: ['roles'] });
    if (!user) throw new NotFoundException('User not found');

    const roles = await this.rolesRepo.find({
      where: roleNames.map((name) => ({ name })),
    });

    user.roles = roles;
    await this.usersRepo.save(user);
    this.cache.delByPrefix('admin:stats:');

    return {
      id: user.id,
      email: user.email,
      roles: user.roles.map((r) => r.name),
    };
  }

  async getYearStats(year: number) {
    if (!Number.isFinite(year) || year < 2000 || year > 2100) {
      throw new BadRequestException('Invalid year');
    }

    const cacheKey = `admin:stats:year:${year}`;

    return this.cache.remember(cacheKey, 180, async () => {
      const from = new Date(year, 0, 1);
      const to = new Date(year + 1, 0, 1);

      const tickets = await this.ticketsRepo.find({
        where: { createdAt: Between(from, to) },
      });

      const monthly = Array.from({ length: 12 }, (_, i) => ({ month: i + 1, count: 0 }));

      for (const t of tickets) {
        monthly[t.createdAt.getMonth()].count++;
      }

      return { year, monthly };
    });
  }

  async getAgentStatusStatsForRange(fromStr: string, toStr: string): Promise<AdminAgentStatsResponse> {
    const { fromStart, toEnd } = this.parseDateRange(fromStr, toStr);
    const cacheKey = `admin:stats:agents-range:${fromStr}:${toStr}`;

    return this.cache.remember(cacheKey, 60, async () => {
      const inProgressTickets = await this.ticketsRepo
        .createQueryBuilder('t')
        .leftJoinAndSelect('t.assignedTo', 'assignedTo')
        .where('t.status = :status', { status: TicketStatus.IN_PROGRESS })
        .andWhere('assignedTo.id IS NOT NULL')
        .andWhere('t.createdAt >= :from AND t.createdAt <= :to', { from: fromStart, to: toEnd })
        .getMany();

      const resolvedTickets = await this.ticketsRepo
        .createQueryBuilder('t')
        .leftJoinAndSelect('t.assignedTo', 'assignedTo')
        .leftJoinAndSelect('t.ratings', 'ratings')
        .where('t.status = :status', { status: TicketStatus.RESOLVED })
        .andWhere('assignedTo.id IS NOT NULL')
        .andWhere(`${this.effectiveResolvedAtExpr} >= :from`, { from: fromStart })
        .andWhere(`${this.effectiveResolvedAtExpr} <= :to`, { to: toEnd })
        .getMany();

      type AgentAccumulator = {
        agentId: string;
        email: string;
        name: string | null;
        inProgress: number;
        resolved: number;
        resolveSecondsSum: number;
        resolveCount: number;
        ratingSum: number;
        ratingCount: number;
      };

      const stats = new Map<string, AgentAccumulator>();

      const ensureAgent = (agent: User) => {
        const existing = stats.get(agent.id);
        if (existing) return existing;

        const next: AgentAccumulator = {
          agentId: agent.id,
          email: agent.email,
          name: agent.name ?? null,
          inProgress: 0,
          resolved: 0,
          resolveSecondsSum: 0,
          resolveCount: 0,
          ratingSum: 0,
          ratingCount: 0,
        };
        stats.set(agent.id, next);
        return next;
      };

      for (const ticket of inProgressTickets) {
        if (!ticket.assignedTo) continue;
        ensureAgent(ticket.assignedTo).inProgress++;
      }

      for (const ticket of resolvedTickets) {
        if (!ticket.assignedTo) continue;
        const row = ensureAgent(ticket.assignedTo);
        row.resolved++;

        if (ticket.resolvedAt && ticket.createdAt) {
          row.resolveSecondsSum +=
            (ticket.resolvedAt.getTime() - ticket.createdAt.getTime()) / 1000;
          row.resolveCount++;
        }

        const rating = ticket.ratings?.[0];
        if (rating?.rating) {
          row.ratingSum += rating.rating;
          row.ratingCount++;
        }
      }

      const agents = [...stats.values()]
        .map((row) => ({
          agentId: row.agentId,
          email: row.email,
          name: row.name,
          inProgress: row.inProgress,
          resolved: row.resolved,
          avgResolveSeconds:
            row.resolveCount > 0 ? Math.round(row.resolveSecondsSum / row.resolveCount) : null,
          avgRating:
            row.ratingCount > 0
              ? Math.round((row.ratingSum / row.ratingCount) * 10) / 10
              : null,
        }))
        .sort((a, b) => {
          const aKey = (a.name || a.email || '').toLowerCase();
          const bKey = (b.name || b.email || '').toLowerCase();
          return aKey.localeCompare(bKey);
        });

      return { agents };
    });
  }

  async getMonthStatusStats(year: number, month: number) {
    if (!Number.isFinite(year) || year < 2000 || year > 2100) {
      throw new BadRequestException('Invalid year');
    }
    if (!Number.isFinite(month) || month < 1 || month > 12) {
      throw new BadRequestException('Invalid month');
    }

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

  /** Status counts for a custom date range (used by dashboard pie chart). */
  async getStatusStatsForRange(fromStr: string, toStr: string) {
    const { fromStart, toEnd } = this.parseDateRange(fromStr, toStr);
    const cacheKey = `admin:stats:status-range:${fromStr}:${toStr}`;

    return this.cache.remember(cacheKey, 60, async () => {
      const tickets = await this.ticketsRepo.find({
        where: { createdAt: Between(fromStart, toEnd) },
      });

      return {
        OPEN: tickets.filter((t) => t.status === TicketStatus.OPEN).length,
        IN_PROGRESS: tickets.filter((t) => t.status === TicketStatus.IN_PROGRESS).length,
        RESOLVED: tickets.filter((t) => t.status === TicketStatus.RESOLVED).length,
      };
    });
  }
}
