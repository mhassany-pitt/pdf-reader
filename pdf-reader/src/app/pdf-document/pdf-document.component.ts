import { Component, NgZone, OnInit, ViewChild } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { ActivatedRoute, Router } from '@angular/router';
import { of } from 'rxjs';
import { environment } from 'src/environments/environment';
import { PDFDocumentService } from './pdf-document.service';
import { Annotation, AnnotationStorage } from '../pdfjs-tools/annotator-storage';
import { Annotator } from '../pdfjs-tools/annotator';
import { FreeformAnnotator } from '../pdfjs-tools/freeform-annotator';
import { EmbedResource } from '../pdfjs-tools/embed-resource';
import { FreeformViewer } from '../pdfjs-tools/freeform-viewer';
import { AddTextSelectionToOutline, Entry } from './add-textselection-to-outline';
import { EmbeddedResourceViewer } from '../pdfjs-tools/embedded-resource-viewer';
import { EnableElemMovement } from '../pdfjs-tools/enable-elem-movement';
import { TextLocator } from '../pdfjs-tools/text-locator';
import { HttpClient } from '@angular/common/http';
import { loadPlugin, scrollTo } from '../pdfjs-tools/pdfjs-utils';
import { AppService } from '../app.service';
import { encode } from 'base-64';
// import { HelperAnnotator } from '../pdfjs-customplugins/helper-annotator';

@Component({
  selector: 'app-pdf-document',
  templateUrl: './pdf-document.component.html',
  styleUrls: ['./pdf-document.component.less']
})
export class PDFDocumentComponent implements OnInit {

  iframe: any;
  window: any;
  pdfjs: any;

  newfile: any;
  pdfDocument: any;

  storage: AnnotationStorage<Annotation> = null as any;
  annotator: Annotator = null as any;

  textExtractionProgress: any = undefined;

  baseHref = document.querySelector('base')?.href;
  updating = false;

  tt = {};

  get pdfDocumentId() {
    return (this.route.snapshot.params as any).id;
  }

  constructor(
    private http: HttpClient,
    private router: Router,
    private ngZone: NgZone,
    private route: ActivatedRoute,
    private service: PDFDocumentService,
    private title: Title,
    private app: AppService,
  ) { }

  ngOnInit(): void {
    this.service.get(this.pdfDocumentId).subscribe({
      next: (pdfDocument: any) => {
        if (!pdfDocument.tags) pdfDocument.tags = [];
        if (!pdfDocument.outline) pdfDocument.outline = [];

        this.pdfDocument = pdfDocument;

        this.updateTitle();
        this.prepare();
      }
    });
  }

  updateTitle() {
    this.title.setTitle(`Document: ${this.pdfDocument.title || 'unnamed'}`);
  }

  getShareDialogTitle(title) {
    return `Share "${title || 'PDF Document'}"`;
  }

  onDocumentLoad(iframe, $event) {
    this.iframe = iframe;
    this.prepare();
  }

  getFileURL() {
    const doc = this.pdfDocument;
    return doc.file_url
      ? `${environment.apiUrl}/load-remote-pdf/${encode(doc.file_url)}`
      : `${environment.apiUrl}/pdf-documents/${doc.id}/file?_hash=${doc.file_hash}`;
  }

  async prepare() {
    if (!this.pdfDocument || !this.iframe)
      return;

    this.window = this.iframe.contentWindow;
    this.pdfjs = this.window.PDFViewerApplication;
    this.removeExtraElements();

    // load annotations first so can be rendered on document load
    const storage = new AnnotationStorage({
      user: () => this.app.user,
      api: `${environment.apiUrl}/annotations`,
      http: this.http,
      groupId: this.pdfDocumentId,
    });
    this.storage = storage;
    await storage.load();

    try {
      await this.pdfjs.open({ url: this.getFileURL(), withCredentials: true });
    } catch (exp) { console.error(exp); }

    this.pdfjs.eventBus.on('fileinputchange', ($event) => this.ngZone.run(() => {
      const files = $event.source.files;
      this.newfile = files.length ? $event.source.files[0] : null;
      this.pdfDocument.file_url = null;
    }));

    const iframe = this.iframe;
    const pdfjs = this.pdfjs;
    const baseHref = this.baseHref;
    const annotator = new Annotator({
      baseHref, iframe, pdfjs, storage, configs: {
        highlight: true, underline: true, linethrough: true, redact: true, notes: true,
        annotation_colors: '#ffd400,#ff6563,#5db221,#2ba8e8,#a28ae9,#e66df2,#f29823,#aaaaaa,black',
      }
    });
    this.annotator = annotator;
    const freeformViewer = new FreeformViewer({
      baseHref, iframe, pdfjs,
      storage, annotator, configs: { resize: true }
    });
    new FreeformAnnotator({
      baseHref, iframe, pdfjs,
      storage, annotator, freeformViewer, configs: {
        freeform_stroke_sizes: 'Thin-1,Normal-3,Thick-5',
        freeform_colors: '#ffd400,#ff6563,#5db221,#2ba8e8,#a28ae9,#e66df2,#f29823,#aaaaaa,black',
      }
    });
    const embedLinkViewer = new EmbeddedResourceViewer({
      baseHref, iframe, pdfjs,
      storage, annotator, configs: { resize: true }
    });
    new EmbedResource({
      baseHref, iframe, pdfjs,
      storage, annotator, embedLinkViewer
    });
    new EnableElemMovement({ iframe, embedLinkViewer, freeformViewer, storage });

    new AddTextSelectionToOutline({
      iframe, annotator, addToOutline: (selection, $event) =>
        this.ngZone.run(() => this.addToOutline(selection, $event))
    });

    // TODO: for development only --
    // new HelperAnnotator({ iframe, pdfjs, storage, annotator });
  }

