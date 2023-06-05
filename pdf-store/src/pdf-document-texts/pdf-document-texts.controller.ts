import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { AuthenticatedGuard } from 'src/auth/authenticated.guard';
import { PDFDocumentTextsService } from './pdf-document-texts.service';
import { useId } from 'src/utils';

@Controller('pdf-document-texts')
export class PDFDocumentTextsController {

  constructor(private service: PDFDocumentTextsService) { }

  // TODO: support api token for 3rd party api

  @Get(':id/:fileId')
  // @UseGuards(AuthenticatedGuard)
  async index(@Param('id') pdfDocId: string, @Param('fileId') fileId: string) {
    const list = await this.service.list({ pdfDocId, fileId, page: null });
    return list.map(useId);
  }

  @Get(':id/:fileId/:page')
  // @UseGuards(AuthenticatedGuard)
  async get(@Param('id') pdfDocId: string, @Param('fileId') fileId: string, @Param('page') page: number) {
    const list = await this.service.list({ pdfDocId, fileId, page });
    return list.map(useId);
  }
}
