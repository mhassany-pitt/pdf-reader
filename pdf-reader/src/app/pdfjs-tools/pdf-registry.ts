export class PdfRegistry {

  private window: any;
  private document: any;
  private documentEl: any;
  private pdfjs: any;
  private internal: { [key: string]: any } = {};

  constructor({ iframe, pdfjs }) {
    this.window = iframe?.contentWindow;
    this.document = iframe?.contentDocument;
    this.documentEl = this.document.documentElement;
    this.pdfjs = pdfjs;
  }

  getWindow() { return this.window; }
  getDocument() { return this.document; }
  getDocumentEl() { return this.documentEl; }
  getPdfJS() { return this.pdfjs; }

  register(key: string, value: any) {
    this.internal[key] = value;
  }

  unregister(key: string) {
    delete this.internal[key];
  }

  get(key: string) {
    return this.internal[key];
  }

  list(prefix: string) {
    return Object.keys(this.internal).filter(key => key.startsWith(prefix));
  }
}
