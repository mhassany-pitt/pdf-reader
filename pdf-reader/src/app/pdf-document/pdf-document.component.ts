import { of } from 'rxjs';
import { encode } from 'base-64';
import { Component, NgZone, OnInit } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { ActivatedRoute, Router } from '@angular/router';
import { environment } from 'src/environments/environment';
import { PDFDocumentService } from './pdf-document.service';
import { PdfStorage } from '../pdfjs-tools/pdf-storage';
import { PdfTextExtractor } from '../pdfjs-tools/pdf-text-extractor';
import { HttpClient } from '@angular/common/http';
import { getUserId, loadPlugin, scrollTo } from '../pdfjs-tools/pdf-utils';
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
import { PdfMoveAnnotation } from '../pdfjs-tools/pdf-move-annotation';
import { PdfNoteToolbarBtn } from '../pdfjs-tools/pdf-note-toolbar-btn';
import { PdfTextToolbarBtn } from '../pdfjs-tools/pdf-text-toolbar-btn';
import { PdfNoteEditor } from '../pdfjs-tools/pdf-note-editor';
import { PdfTextEditor } from '../pdfjs-tools/pdf-text-editor';
import { PdfNoteViewer } from '../pdfjs-tools/pdf-note-viewer';
import { PdfTextViewer } from '../pdfjs-tools/pdf-text-viewer';
import { PdfRemoveOnDelete } from '../pdfjs-tools/pdf-remove-on-delete';
import { PdfShowBoundary } from '../pdfjs-tools/pdf-show-boundary';
import { PdfFreeformToolbarBtn } from '../pdfjs-tools/pdf-freeform-toolbar-btn';
import { PdfEmbedToolbarBtn } from '../pdfjs-tools/pdf-embed-toolbar-btn';
import { PdfAddToOutlineToolbarBtn } from '../pdfjs-tools/pdf-add-to-outline-toolbar-btn';
import { PdfFreeformViewer } from '../pdfjs-tools/pdf-freeform-viewer';
import { PdfFreeformEditor } from '../pdfjs-tools/pdf-freeform-editor';
import { PdfEmbedViewer } from '../pdfjs-tools/pdf-embed-viewer';
import { PdfEmbedEditor } from '../pdfjs-tools/pdf-embed-editor';
import { PdfAddToOutlineEditor } from '../pdfjs-tools/pdf-add-to-outline-editor';
import { PdfLoadCustomPlugins } from '../pdfjs-tools/pdf-load-custom-plugins';
import { PdfILogger } from '../pdfjs-tools/pdf-ilogger';
import { PdfDeleteToolbarBtn } from '../pdfjs-tools/pdf-delete-toolbar-btn';
import { PdfDelete } from '../pdfjs-tools/pdf-delete';
import { PdfFilterToolbarBtn } from '../pdfjs-tools/pdf-filter-toolbar-btn';
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

  registry: PdfRegistry = null as any;

  tt = {};
  rndom = 0;
  newfile: any;
  updating = false;
  outlineRefMapping = {};
  textExtractionProgress: any = undefined;

  pdfDocument: any;
  get pdfDocumentId() { return (this.route.snapshot.params as any).id; }


  constructor(
    private http: HttpClient,
    private router: Router,
    private ngZone: NgZone,
    private route: ActivatedRoute,
    private service: PDFDocumentService,
    private title: Title,
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

    // ensure pdfjs is initialized
    await this.pdfjs.initializedPromise;
    this.removeExtraElements();

    this.registry = new PdfRegistry({ iframe: this.iframe, pdfjs: this.pdfjs });
    const registry = this.registry;
    registry.register('http', this.http);
    registry.register('pdfDocId', this.pdfDocument.id);
    registry.register('userId', await getUserId(this.route));

    // init with default configs
    this.registry.register('configs.ilogger', PdfILogger.defaultConfigs());
    this.registry.register('configs.storage', PdfStorage.defaultConfigs());
    this.registry.register('configs.highlight', PdfHighlighterToolbarBtn.defaultConfigs());
    this.registry.register('configs.underline', PdfUnderlineToolbarBtn.defaultConfigs());
    this.registry.register('configs.strikethrough', PdfStrikeThourghToolbarBtn.defaultConfigs());
    this.registry.register('configs.highlight-note', PdfHighlightNoteEditor.defaultConfigs());
    this.registry.register('configs.note', PdfNoteToolbarBtn.defaultConfigs());
    this.registry.register('configs.text', PdfTextToolbarBtn.defaultConfigs());
    this.registry.register('configs.freeform', PdfFreeformToolbarBtn.defaultConfigs());
    this.registry.register('configs.embed', PdfEmbedToolbarBtn.defaultConfigs());
    this.registry.register('configs.delete', PdfDeleteToolbarBtn.defaultConfigs());

    this.registry.register(`configs.default.plugins`, () => PdfLoadCustomPlugins.defaultConfigs());
    this.registry.register(`configs.default.filter`, () => PdfFilterToolbarBtn.defaultConfigs());

    new PdfILogger({ registry });
    new PdfStorage({ registry });

    new PdfAnnotationLayer({ registry });
    new PdfToolbar({ registry });

    new PdfRemoveOnDelete({ registry });
    new PdfShowBoundary({ registry });
    new PdfMoveAnnotation({ registry });

    new PdfHighlightViewer({ registry });
    new PdfHighlighter({ registry });
    new PdfHighlighterToolbarBtn({ registry });

    new PdfUnderlineToolbarBtn({ registry });
    new PdfStrikeThourghToolbarBtn({ registry });

    new PdfHighlightNoteEditor({ registry });
    new PdfHighlightNoteViewer({ registry });

    registry.get('toolbar').addSeparator();

    new PdfNoteViewer({ registry });
    new PdfTextViewer({ registry });

    new PdfNoteEditor({ registry });
    new PdfTextEditor({ registry });

    new PdfNoteToolbarBtn({ registry });
    new PdfTextToolbarBtn({ registry });

    registry.get('toolbar').addSeparator();

    new PdfFreeformViewer({ registry });
    new PdfFreeformEditor({ registry });

    new PdfEmbedViewer({ registry });
    new PdfEmbedEditor({ registry });

    new PdfFreeformToolbarBtn({ registry });
    new PdfEmbedToolbarBtn({ registry });

    registry.get('toolbar').addSeparator();

    new PdfDelete({ registry });
    new PdfDeleteToolbarBtn({ registry });

    registry.register('add-to-outline', ($event, payload) => this.ngZone.run(() => this.addToOutline($event, payload)))
    new PdfAddToOutlineEditor({ registry });
    new PdfAddToOutlineToolbarBtn({ registry });

    try {
      await this.pdfjs.open({ url: this.getFileURL(), withCredentials: true });
    } catch (exp) { console.error(exp); }

    this.pdfjs.eventBus.on('fileinputchange', ($event) => this.ngZone.run(() => {
      const files = $event.source.files;
      this.newfile = files.length ? $event.source.files[0] : null;
      this.pdfDocument.file_url = null;
      setTimeout(() => this.confirmOutlineExtraction(), 1000);
    }));
  }

  async locateTexts() {
    this.registry.get('storage').enabled = false;
    delete this.tt['show-share-dialog'];
    new PdfTextExtractor({ iframe: this.iframe, pdfjs: this.pdfjs })
      .extractTextBounds({
        progress: (percentage: number) => {
          this.ngZone.run(() => this.textExtractionProgress = `${(percentage * 100).toFixed(0)}%`);
        },
        then: (pageTexts: any) => {
          this.ngZone.run(() => {
            this.registry.get('storage').enabled = true;
            this.textExtractionProgress = `Texts were extracted for ${this.pdfjs.pagesCount} pages.`;
            setTimeout(() => this.textExtractionProgress = undefined, 3000);
            this.service.updateTextLocations(this.pdfDocumentId, pageTexts).subscribe();
          });
        }
      });

    await this.pdfjs.open({ url: this.getFileURL(), withCredentials: true });
  }

  addOutlineEntry(entry: any) {
    this.pdfDocument.outline.push({
      id: Math.max(...this.pdfDocument.outline.map(e => e.id), 0) + 1,
      ...entry,
    });
  }

  removeOutlineEntry(entry: any) {
    const outline = this.pdfDocument.outline;
    outline.splice(outline.indexOf(entry), 1);
  }

  updateEntryLevel(entry: any, change: number) {
    entry.level = Math.min(Math.max(0, (entry.level || 0) + change), 5);
  }

  addToOutline($event: any, { selection, rects }) {
    const title = selection.toString().trim();
    if (!title) return;

    const page = Object.keys(rects).map(k => parseInt(k)).sort()[0];
    const { top, left } = rects[page][0];
    this.addOutlineEntry({ level: 0, title, page, top, left });

    selection.removeAllRanges();
    setTimeout(() => document.getElementById(`outline-title-${this.pdfDocument.outline.length - 1}`)?.focus(), 0);
  }

  async confirmOutlineExtraction() {
    const outline = await this.pdfjs.pdfDocument.getOutline();
    if (outline?.length) this.confirm.confirm({
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
      setTimeout(() => this.confirmOutlineExtraction(), 1000);
    } catch (exp) { console.error(exp); }
  }

  private removeExtraElements() {
    const documentEl = this.window.document;
    documentEl.getElementById('openFile').style.display = 'none';
    documentEl.getElementById('secondaryOpenFile').style.display = 'none';
  }

  loadPlugin(el: any) {
    const respond = (message: string) => this.ngZone.run(() => {
      delete this.tt['custom_plugin'];
      this.tt['custom_plugin_msg'] = message;
      setTimeout(() => delete this.tt['custom_plugin_msg'], 3000);
    });

    loadPlugin({
      url: el.value,
      registry: this.registry,
      loaded: () => respond('custom plugin loaded.'),
      failed: () => respond('failed to load custom plugin.'),
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

// registry.register('baseHref', document.querySelector('base')?.href);