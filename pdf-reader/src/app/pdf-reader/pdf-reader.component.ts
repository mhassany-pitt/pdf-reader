import { Component, NgZone, OnInit, ViewChild } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { ActivatedRoute, Router } from '@angular/router';
import { environment } from 'src/environments/environment';
import { PDFReaderService } from './pdf-reader.service';
import { Annotator } from '../pdfjs-tools/annotator';
import { Annotation, AnnotationStorage } from '../pdfjs-tools/annotator-storage';
import { FreeformAnnotator } from '../pdfjs-tools/freeform-annotator';
import { EmbeddedResourceViewer } from '../pdfjs-tools/embedded-resource-viewer';
import { FreeformViewer } from '../pdfjs-tools/freeform-viewer';
import { InteractionLogger } from '../pdfjs-tools/interaction-logger';
import { HttpClient } from '@angular/common/http';
import { EmbedResource } from '../pdfjs-tools/embed-resource';
import { EnableElemMovement } from '../pdfjs-tools/enable-elem-movement';
import { AppService } from '../app.service';
import { inSameOrigin, loadPlugin, scrollTo } from '../pdfjs-tools/pdfjs-utils';
import { AnnotationFilter } from '../pdfjs-tools/annotation-filter';

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
  pdfDocument: any;
  configs: any;

  storage: AnnotationStorage<Annotation> = null as any;
  annotator: Annotator = null as any;

  get params() { return this.route.snapshot.params as any; }
  get qparams() { return this.route.snapshot.queryParams as any; }
  get qparamsString() { return location.href.split('?').reverse()[0]; }
  get pdfDocumentId() { return this.params.id; }

  constructor(
    private router: Router,
    private http: HttpClient,
    private route: ActivatedRoute,
    private service: PDFReaderService,
    private title: Title,
    private ngZone: NgZone,
    private app: AppService,
  ) { }

  ngOnInit(): void {
    this.reload();
  }

  private reload() {
    this.service.get(`${this.pdfDocumentId}?${this.qparamsString}`).subscribe({
      next: (pdfDocument: any) => {
        if (!pdfDocument.tags)
          pdfDocument.tags = [];
        if (!pdfDocument.outline)
          pdfDocument.outline = [];

        this.configs = pdfDocument.configs;
        delete pdfDocument.configs;

        this.pdfDocument = pdfDocument;
        this.title.setTitle(`Reader: ${this.pdfDocument.title || 'unnamed'}`);

        this.prepare();
      },
      error: (error: any) => {
        if (error.status == 403)
          this.router.navigate(['/login']);
        else if (error.status == 401)
          this.router.navigate(['/unauthorized']);
      }
    });
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
    this.removeExtraElements();

    const iframe = this.iframe;
    const pdfjs = this.pdfjs;

    // load annotations first so can be rendered on document load
    const storage = new AnnotationStorage({
      app: this.app,
      api: this.configs?.annotation_api,
      http: this.http,
      groupId: this.pdfDocumentId,
    });
    this.storage = storage;

    await this.pdfjs.open({
      url: `${environment.apiUrl}/pdf-reader/${this.pdfDocument.id}/file?${this.qparamsString}`,
      withCredentials: true
    });
    this.syncPageOutline();

    this.applyConfigFromQParams();

    this.setupInteractionLogger(iframe, pdfjs);
    const annotator = this.setupAnnotator(iframe, pdfjs, storage);
    this.annotator = annotator;

    const filter = new AnnotationFilter({
      http: this.http, iframe,
      annotator, storage,
      groupId: this.pdfDocumentId
    });
    await filter.loadAnnotators();
    await filter.loadAnnotations();

    const freeformViewer = this.setupFreeform(iframe, pdfjs, annotator, storage);
    const embedLinkViewer = this.setupEmbedResource(iframe, pdfjs, annotator, storage);

    if (this.configs?.embed_resource || this.configs?.freeform)
      new EnableElemMovement({ iframe, embedLinkViewer, freeformViewer, storage });

    this.loadPlugins(annotator);
  }

  private loadPlugins(annotator: Annotator) {
    this.configs.custom_plugins.split('\n').forEach((url: string) => {
      try {
        loadPlugin({
          url,
          iframe: this.iframe,
          pdfjs: this.pdfjs,
          storage: this.storage,
          annotator: this.annotator,
          loaded: () => { },
          failed: () => { },
        })
      } catch (exp) {
        console.error(exp);
      }
    });
  }

  private applyConfigFromQParams() {
    const onDocumentLoad = ($event: any) => {
      this.pdfjs.eventBus.off('textlayerrendered', onDocumentLoad);

      // apply configs from query params OR viewer configs
      const viewer = this.configs.viewer || {};

      const zoom = this.qparams.zoom || viewer.zoom;
      if (zoom) this.pdfjs.pdfViewer.currentScale = zoom;

      const rotation = this.qparams.rotation || viewer.rotation;
      if (rotation) this.pdfjs.pdfViewer.pagesRotation = parseFloat(rotation);

      const entryNum = this.qparams.section || viewer.section;
      if (entryNum && !isNaN(entryNum)) {
        const index = parseInt(entryNum) - 1;
        if (index >= 0 && index < this.pdfDocument.outline.length)
          this.scrollToEntry(this.pdfDocument.outline[index]);
      }

      const page = this.qparams.page || viewer.page;
      if (!entryNum && page) {
        scrollTo(this.iframe.contentDocument, this.pdfjs, {
          page: parseInt(page),
          top: this.qparams.pagetop || viewer.pagetop || 0,
          left: this.qparams.pageleft || viewer.pageleft || 0
        });
      }

      const scrollmode = this.qparams.scrollmode || viewer.scrollmode;
      if (scrollmode) this.pdfjs.pdfViewer.scrollMode = parseInt(scrollmode);

      const spreadmode = this.qparams.spreadmode || viewer.spreadmode;
      if (spreadmode) this.pdfjs.pdfViewer.spreadMode = parseInt(spreadmode);
    };
    this.pdfjs.eventBus.on('textlayerrendered', onDocumentLoad);
  }

  private setupEmbedResource(iframe, pdfjs, annotator, storage) {
    const embedLinkViewer = new EmbeddedResourceViewer({
      iframe, pdfjs, annotator,
      storage, configs: { resize: this.configs?.embed_resource }
    });

    if (this.configs?.embed_resource)
      new EmbedResource({ iframe, pdfjs, storage, annotator, embedLinkViewer });

    return embedLinkViewer;
  }

  private setupFreeform(iframe, pdfjs, annotator, storage) {
    const freeformViewer = new FreeformViewer({
      iframe, pdfjs, annotator,
      storage, configs: { resize: this.configs?.freeform }
    });

    if (this.configs?.freeform)
      new FreeformAnnotator({
        iframe, pdfjs, annotator, freeformViewer, storage, configs: {
          freeform_stroke_sizes: this.configs?.freeform_stroke_sizes,
          freeform_colors: this.configs?.freeform_colors,
        }
      });

    return freeformViewer;
  }

  private setupAnnotator(iframe, pdfjs, storage) {
    return new Annotator({
      iframe, pdfjs, storage, configs: {
        onleftclick: true,
        highlight: this.configs?.highlight,
        underline: this.configs?.underline,
        linethrough: this.configs?.linethrough,
        redact: this.configs?.redact,
        notes: this.configs?.notes,
        annotation_colors: this.configs?.annotation_colors,
      }
    });
  }

  private setupInteractionLogger(iframe: any, pdfjs: any) {
    if (this.configs?.log_interactions) {
      new InteractionLogger({
        iframe, pdfjs,
        persist: (logs: any[]) => {
          const user = this.app.user;
          logs = logs.map(log => ({
            ...log,
            ...(user ? { user_id: user.id } : null),
            pdf_doc_id: this.pdfDocumentId,
          }));

          if (this.configs?.interaction_logger_api) {
            const api = this.configs?.interaction_logger_api || (environment.apiUrl + '/interaction-logs');
            this.http.post(api, logs, { withCredentials: inSameOrigin(api) }).subscribe();
          }
        },
        configs: {
          document_events: this.configs?.document_events,
          pdfjs_events: this.configs?.pdfjs_events,
          mousemove_log_delay: this.configs?.mousemove_log_delay,
          scroll_log_delay: this.configs?.scroll_log_delay,
          resize_log_delay: this.configs?.resize_log_delay,
          interaction_logger_api: this.configs?.interaction_logger_api,
        }
      });
    }
  }

  private syncPageOutline() {
    this.pdfjs.eventBus.on('pagechanging', ($event) => {
      const outline = [...this.pdfDocument.outline];
      for (const entry of outline.sort((a, b) => b.page - a.page)) {
        if (entry.page <= $event.pageNumber) {
          this.ngZone.run(() => this.entry = entry);
          break;
        }
      }
    });
  }

  private removeExtraElements() {
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

  scrollToEntry(entry: any) {
    scrollTo(this.window.document, this.pdfjs, entry);
  }
}
