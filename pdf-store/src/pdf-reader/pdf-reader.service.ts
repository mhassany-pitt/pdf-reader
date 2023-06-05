import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { PDFDocumentLink } from 'src/pdf-document-links/pdf-document-link.schema';
import { PDFDocument } from 'src/pdf-documents/pdf-document.schema';
import { storageRoot, toObject } from 'src/utils';

@Injectable()
export class PDFReaderService {

  constructor(
    private config: ConfigService,
    @InjectModel('pdf-documents') private pdfDocs: Model<PDFDocument>,
    @InjectModel('pdf-document-links') private pdfDocLinks: Model<PDFDocumentLink>
  ) { }

  async readPDFDoc({ user, id }) {
    return toObject(await this.pdfDocs.findOne({ user_id: user.id, _id: id }));
  }

  async readPDFLink({ id }) {
    return toObject(await this.pdfDocLinks.findOne({ _id: id }));
  }

  getFilePath({ id }) {
    return storageRoot(this.config, 'pdf-files', id);
  }
}
