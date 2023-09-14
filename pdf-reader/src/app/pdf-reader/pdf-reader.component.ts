import { Component, NgZone, OnInit, ViewChild } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { ActivatedRoute, Router } from '@angular/router';
import { environment } from 'src/environments/environment';
import { PDFReaderService } from './pdf-reader.service';
import { PdfStorage } from '../pdfjs-tools/pdf-storage';
import { PdfILogger } from '../pdfjs-tools/pdf-ilogger';
import { HttpClient } from '@angular/common/http';
import { getUserId, scrollTo } from '../pdfjs-tools/pdf-utils';
import { PdfRegistry } from '../pdfjs-tools/pdf-registry';
import { PdfAnnotationLayer } from '../pdfjs-tools/pdf-annotation-layer';
import { PdfToolbar } from '../pdfjs-tools/pdf-toolbar';
import { PdfRemoveOnDelete } from '../pdfjs-tools/pdf-remove-on-delete';
import { PdfShowBoundary } from '../pdfjs-tools/pdf-show-boundary';
import { PdfMoveAnnotation } from '../pdfjs-tools/pdf-move-annotation';
import { PdfHighlightViewer } from '../pdfjs-tools/pdf-highlight-viewer';
import { PdfHighlighter } from '../pdfjs-tools/pdf-highlighter';
import { PdfHighlighterToolbarBtn } from '../pdfjs-tools/pdf-highlighter-toolbar-btn';
import { PdfUnderlineToolbarBtn } from '../pdfjs-tools/pdf-underline-toolbar-btn';
import { PdfStrikeThourghToolbarBtn } from '../pdfjs-tools/pdf-strikethrough-toolbar-btn';
import { PdfHighlightNoteEditor } from '../pdfjs-tools/pdf-highlight-note-editor';
import { PdfHighlightNoteViewer } from '../pdfjs-tools/pdf-highlight-note-viewer';
import { PdfNoteViewer } from '../pdfjs-tools/pdf-note-viewer';
import { PdfTextViewer } from '../pdfjs-tools/pdf-text-viewer';
import { PdfNoteEditor } from '../pdfjs-tools/pdf-note-editor';
import { PdfTextEditor } from '../pdfjs-tools/pdf-text-editor';
import { PdfNoteToolbarBtn } from '../pdfjs-tools/pdf-note-toolbar-btn';
import { PdfTextToolbarBtn } from '../pdfjs-tools/pdf-text-toolbar-btn';
import { PdfFreeformViewer } from '../pdfjs-tools/pdf-freeform-viewer';
import { PdfFreeformEditor } from '../pdfjs-tools/pdf-freeform-editor';
import { PdfEmbedViewer } from '../pdfjs-tools/pdf-embed-viewer';
import { PdfEmbedEditor } from '../pdfjs-tools/pdf-embed-editor';
import { PdfFreeformToolbarBtn } from '../pdfjs-tools/pdf-freeform-toolbar-btn';
import { PdfEmbedToolbarBtn } from '../pdfjs-tools/pdf-embed-toolbar-btn';
import { PdfLoadCustomPlugins } from '../pdfjs-tools/pdf-load-custom-plugins';

@Component({
  selector: 'app-pdf-reader',
  templateUrl: './pdf-reader.component.html',
  styleUrls: ['./pdf-reader.component.less']
})
export class PDFReaderComponent implements OnInit {

  @ViewChild('viewer') viewer: any;

  iframe: any;
  window: any;
  pdfjs: any;

  entry: any;

  baseHref = document.querySelector('base')?.href;

  get params() { return this.route.snapshot.params as any; }
  get qparams() { return this.route.snapshot.queryParams as any; }
  get sqparams() { // server query params
    const qparams = Object.keys(this.qparams)
      .filter(key => key.startsWith('s__'))
      .reduce((map, key) => {
        map[key] = this.qparams[key];
        return map;
      }, {});
    return Object.keys(qparams).length ? `?${new URLSearchParams(qparams)}` : '';
  }

  pdfDocument: any;
  get pdfDocumentId() { return this.params.id; }

  constructor(
    private router: Router,
    private http: HttpClient,
    private route: ActivatedRoute,
    private service: PDFReaderService,
    private title: Title,
    private ngZone: NgZone,
  ) { }

  ngOnInit(): void {
    this.reload();
  }

  private postMessage({ type, data }) {
    if (window.parent != window)
      window.parent.postMessage({ type, data }, '*');
  }

  private reload() {
    this.service.get(`${this.pdfDocumentId}${this.sqparams}`).subscribe({
      next: async (pdfDocument: any) => {
        if (!pdfDocument.tags) pdfDocument.tags = [];
        if (!pdfDocument.outline) pdfDocument.outline = [];

        this.pdfDocument = pdfDocument;
        this.postMessage({ type: 'pdf-info-loaded', data: this.pdfDocument });

        this.updateTitle();
        await this.prepare();
      },
      error: (error: any) => {
        if (error.status == 403)
          this.router.navigate(['/login']);
        else if (error.status == 401)
          this.router.navigate(['/unauthorized']);
        else if (error.status == 404)
          this.router.navigate(['/not-found']);
        else
          console.error(error);
      }
    });
  }

