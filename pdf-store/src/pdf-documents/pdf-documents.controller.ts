import {
  Body, Controller, Get, Param,
  Patch, Post, StreamableFile, UploadedFile,
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
  async index() {
    const list = await this.service.list();
    return list.map(useId);
  }

  @Post()
  @UseGuards(AuthenticatedGuard)
  @UseInterceptors(FileInterceptor('file'))
  async create(@UploadedFile() file: Express.Multer.File) {
    return useId(await this.service.create(file));
  }

  @Get(':id')
  @UseGuards(AuthenticatedGuard)
  async get(@Param('id') id: string) {
    return useId(await this.service.read(id));
  }

  @Patch(':id')
  @UseGuards(AuthenticatedGuard)
  async update(@Param('id') id: string, @Body() body: any) {
    return useId(await this.service.update(id, body));
  }

  @Post(':id/file')
  @UseGuards(AuthenticatedGuard)
  @UseInterceptors(FileInterceptor('file'))
  async upload(@Param('id') id: string, @UploadedFile() file: Express.Multer.File) {
    const document = await this.service.read(id);
    this.service.upload(document.file_id, file);
    return {};
  }

  @Get(':id/file')
  @UseGuards(AuthenticatedGuard)
  async download(@Param('id') id: string): Promise<StreamableFile> {
    const document = await this.service.read(id);
    return new StreamableFile(createReadStream(
      this.service.download(document.file_id, true)
    ));
  }
}