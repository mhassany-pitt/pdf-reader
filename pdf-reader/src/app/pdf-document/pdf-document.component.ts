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
import { ConfirmationService } from 'primeng/api';
import { PdfToolbar } from '../pdfjs-tools/pdf-toolbar';
import { PdfRegistry } from '../pdfjs-tools/pdf-registry';
import { PdfHighlighter } from '../pdfjs-tools/pdf-highlighter';
import { PdfHighlightViewer } from '../pdfjs-tools/pdf-highlight-viewer';
import { PdfAnnotationLayer } from '../pdfjs-tools/pdf-annotation-layer';
import { PdfHighlighterToolbarBtn } from '../pdfjs-tools/pdf-highlighter-toolbar-btn';
import { PdfStrikeThourghToolbarBtn } from '../pdfjs-tools/pdf-strikethrough-toolbar-btn';
import { PdfUnderlineToolbarBtn } from '../pdfjs-tools/pdf-underline-toolbar-btn';
import { PdfHighlightNoteEditor } from '../pdfjs-tools/pdf-highlight-note-editor';
import { PdfHighlightNoteViewer } from '../pdfjs-tools/pdf-highlight-note-viewer';
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

  updating = false;

  outlineRefMapping = {};
  tt = {};

  get pdfDocumentId() { return (this.route.snapshot.params as any).id; }

  rndom = 0;

  constructor(
    private http: HttpClient,
    private router: Router,
    private ngZone: NgZone,
    private route: ActivatedRoute,
    private service: PDFDocumentService,
    private title: Title,
    private app: AppService,
    private confirm: ConfirmationService,
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
    this.pdfjs.preferences.set('sidebarViewOnLoad', 0);
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

      this.confirmOutlineExtraction();
    }));

    const registry = new PdfRegistry({ iframe: this.iframe, pdfjs: this.pdfjs });
    // registry.register('baseHref', document.querySelector('base')?.href);
    registry.register('storage', storage);

    new PdfAnnotationLayer({ registry });
    new PdfToolbar({ registry });

    new PdfHighlightViewer({ registry });
    new PdfHighlighter({ registry });
    new PdfHighlighterToolbarBtn({ registry });

    new PdfUnderlineToolbarBtn({ registry });
    new PdfStrikeThourghToolbarBtn({ registry });

    new PdfHighlightNoteEditor({ registry });
    new PdfHighlightNoteViewer({ registry });

    // const baseHref = document.querySelector('base')?.href
    // const iframe = this.iframe;
    // const pdfjs = this.pdfjs;

    // const annotator = new Annotator({
    //   baseHref, iframe, pdfjs, storage, toolbar, configs: {
    //     highlight: true, underline: true, linethrough: true, redact: true, notes: true,
    //     annotation_colors: '#ffd400,#ff6563,#5db221,#2ba8e8,#a28ae9,#e66df2,#f29823,#aaaaaa,black',
    //   }
    // });
    // this.annotator = annotator;
    // const freeformViewer = new FreeformViewer({
    //   baseHref, iframe, pdfjs,
    //   storage, annotator, configs: { resize: true }
    // });
    // new FreeformAnnotator({
    //   baseHref, iframe, pdfjs,
    //   storage, annotator, freeformViewer, configs: {
    //     freeform_stroke_sizes: 'Thin-1,Normal-3,Thick-5',
    //     freeform_colors: '#ffd400,#ff6563,#5db221,#2ba8e8,#a28ae9,#e66df2,#f29823,#aaaaaa,black',
    //   }
    // });
    // const embedLinkViewer = new EmbeddedResourceViewer({
    //   baseHref, iframe, pdfjs,
    //   storage, annotator, configs: { resize: true }
    // });
    // new EmbedResource({
    //   baseHref, iframe, pdfjs,
    //   storage, annotator, embedLinkViewer
    // });
    // new EnableElemMovement({ iframe, embedLinkViewer, freeformViewer, storage });

    // new AddTextSelectionToOutline({
    //   iframe, annotator, addToOutline: (selection, $event) =>
    //     this.ngZone.run(() => this.addToOutline(selection, $event))
    // });

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

  addOutlineEntry(entry: Entry) {
    this.pdfDocument.outline.push({
      id: Math.max(...this.pdfDocument.outline.map(e => e.id), 0) + 1,
      ...entry,
    });
  }

  removeOutlineEntry(entry: Entry) {
    const outline = this.pdfDocument.outline;
    outline.splice(outline.indexOf(entry), 1);
  }

  updateEntryLevel(entry: Entry, change: number) {
    entry.level = Math.min(Math.max(0, (entry.level || 0) + change), 5);
  }

  addToOutline(selection: any, $event: any) {
    let { top, left } = selection.getRangeAt(0).getBoundingClientRect();
    const textLayer = selection.anchorNode.parentElement.closest(`.pdfViewer .textLayer`);
    const page = parseInt(textLayer.parentElement.getAttribute('data-page-number'));
    const bound = textLayer.getBoundingClientRect();

    // relative % to parent
    top = (top - bound.top) / bound.height;
    left = (left - bound.left) / bound.width;

    const title = selection.toString().trim();
    const level = 0;

    if (!title) return;

    this.addOutlineEntry({ level, title, page, top, left });

    selection.removeAllRanges();
    setTimeout(() => document.getElementById(`outline-title-${this.pdfDocument.outline.length - 1}`)?.focus(), 0);
  }

  async confirmOutlineExtraction() {
    const outline = await this.pdfjs.pdfDocument.getOutline();
    if (outline.length) this.confirm.confirm({
      header: 'Sync Outline?',
      message: 'This will overwrite the outline from the PDF document!',
      acceptLabel: 'Yes, Sure!',
      acceptButtonStyleClass: 'p-button-danger',
      accept: () => this.extractOutline()
    });
  }

  async extractOutline() {
    this.pdfDocument.outline = [];
    const outline = await this.pdfjs.pdfDocument.getOutline();
    for (const entry of (outline || []))
      await this.extractOutlineEntry(entry, 0);
  }

  async extractOutlineEntry({ title, dest, items }, level: number) {
    dest = await this.pdfjs.pdfDocument.getDestination(dest);
    this.addOutlineEntry({
      level,
      title: title,
      page: await this.pdfjs.pdfDocument.getPageIndex(dest[0]) + 1,
      dest,
    } as any);
    for (const subentry of (items || []))
      await this.extractOutlineEntry(subentry, level + 1);
  }

  manageOutlineEntry($event: any, i: number) {
    const outline = this.pdfDocument.outline,
      /* */ entry = outline[i];
    if ($event.code == 'Tab') {
      $event.preventDefault();
      this.updateEntryLevel(entry, $event.shiftKey ? -1 : 1);
    } else if ($event.code == 'ArrowUp' && i > 0) {
      this.focusEntryTitle(i - 1);
      if ($event.altKey) {
        $event.preventDefault();
        this.swapOutlineEntry(i, i - 1);
      }
    } else if ($event.code == 'ArrowDown' && i < outline.length - 1) {
      this.focusEntryTitle(i + 1);
      if ($event.altKey) {
        $event.preventDefault();
        this.swapOutlineEntry(i, i + 1);
      }
    }
  }

  focusEntryTitle(i: any) {
    setTimeout(() => document.getElementById('outline-entry-' + i)?.focus(), 0);
  }

  swapOutlineEntry(i, j) {
    const array = this.pdfDocument.outline;
    if (i >= 0 && j >= 0 && i < array.length && j < array.length) {
      this.rndom = Date.now();
      [i, j] = [Math.min(i, j), Math.max(i, j)]
      this.pdfDocument.outline = [
        ...array.slice(0, i),
        array[j], array[i],
        ...array.slice(j + 1)
      ];
    }
  }

  async scrollToEntry(entry: any) {
    scrollTo(this.window.document, this.pdfjs, entry);
  }

  selectFile($event) {
    this.pdfjs.appConfig.openFileInput.click();
  }

  async fileUrlChanged($event) {
    try {
      await this.pdfjs.open({ url: this.getFileURL(), withCredentials: true });
      this.confirmOutlineExtraction();
    } catch (exp) { console.error(exp); }
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
    });
  }
}