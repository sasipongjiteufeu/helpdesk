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
import { User } from 'src/user/entities/user.entity';
import { RoleEnum } from 'src/role/entities/role.enum';
import { hasAnyRole, hasRole } from 'src/auth/role.utile';
import { CreateTicketMessageDto } from './dto/create-ticket-message.dto';

@Injectable()
export class TicketMessageService {
  constructor(
    @InjectRepository(Ticket) private readonly tickets: Repository<Ticket>,
    @InjectRepository(TicketMessage)
    private readonly messages: Repository<TicketMessage>,
    @InjectRepository(TicketMessageAttachment)
    private readonly attachments: Repository<TicketMessageAttachment>,
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
      relations: ['createdBy', 'assignedTo'],
    });

    if (!ticket) throw new NotFoundException('Ticket not found');

    const isStaff = hasAnyRole(user, [RoleEnum.AGENT, RoleEnum.ADMIN]);
    const isOwner = ticket.createdBy?.id === user.id;

    if (!isStaff && !isOwner) {
      throw new ForbiddenException('Not your ticket');
    }

    return ticket;
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
        roles: message.sender.roles,
      },
      attachments: (message.attachments ?? []).map((attachment) => ({
        id: attachment.id,
        originalName: attachment.originalName,
        filename: attachment.filename,
        mimeType: attachment.mimeType,
        size: attachment.size,
        url: `/tickets/${ticketId}/messages/${message.id}/attachments/${attachment.id}`,
      })),
    };
  }

  async findAllForTicket(user: User, ticketId: number) {
    const ticket = await this.getTicketForAccess(user, ticketId);
    const messages = await this.messages.find({
      where: { ticket: { id: ticket.id } },
      relations: ['sender', 'sender.roles', 'attachments'],
      order: { createdAt: 'ASC', attachments: { createdAt: 'ASC' } },
    });

    return messages.map((message) => this.toDto(message, ticket.id));
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
    return this.toDto(saved, ticket.id);
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
    return { ok: true };
  }
}
