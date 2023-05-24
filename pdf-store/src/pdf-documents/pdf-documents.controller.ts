import {
  Body, Controller, Get, NotFoundException, Param,
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

  private async _getOrFail({ user, id }) {
    const pdfDoc = await this.service.read({ user, id });
    if (pdfDoc)
      return useId(pdfDoc);
    throw new NotFoundException();
  }

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
    return await this._getOrFail({ user: req.user, id });
  }

  @Patch(':id')
  @UseGuards(AuthenticatedGuard)
  async update(@Req() req: any, @Param('id') id: string, @Body() body: any) {
    await this._getOrFail({ user: req.user, id });
    return useId(await this.service.update({ user: req.user, id, pdfDoc: body }));
  }

  @Post(':id/file')
  @UseGuards(AuthenticatedGuard)
  @UseInterceptors(FileInterceptor('file'))
  async upload(@Req() req: any, @Param('id') id: string, @UploadedFile() file: Express.Multer.File) {
    const pdfDoc = await this._getOrFail({ user: req.user, id });
    this.service.upload({ user: req.user, fileId: pdfDoc.file_id, file });
    return {};
  }

  @Get(':id/file')
  @UseGuards(AuthenticatedGuard)
  async download(@Req() req: any, @Param('id') id: string): Promise<StreamableFile> {
    const pdfDoc = await this._getOrFail({ user: req.user, id });
    return new StreamableFile(createReadStream(this.service.getFilePath({ id: pdfDoc.file_id })));
  }

  @Post(':id/text-locations')
  @UseGuards(AuthenticatedGuard)
  async updateTextLocations(@Req() req: any, @Param('id') id: string, @Body() pageTexts: any) {
    const pdfDoc = await this._getOrFail({ user: req.user, id });
    await this.service.updateTextLocations({ id, fileId: pdfDoc.file_id, pageTexts });
  }
}