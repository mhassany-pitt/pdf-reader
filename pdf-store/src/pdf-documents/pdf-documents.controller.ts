import {
  Body, Controller, Get, Param,
  Patch, Post, Req, StreamableFile, UploadedFile,
  UseGuards, UseInterceptors
} from '@nestjs/common';
import { Express } from 'express';
import { FileInterceptor } from '@nestjs/platform-express';
import { PDFDocumentsService } from './pdf-documents.service';
import { createReadStream } from 'fs-extra';
import { AuthenticatedGuard } from 'src/auth/authenticated.guard';
import { useId } from 'src/utils';

@Controller('pdf-documents')
export class PDFDocumentsController {

  constructor(
    private service: PDFDocumentsService,
  ) { }

  @Get()
  @UseGuards(AuthenticatedGuard)
  async index(@Req() req: any) {
    const list = await this.service.list({ user: req.user });
    return list.map(useId);
  }

  @Post()
  @UseGuards(AuthenticatedGuard)
  @UseInterceptors(FileInterceptor('file'))
  async create(@Req() req: any, @UploadedFile() file: Express.Multer.File) {
    return useId(await this.service.create({ user: req.user, file }));
  }

  @Get(':id')
  @UseGuards(AuthenticatedGuard)
  async get(@Req() req: any, @Param('id') id: string) {
    return useId(await this.service.read({ user: req.user, id }));
  }

  @Patch(':id')
  @UseGuards(AuthenticatedGuard)
  async update(@Req() req: any, @Param('id') id: string, @Body() body: any) {
    return useId(await this.service.update({ user: req.user, id, document: body }));
  }

  @Post(':id/file')
  @UseGuards(AuthenticatedGuard)
  @UseInterceptors(FileInterceptor('file'))
  async upload(@Req() req: any, @Param('id') id: string, @UploadedFile() file: Express.Multer.File) {
    const document = await this.service.read({ user: req.user, id });
    this.service.upload({ user: req.user, fileId: document.file_id, file });
    return {};
  }

  @Get(':id/file')
  @UseGuards(AuthenticatedGuard)
  async download(@Req() req: any, @Param('id') id: string): Promise<StreamableFile> {
    const document = await this.service.read({ user: req.user, id });
    return new StreamableFile(createReadStream(
      this.service.download({ id: document.file_id, pathOnly: true })
    ));
  }
}