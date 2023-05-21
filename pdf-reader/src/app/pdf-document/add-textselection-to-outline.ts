import { isLeftClick, htmlToElements, } from '../pdfjs-tools/annotator-utils';
import { POPUP_ROW_ITEM_UI } from '../pdfjs-tools/annotator';

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
    const documentEl = iframe?.contentDocument.documentElement;
    documentEl.querySelector('head').appendChild(htmlToElements(
      `<style>
        .pdf-reader__add2outline-btns {
          display: flex;
          align-items: center;
          justify-content: space-evenly;
          column-gap: 0.125rem;
          z-index: 1;
        }
        
        .pdf-reader__add2outline-btns button {
          flex-grow: 1;
        }
      <style>`
    ));

    annotator.register(POPUP_ROW_ITEM_UI, ($event: any) => {
      const selection = window.getSelection();
      const selectionRects = selection?.rangeCount > 0
        ? Array.from(selection?.getRangeAt(0).getClientRects())
          .filter((rect: any) => rect.width >= 1 && rect.height >= 1)
        : [];

      if (selectionRects.length && isLeftClick($event)) {
        const containerEl = htmlToElements(
          `<div class="pdf-reader__add2outline-btns">
            <button class="pdf-reader__add2outline-btn">add to outline</button>  
          </div>`);
        const add2outlineBtnEl = containerEl.querySelector('button') as any;
        add2outlineBtnEl.onclick = ($event: any) => {
          addToOutline(selection, $event);
          annotator.hidePopup();
        }
        return containerEl;
      }

      return null;
    });
  }
}