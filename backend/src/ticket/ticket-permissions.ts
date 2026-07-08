import { User } from 'src/user/entities/user.entity';
import { RoleEnum } from 'src/role/entities/role.enum';
import { hasAnyRole, hasRole } from 'src/auth/role.utile';
import { Ticket, TicketStatus } from './entities/ticket.entity';
import { TicketParticipant } from './entities/ticket-participant.entity';

type TicketAccessContext = Pick<Ticket, 'createdBy' | 'assignedTo' | 'status'> & {
  participants?: TicketParticipant[];
};

export function isTicketOwner(user: User, ticket: TicketAccessContext) {
  return ticket.createdBy?.id === user.id;
}

export function isTicketAssignedAgent(user: User, ticket: TicketAccessContext) {
  return ticket.assignedTo?.id === user.id;
}

export function isTicketParticipant(user: User, ticket: TicketAccessContext) {
  return (ticket.participants ?? []).some(
    (participant) => participant.isActive && participant.agent?.id === user.id,
  );
}

/** View ticket detail / read messages (agents can browse queue tickets). */
export function canAccessTicket(user: User, ticket: TicketAccessContext) {
  if (hasRole(user, RoleEnum.ADMIN)) return true;
  if (isTicketOwner(user, ticket)) return true;
  if (isTicketAssignedAgent(user, ticket)) return true;
  if (isTicketParticipant(user, ticket)) return true;

  return hasAnyRole(user, [RoleEnum.AGENT]);
}

/** Reply, change status, manage tags — owner, primary agent, collaborators, admin. */
export function canActOnTicket(user: User, ticket: TicketAccessContext) {
  if (hasRole(user, RoleEnum.ADMIN)) return true;
  if (isTicketOwner(user, ticket)) return true;
  if (isTicketAssignedAgent(user, ticket)) return true;
  if (isTicketParticipant(user, ticket)) return true;
  return false;
}

/** Only the primary assigned agent may add/remove collaborators. */
export function canManageTicketParticipants(user: User, ticket: TicketAccessContext) {
  return (
    hasRole(user, RoleEnum.AGENT) &&
    Boolean(ticket.assignedTo) &&
    isTicketAssignedAgent(user, ticket)
  );
}

/** Self-join is no longer allowed — owner must add collaborators. */
export function canJoinTicket(_user: User, _ticket: TicketAccessContext) {
  return false;
}

export function userHasAgentRole(user: User) {
  return hasRole(user, RoleEnum.AGENT);
}

export function ticketAllowsAddingParticipants(ticket: TicketAccessContext) {
  return ticket.status !== TicketStatus.RESOLVED;
}
