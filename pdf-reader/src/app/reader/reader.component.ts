import { Component, OnInit, ViewChild } from '@angular/core';
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

  get documentId() {
    return (this.route.snapshot.params as any).id;
  }

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private service: ReaderService,
    private title: Title,
  ) { }

  ngOnInit(): void {
    this.service.get(this.documentId).subscribe({
      next: (document: any) => {
        if (!document.tags) document.tags = [];
        if (!document.sections) document.sections = [];

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

    this.window.document.getElementById('openFile').remove();
    this.window.document.getElementById('download').remove();
    this.window.document.getElementById('print').remove();
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
}
