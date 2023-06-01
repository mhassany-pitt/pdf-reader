import {
  Controller, ForbiddenException, Get,
  NotFoundException, Param, Req, Res, UnauthorizedException
} from '@nestjs/common';
import { useId } from 'src/utils';
import { PDFReaderService } from './pdf-reader.service';
import axios from 'axios';
import { Response } from 'express';

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
  async download(@Req() req: any, @Res() res: Response, @Param('id') id: string) {
    const pdfDoc = await this._getOrFail({ user: req.user, id });
    res.setHeader('Content-Type', 'application/pdf');
    if (pdfDoc.file_url) {
      const resp = await axios.get(pdfDoc.file_url, { responseType: 'arraybuffer' });
      res.send(resp.data);
    } else {
      const path = this.pdfReaderService.getFilePath({ id: pdfDoc.file_id });
      res.sendFile(path, { root: '.' });
    }
  }
}
