import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ensureDirSync, readFileSync, rm, writeFile, writeFileSync } from 'fs-extra';
import { storageRoot, toObject } from 'src/utils';
import { InjectModel } from '@nestjs/mongoose';
import { PDFDocument } from './pdf-document.schema';
import { Model } from 'mongoose';
import { PDFFile } from './pdf-file.schema';
import { PDFDocumentText } from '../pdf-document-texts/pdf-document-text.schema';
import { UsersService } from 'src/users/users.service';

@Injectable()
export class PDFDocumentsService {

  constructor(
    private config: ConfigService,
    @InjectModel('pdf-files') private pdfFiles: Model<PDFFile>,
    @InjectModel('pdf-documents') private pdfDocs: Model<PDFDocument>,
    @InjectModel('pdf-document-texts') private pdfTexts: Model<PDFDocumentText>,
    private users: UsersService,
  ) {
    ensureDirSync(storageRoot(this.config, 'pdf-files'));
    this._setMissingOwnerEmails();
  }
  private async _setMissingOwnerEmails() {
    // a temporary fix to set missing owner emails
    // TODO: remove this after next update
    const list = await this.pdfDocs.find({
      $or: [
        { owner_email: { $exists: false } },
        { owner_email: null }
      ]
    });
    for (const each of list) {
      const user = await this.users.findUserBy({ _id: each.user_id });
      await this.pdfDocs.updateOne({ _id: each._id }, { $set: { owner_email: user.email } });
    }
  }

  async list({ user, includeArchives }) {
    const filter: any = { $or: [{ user_id: user.id }, { collaborator_emails: user.email }] };
    if (includeArchives) {
      // nothing is necessary
    } else filter.archived = false;
    const list = await this.pdfDocs.find(filter);
    return list.map(toObject);
  }

  async create({ user }) {
    return toObject(await this.pdfDocs.create({
      archived: false,
      user_id: user.id,
      owner_email: user.email,
      file_id: '04accfd333c3ab5318808e0d', // default blank pdf
      created_at: new Date().toISOString(),
      modified_at: new Date().toISOString(),
    }));
  }

  async read({ user, id }) {
    return toObject(await this.pdfDocs.findOne({ $or: [{ user_id: user.id }, { collaborator_emails: user.email }], _id: id }));
  }

  async update({ user, id, pdfDoc }) {
    await this.pdfDocs.updateOne({ $or: [{ user_id: user.id }, { collaborator_emails: user.email }], _id: id }, {
      $set: { modified_at: new Date().toISOString(), ...pdfDoc }
    });
    return this.read({ user, id });
  }

  async upload({ user, fileId, file }) {
    const { originalname, size, buffer } = file;
    if (fileId) {
      await this.pdfFiles.deleteOne({ user_id: user.id, _id: fileId });
      await rm(storageRoot(this.config, 'pdf-files', fileId), { force: true });
    }
    fileId = (await this.pdfFiles.create({ user_id: user.id, originalname, size }))._id.toString();
    await writeFile(storageRoot(this.config, 'pdf-files', fileId), buffer, { flag: 'w' });
    return fileId;
  }

  getFilePath({ id }) {
    return storageRoot(this.config, 'pdf-files', id);
  }

  async updateTextLocations({ id, fileId, pageTexts }) {
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
    await this.pdfTexts.bulkWrite(texts);
  }
}
