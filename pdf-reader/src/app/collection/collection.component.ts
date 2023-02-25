import { Component, NgZone, ViewChild } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-collection',
  templateUrl: './collection.component.html',
  styleUrls: ['./collection.component.less']
})
export class CollectionComponent {

  collection: any = {
    id: '123',
    name: 'Chapter 1 - ...',
    modified_at: new Date(),
    sections: [
      {
        "level": 0,
        "title": "Late Submissions: A",
        "page": 4,
        "top": 0.14453761938038667,
        "left": 0.1176899115755627,
        "width": 0.17230008729401125,
        "height": 0.017392654709216554
      },
      {
        "level": 0,
        "title": "Overview: Through this",
        "page": 1,
        "top": 0.2951316095970184,
        "left": 0.1176899115755627,
        "width": 0.1914734917054989,
        "height": 0.017392654709216554
      },
      {
        "level": 0,
        "title": "Apr 3",
        "page": 6,
        "top": 0.5206343660222067,
        "left": 0.12708500803858522,
        "width": 0.04996483118971061,
        "height": 0.017392654709216554
      }
    ],
    new_pdf: null,
  };

  @ViewChild('viewer') viewer: any;

  window: any;
  pdfjs: any;
  record = false;

  constructor(
    private router: Router,
    private ngZone: NgZone,
  ) { }

  onDocumentLoad($event) {
    const iframe = this.viewer.nativeElement;
    this.window = iframe.contentWindow;
    this.pdfjs = this.window.PDFViewerApplication;
    this.pdfjs.open('http://localhost:3000/api/store/demo.pdf');

    this.registerEventHandlers();
  }

  add(section: any) {
    this.collection.sections.push(section);
  }

  remove(section: any) {
    const sections = this.collection.sections;
    sections.splice(sections.indexOf(section), 1);
  }

  level(section: any, change: number) {
    section.level = Math.min(Math.max(0, (section.level || 0) + change), 5);
  }

  focus(i: any) {
    setTimeout(() => document.getElementById('outline-title-' + i)?.focus(), 0);
  }

  manageSections(section: any, $event: any, i: number) {
    const sections = this.collection.sections;
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

  registerEventHandlers() {
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
      this.focus(this.collection.sections.length - 1);
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
    this.router.navigate(['/collections']);
  }

  update() {
    this.cancel();
    // TODO ---
  }
}
