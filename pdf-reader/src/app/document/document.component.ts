import { Component, NgZone, OnInit, ViewChild } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { ActivatedRoute, Router } from '@angular/router';
import { EMPTY, Observable, of } from 'rxjs';
import { environment } from 'src/environments/environment';
import { DocumentService } from './document.service';

@Component({
  selector: 'app-document',
  templateUrl: './document.component.html',
  styleUrls: ['./document.component.less']
})
export class DocumentComponent implements OnInit {

  document: any;

  @ViewChild('viewer') viewer: any;

  window: any;
  pdfjs: any;
  record = false;

  newfile: any;

  get documentId() {
    return (this.route.snapshot.params as any).id;
  }

  constructor(
    private router: Router,
    private ngZone: NgZone,
    private route: ActivatedRoute,
    private service: DocumentService,
    private title: Title,
  ) { }

  ngOnInit(): void {
    this.service.get(this.documentId).subscribe({
      next: (document: any) => {
        if (!document.tags) document.tags = [];
        if (!document.sections) document.sections = [];

        this.document = document;
        this.title.setTitle(`Document: ${this.document.name || 'unnamed'}`);
      },
      error: (error: any) => console.log(error)
    });
  }

  onDocumentLoad($event) {
    const iframe = this.viewer.nativeElement;
    this.window = iframe.contentWindow;
    this.pdfjs = this.window.PDFViewerApplication;
    this.pdfjs.open(`${environment.apiUrl}/documents/${this.document.id}/file`);

    this.onWindowClick();

    setTimeout(() => {
      this.onFileInputChange();
    }, 300);
  }

  private onFileInputChange() {
    this.pdfjs.eventBus.on('fileinputchange', ($event) => {
      const files = $event.source.files;
      this.newfile = files.length ? $event.source.files[0] : null;;
    });
  }

  add(section: any) {
    this.document.sections.push(section);
  }

  remove(section: any) {
    const sections = this.document.sections;
    sections.splice(sections.indexOf(section), 1);
  }

  level(section: any, change: number) {
    section.level = Math.min(Math.max(0, (section.level || 0) + change), 5);
  }

  focus(i: any) {
    setTimeout(() => document.getElementById('outline-title-' + i)?.focus(), 0);
  }

  manageSections(section: any, $event: any, i: number) {
    const sections = this.document.sections;
    if ($event.altKey && $event.code == 'Backspace') {
      $event.preventDefault();
      this.remove(sections[i]);

      if (i > 0) this.focus(i - 1);
      else if (sections.length > 0) this.focus(0);
    } else if ($event.altKey && $event.code == 'ArrowRight') {
      $event.preventDefault();
      this.level(section, +1);
    } else if ($event.altKey && $event.code == 'ArrowLeft') {
      $event.preventDefault();
      this.level(section, -1);
    } else if ($event.code == 'ArrowUp' && i > 0) {
      this.focus(i - 1);
    } else if ($event.code == 'ArrowDown' && i < sections.length - 1) {
      this.focus(i + 1);
    }
  }

  onWindowClick() {
    this.window.onclick = ($event: any) => this.ngZone.run(() => {
      if (!this.record)
        return;

      const selection = this.window.getSelection();
      let { top, left, width, height } = selection.getRangeAt(0).getBoundingClientRect();

      const textLayer = selection.anchorNode.parentElement.closest(`.pdfViewer .textLayer`);
      const page = parseInt(textLayer.parentElement.getAttribute('data-page-number'));

      const { top: $top, left: $left, width: $width, height: $height } = textLayer.getBoundingClientRect();

      // relative % to parent
      top = (top - $top) / $height;
      left = (left - $left) / $width;
      width /= $width;
      height /= $height;

      const title = selection.toString().trim();
      const level = 0;

      if (!title)
        return;

      this.add({ level, title, page, top, left, width, height });

      selection.removeAllRanges();
      this.focus(this.document.sections.length - 1);
    });
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
      ? this.service.upload(this.documentId, this.newfile)
      : of({})
    ).subscribe({  // update document
      next: (resp: any) => {
        this.service.update(this.document).subscribe({
          next: (resp: any) => this.router.navigate(['/documents']),
          error: (error: any) => console.log(error)
        })
      },
      error: (error: any) => console.log(error)
    })
  }
}
