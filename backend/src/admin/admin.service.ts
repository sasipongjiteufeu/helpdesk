// src/admin/admin.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, Repository } from 'typeorm';
import { User } from 'src/user/entities/user.entity';
import { Ticket } from 'src/ticket/entities/ticket.entity';
import { Role } from 'src/role/entities/role.entity';
import { RoleEnum } from 'src/role/entities/role.enum';

@Injectable()
export class AdminService {
  constructor(
    @InjectRepository(User) private readonly usersRepo: Repository<User>,
    @InjectRepository(Ticket) private readonly ticketsRepo: Repository<Ticket>,
    @InjectRepository(Role) private readonly rolesRepo: Repository<Role>,
  ) {}

  // === USERS + ROLES ===

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
