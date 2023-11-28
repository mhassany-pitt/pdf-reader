import { getOrParent, getPageEl, getPageNum, htmlToElements } from "./pdf-utils";
import { PdfRegistry } from "./pdf-registry";

export class PdfTextWord {

  private registry: PdfRegistry;

  constructor({ registry }) {
    this.registry = registry;

    this.registry.register('text-word', this);

    this._attachStylesheet();
    this._onTextLayerRendered();
  }

  private _getPdfJS() { return this.registry.getPdfJS(); }
  private _getDocument() { return this.registry.getDocument(); }
  private _getDocumentEl() { return this.registry.getDocumentEl(); }

  private _onTextLayerRendered() {
    this._getPdfJS().eventBus.on('textlayerrendered', ($event: any) => {
      const pageNum = $event.pageNumber;
      const selector = `.pdfViewer .page[data-page-number="${pageNum}"] .textLayer`;
      const textLayer = this._getDocumentEl().querySelector(selector);
      let i = 0;
      Array.from(textLayer.querySelectorAll('span[role="presentation"]')).forEach((span: any) => {
        if (span.textContent.trim().length) {
          span.innerHTML = span.textContent.split(' ').map((word: any) =>
            `<span class="pdf-text__word" data-page="${pageNum}" data-word="${i++}">${word}</span>`
          ).join(' ');
        }
      });
    });
  }

  getSelectionWords() {
    const document = this._getDocument();
    const selection = document.getSelection();
    if (!selection || selection.rangeCount < 1)
      return null;

    const range = selection.getRangeAt(0);
    const rects = Array.from(range.getClientRects());
    const cachePW = {};

    const words = rects.map((rect: any) => {
      const el = document.elementFromPoint(rect.x + 1, rect.y + 1);
      if (!el) return null;
      if (!el.classList.contains('pdf-text__word'))
        return null;

      const page = parseInt(el.getAttribute('data-page'));
      const word = parseInt(el.getAttribute('data-word'));
      const text = el.textContent.trim();
      if (cachePW[`${page}-${word}`])
        return null;
      cachePW[`${page}-${word}`] = true;
      return { ...rect, page, word, text };
    }).filter(r => r);

    if (words.length) {
      words[0].offset = range.startOffset;
      words[0].text = words[0].text.substring(range.startOffset);
      const l = words.length - 1;
      words[l].offset = range.endOffset;
      words[l].text = words[l].text.substring(0, range.endOffset);
    }

    return words.sort((a, b) => a.page - b.page || a.word - b.word);
  }

  getWords(start, end /* is included */) {
    const words: any[] = [];
    for (let i = start.page; i <= end.page; i++) {
      const selector = `.pdfViewer .pdf-text__word[data-page="${i}"]`;
      const pagewords: HTMLElement[] = Array.from(this._getDocumentEl().querySelectorAll(selector));
      if (i === end.page) pagewords.splice(end.word + 1);
      if (i === start.page) pagewords.splice(0, start.word);
      words.push(...pagewords.map((w: any) => ({
        page: i,
        word: parseInt(w.getAttribute('data-word')),
        text: w.textContent
      })));
    }
    return words;
  }

  private _attachStylesheet() {
    this.registry
      .getDocumentEl()
      .querySelector('head')
      .appendChild(htmlToElements(
        `<style>
          .pdf-text__word {
            position: relative !important; 
          }
        </style>`
      ));
  }
}
