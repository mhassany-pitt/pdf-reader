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
    if (user) { // user is the author
      pdfDoc = await this.service.readPDFDoc({ user: user, id });
      if (pdfDoc) return useId(pdfDoc);
    }

    let pdfLink = await this.service.readPDFLink({ id });
    if (!pdfLink) throw new NotFoundException();

    if (pdfLink.delegated) {
      if (!pdfLink.delegated_to_url)
        throw new NotFoundException();

      try { // fetch delegated config
        let url = `${pdfLink.delegated_to_url}/${id}?user_id=${user?.id}`;
        const qparams = req.url.split('?').reverse()[0];
        if (qparams) url += `&${qparams.split('&').filter(q => !q.startsWith('user_id=')).join('&')}`;

        const resp = await axios.get(url);
        const { _id, user_id, pdf_doc_id, created_at } = pdfLink;
        pdfLink = { ...(resp.data), _id, user_id, pdf_doc_id, created_at };
      } catch (exp) {
        const status = exp.response?.status;
        /**/ if (status == 401) throw new UnauthorizedException();
        else if (status == 403) throw new ForbiddenException();
        console.error(exp);
        throw new NotFoundException();
      }
    }

    if (!pdfLink.published) throw new NotFoundException();

    if (Array.isArray(pdfLink.configs))
      pdfLink.configs = user // find the user specific config: order matters
        ? pdfLink.configs.find(e => !e.users?.length || e.users.includes(user?.email))
        : pdfLink.configs.find(e => !e.users?.length);

    if (!pdfLink.configs) throw new ForbiddenException();

    const users = pdfLink.configs.users?.map(e => e.trim()).filter(e => e);
    if (users?.length && !user)
      throw new ForbiddenException();

    if (users?.length && !users.includes(user?.email))
      throw new UnauthorizedException();

    pdfDoc = await this.service.readPDFDoc({
      user: { id: pdfLink.user_id },
      id: pdfLink.pdf_doc_id,
    });
    pdfDoc.id = id;

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