  async locateTexts() {
    delete this.tt['share'];
    await this.pdfjs.open({ url: this.getFileURL(), withCredentials: true });
    new TextLocator({ iframe: this.iframe, pdfjs: this.pdfjs })
      .extractTextBounds({
        progress: (percentage: number) => {
          this.ngZone.run(() => this.textExtractionProgress = `${(percentage * 100).toFixed(0)}%`);
        },
        then: (pageTexts: any) => {
          this.ngZone.run(() => {
            this.textExtractionProgress = `Texts (including their location) were extracted for ${this.pdfjs.pagesCount} pages.`;
            setTimeout(() => this.textExtractionProgress = undefined, 3000);
          });
          this.service.updateTextLocations(this.pdfDocumentId, pageTexts).subscribe();
        }
      });
  }

  add(entry: Entry) {
    this.pdfDocument.outline.push(entry);
  }

  remove(entry: Entry) {
    const outline = this.pdfDocument.outline;
    outline.splice(outline.indexOf(entry), 1);
  }

  level(entry: Entry, change: number) {
    entry.level = Math.min(Math.max(0, (entry.level || 0) + change), 5);
  }

  addToOutline(selection: any, $event: any) {
    let { top, left, width, height } = selection.getRangeAt(0).getBoundingClientRect();
    const textLayer = selection.anchorNode.parentElement.closest(`.pdfViewer .textLayer`);
    const page = parseInt(textLayer.parentElement.getAttribute('data-page-number'));
    const bound = textLayer.getBoundingClientRect();

    // relative % to parent
    top = (top - bound.top) / bound.height;
    left = (left - bound.left) / bound.width;
    width /= bound.width;
    height /= bound.height;

    const title = selection.toString().trim();
    const level = 0;

    if (!title)
      return;

    this.add({ level, title, page, top, left, width, height });

    selection.removeAllRanges();
    setTimeout(() => document.getElementById(`outline-title-${this.pdfDocument.outline.length - 1}`)?.focus(), 0);
  }

  scrollToEntry(entry: any) {
    scrollTo(this.window.document, this.pdfjs, entry);
  }

  selectFile($event) {
    this.pdfjs.appConfig.openFileInput.click();
  }

  fileUrlChanged($event) {
    this.pdfjs.open({ url: this.getFileURL(), withCredentials: true });
  }

  private removeExtraElements() {
    const documentEl = this.window.document;
    documentEl.getElementById('openFile').style.display = 'none';
    documentEl.getElementById('secondaryOpenFile').style.display = 'none';
  }

  loadPlugin(el: any) {
    loadPlugin({
      url: el.value,
      iframe: this.iframe,
      pdfjs: this.pdfjs,
      storage: this.storage,
      annotator: this.annotator,
      loaded: () => {
        this.ngZone.run(() => {
          delete this.tt['custom_plugin'];
          this.tt['custom_plugin_msg'] = 'custom plugin loaded.';
          setTimeout(() => delete this.tt['custom_plugin_msg'], 3000);
        });
      },
      failed: () => { },
    });
  }

  cancel() {
    this.router.navigate(['/pdf-documents']);
  }

  update() {
    this.updating = true;
    (this.newfile // upload file
      ? this.service.upload(this.pdfDocumentId, this.newfile)
      : of({})
    ).subscribe({  // update document
      next: (resp: any) => {
        this.service.update(this.pdfDocument).subscribe({
          next: (resp: any) => this.router.navigate(['/pdf-documents'])
        })
      },
      complete: () => this.updating = false,
    })
  }
}
