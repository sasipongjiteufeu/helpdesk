import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as fs from 'fs';
import { Ticket } from './entities/ticket.entity';
import { TicketMessage } from './entities/ticket-message.entity';
import { TicketMessageAttachment } from './entities/ticket-message-attachment.entity';
import { TicketReadState } from './entities/ticket-read-state.entity';
import { User } from 'src/user/entities/user.entity';
import { RoleEnum } from 'src/role/entities/role.enum';
import { hasRole } from 'src/auth/role.utile';
import { CreateTicketMessageDto } from './dto/create-ticket-message.dto';
import { ListTicketMessagesDto } from './dto/list-ticket-messages.dto';
import { ListMessageAttachmentsDto } from './dto/list-message-attachments.dto';
import { canAccessTicket } from './ticket-permissions';
import { AppCacheService } from 'src/cache/app-cache.service';

@Injectable()
export class TicketMessageService {
  constructor(
    @InjectRepository(Ticket) private readonly tickets: Repository<Ticket>,
    @InjectRepository(TicketMessage)
    private readonly messages: Repository<TicketMessage>,
    @InjectRepository(TicketMessageAttachment)
    private readonly attachments: Repository<TicketMessageAttachment>,
    @InjectRepository(TicketReadState)
    private readonly readStates: Repository<TicketReadState>,
    private readonly cache: AppCacheService,
  ) {}

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

  private async getTicketForAccess(user: User, ticketId: number) {
    const ticket = await this.tickets.findOne({
      where: { id: ticketId },
      relations: ['createdBy', 'assignedTo', 'participants', 'participants.agent'],
    });

    if (!ticket) throw new NotFoundException('Ticket not found');

    if (!canAccessTicket(user, ticket)) {
      throw new ForbiddenException('Not your ticket');
    }

    return ticket;
  }

  private invalidateTicketMessageCaches(ticketId: number) {
    this.cache.delByPrefix(`ticket:messages:${ticketId}:`);
  }

