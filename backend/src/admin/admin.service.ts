// src/admin/admin.service.ts
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, Repository } from 'typeorm';
import { User } from 'src/user/entities/user.entity';
import { Ticket, TicketStatus } from 'src/ticket/entities/ticket.entity';
import { Role } from 'src/role/entities/role.entity';
import { RoleEnum } from 'src/role/entities/role.enum';

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

    return {
      id: user.id,
      email: user.email,
      roles: user.roles.map(r => r.name),
    };
  }

  // === STATS ===

  async getYearStats(year: number) {
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
  }
    async getAgentStatusStatsForRange(fromStr: string, toStr: string) {
    const from = new Date(fromStr);
    from.setHours(0, 0, 0, 0);
    const to = new Date(toStr);
    to.setHours(23, 59, 59, 999);

    const raw = await this.ticketsRepo
      .createQueryBuilder('t')
      .leftJoin('t.assignedTo', 'a')
      .leftJoin('a.roles', 'r')
      .where('t.createdAt BETWEEN :from AND :to', { from, to })
      .andWhere('a.id IS NOT NULL')
      .andWhere('r.name = :agentRole', { agentRole: RoleEnum.AGENT })
      .select([
        'a.id AS agentId',
        'a.email AS email',
        'a.name AS name',
        "SUM(CASE WHEN t.status = 'IN_PROGRESS' THEN 1 ELSE 0 END) AS inProgress",
        "SUM(CASE WHEN t.status = 'RESOLVED' THEN 1 ELSE 0 END) AS resolved",
      ])
      .groupBy('a.id')
      .addGroupBy('a.email')
      .addGroupBy('a.name')
      .orderBy('a.name', 'ASC')
      .getRawMany();

    return raw.map((r) => ({
      agentId: r.agentId as string,
      email: r.email as string,
      name: (r.name as string) ?? null,
      inProgress: Number(r.inProgress) || 0,
      resolved: Number(r.resolved) || 0,
    }));
  }
  async getMonthStatusStats(year: number, month: number) {
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
  }
}
