import {
  BadRequestException, Controller, Get, Post, Body, Param, Patch, Delete,
  Query, Req, Res, UseGuards, UseInterceptors, UploadedFiles
} from '@nestjs/common';
import express from 'express';
import { FilesInterceptor } from '@nestjs/platform-express';
import { TicketService } from './ticket.service';
import { TicketMessageService } from './ticket-message.service';
import { CreateTicketDto } from './dto/create-ticket.dto';
import { CreateTicketMessageDto } from './dto/create-ticket-message.dto';
import { ListTicketMessagesDto } from './dto/list-ticket-messages.dto';
import { ListMessageAttachmentsDto } from './dto/list-message-attachments.dto';
import { LeaveTicketDto } from './dto/leave-ticket.dto';
import { ListTicketParticipantsDto } from './dto/list-ticket-participants.dto';
import { AuthenticatedGuard } from 'src/auth/guards/authenticated.guard';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { RoleEnum } from 'src/role/entities/role.enum';
import * as path from 'path';
import * as fs from 'fs';
import { FilterTicketDto } from './dto/filter-ticket.dto';

@Controller('tickets')

export class TicketController {
  constructor(
    private readonly svc: TicketService,
    private readonly messages: TicketMessageService,
  ) { }


  // Create (multipart form: title, detail, tal?, picture?)
  @Post()
  @UseGuards(AuthenticatedGuard, RolesGuard)
  @Roles(RoleEnum.USER, RoleEnum.AGENT, RoleEnum.ADMIN)
  @UseInterceptors(FilesInterceptor('pictures', 10)) // 👈 matches form field "pictures"
  create(
    @Body() dto: CreateTicketDto,
    @UploadedFiles() files: Express.Multer.File[],
    @Req() req: any,
  ) {
    return this.svc.create(dto, req.user, files);
  }

  // List (mine for USER, all for staff)
  @Get()
  @UseGuards(AuthenticatedGuard, RolesGuard)
  @Roles(RoleEnum.USER, RoleEnum.AGENT, RoleEnum.ADMIN)
  findAll(@Req() req: any, @Query('page') page?: string, @Query('limit') limit?: string) {
    return this.svc.findAllFor(req.user, {
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 20,
    });
  }
  
@Post('public')
findAllPublicPost(
  @Body() body: { page?: number; limit?: number },
) {
  const page = body.page ?? 1;
  const limit = body.limit ?? 20;
  return this.svc.findAllPublicPost({ page, limit }); // 👈 use the new method
}
  // Public list (no auth) for landing page
  @Get('public')
  findAllPublic(@Query('page') page?: string, @Query('limit') limit?: string) {
    return this.svc.findAllPublic({
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 20,
    });
  }

  // Filter (server-side) to reduce client load
  @Post('filter')
  @UseGuards(AuthenticatedGuard, RolesGuard)
  @Roles(RoleEnum.USER, RoleEnum.AGENT, RoleEnum.ADMIN)
  filter(@Req() req: any, @Body() dto: FilterTicketDto) {
    return this.svc.filterFor(req.user, dto);
  }


  @Post('mine')
  @UseGuards(AuthenticatedGuard, RolesGuard)
  @Roles(RoleEnum.USER, RoleEnum.AGENT, RoleEnum.ADMIN)
  findAllMine(@Req() req: any, @Body() body: { page?: number; limit?: number }) {
    const page = body.page ?? 1;
    const limit = body.limit ?? 20;
    return this.svc.findAllMine(req.user, { page, limit });
  }

  @Post(':ticketId/join')
  @UseGuards(AuthenticatedGuard, RolesGuard)
  @Roles(RoleEnum.AGENT, RoleEnum.ADMIN)
  joinTicket(@Param('ticketId') ticketId: number, @Req() req: any) {
    return this.svc.joinTicket(ticketId, req.user);
  }

  @Post(':ticketId/leave')
  @UseGuards(AuthenticatedGuard, RolesGuard)
  @Roles(RoleEnum.AGENT, RoleEnum.ADMIN)
  leaveTicket(
    @Param('ticketId') ticketId: number,
    @Body() dto: LeaveTicketDto,
    @Req() req: any,
  ) {
    return this.svc.leaveTicket(ticketId, req.user, dto);
  }

