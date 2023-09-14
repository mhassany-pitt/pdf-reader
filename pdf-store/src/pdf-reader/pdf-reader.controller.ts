import {
  Controller, ForbiddenException, Get,
  NotFoundException, Param, Req, Res,
  UnauthorizedException
} from '@nestjs/common';
import axios from 'axios';
import { useId } from 'src/utils';
import { Response } from 'express';
import { PDFReaderService } from './pdf-reader.service';
import { createHash } from 'node:crypto';
import { createReadStream, existsSync, statSync, writeFileSync } from 'fs-extra';

@Controller('pdf-reader')
export class PDFReaderController {

  constructor(
    private service: PDFReaderService,
  ) { }

  private async _getOrFail({ user, id, req }) {
    let pdfDoc: any = null;
    if (user) { // 1. user is the author
      pdfDoc = await this.service.readPDFDoc({ user: user, id });
      if (pdfDoc) return useId(pdfDoc);
    }

    let pdfLink = await this.service.readPDFLink({ id });
    if (!pdfLink) // 2. if the link does not exist
      throw new NotFoundException();

    if (pdfLink.delegated) { // 3. if delegated config
      if (!pdfLink.delegated_to_url)
        throw new NotFoundException();

      try { // 3.1. fetch the config from the delegated url
        let url = `${pdfLink.delegated_to_url}/${id}?user_id=${user?.id}`;

        const qparams = req.url.split('?').reverse()[0];
        if (qparams) // 3.2. append the query params (except user_id)
          url += `&${qparams.split('&').filter(q => !q.startsWith('user_id=')).join('&')}`;

        const resp = await axios.get(url);
        const { _id, user_id, pdf_doc_id, created_at } = pdfLink;
        pdfLink = { ...(resp.data), _id, user_id, pdf_doc_id, created_at };
      } catch (exp) {
        console.error(exp);
        throw new NotFoundException();
      }
    }

    if (!pdfLink.published) // 4. if not published
      throw new NotFoundException();

    // 4. abort if authorized accounts is set and user is not logged in
    const accounts = pdfLink.authorized_accounts?.map(e => e.trim()).filter(e => e);
    if (accounts?.length && !user)
      throw new ForbiddenException();

    // 5. abort if authorized accounts is set and user is not in the list
    if (accounts?.length && !accounts.includes(user.email))
      throw new UnauthorizedException();

    // 6. find the org document and return it
    pdfDoc = await this.service.readPDFDoc({
      user: { id: pdfLink.user_id },
      id: pdfLink.pdf_doc_id,
    });
    pdfDoc.id = id;

    // 7. attach the link confgurations
    return useId({ ...pdfDoc, ...useId(pdfLink) });
  }

  @Get(':id')
  async get(@Req() req: any, @Param('id') id: string) {
    const pdfDoc = await this._getOrFail({ user: req.user, id, req });
    pdfDoc.file_hash = createHash('sha256').update(pdfDoc.file_url || pdfDoc.file_id).digest('hex');

    // remove unnecessary/confidential fields
    ('tags,pdf_doc_id,created_at,modified_at,' +
      'user_id,file_id,file_url,archived,published,' +
      'delegated,delegated_to_url').split(',').forEach(attr => delete pdfDoc[attr]);

    return pdfDoc;
  }

  @Get(':id/file')
  async download(@Req() req: any, @Res() res: Response, @Param('id') id: string) {
    const pdfDoc = await this._getOrFail({ user: req.user, id, req });
    let path: string = null;
    if (pdfDoc.file_url) {
      path = this.service.getFilePath({
        id: createHash('sha256').update(pdfDoc.file_url).digest('hex'),
      });
      if (!existsSync(path)) {
        writeFileSync(
          path,
          (await axios.get(pdfDoc.file_url, { responseType: 'arraybuffer' })).data,
          { encoding: 'binary' }
        );
      }
    } else {
      path = this.service.getFilePath({ id: pdfDoc.file_id });
    }

    if (!path || !existsSync(path)) {
      throw new NotFoundException();
    }

    const fileSize = statSync(path).size;
    let start = 0, end = fileSize - 1;

    const rangeHeader = req.headers.range;
    if (rangeHeader) {
      const parts = rangeHeader.replace(/bytes=/, '').split('-');
      start = parseInt(parts[0], 10);
      end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
      const chunkSize = end - start + 1;

      res.status(206);
      res.setHeader('Content-Range', `bytes ${start}-${end}/${fileSize}`);
      res.setHeader('Content-Length', chunkSize);
      res.setHeader('Accept-Ranges', 'bytes');
    } else {
      res.setHeader('Content-Length', fileSize);
    }

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Cache-Control', 'max-age=2592000'); // 30 days

    createReadStream(path, { start, end }).pipe(res);
  }
}
