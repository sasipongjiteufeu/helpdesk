import { User } from 'src/user/entities/user.entity';
import { RoleEnum } from 'src/role/entities/role.enum';
import { hasAnyRole, hasRole } from 'src/auth/role.utile';
import { Ticket, TicketStatus } from './entities/ticket.entity';

export function isTicketOwner(user: User, ticket: Ticket) {
  return ticket.createdBy?.id === user.id;
}

export function isTicketAssignedAgent(user: User, ticket: Ticket) {
  return ticket.assignedTo?.id === user.id;
}

export function isTicketParticipant(user: User, ticket: Ticket) {
  return (ticket.participants ?? []).some(
    (participant) => participant.isActive && participant.agent?.id === user.id,
  );
}

export function canAccessTicket(user: User, ticket: Ticket) {
  if (hasRole(user, RoleEnum.ADMIN)) return true;
  if (isTicketOwner(user, ticket)) return true;
  if (isTicketAssignedAgent(user, ticket)) return true;
  if (isTicketParticipant(user, ticket)) return true;

  return hasAnyRole(user, [RoleEnum.AGENT]);
}

export function canJoinTicket(user: User, ticket: Ticket) {
  return (
    hasAnyRole(user, [RoleEnum.AGENT, RoleEnum.ADMIN]) &&
    ticket.status === TicketStatus.IN_PROGRESS
  );
}
