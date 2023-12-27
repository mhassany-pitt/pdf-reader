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
      const pageEl = getPageEl(this._getDocumentEl(), pageNum);
      const textLayerEl = pageEl.querySelector('.textLayer');
      let index = 0;
      Array.from(textLayerEl.querySelectorAll('span[role="presentation"]')).forEach((span: any) => {
        if (span.textContent.trim().length) {
          span.innerHTML = span.textContent.split(' ').map((word: any) =>
            `<span class="pdf-text__word" data-page="${pageNum}" data-word="${index++}">${word}</span>`
          ).join(' ');
        }
      });
      pageEl.setAttribute('data-textword-extracted', 'true');
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

  getWords(start, end /* is included */): Promise<{ page: number, word: number, text: string }[]> {
    return new Promise((resolve, reject) => {
      try {
        const words: any[] = [];
        let pageNum = start.page;
        const extractPageWords = () => {
          while (pageNum <= end.page) {
            if (!this._getDocumentEl().querySelector(
              `.pdfViewer .page[data-page-number="${pageNum}"][data-loaded="true"][data-textword-extracted="true"]`)) {
              this.registry.getPdfJS().page = pageNum;
              setTimeout(() => extractPageWords(), 100);
              return; // wait for page to be rendered
            }

            const wordEls: HTMLElement[] = Array.from(
              this._getDocumentEl().querySelectorAll(`.pdfViewer .pdf-text__word[data-page="${pageNum}"]`));
            if (pageNum === end.page) wordEls.splice(end.word + 1);
            if (pageNum === start.page) wordEls.splice(0, start.word);

            const pwords = wordEls.map((w: any) => ({
              page: pageNum,
              word: parseInt(w.getAttribute('data-word')),
              text: w.textContent
            }));

            // ensure words are sorted
            pwords.sort((a, b) => a.word - b.word);
            words.push(...pwords);

            // next page or resolve
            pageNum++;
          }

          // when all pages are processed
          resolve(words);
        };

        extractPageWords();
      } catch (error) {
        reject(error);
      }
    });
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
