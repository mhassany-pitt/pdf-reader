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
    @InjectModel('pdf-document-links') private pdfDocShares: Model<PDFDocumentLink>
  ) {
    ensureDirSync(storageRoot(this.config, 'pdf-document-links'));
  }

  async list(pdfDocId: string) {
    const list = await this.pdfDocShares.find({ pdf_doc_id: pdfDocId });
    return list.map(toObject);
  }

  async create(pdfDocId: string, body: any) {
    return toObject(await this.pdfDocShares.create({
      ...body,
      pdf_doc_id: pdfDocId,
      created_at: new Date().toISOString()
    }));
  }

  async publish(id: string, published: boolean) {
    await this.pdfDocShares.updateOne({ _id: id }, { $set: { published } });
  }

  async read(id: string) {
    return toObject(await this.pdfDocShares.findOne({ _id: id }));
  }

  async update(id: string, share: any) {
    await this.pdfDocShares.updateOne({ _id: id }, { $set: { ...share } });
    return this.read(id);
  }
}
