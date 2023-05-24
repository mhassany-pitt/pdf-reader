import { Controller, Get, NotFoundException, Param, Req, StreamableFile, UseGuards } from '@nestjs/common';
import { AuthenticatedGuard } from 'src/auth/authenticated.guard';
import { createReadStream } from 'fs-extra';
import { PDFDocumentsService } from 'src/pdf-documents/pdf-documents.service';
import { PDFDocumentLinksService } from 'src/pdf-document-links/pdf-document-links.service';
import { useId } from 'src/utils';

@Controller('pdf-reader')
export class PDFReaderController {

  constructor(
    private pdfDocsService: PDFDocumentsService,
    private pdfLinksService: PDFDocumentLinksService,
  ) { }

  private async _getOrFail({ user, id }) {
    let pdfDoc = await this.pdfDocsService.read({ user: user, id });
    if (pdfDoc)
      return useId(pdfDoc);

    const pdfLink = await this.pdfLinksService.read({ user: user, id });
    if (pdfLink && pdfLink.published) {
      pdfDoc = await this.pdfDocsService.read({
        user: { id: pdfLink.owner_id },
        id: pdfLink.pdf_doc_id,
      });
      pdfDoc.id = id;
      pdfDoc.configs = useId(pdfLink);
      return useId(pdfDoc);
    }

    throw new NotFoundException();
  }

  @Get(':id')
  @UseGuards(AuthenticatedGuard)
  async get(@Req() req: any, @Param('id') id: string) {
    const pdfDoc = await this._getOrFail({ user: req.user, id });
    delete pdfDoc.file_id;
    delete pdfDoc.owner_id;
    if (pdfDoc.configs) {
      delete pdfDoc.configs.owner_id;
      delete pdfDoc.configs.pdf_doc_id;
    }
    return pdfDoc;
  }

  @Get(':id/file')
  @UseGuards(AuthenticatedGuard)
  async download(@Req() req: any, @Param('id') id: string): Promise<StreamableFile> {
    const pdfDoc = await this._getOrFail({ user: req.user, id });
    return new StreamableFile(createReadStream(this.pdfDocsService.getFilePath({ id: pdfDoc.file_id })));
  }
}
