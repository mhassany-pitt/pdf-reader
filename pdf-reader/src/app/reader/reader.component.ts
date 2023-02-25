import { Component, OnInit, ViewChild } from '@angular/core';
import { Title } from '@angular/platform-browser';

@Component({
  selector: 'app-reader',
  templateUrl: './reader.component.html',
  styleUrls: ['./reader.component.less']
})
export class ReaderComponent implements OnInit {

  @ViewChild('viewer') viewer: any;

  window: any;
  pdfjs: any;

  constructor(private title: Title) {
    this.title.setTitle('PdfReader: demo.pdf');
  }

  async ngOnInit() { }

  onDocumentLoad($: any) {
    const iframe = this.viewer.nativeElement;
    this.window = iframe.contentWindow;
    this.pdfjs = this.window.PDFViewerApplication;
    this.pdfjs.open('http://localhost:3000/api/store/demo.pdf');
  }
}
