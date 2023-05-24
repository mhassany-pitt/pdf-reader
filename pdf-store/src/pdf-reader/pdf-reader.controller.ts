import { Controller, Get, NotFoundException, Param, Req, StreamableFile, UnauthorizedException, UseGuards } from '@nestjs/common';
import { AuthenticatedGuard } from 'src/auth/authenticated.guard';
import { createReadStream } from 'fs-extra';
import { useId } from 'src/utils';
import { PDFReaderService } from './pdf-reader.service';

@Controller('pdf-reader')
export class PDFReaderController {

  constructor(
    private pdfReaderService: PDFReaderService,
  ) { }

  private async _getOrFail({ user, id }) {
    let pdfDoc = await this.pdfReaderService.readPDFDoc({ user: user, id });
    if (pdfDoc)
      return useId(pdfDoc);

    const pdfLink = await this.pdfReaderService.readPDFLink({ id });
    if (!pdfLink || !pdfLink.published)
      throw new NotFoundException();

    const accounts = pdfLink.authorized_accounts.split(',').map(e => e.trim()).filter(e => e);
    if (accounts.length && !accounts.includes(user.email))
      throw new UnauthorizedException

    pdfDoc = await this.pdfReaderService.readPDFDoc({
      user: { id: pdfLink.owner_id },
      id: pdfLink.pdf_doc_id,
    });
    pdfDoc.id = id;
    pdfDoc.configs = useId(pdfLink);
    return useId(pdfDoc);
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
    return new StreamableFile(createReadStream(this.pdfReaderService.getFilePath({ id: pdfDoc.file_id })));
  }
}
