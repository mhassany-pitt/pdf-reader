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

  section: any;
  pdfDocument: any;
  configs: any;

  get pdfDocumentId() {
    return (this.route.snapshot.params as any).id;
  }

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
    this.service.get(this.pdfDocumentId).subscribe({
      next: (pdfDocument: any) => {
        if (!pdfDocument.tags)
          pdfDocument.tags = [];
        if (!pdfDocument.sections)
          pdfDocument.sections = [];

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
    await this.pdfjs.open({
      url: `${environment.apiUrl}/pdf-reader/${this.pdfDocument.id}/file`,
      withCredentials: true
    });
    this.syncPageSection();

    const iframe = this.iframe;
    const pdfjs = this.pdfjs;

    this.setupInteractionLogger(iframe, pdfjs);
    const storage = this.setupAnnotStorage();
    const annotator = this.setupAnnotator(iframe, pdfjs, storage);
    const freeformViewer = this.setupFreeform(iframe, pdfjs, annotator, storage);
    const embedLinkViewer = this.setupEmbedResource(iframe, pdfjs, annotator, storage);

    if (embedLinkViewer || freeformViewer)
      new EnableElemMovement({ iframe, embedLinkViewer, freeformViewer, storage });
  }

  private setupEmbedResource(iframe, pdfjs, annotator, storage) {
    const embedLinkViewer = new EmbeddedResourceViewer({
      iframe, pdfjs, annotator,
      storage, configs: { resize: false }
    });

    if (this.configs?.embed_resource)
      new EmbedResource({ iframe, pdfjs, storage, annotator, embedLinkViewer });

    return embedLinkViewer;
  }

  private setupFreeform(iframe, pdfjs, annotator, storage) {
    const freeformViewer = new FreeformViewer({
      iframe, pdfjs, annotator,
      storage, configs: { resize: false }
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
        highlight: this.configs?.highlight,
        underline: this.configs?.underline,
        linethrough: this.configs?.linethrough,
        redact: this.configs?.redact,
        notes: this.configs?.notes,
        annotation_colors: this.configs?.annotation_colors,
      }
    });
  }

  private setupAnnotStorage() {
    return new AnnotationStorage({
      http: this.http,
      groupId: this.pdfDocumentId,
      annotationApi: this.configs?.annotation_api,
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
            this.http.post(
              this.configs?.interaction_logger_api || (environment.apiUrl + '/interaction-logs'),
              logs, { withCredentials: true }).subscribe();
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

  private syncPageSection() {
    this.pdfjs.eventBus.on('pagechanging', ($event) => {
      for (const section of this.pdfDocument.sections.sort((a, b) => b.page - a.page)) {
        if (section.page <= $event.pageNumber) {
          this.ngZone.run(() => this.section = section);
          break;
        }
      }
    });
  }

  private removeExtraElements() {
    const docs = this.window.document;

    docs.getElementById('openFile').remove();
    docs.getElementById('secondaryOpenFile').remove();
    docs.getElementById('download').remove();
    docs.getElementById('secondaryDownload').remove();
    docs.getElementById('print').remove();
    docs.getElementById('secondaryPrint').remove();
    docs.getElementById('documentProperties').remove();

    const children = docs.getElementById('secondaryToolbarButtonContainer').children;
    children[0].remove();
    children[children.length - 1].remove();
  }

  locate(section: any) {
    if (this.pdfjs.pdfViewer.scrollMode == 3) {
      // for certain page layout, set page first
      this.pdfjs.page = section.page;
    }

    const query = `.pdfViewer .page[data-page-number="${section.page}"]`;
    const page = this.window.document.querySelector(query);
    const offset = -32; // a bit to the top

    let { top, left } = section;
    this.window.document.getElementById('viewerContainer').scrollTo({
      top: page.offsetTop + (top * page.offsetHeight) + offset,
      left: page.offsetLeft + (left * page.offsetWidth) + offset,
      behavior: 'smooth'
    });
  }
}
