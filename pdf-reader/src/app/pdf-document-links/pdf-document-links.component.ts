import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { CheckboxModule } from 'primeng/checkbox';
import { InputNumberModule } from 'primeng/inputnumber';
import { InputSwitchModule } from 'primeng/inputswitch';
import { InputTextModule } from 'primeng/inputtext';
import { MultiSelectModule } from 'primeng/multiselect';
import { environment } from 'src/environments/environment';
import { PDFDocumentLink } from './pdf-document-link.type';
import { ColorPickerModule } from 'primeng/colorpicker';
import { InputTextareaModule } from 'primeng/inputtextarea';
import { JsonEditorOptions, NgJsonEditorModule } from 'ang-jsoneditor';
import { PdfRegistry } from '../pdfjs-tools/pdf-registry';

@Component({
  standalone: true,
  imports: [
    CommonModule, FormsModule,
    ButtonModule, InputTextModule,
    InputSwitchModule, CheckboxModule,
    MultiSelectModule, InputNumberModule,
    ColorPickerModule, InputTextareaModule,
    NgJsonEditorModule,
  ],
  selector: 'app-pdf-document-links',
  templateUrl: './pdf-document-links.component.html',
  styleUrls: ['./pdf-document-links.component.less']
})
export class PDFDocumentLinksComponent implements OnInit {

  @Input() registry: PdfRegistry = null as any;
  @Input() pdfDocumentId: any;
  @Output() locateTexts = new EventEmitter();

  configUpdates = {};

  // documentEvents = ['click', 'contextmenu', 'mousedown', 'mousemove', 'mouseup', 'scroll'];
  // pdfJSEvents = ['currentoutlineitem', 'outlineloaded', 'toggleoutlinetree', 'find', 'findbarclose',
  //   'documentloaded', 'presentationmodechanged', 'pagenumberchanged', 'scalechanged', 'scrollmodechanged',
  //   'sidebarviewchanged', 'spreadmodechanged', 'zoomin', 'zoomout', 'resize', 'rotateccw', 'rotatecw'];

  pdfLinks: PDFDocumentLink[] = [];

  copyToast: any = null;
  archived = false;

  tt = {};
  filter = '';

  filteredPdfLinks() {
    return this.pdfLinks.filter(link => this.archived || link.archived == false)
      .filter(link => link.title?.indexOf(this.filter) >= 0);
  }

  get isHttps() { return document.location.origin.startsWith('https://'); }

  constructor(private http: HttpClient) {
  }

  ngOnInit(): void {
    this.load();
  }

  getJSONEditorOpts(pdfLink) {
    const opts = new JsonEditorOptions();
    opts.modes = ['code'];
    opts.mode = 'code';
    opts.statusBar = false;
    opts.mainMenuBar = false;
    opts.navigationBar = false;
    opts.enableSort = false;
    opts.enableTransform = false;
    opts.name = `config-${pdfLink.id}`;
    return opts;
  }

  load() {
    this.http.get(
      `${environment.apiUrl}/pdf-document-links?pdfDocId=${this.pdfDocumentId}`,
      { withCredentials: true }
    ).subscribe({
      next: (data: any) => this.pdfLinks = data,
      error: (err) => console.error(err),
    });
  }

  getURL(id: string) {
    return `${document.querySelector('base')?.href}#/pdf-reader/${id}`;
  }

  copyURL(id: string) {
    navigator.clipboard.writeText(this.getURL(id));
    this.copyToast = { id, message: 'Copied!' };
    setTimeout(() => this.copyToast = null, 3000);
  }

  configUpdated(pdfLink, $event) {
    if ($event.isTrusted)
      return;

    this.configUpdates[pdfLink.id] = $event;
  }

  archive(form, link) {
    link.archived = !link.archived;
    this.update(form, link);
  }

  create() {
    // document_events: this.documentEvents,
    // pdfjs_events: this.pdfJSEvents,
    // mousemove_log_delay: 100,
    // scroll_log_delay: 100,
    // resize_log_delay: 100,
    // annotation_colors: this.defColors.join(','),
    // freeform_stroke_sizes: this.defStrokes.join(','),
    // freeform_colors: this.defColors.join(','),
    // annotation_api: `${environment.apiUrl}/annotations`,
    // interaction_logger_api: `${environment.apiUrl}/interaction-logs`,
    // authorized_accounts: '',
    this.http.post<PDFDocumentLink>(
      `${environment.apiUrl}/pdf-document-links?pdfDocId=${this.pdfDocumentId}`,
      this.registry.list('configs.default').reduce((acc, key) => {
        acc[key.replace('configs.default.', '')] = this.registry.get(key)?.();
        return acc;
      }, {}),
      { withCredentials: true }
    ).subscribe({
      next: (link) => this.pdfLinks.unshift(link),
      error: (err) => console.error(err),
    });
  }

  update(form, pdfLink, skipArrUpdate = false) {
    const hasUpdatedConfigs = pdfLink.id in this.configUpdates;
    this.http.patch<PDFDocumentLink>(
      `${environment.apiUrl}/pdf-document-links/${pdfLink.id}`,
      {
        ...pdfLink,
        configs: hasUpdatedConfigs
          ? this.configUpdates[pdfLink.id]
          : pdfLink.configs || {}
      },
      { withCredentials: true }
    ).subscribe({
      next: (link) => {
        if (hasUpdatedConfigs)
          delete this.configUpdates[pdfLink.id];

        if (!skipArrUpdate) {
          this.tt[pdfLink.id] = false;
          const index = this.pdfLinks.indexOf(pdfLink);
          this.pdfLinks.splice(index, 1, link);
        }
      },
      error: (err) => console.error(err),
    });
  }
}
