import { WHRect, relativeToPageEl } from "./pdf-utils";

export class PdfTextExtractor {

  private document: any;
  private documentEl: any;

  private pdfjs: any;

  constructor({ iframe, pdfjs }) {
    this.document = iframe?.contentDocument;
    this.documentEl = this.document.documentElement;

    this.pdfjs = pdfjs;
  }

  extractTextBounds(args: {
    then: (pageTexts: any) => void,
    progress: (percentage: number) => void
  }) {
    const onDocumentInit = ($event: any) => {
      const orgPageNum = this.pdfjs.page;
      const pageTextBounds = {};
      let page = 1, pages = this.pdfjs.pagesCount;
      const onTextLayerRendered = ($event: any) => {
        const pageNum = $event.pageNumber;
        const pageEl = this.documentEl.querySelector(`.pdfViewer .page[data-page-number="${pageNum}"]`);
        pageTextBounds[pageNum] = this._extractPageTexts(pageEl);

        args.progress(pageNum / this.pdfjs.pagesCount);
        if (page < pages)
          setTimeout(() => this.pdfjs.page = ++page, 0);
        else {
          this.pdfjs.eventBus.off('textlayerrendered', onTextLayerRendered);
          this.pdfjs.eventBus.off('documentinit', onDocumentInit);
          this.pdfjs.page = orgPageNum;
          args.then(pageTextBounds);
        }
      };
      this.pdfjs.eventBus.on('textlayerrendered', onTextLayerRendered);
      this.pdfjs.page = page;
    }
    this.pdfjs.eventBus.on('documentinit', onDocumentInit);
  }

  private _extractPageTexts(pageEl: any) {
    const textLayer = pageEl.querySelector('.textLayer');
    textLayer.style.opacity = 1;

    const textBounds: any[] = [];
    const classIdentifier = `span${Math.random().toString(36).substring(2)}`;
    Array.from(textLayer.querySelectorAll('span[role="presentation"]')).forEach((textElem: any) => {
      if (textElem.textContent.trim().length < 1)
        return;

      const orgHtmlContent = textElem.innerHTML;;

      textElem.innerHTML = textElem.textContent.split(' ')
        .map((word: any) => `<span class="${classIdentifier}" style="position: relative">${word}</span>`)
        .join(' ');

      Array.from(textElem.querySelectorAll(`.${classIdentifier}`))
        .map((word: any) => {
          const bound = word.getBoundingClientRect();
          return relativeToPageEl({
            top: bound.top,
            left: bound.left,
            bottom: bound.bottom,
            right: bound.right,
            width: bound.width,
            height: bound.height,
            text: word.textContent,
          } as any, pageEl);
        })
        .forEach((bound: WHRect) => textBounds.push(bound));

      textElem.innerHTML = orgHtmlContent;
    });

    return textBounds;
  }
}
