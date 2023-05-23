import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component, Input, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { CheckboxModule } from 'primeng/checkbox';
import { InputNumberModule } from 'primeng/inputnumber';
import { InputSwitchModule } from 'primeng/inputswitch';
import { InputTextModule } from 'primeng/inputtext';
import { MultiSelectModule } from 'primeng/multiselect';
import { environment } from 'src/environments/environment';
import { SharableLink } from './sharable-link.type';
import { ColorPickerModule } from 'primeng/colorpicker';

@Component({
  standalone: true,
  imports: [
    CommonModule, FormsModule,
    ButtonModule, InputTextModule,
    InputSwitchModule, CheckboxModule,
    MultiSelectModule, InputNumberModule,
    ColorPickerModule,
  ],
  selector: 'app-pdf-document-links',
  templateUrl: './pdf-document-links.component.html',
  styleUrls: ['./pdf-document-links.component.less']
})
export class PDFDocumentLinksComponent implements OnInit {
  @Input() pdfDocumentId: any;

  tmpColor1 = 'blue';
  tmpColor2 = 'blue';
  documentEvents = ['click', 'contextmenu', 'mousedown', 'mousemove', 'mouseup', 'scroll'];
  pdfJSEvents = ['currentoutlineitem', 'outlineloaded', 'toggleoutlinetree', 'find', 'findbarclose',
    'documentloaded', 'presentationmodechanged', 'pagenumberchanged', 'scalechanged', 'scrollmodechanged',
    'sidebarviewchanged', 'spreadmodechanged', 'zoomin', 'zoomout', 'resize', 'rotateccw', 'rotatecw'];
  defColors = ['#ffd400', '#ff6563', '#5db221', '#2ba8e8', '#a28ae9', '#e66df2', '#f29823', '#aaaaaa', 'black'];
  defStrokes = ['thin-1', 'normal-3', 'thick-5'];

  sharableLinks: SharableLink[] = [];

  copyToast: any = null;

  tt = {};
  filter = '';
  get filteredSharableLinks() {
    return this.sharableLinks.filter(link => link.title?.indexOf(this.filter) >= 0);
  }

  constructor(private http: HttpClient) { }

  ngOnInit(): void {
    this.load();
  }

  load() {
    this.http.get(
      `${environment.apiUrl}/pdf-document-links?pdfDocId=${this.pdfDocumentId}`,
      { withCredentials: true }
    ).subscribe({
      next: (data: any) => this.sharableLinks = data,
      error: (err) => console.error(err),
    });
  }

  addColor(link, attr, color) {
    link[attr] = link[attr] || '';
    link[attr] += link[attr] == '' ? color : `, ${color}`;
  }

  getURL(id: string) {
    return [window.location.origin, 'pdf-reader', id].join('/');
  }

  copyURL(id: string) {
    navigator.clipboard.writeText(this.getURL(id));
    this.copyToast = { id, message: 'Copied!' };
    setTimeout(() => this.copyToast = null, 3000);
  }

  create() {
    this.http.post<SharableLink>(
      `${environment.apiUrl}/pdf-document-links?pdfDocId=${this.pdfDocumentId}`,
      {
        id: `${Math.random().toString(36).substring(2)}`,
        title: '',
        created_at: new Date().toLocaleString(),
        highlight: true,
        underline: true,
        linethrough: true,
        redact: true,
        notes: true,
        document_events: this.documentEvents,
        pdfjs_events: this.pdfJSEvents,
        annotation_colors: this.defColors.join(','),
        freeform_stroke_sizes: this.defStrokes.join(','),
        freeform_colors: this.defColors.join(','),
        annotation_api: `${environment.apiUrl}/annotations`,
        interaction_logger_api: `${environment.apiUrl}/interaction-logs`,
      },
      { withCredentials: true }
    ).subscribe({
      next: (link) => this.sharableLinks.unshift(link),
      error: (err) => console.error(err),
    });
  }

  update(form, link) {
    this.tt[link.id] = false;
    const index = this.sharableLinks.indexOf(link);
    this.http.patch<SharableLink>(
      `${environment.apiUrl}/pdf-document-links/${link.id}`,
      link,
      { withCredentials: true }
    ).subscribe({
      next: (link) => this.sharableLinks.splice(index, 1, link),
      error: (err) => console.error(err),
    });
  }
}

