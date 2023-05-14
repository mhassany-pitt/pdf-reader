import { isLeftClick } from '../pdfjs-tools/annotator';
import { htmlToElements, POPUP_ROW_ITEM_UI } from '../pdfjs-tools/annotator';

export type Section = {
  level: number,
  title: string,
  page: number,
  top: number,
  left: number,
  width: number,
  height: number
};

export class AddTextSelectionToOutline {
  constructor({ iframe, annotator, addToOutline }) {
    const window = iframe?.contentWindow;
    annotator.register(POPUP_ROW_ITEM_UI, ($event: any) => {
      const selection = window.getSelection();
      const selectionRects = selection?.rangeCount > 0
        ? Array.from(selection?.getRangeAt(0).getClientRects())
          .filter((rect: any) => rect.width >= 1 && rect.height >= 1)
        : [];

      if (selectionRects.length && isLeftClick($event)) {
        const containerEl = htmlToElements(`<div class="pdf-reader__add2outline-container"></div>`);
        const add2outlineBtnEl = htmlToElements(`<button class="pdf-reader__add2outline-btn">add to outline</button>`);
        add2outlineBtnEl.onclick = ($ev) => {
          addToOutline(selection, $ev);
          annotator.hidePopup();
        }
        containerEl.appendChild(add2outlineBtnEl);
        return containerEl;
      }

      return null;
    });
  }
}