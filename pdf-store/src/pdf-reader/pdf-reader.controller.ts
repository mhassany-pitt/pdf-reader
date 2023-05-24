import { Controller, ForbiddenException, Get, NotFoundException, Param, Req, StreamableFile, UnauthorizedException } from '@nestjs/common';
import { createReadStream } from 'fs-extra';
import { useId } from 'src/utils';
import { PDFReaderService } from './pdf-reader.service';

@Controller('pdf-reader')
export class PDFReaderController {

  constructor(
    private pdfReaderService: PDFReaderService,
  ) { }

  private async _getOrFail({ user, id }) {
    let pdfDoc: any = null;
    if (user) { // user is the author
      pdfDoc = await this.pdfReaderService.readPDFDoc({ user: user, id });
      if (pdfDoc) // link was the org created by the author
        return useId(pdfDoc);
    }

    const pdfLink = await this.pdfReaderService.readPDFLink({ id });
    if (!pdfLink || !pdfLink.published)
      throw new NotFoundException(); // abort on non-published links

    const accounts = pdfLink.authorized_accounts.split(',').map(e => e.trim()).filter(e => e);
    // abort if authorized accounts is set and user is not logged in
    if (accounts.length && !user)
      throw new ForbiddenException();

    // abort if authorized accounts is set and user is not in the list
    if (accounts.length && !accounts.includes(user.email))
      throw new UnauthorizedException();

    // find the org document and return it
    pdfDoc = await this.pdfReaderService.readPDFDoc({
      user: { id: pdfLink.owner_id },
      id: pdfLink.pdf_doc_id,
    });
    pdfDoc.id = id;

    // attach the link confgurations
    pdfDoc.configs = useId(pdfLink);

    return useId(pdfDoc);
  }

  @Get(':id')
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
  async download(@Req() req: any, @Param('id') id: string): Promise<StreamableFile> {
    const pdfDoc = await this._getOrFail({ user: req.user, id });
    return new StreamableFile(createReadStream(this.pdfReaderService.getFilePath({ id: pdfDoc.file_id })));
  }
}
