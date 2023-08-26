import {
  Body, Controller, Get, NotFoundException, Param,
  Patch, Post, Query, Req, Res, UploadedFile,
  UseGuards, UseInterceptors
} from '@nestjs/common';
import { Express, Response } from 'express';
import { FileInterceptor } from '@nestjs/platform-express';
import { PDFDocumentsService } from './pdf-documents.service';
import { AuthenticatedGuard } from 'src/auth/authenticated.guard';
import { useId } from 'src/utils';
import { createHash } from 'node:crypto';
import { createReadStream, statSync } from 'fs-extra';

@Controller('pdf-documents')
export class PDFDocumentsController {

  constructor(
    private service: PDFDocumentsService,
  ) { }

  private async _getOrFail({ user, id }) {
    let pdfDoc = await this.service.read({ user, id });
    if (pdfDoc) {
      pdfDoc = useId(pdfDoc);
      pdfDoc.file_hash = createHash('sha256').update(pdfDoc.file_url || pdfDoc.file_id).digest('hex');
      return pdfDoc;
    }
    throw new NotFoundException();
  }

  @Get()
  @UseGuards(AuthenticatedGuard)
  async index(@Req() req: any, @Query('include-archives') includeArchives: boolean) {
    const list = await this.service.list({ user: req.user, includeArchives });
    return list.map(useId);
  }

  @Post()
  @UseGuards(AuthenticatedGuard)
  async create(@Req() req: any) {
    return useId(await this.service.create({ user: req.user }));
  }

  @Get(':id')
  @UseGuards(AuthenticatedGuard)
  async get(@Req() req: any, @Param('id') id: string) {
    return await this._getOrFail({ user: req.user, id });
  }

  @Patch(':id')
  @UseGuards(AuthenticatedGuard)
  async update(@Req() req: any, @Param('id') id: string, @Body() _pdfDoc: any) {
    const { file_id, ...pdfDoc } = _pdfDoc;
    await this._getOrFail({ user: req.user, id });
    return useId(await this.service.update({ user: req.user, id, pdfDoc }));
  }

  @Patch(':id/archive')
  @UseGuards(AuthenticatedGuard)
  async archive(@Req() req: any, @Param('id') id: string) {
    const pdfDoc = await this._getOrFail({ user: req.user, id });
    useId(await this.service.update({ user: req.user, id, pdfDoc: { archived: !pdfDoc.archived } }));
    return {};
  }

  @Post(':id/file')
  @UseGuards(AuthenticatedGuard)
  @UseInterceptors(FileInterceptor('file'))
  async upload(@Req() req: any, @Param('id') id: string, @UploadedFile() file: Express.Multer.File) {
    const pdfDoc = await this._getOrFail({ user: req.user, id });
    const fileId = await this.service.upload({ user: req.user, fileId: pdfDoc.file_id, file });
    await this.service.update({ user: req.user, id, pdfDoc: { ...pdfDoc, file_id: fileId } });
    return {};
  }

  @Get(':id/file')
  @UseGuards(AuthenticatedGuard)
  async download(@Req() req: any, @Res() res: Response, @Param('id') id: string) {
    const pdfDoc = await this._getOrFail({ user: req.user, id });
    const filePath = this.service.getFilePath({ id: pdfDoc.file_id });

    const fileSize = statSync(filePath).size;
    let start = 0, end = fileSize - 1;

    const rangeHeader = req.headers.range;
    if (rangeHeader) {
      const parts = rangeHeader.replace(/bytes=/, '').split('-');
      start = parseInt(parts[0], 10);
      end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;

      res.status(206);
      res.setHeader('Content-Range', `bytes ${start}-${end}/${fileSize}`);
      res.setHeader('Content-Length', end - start + 1);
      res.setHeader('Accept-Ranges', 'bytes');
    } else {
      res.setHeader('Content-Length', fileSize);
    }

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Cache-Control', 'max-age=2592000'); // 30 days

    createReadStream(filePath, { start, end }).pipe(res);
  }

  @Post(':id/text-locations')
  @UseGuards(AuthenticatedGuard)
  async updateTextLocations(@Req() req: any, @Param('id') id: string, @Body() pageTexts: any) {
    const pdfDoc = await this._getOrFail({ user: req.user, id });
    await this.service.updateTextLocations({ id, fileId: pdfDoc.file_id, pageTexts });
  }
}
