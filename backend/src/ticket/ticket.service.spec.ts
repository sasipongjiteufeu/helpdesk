import { TicketService } from './ticket.service';

describe('TicketService', () => {
  let service: TicketService;

  beforeEach(() => {
    service = Reflect.construct(TicketService, Array.from({ length: 12 }, () => ({})));
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('skips the phone clause for plain text searches', () => {
    const qb = { andWhere: jest.fn() };

    (service as any).applySearch(qb, 'Alice');

    expect(qb.andWhere).toHaveBeenCalledTimes(1);

    const [sql, params] = qb.andWhere.mock.calls[0];
    expect(sql).toContain('LOWER(t.title) LIKE :like');
    expect(sql).toContain('LOWER(createdBy.email) LIKE :like');
    expect(sql).not.toContain('t.tel LIKE :tel');
    expect(sql).not.toContain('t.id = :tid');
    expect(params).toEqual({ like: '%alice%' });
  });

  it('adds phone matching only when the search contains digits', () => {
    const qb = { andWhere: jest.fn() };

    (service as any).applySearch(qb, '081-234');

    expect(qb.andWhere).toHaveBeenCalledTimes(1);

    const [sql, params] = qb.andWhere.mock.calls[0];
    expect(sql).toContain('t.tel LIKE :tel');
    expect(sql).not.toContain('t.id = :tid');
    expect(params).toEqual({
      like: '%081-234%',
      tel: '%081234%',
    });
  });

  it('adds exact ticket id matching for numeric searches', () => {
    const qb = { andWhere: jest.fn() };

    (service as any).applySearch(qb, '0000123');

    expect(qb.andWhere).toHaveBeenCalledTimes(1);

    const [sql, params] = qb.andWhere.mock.calls[0];
    expect(sql).toContain('t.tel LIKE :tel');
    expect(sql).toContain('t.id = :tid');
    expect(params).toEqual({
      like: '%0000123%',
      tel: '%0000123%',
      tid: 123,
    });
  });

  it('normalizes ACTIVE into OPEN and IN_PROGRESS', () => {
    expect((service as any).normalizeFilters(['ACTIVE'])).toEqual([
      'OPEN',
      'IN_PROGRESS',
    ]);
  });

  it('combines OPEN and IN_PROGRESS into one status clause', () => {
    const qb = { andWhere: jest.fn() };

    (service as any).applyFilters(qb, ['OPEN', 'IN_PROGRESS'], { id: 'agent-1' });

    expect(qb.andWhere).toHaveBeenCalledTimes(1);
    expect(qb.andWhere).toHaveBeenCalledWith(
      '(t.status = :openStatus0 OR t.status = :inProgressStatus1)',
      {
        openStatus0: 'OPEN',
        inProgressStatus1: 'IN_PROGRESS',
      },
    );
  });

  it('keeps FINISHED_BY_ME distinct from in-progress assignments', () => {
    expect((service as any).normalizeFilters(['FINISHED_BY_ME'])).toEqual([
      'FINISHED_BY_ME',
    ]);
  });

  it('keeps COMMIT as the assigned-to-me filter', () => {
    expect((service as any).normalizeFilters(['COMMIT'])).toEqual([
      'COMMIT',
    ]);
  });

  it('adds the assigned-in-progress clause when COMMIT is selected', () => {
    const qb = { andWhere: jest.fn() };

    (service as any).applyFilters(qb, ['COMMIT'], { id: 'agent-1' });

    expect(qb.andWhere).toHaveBeenCalledTimes(1);
    expect(qb.andWhere).toHaveBeenCalledWith(
      '((t.status = :commitStatus0 AND (assignedTo.id = :commitUser0 OR (participantAgent.id = :commitUser0 AND participants.isActive = true))))',
      {
        commitStatus0: 'IN_PROGRESS',
        commitUser0: 'agent-1',
      },
    );
  });

  it('unions OPEN with COMMIT when both are selected', () => {
    const qb = { andWhere: jest.fn() };

    (service as any).applyFilters(qb, ['OPEN', 'COMMIT'], {
      id: 'agent-1',
    });

    expect(qb.andWhere).toHaveBeenCalledTimes(1);
    expect(qb.andWhere).toHaveBeenCalledWith(
      '(t.status = :openStatus0 OR (t.status = :commitStatus1 AND (assignedTo.id = :commitUser1 OR (participantAgent.id = :commitUser1 AND participants.isActive = true))))',
      {
        openStatus0: 'OPEN',
        commitStatus1: 'IN_PROGRESS',
        commitUser1: 'agent-1',
      },
    );
  });
});