  @Post(':ticketId/participants/list')
  @UseGuards(AuthenticatedGuard, RolesGuard)
  @Roles(RoleEnum.USER, RoleEnum.AGENT, RoleEnum.ADMIN)
  listParticipants(
    @Param('ticketId') ticketId: number,
    @Body() dto: ListTicketParticipantsDto,
    @Req() req: any,
  ) {
    return this.svc.listParticipantsForTicket(req.user, ticketId, dto);
  }


  // Get one (owner or staff)
  @Get(':id')
  @UseGuards(AuthenticatedGuard, RolesGuard)
  @Roles(RoleEnum.USER, RoleEnum.AGENT, RoleEnum.ADMIN)
  findOne(@Param('id') id: number, @Req() req: any) {
    return this.svc.findOneFor(req.user, id);
  }

  // Get raw picture bytes (204 if none)
  @Get(':id/picture')
  @UseGuards(AuthenticatedGuard, RolesGuard)
  @Roles(RoleEnum.USER, RoleEnum.AGENT, RoleEnum.ADMIN)
  async getPicture(@Param('id') id: number, @Req() req: any, @Res() res: express.Response) {
    const t = await this.svc.findOneFor(req.user, id); // now includes images
    const firstImage = t.images?.[0];
    if (!firstImage || !firstImage.path) return res.status(204).send();

    const absPath = path.isAbsolute(firstImage.path)
      ? firstImage.path
      : path.join(process.cwd(), firstImage.path);
    if (!fs.existsSync(absPath)) return res.status(204).send();

    res.setHeader('Content-Type', firstImage.mimeType || 'application/octet-stream');
    return res.sendFile(absPath);
  }
  // === NEW: get one image's bytes ===
  @Get(':id/images/:imageId')
  @UseGuards(AuthenticatedGuard, RolesGuard)
  @Roles(RoleEnum.USER, RoleEnum.AGENT, RoleEnum.ADMIN)
  async getImage(
    @Param('id') id: number,
    @Param('imageId') imageId: string,
    @Req() req: any,
    @Res() res: express.Response,
  ) {
    const img = await this.svc.getImageFor(req.user, id, imageId);
    const absPath = img.path && path.isAbsolute(img.path)
      ? img.path
      : img.path
        ? path.join(process.cwd(), img.path)
        : null;

    if (!absPath || !fs.existsSync(absPath)) {
      return res.status(204).send();
    }

    res.setHeader('Content-Type', img.mimeType || 'application/octet-stream');
    return res.sendFile(absPath);
  }
  // === NEW: list all images metadata for a ticket ===
  @Get(':id/images')
  @UseGuards(AuthenticatedGuard, RolesGuard)
  @Roles(RoleEnum.USER, RoleEnum.AGENT, RoleEnum.ADMIN)
  getAllImages(@Param('id') id: number, @Req() req: any) {
    return this.svc.getAllImagesFor(req.user, id);
  }

  @Post(':ticketId/messages/list')
  @UseGuards(AuthenticatedGuard, RolesGuard)
  @Roles(RoleEnum.USER, RoleEnum.AGENT, RoleEnum.ADMIN)
  listMessages(
    @Param('ticketId') ticketId: number,
    @Body() dto: ListTicketMessagesDto,
    @Req() req: any,
  ) {
    return this.messages.listForTicket(req.user, ticketId, dto);
  }

  @Post(':ticketId/messages')
  @UseGuards(AuthenticatedGuard, RolesGuard)
  @Roles(RoleEnum.USER, RoleEnum.AGENT, RoleEnum.ADMIN)
  @UseInterceptors(FilesInterceptor('attachments', 10, {
    fileFilter: (req, file, cb) => {
      const allowed = new Set([
        'image/png',
        'image/jpeg',
        'image/webp',
        'application/pdf',
        'text/plain',
        'application/zip',
      ]);

      if (!allowed.has(file.mimetype)) {
        return cb(new BadRequestException('Unsupported attachment type'), false);
      }

      cb(null, true);
    },
  }))
  createMessage(
    @Param('ticketId') ticketId: number,
    @Body() dto: CreateTicketMessageDto,
    @UploadedFiles() files: Express.Multer.File[],
    @Req() req: any,
  ) {
    return this.messages.createForTicket(req.user, ticketId, dto, files);
  }

