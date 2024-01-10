import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { ensureDirSync } from 'fs-extra';
import { storageRoot, toObject } from 'src/utils';
import { PDFDocumentLink } from './pdf-document-link.schema';
import { Model } from 'mongoose';

@Injectable()
export class PDFDocumentLinksService {

  constructor(
    private config: ConfigService,
    @InjectModel('pdf-document-links') private pdfDocLinks: Model<PDFDocumentLink>
  ) { }

  async list({ user, pdfDocId }) {
    const list = await this.pdfDocLinks.find({
      user_id: user.id,
      pdf_doc_id: pdfDocId
    });
    return list.map(toObject);
  }

  async create({ user, pdfDocId, configs }) {
    return toObject(await this.pdfDocLinks.create({
      user_id: user.id,
      pdf_doc_id: pdfDocId,
      title: '',
      archived: false,
      published: false,
      configs,
      created_at: new Date().toISOString(),
    }));
  }

  async read({ user, id }) {
    const filter: any = { _id: id };
    if (user) filter.user_id = user.id;
    return toObject(await this.pdfDocLinks.findOne(filter));
  }

  async update({ user, id, pdfLink }) {
    delete pdfLink.user_id;
    delete pdfLink.pdf_doc_id;
    delete pdfLink.created_at;

    await this.pdfDocLinks.updateOne(
      { user_id: user.id, _id: id },
      { $set: { ...pdfLink } }
    );
    return this.read({ user, id });
  }
}
