import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ensureDirSync, readFileSync, writeFileSync } from 'fs-extra';
import { storageRoot, toObject } from 'src/utils';
import { InjectModel } from '@nestjs/mongoose';
import { PDFDocument } from './pdf-document.schema';
import { Model } from 'mongoose';
import { PDFFile } from './pdf-file.schema';

@Injectable()
export class PDFDocumentsService {

  constructor(
    private config: ConfigService,
    @InjectModel('pdf-files') private pdfFiles: Model<PDFFile>,
    @InjectModel('pdf-documents') private pdfDocs: Model<PDFDocument>
  ) {
    ensureDirSync(storageRoot(this.config, 'pdf-files'));
  }

  async upload(fileId: string, file: any) {
    const { originalname, size, buffer } = file;
    if (fileId) {
      await this.pdfFiles.updateOne({ _id: fileId }, { $set: { originalname, size } });
    } else {
      fileId = (await this.pdfFiles.create({ originalname, size }))._id.toString();
    }
    writeFileSync(storageRoot(this.config, 'pdf-files', fileId), buffer, { flag: 'w' });
    return fileId;
  }

  download(id: any, pathOnly?: boolean) {
    const path = storageRoot(this.config, 'pdf-files', id);
    return pathOnly ? path : readFileSync(path);
  }

  async list() {
    const list = await this.pdfDocs.find();
    return list.map(toObject);
  }

  async create(file: any) {
    return toObject(await this.pdfDocs.create({
      file_id: await this.upload(null, file),
      created_at: new Date().toISOString(),
      modified_at: new Date().toISOString(),
    }));
  }

  async update(id: string, document: any) {
    await this.pdfDocs.updateOne({ _id: id }, {
      $set: { modified_at: new Date().toISOString(), ...document }
    });
    return this.read(id);
  }

  async read(id: string) {
    return toObject(await this.pdfDocs.findOne({ _id: id }));
  }
}
