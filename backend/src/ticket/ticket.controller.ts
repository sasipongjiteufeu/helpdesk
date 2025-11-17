import {
  Controller, Get, Post, Body, Param, Patch, Delete, Query, Req, Res,
  UseGuards, UploadedFile, UseInterceptors,
  UploadedFiles
} from '@nestjs/common';
import express from 'express';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { TicketService } from './ticket.service';
import { CreateTicketDto } from './dto/create-ticket.dto';
import { AuthenticatedGuard } from 'src/auth/guards/authenticated.guard';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { RoleEnum } from 'src/role/entities/role.enum';

@Controller('tickets')
@UseGuards(AuthenticatedGuard, RolesGuard)
export class TicketController {
  constructor(private readonly svc: TicketService) {}

  // Create (multipart form: title, detail, tal?, picture?)
  @Post()
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
  @Roles(RoleEnum.USER, RoleEnum.AGENT, RoleEnum.ADMIN)
  findAll(@Req() req: any, @Query('page') page?: string, @Query('limit') limit?: string) {
    return this.svc.findAllFor(req.user, {
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 20,
    });
  }

  // Get one (owner or staff)
  @Get(':id')
  @Roles(RoleEnum.USER, RoleEnum.AGENT, RoleEnum.ADMIN)
  findOne(@Param('id') id: number, @Req() req: any) {
    return this.svc.findOneFor(req.user, id);
  }

  // Get raw picture bytes (204 if none)
@Get(':id/picture')
@Roles(RoleEnum.USER, RoleEnum.AGENT, RoleEnum.ADMIN)
async getPicture(@Param('id') id: number, @Req() req: any, @Res() res: express.Response) {
  const t = await this.svc.findOneFor(req.user, id); // now includes images
  const firstImage = t.images?.[0];
  if (!firstImage) return res.status(204).send();

  res.setHeader('Content-Type', firstImage.mimeType || 'application/octet-stream');
  res.end(firstImage.data);
}
  // === NEW: get one image's bytes ===
  @Get(':id/images/:imageId')
  @Roles(RoleEnum.USER, RoleEnum.AGENT, RoleEnum.ADMIN)
  async getImage(
    @Param('id') id: number,
    @Param('imageId') imageId: string,
    @Req() req: any,
    @Res() res: express.Response,
  ) {
    const img = await this.svc.getImageFor(req.user, id, imageId);
    res.setHeader('Content-Type', img.mimeType || 'application/octet-stream');
    res.end(img.data);
  }
  // === NEW: list all images metadata for a ticket ===
  @Get(':id/images')
  @Roles(RoleEnum.USER, RoleEnum.AGENT, RoleEnum.ADMIN)
  getAllImages(@Param('id') id: number, @Req() req: any) {
    return this.svc.getAllImagesFor(req.user, id);
  }


  // Update content/tel/picture (owner or staff)
  @Patch(':id')
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
  @Roles(RoleEnum.AGENT, RoleEnum.ADMIN)
  assign(@Param('id') id: number, @Body() dto: CreateTicketDto) {
    return this.svc.assign(id, dto);
  }

  // Change status (staff only)
  @Patch(':id/status')
  @Roles(RoleEnum.AGENT, RoleEnum.ADMIN)
  changeStatus(@Param('id') id: number, @Body() dto: CreateTicketDto, @Req() req,) {
    return this.svc.changeStatus(id, dto, req.user);
  }

  // Delete (admin; or owner if OPEN & unassigned)
  @Delete(':id')
  @Roles(RoleEnum.USER, RoleEnum.ADMIN)
  remove(@Param('id') id: number, @Req() req: any) {
    return this.svc.removeFor(req.user, id);
  }
}
