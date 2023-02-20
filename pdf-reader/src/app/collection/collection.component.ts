import { Component, ViewChild } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-collection',
  templateUrl: './collection.component.html',
  styleUrls: ['./collection.component.less']
})
export class CollectionComponent {

  indentLevels = [0, 4, 8, 12, 16, 20];
  collection: any = {
    id: '123',
    name: 'Chapter 1 - ...',
    modified_at: new Date(),
    sections: [{ level: 0 }],
    new_pdf: null,
  };

  @ViewChild('viewer') viewer: any;

  constructor(
    private router: Router
  ) { }

  onDocumentLoad($event) {
    this.collection.pages = $event;

    // -- attach fileinput onchange
    const iframe = this.viewer.iframe.nativeElement;
    const content = (iframe.contentDocument || iframe.contentWindow.document);
    const input = content.getElementById('fileInput');
    input.onchange = (e: any) => this.collection.new_pdf = e.target.files[0];
  }

  addSection() {
    this.collection.sections.push({});
  }

  removeSection(i) {
    this.collection.sections.splice(i, 1);
  }

  focusInput(i: any) {
    setTimeout(() => document.getElementById('outline-title-' + i)?.focus(), 0);
  }

  changeLevel(section: any, change: number) {
    section.level = Math.min(Math.max(0, (section.level || 0) + change), 5);
  }

  manageSections(section, $event, i) {
    if ($event.code == 'Enter') {
      this.addSection();
      this.focusInput(i + 1);
    } else if ($event.altKey && $event.code == 'Backspace') {
      this.removeSection(i);

      if (this.collection.sections.length < 1)
        this.addSection();

      if (i > 0) this.focusInput(i - 1);
      else /* */ this.focusInput(0);
    } else if ($event.altKey && $event.code == 'ArrowRight') {
      this.changeLevel(section, +1);
    } else if ($event.altKey && $event.code == 'ArrowLeft') {
      this.changeLevel(section, -1);
    } else if ($event.code == 'ArrowUp' && i > 0) {
      this.focusInput(i - 1);
    } else if ($event.code == 'ArrowDown' && i < this.collection.sections.length - 1) {
      this.focusInput(i + 1);
    }
  }

  cancel() {
    this.router.navigate(['/collections']);
  }

  update() {
    this.cancel();
    // TODO ---
  }
}
