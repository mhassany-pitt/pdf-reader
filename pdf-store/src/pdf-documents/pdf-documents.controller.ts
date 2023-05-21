import {
  Body, Controller, Get, NotFoundException, Param,
  Patch, Post, StreamableFile, UploadedFile, UseGuards, UseInterceptors
} from '@nestjs/common';
import { Express } from 'express';
import { FileInterceptor } from '@nestjs/platform-express';
import { PDFDocumentsService } from './pdf-documents.service';
import { createReadStream } from 'fs-extra';
import { AuthenticatedGuard } from 'src/auth/authenticated.guard';

@Controller('pdf-documents')
export class PDFDocumentsController {

  constructor(
    private service: PDFDocumentsService,
  ) { }

  @Get()
  @UseGuards(AuthenticatedGuard)
  index() {
    return this.service.list().map(id => {
      const { name, tags, created_at, modified_at } = this.service.read(id);
      return { id, name, tags, created_at, modified_at };
    });
  }

  @Post()
  @UseGuards(AuthenticatedGuard)
  @UseInterceptors(FileInterceptor('file'))
  create(@UploadedFile() file: Express.Multer.File) {
    const document = this.service.create(file);
    return document;
  }

  @Get(':id')
  @UseGuards(AuthenticatedGuard)
  get(@Param('id') id: string) {
    if (!this.service.exists(id))
      throw new NotFoundException();

    return this.service.read(id);
  }

  @Patch(':id')
  @UseGuards(AuthenticatedGuard)
  update(@Param('id') id: string, @Body() body: any) {
    if (!this.service.exists(id))
      throw new NotFoundException();

    this.service.write(id, body);
  }

  @Post(':id/file')
  @UseGuards(AuthenticatedGuard)
  @UseInterceptors(FileInterceptor('file'))
  upload(@Param('id') id: string, @UploadedFile() file: Express.Multer.File) {
    if (!this.service.exists(id))
      throw new NotFoundException();

    const document = this.service.read(id);
    this.service.upload(document.file_id, file);

    return {};
  }

  @Get(':id/file')
  // TODO: this api should be protected 
  // @UseGuards(AuthenticatedGuard)
  download(@Param('id') id: string): StreamableFile {
    if (!this.service.exists(id))
      throw new NotFoundException();

    const document = this.service.read(id);

    return new StreamableFile(createReadStream(
      this.service.download(document.file_id, true)
    ));
  }
}