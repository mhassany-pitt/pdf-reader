import { Component, OnInit, ViewChild } from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';

@Component({
  selector: 'app-iframe-integration-testground',
  templateUrl: './iframe-integration-testground.component.html',
  styleUrls: ['./iframe-integration-testground.component.less']
})
export class IframeIntegrationTestgroundComponent implements OnInit {
  @ViewChild('iframe', { static: true }) iframe: any;

  url: any;
  messages: any[] = [];

  constructor(private domSanitizer: DomSanitizer) {
    this.url = this.domSanitizer.bypassSecurityTrustResourceUrl('http://localhost:4200/pdf-reader/647de3be451dcad88a4b726a');

    window.addEventListener('message', (event) => {
      // // IMPORTANT: check the origin of the data!
      // if (event.origin !== 'http://example.org:8080')
      //   return;
      this.messages.unshift(event.data);

      // just a sample on how to send messages to iframe
      if (event.data.type == 'pdf-ready')
        this.postMessagesToIframe();
    }, false);
  }

  ngOnInit(): void {
    this.postMessagesToIframe();
  }

  postMessagesToIframe() {
    const $window = this.iframe.nativeElement.contentWindow;
    const $postMessage = (data) => $window.postMessage(data, '*');;
    // $postMessage({
    //   type: 'find', query: 'you',
    //   caseSensitive: true, entireWord: true, findPrevious: true, highlightAll: true, matchDiacritics: true, phraseSearch: true,
    // });
    // $postMessage({ type: 'changepagenumber', value: 1 });
    // $postMessage({ type: 'changepresentationmode', state: 1 });
    // $postMessage({ type: 'rotateccw' });
    // $postMessage({ type: 'rotatecw' });
    // $postMessage({ type: 'changescale', value: '1' });
    // $postMessage({ type: 'changescrollmode', mode: 1 });
    // $postMessage({ type: 'changesidebarview', view: '1' });
    // $postMessage({ type: 'changespreadmode', mode: '1' });
    // $postMessage({ type: 'zoomin' });
    // $postMessage({ type: 'zoomout' });
  }

  json(message: any) {
    return JSON.stringify(message);
  }
}
