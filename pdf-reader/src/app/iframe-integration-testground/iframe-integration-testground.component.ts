import { CommonModule } from '@angular/common';
import { Component, OnInit, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DomSanitizer } from '@angular/platform-browser';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { InputTextareaModule } from 'primeng/inputtextarea';

@Component({
  standalone: true,
  imports: [
    CommonModule, FormsModule,
    InputTextModule, InputTextareaModule,
    ButtonModule,
  ],
  selector: 'app-iframe-integration-testground',
  templateUrl: './iframe-integration-testground.component.html',
  styleUrls: ['./iframe-integration-testground.component.less']
})
export class IframeIntegrationTestgroundComponent implements OnInit {
  @ViewChild('iframe', { static: true }) iframe: any;

  iframeUrl = 'http://localhost:4200/#/pdf-reader/65498b454c81a88a86917fb6';

  url: any;
  agent: any;
  messages: any[] = [];
  script = [
    '// write your js script here to interact with pdf-reader',
    `this.postMessage({ type: 'hello', /* ... */ });`
  ].join('\n');

  constructor(private domSanitizer: DomSanitizer) { }

  ngOnInit(): void {
    this.reloadIframe();
  }

  reloadIframe() {
    this.url = this.domSanitizer.bypassSecurityTrustResourceUrl(this.iframeUrl);
    if (this.agent) window.removeEventListener('message', this.agent);

    this.listenForMessage();
  }

  private listenForMessage() {
    window.addEventListener('message', (event: any) => {
      if (event.origin == location.origin)
        this.messages.unshift(this.json(event.data));
    }, false);
  }

  postMessage(message: any) {
    this.iframe.nativeElement.contentWindow.postMessage(message, location.origin);
  }

  json(message: any) {
    return JSON.stringify(message);
  }

  execute() {
    eval(this.script);
  }
}
