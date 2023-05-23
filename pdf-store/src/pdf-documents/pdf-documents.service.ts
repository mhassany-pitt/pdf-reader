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

  async list({ user }) {
    const list = await this.pdfDocs.find({ owner_id: user.id });
    return list.map(toObject);
  }

  async create({ user, file }) {
    return toObject(await this.pdfDocs.create({
      owner_id: user.id,
      file_id: await this.upload({ user, file, fileId: null }),
      created_at: new Date().toISOString(),
      modified_at: new Date().toISOString(),
    }));
  }

  async read({ user, id }) {
    return toObject(await this.pdfDocs.findOne({ owner_id: user.id, _id: id }));
  }

  async update({ user, id, document }) {
    await this.pdfDocs.updateOne({ owner_id: user.id, _id: id }, {
      $set: { modified_at: new Date().toISOString(), ...document }
    });
    return this.read({ user, id });
  }

  async upload({ user, fileId, file }) {
    const { originalname, size, buffer } = file;
    if (fileId) {
      await this.pdfFiles.updateOne({ owner_id: user.id, _id: fileId }, { $set: { originalname, size } });
    } else {
      fileId = (await this.pdfFiles.create({ owner_id: user.id, originalname, size }))._id.toString();
    }
    writeFileSync(storageRoot(this.config, 'pdf-files', fileId), buffer, { flag: 'w' });
    return fileId;
  }

  download({ id, pathOnly }) {
    const path = storageRoot(this.config, 'pdf-files', id);
    return pathOnly ? path : readFileSync(path);
  }
}
