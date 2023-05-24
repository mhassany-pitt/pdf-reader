import { Component, NgZone, OnInit, ViewChild } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { ActivatedRoute, Router } from '@angular/router';
import { of } from 'rxjs';
import { environment } from 'src/environments/environment';
import { PDFDocumentService } from './pdf-document.service';
import { AnnotationStorage } from '../pdfjs-tools/annotator-storage';
import { Annotator } from '../pdfjs-tools/annotator';
import { FreeformAnnotator } from '../pdfjs-tools/freeform-annotator';
import { EmbedResource } from '../pdfjs-tools/embed-resource';
import { FreeformViewer } from '../pdfjs-tools/freeform-viewer';
import { AddTextSelectionToOutline, Section } from './add-textselection-to-outline';
import { EmbeddedResourceViewer } from '../pdfjs-tools/embedded-resource-viewer';
import { EnableElemMovement } from '../pdfjs-tools/enable-elem-movement';
import { TextLocator } from '../pdfjs-tools/text-locator';
import { HttpClient } from '@angular/common/http';

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

  textExtractionProgress: any = undefined;

  share = false;

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
  ) { }

  ngOnInit(): void {
    this.service.get(this.pdfDocumentId).subscribe({
      next: (pdfDocument: any) => {
        if (!pdfDocument.tags) pdfDocument.tags = [];
        if (!pdfDocument.sections) pdfDocument.sections = [];

        this.pdfDocument = pdfDocument;

        this.updateTitle();
        this.prepare();
      },
      error: (error: any) => console.log(error)
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

  async prepare() {
    if (!this.pdfDocument || !this.iframe)
      return;

    this.window = this.iframe.contentWindow;
    this.pdfjs = this.window.PDFViewerApplication;
    await this.pdfjs.open({
      url: `${environment.apiUrl}/pdf-documents/${this.pdfDocument.id}/file`,
      withCredentials: true,
    });
    this.pdfjs.eventBus.on('fileinputchange', ($event) => {
      const files = $event.source.files;
      this.newfile = files.length ? $event.source.files[0] : null;
    });

    const iframe = this.iframe;
    const pdfjs = this.pdfjs;
    const storage = new AnnotationStorage({
      http: this.http,
      groupId: this.pdfDocumentId,
      annotationApi: `${environment.apiUrl}/annotations`,
    });
    const annotator = new Annotator({
      iframe, pdfjs, storage, configs: {
        highlight: true, underline: true, linethrough: true, redact: true, notes: true,
        annotation_colors: '#ffd400,#ff6563,#5db221,#2ba8e8,#a28ae9,#e66df2,#f29823,#aaaaaa,black',
      }
    });
    const freeformViewer = new FreeformViewer({ iframe, pdfjs, storage, annotator, configs: { resize: true } });
    new FreeformAnnotator({
      iframe, pdfjs, storage, annotator, freeformViewer, configs: {
        freeform_stroke_sizes: 'thin-1,normal-3,thick-5',
        freeform_colors: '#ffd400,#ff6563,#5db221,#2ba8e8,#a28ae9,#e66df2,#f29823,#aaaaaa,black',
      }
    });
    const embedLinkViewer = new EmbeddedResourceViewer({ iframe, pdfjs, storage, annotator, configs: { resize: true } });
    new EmbedResource({ iframe, pdfjs, storage, annotator, embedLinkViewer });
    new EnableElemMovement({ iframe, embedLinkViewer, freeformViewer, storage });

    // TODO: use to extract text bounds
    // new TextLocator({ iframe, pdfjs }).extractTextBounds({
    //   progress: (percentage: number) =>
    //     this.ngZone.run(() => this.textExtractionProgress = percentage),
    //   then: (pageTexts: any) => {
    //     this.ngZone.run(() => this.textExtractionProgress = undefined);
    //     console.log('text bounds:', pageTexts);
    //   }
    // });

    new AddTextSelectionToOutline({
      iframe, annotator, addToOutline: (selection, $event) =>
        this.ngZone.run(() => this.addToOutline(selection, $event))
    });
  }

  add(section: Section) {
    this.pdfDocument.sections.push(section);
  }

  remove(section: Section) {
    const sections = this.pdfDocument.sections;
    sections.splice(sections.indexOf(section), 1);
  }

  level(section: Section, change: number) {
    section.level = Math.min(Math.max(0, (section.level || 0) + change), 5);
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
    setTimeout(() => document.getElementById(`outline-title-${this.pdfDocument.sections.length - 1}`)?.focus(), 0);
  }

  locate(section: any) {
    if (this.pdfjs.pdfViewer.scrollMode == 3)
      this.pdfjs.page = section.page;

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

  cancel() {
    this.router.navigate(['/Documents']);
  }

  update() {
    (this.newfile // upload file
      ? this.service.upload(this.pdfDocumentId, this.newfile)
      : of({})
    ).subscribe({  // update document
      next: (resp: any) => {
        this.service.update(this.pdfDocument).subscribe({
          next: (resp: any) => this.router.navigate(['/pdf-documents']),
          error: (error: any) => console.log(error)
        })
      },
      error: (error: any) => console.log(error)
    })
  }
}
