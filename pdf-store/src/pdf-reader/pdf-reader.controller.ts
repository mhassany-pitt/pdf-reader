import {
  Controller, ForbiddenException, Get,
  NotFoundException, Param, Req, Res, UnauthorizedException
} from '@nestjs/common';
import axios from 'axios';
import { useId } from 'src/utils';
import { Response } from 'express';
import { PDFReaderService } from './pdf-reader.service';

@Controller('pdf-reader')
export class PDFReaderController {

  constructor(
    private pdfReaderService: PDFReaderService,
  ) { }

  // -- delegation demo
  @Get('delegation/:id')
  delegation(@Req() req: any, @Param('id') id: string) {
    const userId = req.query.user_id; // use for auth
    return { published: true };
  }

  private async _getOrFail({ user, id }) {
    let pdfDoc: any = null;
    if (user) { // 1. user is the author
      pdfDoc = await this.pdfReaderService.readPDFDoc({ user: user, id });
      if (pdfDoc) return useId(pdfDoc);
    }

    let pdfLink = await this.pdfReaderService.readPDFLink({ id });
    if (!pdfLink) // 2. if the link does not exist
      throw new NotFoundException();

    if (pdfLink.delegated) { // 3. if delegated config
      if (!pdfLink.delegated_to_url)
        throw new NotFoundException();

      try { // 3.1. fetch the config from the delegated url
        const resp = await axios.get(`${pdfLink.delegated_to_url}/${id}?user_id=${user?.id}`);
        const { _id, owner_id, pdf_doc_id, created_at } = pdfLink;
        pdfLink = { ...(resp.data), _id, owner_id, pdf_doc_id, created_at };
      } catch (exp) {
        console.error(exp);
        throw new NotFoundException();
      }
    }

    if (!pdfLink.published) // 4. if not published
      throw new NotFoundException();

    // 4. abort if authorized accounts is set and user is not logged in
    const accounts = pdfLink.authorized_accounts?.split(',').map(e => e.trim()).filter(e => e);
    if (accounts?.length && !user)
      throw new ForbiddenException();

    // 5. abort if authorized accounts is set and user is not in the list
    if (accounts?.length && !accounts.includes(user.email))
      throw new UnauthorizedException();

    // 6. find the org document and return it
    pdfDoc = await this.pdfReaderService.readPDFDoc({
      user: { id: pdfLink.owner_id },
      id: pdfLink.pdf_doc_id,
    });
    pdfDoc.id = id;

    // 7. attach the link confgurations
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
