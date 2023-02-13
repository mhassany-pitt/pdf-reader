import { Component, OnInit, ViewChild } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { PdfJsViewerComponent } from 'ng2-pdfjs-viewer';

@Component({
  selector: 'app-reader',
  templateUrl: './reader.component.html',
  styleUrls: ['./reader.component.less']
})
export class ReaderComponent implements OnInit {

  viewerId: number = Math.random();
  @ViewChild('viewer') viewer: PdfJsViewerComponent = null as any;

  get document() { return this.viewer.iframe.nativeElement.contentDocument.documentElement; }

  url = 'http://localhost:3000/api/store/demo.pdf';

  constructor(private title: Title) {
    this.title.setTitle('PdfReader: demo.pdf');
  }

  async ngOnInit() { }

  onDocumentLoad($: any) {
    console.log(this.document);
  }
}
