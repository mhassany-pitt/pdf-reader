import {
  Body, Controller, Get, NotFoundException, Param,
  Patch, Post, Query, Req, UseGuards
} from '@nestjs/common';
import { PDFDocumentLinksService } from './pdf-document-links.service';
import { AuthenticatedGuard } from 'src/auth/authenticated.guard';
import { useId } from 'src/utils';
import { PDFDocumentsService } from 'src/pdf-documents/pdf-documents.service';

@Controller('pdf-document-links')
export class PDFDocumentLinksController {

  constructor(
    private pdfDocs: PDFDocumentsService,
    private service: PDFDocumentLinksService,
  ) { }

  private async _getPDFDocUser({ user, pdfDocId }) {
    const pdfDoc = await this.pdfDocs.read({ user, id: pdfDocId });
    if (pdfDoc)
      return { id: pdfDoc.user_id };
    return null;
  }

  private async _getOrFail({ user, id }) {
    const pdfLink = await this.service.read({ user, id });
    if (pdfLink)
      return useId(pdfLink);
    throw new NotFoundException();
  }

  @Get()
  @UseGuards(AuthenticatedGuard)
  async index(@Req() req: any, @Query('pdfDocId') pdfDocId: string) {
    const author = await this._getPDFDocUser({ user: req.user, pdfDocId });
    const list = await this.service.list({ user: author, pdfDocId });
    return list.map(useId);
  }

  @Post()
  @UseGuards(AuthenticatedGuard)
  async create(@Req() req: any, @Query('pdfDocId') pdfDocId: string, @Body() configs: any) {
    const author = await this._getPDFDocUser({ user: req.user, pdfDocId });
    return useId(await this.service.create({ user: author, pdfDocId, configs }));
  }

  @Get(':id')
  @UseGuards(AuthenticatedGuard)
  async get(@Req() req: any, @Param('id') id: string) {
    const link = await this.service.read({ user: null, id });
    const author = await this._getPDFDocUser({ user: req.user, pdfDocId: link.pdf_doc_id });
    return this._getOrFail({ user: author, id });
  }

  @Patch(':id')
  @UseGuards(AuthenticatedGuard)
  async update(@Req() req: any, @Param('id') id: string, @Body() pdfLink: any) {
    const link = await this.service.read({ user: null, id });
    const author = await this._getPDFDocUser({ user: req.user, pdfDocId: link.pdf_doc_id });
    await this._getOrFail({ user: author, id });
    return useId(await this.service.update({ user: author, id, pdfLink }));
  }
}
