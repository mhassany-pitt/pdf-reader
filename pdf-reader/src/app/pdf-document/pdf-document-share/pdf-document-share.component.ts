import { Component } from '@angular/core';

type SharableLink = {
  id: string,
  title: string,
  published: string,
  created_at: string,
  // --- features
  log_interactions: boolean,
  highlight: boolean,
  underline: boolean,
  linethrough: boolean,
  redact: boolean,
  notes: boolean,
  freeform: boolean,
  embed_resource: boolean,
  // --- interaction logger
  document_events: string,
  pdfjs_events: string,
  mousemove_log_delay: number,
  scroll_log_delay: number,
  resize_log_delay: number,
  // --- annotation
  annotation_colors: string,
  // --- freeform
  freeform_stroke_sizes: string,
  freeform_colors: string,
  // --- advanced features (apis)
  annotation_api: string,
  interaction_logger_api: string,
};

@Component({
  selector: 'app-pdf-document-share',
  templateUrl: './pdf-document-share.component.html',
  styleUrls: ['./pdf-document-share.component.less']
})
export class PdfDocumentShareComponent {
  sharableLinks: SharableLink[] = [];

  documentEvents = ['click', 'contextmenu', 'mousedown', 'mousemove', 'mouseup', 'scroll'];
  pdfJSEvents = ['currentoutlineitem', 'outlineloaded', 'toggleoutlinetree', 'find', 'findbarclose',
    'documentloaded', 'presentationmodechanged', 'pagenumberchanged', 'scalechanged', 'scrollmodechanged',
    'sidebarviewchanged', 'spreadmodechanged', 'zoomin', 'zoomout', 'resize', 'rotateccw', 'rotatecw'];
  defColors = ['#ffd400', '#ff6563', '#5db221', '#2ba8e8', '#a28ae9', '#e66df2', '#f29823', '#aaaaaa', 'black'];
  defStrokes = ['thin-1', 'normal-3', 'thick-5'];

  tmpColor1 = 'blue';
  tmpColor2 = 'blue';

  tt = {};
  filter = '';
  get filteredSharableLinks() {
    return this.sharableLinks.filter(link => link.title?.indexOf(this.filter) >= 0);
  }

  getURL(id: string) {
    return [
      window.location.origin,
      'pdf-reader',
      id
    ].join('/');
  }

  create() {
    this.sharableLinks.unshift({
      id: `${Math.random().toString(36).substring(2)}`,
      title: '',
      created_at: new Date().toLocaleString(),
      highlight: true,
      underline: true,
      linethrough: true,
      redact: true,
      notes: true,
      document_events: this.documentEvents.join(','),
      pdfjs_events: this.pdfJSEvents.join(','),
      annotation_colors: this.defColors.join(','),
      freeform_stroke_sizes: this.defStrokes.join(','),
      freeform_colors: this.defColors.join(','),
      annotation_api: 'http://localhost:3000/api/annotations',
      interaction_logger_api: 'http://localhost:3000/api/interaction-logs',
    } as any);
  }
}
