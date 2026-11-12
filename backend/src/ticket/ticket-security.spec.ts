import { TicketService } from './ticket.service';
import { AppCacheService } from '../cache/app-cache.service';
import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { ChangeTicketStatusDto, AssignTicketDto } from './dto/ticket-mutations.dto';
import { UpdateTicketDto } from './dto/update-ticket.dto';

describe('ticket authorization and mutation validation', () => {
  const actor = (id: string, role = 'AGENT') => ({ id, roles: [{ name: role }] }) as any;
  function fixture(ticket: any, assignee = actor('next-agent')) {
    const repo = { findOne: jest.fn().mockResolvedValue(ticket), save: jest.fn(async value => value) };
    const users = { findOne: jest.fn().mockResolvedValue(assignee) };
    const service: TicketService = Reflect.construct(TicketService, [repo, {}, {}, {}, {}, {}, {}, {}, users, {}, {}, new AppCacheService()]);
    return { repo, users, service };
  }
  it('blocks an unrelated agent from taking an already assigned ticket', async () => {
    const { service, repo } = fixture({ id: 1, status: 'IN_PROGRESS', assignedTo: { id: 'primary' } });
    await expect(service.assign(1, { userId: 'intruder' }, actor('intruder'))).rejects.toThrow('Only the assigned');
    expect(repo.save).not.toHaveBeenCalled();
  });
  it('allows the primary agent and ADMIN to reassign', async () => {
    for (const user of [actor('primary'), actor('admin', 'ADMIN')]) {
      const { service, repo } = fixture({ id: 1, status: 'IN_PROGRESS', assignedTo: { id: 'primary' } });
      await service.assign(1, { userId: 'next-agent' }, user);
      expect(repo.save).toHaveBeenCalled();
    }
  });
  it('allows an agent to claim an unassigned open ticket', async () => {
    const { service } = fixture({ id: 1, status: 'OPEN', assignedTo: null }, actor('agent'));
    await expect(service.assign(1, { userId: 'agent' }, actor('agent'))).resolves.toMatchObject({ assignedTo: { id: 'agent' } });
  });
  it('rejects non-agent assignees even for ADMIN', async () => {
    const { service } = fixture({ id: 1, status: 'OPEN', assignedTo: null }, actor('user', 'USER'));
    await expect(service.assign(1, { userId: 'user' }, actor('admin', 'ADMIN'))).rejects.toThrow('AGENT role');
  });
  it('blocks unrelated agents from editing ticket contents', async () => {
    const { service, repo } = fixture({ id: 1, status: 'OPEN', createdBy: { id: 'owner' }, assignedTo: { id: 'primary' } });
    await expect(service.updateFor(actor('intruder'), 1, { title: 'changed' })).rejects.toThrow();
    expect(repo.save).not.toHaveBeenCalled();
  });
  it('keeps owner and assigned-agent edits working', async () => {
    for (const user of [actor('owner', 'USER'), actor('primary')]) {
      const { service } = fixture({ id: 1, status: 'OPEN', createdBy: { id: 'owner' }, assignedTo: { id: 'primary' } });
      await expect(service.updateFor(user, 1, { title: 'updated' })).resolves.toMatchObject({ title: 'updated' });
    }
  });
  it('validates status and assignment separately without requiring a title', async () => {
    expect(await validate(plainToInstance(ChangeTicketStatusDto, { status: 'IN_PROGRESS' }))).toHaveLength(0);
    expect(await validate(plainToInstance(ChangeTicketStatusDto, { status: 'INVALID' }))).not.toHaveLength(0);
    expect(await validate(plainToInstance(AssignTicketDto, { userId: 'invalid' }))).not.toHaveLength(0);
    expect(await validate(plainToInstance(UpdateTicketDto, { detail: 'updated' }))).toHaveLength(0);
  });
});