  @Get(':ticketId/messages/:messageId/attachments/:attachmentId')
  @UseGuards(AuthenticatedGuard, RolesGuard)
  @Roles(RoleEnum.USER, RoleEnum.AGENT, RoleEnum.ADMIN)
  async getMessageAttachment(
    @Param('ticketId') ticketId: number,
    @Param('messageId') messageId: string,
    @Param('attachmentId') attachmentId: string,
    @Req() req: any,
    @Res() res: express.Response,
  ) {
    const attachment = await this.messages.getAttachmentFor(
      req.user,
      ticketId,
      messageId,
      attachmentId,
    );
    const absPath = path.isAbsolute(attachment.path)
      ? attachment.path
      : path.join(process.cwd(), attachment.path);

    if (!fs.existsSync(absPath)) {
      return res.status(404).send();
    }

    res.setHeader('Content-Type', attachment.mimeType || 'application/octet-stream');
    res.setHeader(
      'Content-Disposition',
      `inline; filename="${encodeURIComponent(attachment.originalName)}"`,
    );
    return res.sendFile(absPath);
  }

  @Post(':ticketId/messages/:messageId/attachments/list')
  @UseGuards(AuthenticatedGuard, RolesGuard)
  @Roles(RoleEnum.USER, RoleEnum.AGENT, RoleEnum.ADMIN)
  listMessageAttachments(
    @Param('ticketId') ticketId: number,
    @Param('messageId') messageId: string,
    @Body() dto: ListMessageAttachmentsDto,
    @Req() req: any,
  ) {
    return this.messages.listAttachmentsForMessage(
      req.user,
      ticketId,
      messageId,
      dto,
    );
  }

  @Delete(':ticketId/messages/:messageId')
  @UseGuards(AuthenticatedGuard, RolesGuard)
  @Roles(RoleEnum.USER, RoleEnum.AGENT, RoleEnum.ADMIN)
  removeMessage(
    @Param('ticketId') ticketId: number,
    @Param('messageId') messageId: string,
    @Req() req: any,
  ) {
    return this.messages.removeFor(req.user, ticketId, messageId);
  }


  // Update content/tel/picture (owner or staff)
  @Patch(':id')
  @UseGuards(AuthenticatedGuard, RolesGuard)
  @Roles(RoleEnum.USER, RoleEnum.AGENT, RoleEnum.ADMIN)
  @UseInterceptors(FilesInterceptor('pictures'))
  update(
    @Param('id') id: number,
    @Body() dto: CreateTicketDto,
    @UploadedFiles() files: Express.Multer.File[],
    @Req() req: any,
  ) {
    return this.svc.updateFor(req.user, id, dto, files);
  }

  // Assign (staff only)
  @Patch(':id/assign')
  @UseGuards(AuthenticatedGuard, RolesGuard)
  @Roles(RoleEnum.AGENT, RoleEnum.ADMIN)
  assign(@Param('id') id: number, @Body() dto: CreateTicketDto) {
    return this.svc.assign(id, dto);
  }

  // Change status (staff only)
  @UseGuards(AuthenticatedGuard, RolesGuard)
  @Patch(':id/status')
  @Roles(RoleEnum.AGENT, RoleEnum.ADMIN)
  changeStatus(@Param('id') id: number, @Body() dto: CreateTicketDto, @Req() req,) {
    return this.svc.changeStatusFor(id, req.user, dto);
  }

  // Delete (admin; or owner if OPEN & unassigned)
  @Delete(':id')
  @UseGuards(AuthenticatedGuard, RolesGuard)
  @Roles(RoleEnum.USER, RoleEnum.ADMIN)
  remove(@Param('id') id: number, @Req() req: any) {
    return this.svc.removeFor(req.user, id);
  }


}
