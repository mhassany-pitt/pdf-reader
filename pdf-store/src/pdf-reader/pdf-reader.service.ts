import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { ensureDirSync, readFileSync } from 'fs-extra';
import { Model } from 'mongoose';
import { PDFDocument } from 'src/pdf-documents/pdf-document.schema';
import { PDFFile } from 'src/pdf-documents/pdf-file.schema';
import { storageRoot, toObject } from 'src/utils';

@Injectable()
export class PDFReaderService {

  constructor(
    private config: ConfigService,
    @InjectModel('pdf-files') private pdfFiles: Model<PDFFile>,
    @InjectModel('pdf-documents') private pdfDocs: Model<PDFDocument>
  ) {
    ensureDirSync(storageRoot(this.config, 'pdf-files'));
  }

  download(id: any, pathOnly?: boolean) {
    const path = storageRoot(this.config, 'pdf-files', id);
    return pathOnly ? path : readFileSync(path);
  }

  async read(id: string) {
    return toObject(await this.pdfDocs.findOne({ _id: id }));
  }
}