  private invalidateTicketListCachesForMessage(ticketId: number, userId?: string) {
    this.invalidateTicketMessageCaches(ticketId);
    if (userId) {
      this.cache.delByPrefix(`user:tickets:userId=${userId}:`);
      this.cache.delByPrefix(`agent:tickets:userId=${userId}:`);
      return;
    }
    this.cache.delByPrefix('user:tickets:');
    this.cache.delByPrefix('agent:tickets:');
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

  private toAttachmentDto(
    attachment: TicketMessageAttachment,
    ticketId: number,
    messageId: string,
  ) {
    return {
      id: attachment.id,
      originalName: attachment.originalName,
      filename: attachment.filename,
      mimeType: attachment.mimeType,
      size: attachment.size,
      url: `/api/tickets/${ticketId}/messages/${messageId}/attachments/${attachment.id}`,
    };
  }

  private toDto(message: TicketMessage, ticketId: number) {
    return {
      id: message.id,
      message: message.message,
      createdAt: message.createdAt,
      updatedAt: message.updatedAt,
      sender: {
        id: message.sender.id,
        name: message.sender.name,
        email: message.sender.email,
        avatarUrl: message.sender.avatarUrl,
        roles: message.sender.roles?.map((role) => role.name) ?? [],
      },
      attachments: (message.attachments ?? []).map((attachment) =>
        this.toAttachmentDto(attachment, ticketId, message.id),
      ),
    };
  }

  async listForTicket(
    user: User,
    ticketId: number,
    dto: ListTicketMessagesDto = {},
  ) {
    const ticket = await this.getTicketForAccess(user, ticketId);
    const page = this.normalizePage(dto.page, 1);
    const limit = this.normalizeLimit(dto.limit, 50, 100);
    const sort = dto.sort === 'DESC' ? 'DESC' : 'ASC';
    const search = dto.search?.trim();
    const cacheKey = `ticket:messages:${ticket.id}:userId=${user.id}:payload=${this.cache.stableHash({
      page,
      limit,
      sort,
      search,
    })}`;

    return this.cache.remember(cacheKey, 3, async () => {
    const qb = this.messages
      .createQueryBuilder('message')
      .leftJoinAndSelect('message.sender', 'sender')
      .leftJoinAndSelect('sender.roles', 'senderRoles')
      .leftJoinAndSelect('message.attachments', 'attachments')
      .where('message.ticket = :ticketId', { ticketId: ticket.id })
      .orderBy('message.createdAt', sort)
      .addOrderBy('attachments.createdAt', 'ASC')
      .skip((page - 1) * limit)
      .take(limit);

    if (search) {
      qb.andWhere('LOWER(message.message) LIKE :search', {
        search: `%${search.toLowerCase()}%`,
      });
    }

    const [items, total] = await qb.getManyAndCount();

    return {
      items: items.map((message) => this.toDto(message, ticket.id)),
      page,
      limit,
      total,
      totalPages: total > 0 ? Math.ceil(total / limit) : 0,
    };
    });
  }

  async createForTicket(
    user: User,
    ticketId: number,
    dto: CreateTicketMessageDto,
    files?: Express.Multer.File[],
  ) {
    const ticket = await this.getTicketForAccess(user, ticketId);
    const text = dto.message?.trim() || null;

    if (!text && !files?.length) {
      throw new BadRequestException('Message or attachment is required');
    }

    if (text && text.length > 5000) {
      throw new BadRequestException('Message must not exceed 5000 characters');
    }

    const message = await this.messages.save(
      this.messages.create({
        ticket,
        sender: user,
        message: text,
      }),
    );

    if (files?.length) {
      const rows = files.map((file) =>
        this.attachments.create({
          message,
          originalName: file.originalname,
          filename: file.filename,
          mimeType: file.mimetype,
          size: file.size,
          path: file.path,
        }),
      );
      await this.attachments.save(rows);
    }

    const saved = await this.messages.findOne({
      where: { id: message.id, ticket: { id: ticket.id } },
      relations: ['sender', 'sender.roles', 'attachments'],
    });

    if (!saved) throw new NotFoundException('Message not found');
    this.invalidateTicketListCachesForMessage(ticket.id);
    return this.toDto(saved, ticket.id);
  }

  async markTicketMessagesAsRead(user: User, ticketId: number) {
    const ticket = await this.getTicketForAccess(user, ticketId);
    const latestMessage = await this.messages.findOne({
      where: { ticket: { id: ticket.id } },
      select: { id: true, createdAt: true },
      order: { createdAt: 'DESC' },
    });
    const now = new Date();

    let readState = await this.readStates.findOne({
      where: {
        ticket: { id: ticket.id },
        user: { id: user.id },
      },
      relations: ['ticket', 'user'],
    });

    if (!readState) {
      readState = this.readStates.create({
        ticket,
        user,
      });
    }

    readState.lastReadAt = now;
    readState.lastReadMessageId = latestMessage?.id ?? null;
    await this.readStates.save(readState);
    this.invalidateTicketListCachesForMessage(ticket.id, user.id);

    return {
      success: true,
      ticketId: ticket.id,
      lastReadAt: readState.lastReadAt,
      lastReadMessageId: readState.lastReadMessageId,
    };
  }

  async getAttachmentFor(
    user: User,
    ticketId: number,
    messageId: string,
    attachmentId: string,
  ) {
    const ticket = await this.getTicketForAccess(user, ticketId);
    const attachment = await this.attachments.findOne({
      where: {
        id: attachmentId,
        message: { id: messageId, ticket: { id: ticket.id } },
      },
      relations: ['message', 'message.ticket'],
    });

    if (!attachment) throw new NotFoundException('Attachment not found');
    return attachment;
  }

  async listAttachmentsForMessage(
    user: User,
    ticketId: number,
    messageId: string,
    dto: ListMessageAttachmentsDto = {},
  ) {
    const ticket = await this.getTicketForAccess(user, ticketId);
    const message = await this.messages.findOne({
      where: { id: messageId, ticket: { id: ticket.id } },
      select: { id: true },
    });

    if (!message) throw new NotFoundException('Message not found');

    const page = this.normalizePage(dto.page, 1);
    const limit = this.normalizeLimit(dto.limit, 20, 100);
    const [items, total] = await this.attachments.findAndCount({
      where: { message: { id: message.id } },
      order: { createdAt: 'ASC' },
      take: limit,
      skip: (page - 1) * limit,
    });

    return {
      items: items.map((attachment) =>
        this.toAttachmentDto(attachment, ticket.id, message.id),
      ),
      page,
      limit,
      total,
      totalPages: total > 0 ? Math.ceil(total / limit) : 0,
    };
  }

  async removeFor(user: User, ticketId: number, messageId: string) {
    const ticket = await this.getTicketForAccess(user, ticketId);
    const message = await this.messages.findOne({
      where: { id: messageId, ticket: { id: ticket.id } },
      relations: ['sender', 'attachments'],
    });

    if (!message) throw new NotFoundException('Message not found');

    const isAdmin = hasRole(user, RoleEnum.ADMIN);
    const isSender = message.sender.id === user.id;

    if (!isAdmin && !isSender) {
      throw new ForbiddenException('Only the sender or admin can delete this message');
    }

    for (const attachment of message.attachments ?? []) {
      this.deleteFileIfExists(attachment.path);
    }

    await this.messages.remove(message);
    this.invalidateTicketListCachesForMessage(ticket.id);
    return { ok: true };
  }
}
