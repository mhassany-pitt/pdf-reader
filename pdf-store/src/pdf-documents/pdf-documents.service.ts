import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ensureDirSync, readFileSync, writeFileSync } from 'fs-extra';
import { storageRoot, toObject } from 'src/utils';
import { InjectModel } from '@nestjs/mongoose';
import { PDFDocument } from './pdf-document.schema';
import { Model } from 'mongoose';
import { PDFFile } from './pdf-file.schema';
import { PDFDocumentText } from '../pdf-document-texts/pdf-document-text.schema';

@Injectable()
export class PDFDocumentsService {

  constructor(
    private config: ConfigService,
    @InjectModel('pdf-files') private pdfFiles: Model<PDFFile>,
    @InjectModel('pdf-documents') private pdfDocs: Model<PDFDocument>,
    @InjectModel('pdf-document-texts') private pdfTexts: Model<PDFDocumentText>,
  ) {
    ensureDirSync(storageRoot(this.config, 'pdf-files'));
  }

  async list({ user }) {
    const list = await this.pdfDocs.find({ user_id: user.id });
    return list.map(toObject);
  }

  async create({ user, file }) {
    return toObject(await this.pdfDocs.create({
      user_id: user.id,
      file_id: await this.upload({ user, file, fileId: null }),
      created_at: new Date().toISOString(),
      modified_at: new Date().toISOString(),
    }));
  }

  async read({ user, id }) {
    return toObject(await this.pdfDocs.findOne({ user_id: user.id, _id: id }));
  }

  async update({ user, id, pdfDoc }) {
    await this.pdfDocs.updateOne({ user_id: user.id, _id: id }, {
      $set: { modified_at: new Date().toISOString(), ...pdfDoc }
    });
    return this.read({ user, id });
  }

  async upload({ user, fileId, file }) {
    const { originalname, size, buffer } = file;
    if (fileId) {
      await this.pdfFiles.updateOne({ user_id: user.id, _id: fileId }, { $set: { originalname, size } });
    } else {
      fileId = (await this.pdfFiles.create({ user_id: user.id, originalname, size }))._id.toString();
    }
    writeFileSync(storageRoot(this.config, 'pdf-files', fileId), buffer, { flag: 'w' });
    return fileId;
  }

  getFilePath({ id }) {
    return storageRoot(this.config, 'pdf-files', id);
  }

  updateTextLocations({ id, fileId, pageTexts }) {
    const updated_at = new Date().toISOString();
    const texts = Object.keys(pageTexts)
      .map(page => ({
        pdf_doc_id: id,
        file_id: fileId,
        page: parseInt(page),
        texts: pageTexts[page],
        updated_at,
      }))
      .map(pageText => ({
        updateOne: {
          filter: {
            pdf_doc_id: pageText.pdf_doc_id,
            file_id: pageText.file_id,
            page: pageText.page
          },
          update: { $set: pageText },
          upsert: true
        }
      }));
    this.pdfTexts.bulkWrite(texts);
  }
}
