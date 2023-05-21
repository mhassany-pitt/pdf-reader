import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v4 as uuid4, validate } from 'uuid';
import {
  existsSync, ensureDirSync, readFileSync,
  writeFileSync, writeJsonSync, readJsonSync,
  readdirSync
} from 'fs-extra';

@Injectable()
export class PDFDocumentsService {

  constructor(
    private config: ConfigService,
  ) {
    ensureDirSync(this.root('pdf-documents'));
    ensureDirSync(this.root('upload-files'));
  }

  root(...path: string[]) {
    return this.config.get('STORAGE') + (path ? '/' + path.join('/') : '');
  }

  upload(id: string, file: any) {
    const { originalname, size, buffer } = file;
    if (!id) id = uuid4();
    writeFileSync(this.root('upload-files', id), buffer, { flag: 'w' });
    writeJsonSync(this.root('upload-files', id + '-info'), { originalname, size }, { flag: 'w' });
    return id;
  }

  download(id: any, pathOnly?: boolean) {
    const path = this.root('upload-files', id);
    return pathOnly ? path : readFileSync(path);
  }

  list() {
    return readdirSync(this.root('pdf-documents')).filter(document => validate(document));
  }

  create(file: any) {
    const document = {
      id: uuid4(),
      file_id: this.upload(null, file),
      created_at: new Date().toISOString(),
      modified_at: new Date().toISOString(),
    };

    writeJsonSync(this.root('pdf-documents', document.id), document);

    return document;
  }

  write(id: string, document: any) {
    document.id = id;
    document.modified_at = new Date().toISOString();
    writeJsonSync(this.root('pdf-documents', id), document);

    return document;
  }

  exists(id: string) {
    return validate(id) && existsSync(this.root('pdf-documents', id));
  }

  read(id: string) {
    if (!this.exists(id))
      return null;

    return readJsonSync(this.root('pdf-documents', id));
  }
}