  updateTitle() {
    this.title.setTitle(`${this.pdfDocument.title || 'unnamed'}`);
  }

  onDocumentLoad(iframe, $event) {
    this.iframe = iframe;
    this.prepare();
  }

  async prepare() {
    if (!this.pdfDocument || !this.iframe)
      return;

    this.window = this.iframe.contentWindow;
    this.pdfjs = this.window.PDFViewerApplication;
    this.pdfjs.preferences.set('sidebarViewOnLoad', 0);
    this._removeExtraElements();

    const registry = new PdfRegistry({ iframe: this.iframe, pdfjs: this.pdfjs });
    registry.register('http', this.http);
    registry.register('pdfDocId', this.pdfDocument.id);
    registry.register('userId', await getUserId(this.route));

    const configs = this.pdfDocument.configs || {};
    for (const key of Object.keys(configs))
      registry.register(`configs.${key}`, configs[key]);

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
    new PdfNoteEditor({ registry });
    new PdfNoteToolbarBtn({ registry });

    new PdfTextViewer({ registry });
    new PdfTextEditor({ registry });
    new PdfTextToolbarBtn({ registry });

    registry.get('toolbar').addSeparator();

    new PdfFreeformViewer({ registry });
    new PdfFreeformEditor({ registry });
    new PdfFreeformToolbarBtn({ registry });

    new PdfEmbedViewer({ registry });
    new PdfEmbedEditor({ registry });
    new PdfEmbedToolbarBtn({ registry });

    new PdfLoadCustomPlugins({ registry });

    this._postPdfEventsToParent();
    this._listenToParentMessages();

    try {
      const url = `${environment.apiUrl}/pdf-reader/${this.pdfDocument.id}/file?_hash=${this.pdfDocument.file_hash}`;
      await this.pdfjs.open({ url, withCredentials: true });
      this.postMessage({ type: 'pdf-document-loaded', data: { url } });
    } catch (exp) { console.error(exp); }

    this._bindPageOutline();
    this._applyViewParams();
    this.postMessage({ type: 'pdf-ready', data: null });
  }

  private _applyViewParams() {
    const onDocumentLoad = ($event: any) => {
      this.pdfjs.eventBus.off('textlayerrendered', onDocumentLoad);

      // apply configs from query params OR viewer configs
      const view = this.pdfDocument.configs?.view || {};

      const zoom = this.qparams.zoom || view.zoom;
      if (zoom) this.pdfjs.pdfViewer.currentScale = zoom;

      const rotation = this.qparams.rotation || view.rotation;
      if (rotation) this.pdfjs.pdfViewer.pagesRotation = parseFloat(rotation);

      const section = this.qparams.section || view.section;
      if (section) {
        const entryIndex = !isNaN(section)
          ? parseInt(section) - 1
          : this.pdfDocument.outline.findIndex(
            (e: any) => e.title.toLowerCase() == section.toLowerCase());

        if (entryIndex >= 0 && entryIndex < this.pdfDocument.outline.length)
          this.scrollToEntry(this.pdfDocument.outline[entryIndex]);
      }

      const page = this.qparams.page || view.page;
      if (!section && page) {
        scrollTo(this.iframe.contentDocument, this.pdfjs, {
          page: parseInt(page),
          top: this.qparams.pagetop || view.pagetop || 0,
          left: this.qparams.pageleft || view.pageleft || 0
        });
      }

      const scrollmode = this.qparams.scrollmode || view.scrollmode;
      if (scrollmode) this.pdfjs.pdfViewer.scrollMode = parseInt(scrollmode);

      const spreadmode = this.qparams.spreadmode || view.spreadmode;
      if (spreadmode) this.pdfjs.pdfViewer.spreadMode = parseInt(spreadmode);
    };
    this.pdfjs.eventBus.on('textlayerrendered', onDocumentLoad);
  }

  private _bindPageOutline() {
    this.pdfjs.eventBus.on('pagechanging', ($event) => {
      const outline = [...this.pdfDocument.outline];
      for (const entry of outline.sort((a, b) => b.page - a.page))
        if (entry.page <= $event.pageNumber) {
          this.ngZone.run(() => this.entry = entry);
          break;
        }

      this.postMessage({ type: 'pdf-event', data: { type: 'pagechanging', page: $event.pageNumber } });
    });
  }

