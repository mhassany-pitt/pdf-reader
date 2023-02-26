import { Component, NgZone, OnInit, ViewChild } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { ActivatedRoute, Router } from '@angular/router';
import { environment } from 'src/environments/environment';
import { ReaderService } from './reader.service';

@Component({
  selector: 'app-reader',
  templateUrl: './reader.component.html',
  styleUrls: ['./reader.component.less']
})
export class ReaderComponent implements OnInit {

  @ViewChild('viewer') viewer: any;

  document: any;
  window: any;
  pdfjs: any;

  section: any;

  get documentId() {
    return (this.route.snapshot.params as any).id;
  }

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private service: ReaderService,
    private title: Title,
    private ngZone: NgZone,
  ) { }

  ngOnInit(): void {
    this.reload();
  }

  private reload() {
    this.service.get(this.documentId).subscribe({
      next: (document: any) => {
        if (!document.tags)
          document.tags = [];
        if (!document.sections)
          document.sections = [];

        this.document = document;
        this.title.setTitle(`Reader: ${this.document.name || 'unnamed'}`);
      },
      error: (error: any) => console.log(error)
    });
  }

  onDocumentLoad($event) {
    const iframe = this.viewer.nativeElement;
    this.window = iframe.contentWindow;
    this.pdfjs = this.window.PDFViewerApplication;
    this.pdfjs.open(`${environment.apiUrl}/documents/${this.document.id}/file`);

    setTimeout(() => {
      this.syncPageSection();
      this.removeExtraElements();
    }, 300);
  }

  private syncPageSection() {
    this.pdfjs.eventBus.on('pagechanging', ($event) => {
      for (const section of this.document.sections.sort((a, b) => b.page - a.page)) {
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

    const childs = docs.getElementById('secondaryToolbarButtonContainer').children;
    childs[0].remove();
    childs[childs.length - 1].remove();
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
