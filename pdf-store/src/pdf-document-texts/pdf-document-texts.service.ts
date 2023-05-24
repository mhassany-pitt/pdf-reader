import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { PDFDocumentText } from './pdf-document-text.schema';
import { Model } from 'mongoose';
import { toObject } from 'src/utils';

@Injectable()
export class PDFDocumentTextsService {

  constructor(
    private config: ConfigService,
    @InjectModel('pdf-document-texts') private pdfTexts: Model<PDFDocumentText>
  ) { }

  async list({ pdfDocId, fileId, page }) {
    const filter: any = { pdf_doc_id: pdfDocId };
    if (fileId) filter.file_id = fileId;
    if (page) filter.page = page;
    const list = await this.pdfTexts.find(filter);
    return list.map(toObject);
  }
}