  private _removeExtraElements() {
    const documentEl = this.window.document;

    documentEl.getElementById('openFile').remove();
    documentEl.getElementById('secondaryOpenFile').remove();
    documentEl.getElementById('download').remove();
    documentEl.getElementById('secondaryDownload').remove();
    documentEl.getElementById('print').remove();
    documentEl.getElementById('secondaryPrint').remove();
    documentEl.getElementById('documentProperties').remove();

    const children = documentEl.getElementById('secondaryToolbarButtonContainer').children;
    children[0].remove();
    children[children.length - 1].remove();
  }

  async scrollToEntry(entry) {
    scrollTo(this.window.document, this.pdfjs, entry);
    this.postMessage({ type: 'navto-outline-entry', data: entry });
  }

  private _postPdfEventsToParent() {
    const $postMessage = (data) => this.postMessage({ type: 'pdf-event', data });
    const eb = this.pdfjs.eventBus;
    eb.on('find', ($ev) => {
      const { caseSensitive, entireWord, findPrevious,
        highlightAll, matchDiacritics, phraseSearch,
        query } = $ev;
      $postMessage({
        type: 'find',
        caseSensitive, entireWord, findPrevious,
        highlightAll, matchDiacritics, phraseSearch,
        query
      })
    });
    eb.on('currentoutlineitem',/*     */($ev) => $postMessage({ type: 'currentoutlineitem' }));
    eb.on('findbarclose',/*           */($ev) => $postMessage({ type: 'findbarclose' }));
    eb.on('outlineloaded',/*          */($ev) => $postMessage({ type: 'outlineloaded', outlineCount: $ev.outlineCount }));
    eb.on('pagenumberchanged',/*      */($ev) => $postMessage({ type: 'pagenumberchanged', value: $ev.value }));
    eb.on('presentationmodechanged',/**/($ev) => $postMessage({ type: 'presentationmodechanged', state: $ev.state }));
    eb.on('resize',/*                 */($ev) => $postMessage({ type: 'resize' }));
    eb.on('rotateccw',/*              */($ev) => $postMessage({ type: 'rotateccw' }));
    eb.on('rotatecw',/*               */($ev) => $postMessage({ type: 'rotatecw' }));
    eb.on('scalechanged',/*           */($ev) => $postMessage({ type: 'scalechanged', value: $ev.value }));
    eb.on('scrollmodechanged',/*      */($ev) => $postMessage({ type: 'scrollmodechanged', mode: $ev.mode }));
    eb.on('sidebarviewchanged',/*     */($ev) => $postMessage({ type: 'sidebarviewchanged', view: $ev.view }));
    eb.on('spreadmodechanged',/*      */($ev) => $postMessage({ type: 'spreadmodechanged', mode: $ev.mode }));
    eb.on('toggleoutlinetree',/*      */($ev) => $postMessage({ type: 'toggleoutlinetree' }));
    eb.on('zoomin',/*                 */($ev) => $postMessage({ type: 'zoomin' }));
    eb.on('zoomout',/*                */($ev) => $postMessage({ type: 'zoomout' }));

    // scroll event
    const vcontainer = this.window.document.getElementById('viewerContainer');
    let scrolltimeout: any = null;
    vcontainer.addEventListener('scroll', ($event: any) => {
      if (scrolltimeout) clearTimeout(scrolltimeout);
      const { scrollTop, scrollLeft, scrollWidth, scrollHeight } = vcontainer;
      scrolltimeout = setTimeout(() =>
        $postMessage({ type: 'scrol', scrollWidth, scrollHeight, scrollLeft, scrollTop })
        , 300);
    });
  }

  private _listenToParentMessages() {
    const ebus = this.pdfjs.eventBus;
    const viewer = this.pdfjs.pdfViewer;
    const sidebar = this.pdfjs.pdfSidebar;
    window.addEventListener('message', (event) => {
      // // IMPORTANT: check the origin of the data!
      // if (event.origin !== 'http://example.org:8080')
      //   return;
      const type = event.data.type;
      /**/ if (type == 'find')/*                  */ebus.dispatch('find', event.data);
      else if (type == 'changepagenumber')/*      */viewer.currentPageNumber = event.data.value;
      else if (type == 'changepresentationmode')/**/viewer.presentationMode = event.data.state;
      else if (type == 'rotateccw')/*             */viewer.pagesRotation -= 90;
      else if (type == 'rotatecw')/*              */viewer.pagesRotation += 90;
      else if (type == 'changescale')/*           */viewer.currentScaleValue = event.data.value;
      else if (type == 'changescrollmode')/*      */viewer.scrollMode = event.data.mode;
      else if (type == 'changesidebarview')/*     */sidebar.switchView(event.data.view);
      else if (type == 'changespreadmode')/*      */viewer.spreadMode = event.data.mode;
      else if (type == 'zoomin')/*                */viewer.currentScaleValue += 0.1;
      else if (type == 'zoomout')/*               */viewer.currentScaleValue -= 0.1;
    }, false);
  }
}
