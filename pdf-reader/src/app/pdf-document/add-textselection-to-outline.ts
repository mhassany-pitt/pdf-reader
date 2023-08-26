import { isLeftClick, htmlToElements, } from '../pdfjs-tools/annotator-utils';
import { POPUP_ROW_ITEM_UI } from '../pdfjs-tools/annotator';

export type Entry = {
  level: number,
  title: string,
  page: number,
  top: number,
  left: number,
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
          display: flex;
          align-items: center;
          column-gap: 0.25rem;
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
            <button class="pdf-reader__add2outline-btn">
              <img src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAA2ElEQVR4AaTRtVUEURSAYdzduoACSHGnBTqgCNxdc+iAkATXCF33bHvYP7iz4/7O+cbnXasYW5wOpXzBqnTivEEI2ug96EOvQR863TZowzcKSCMrUijiRr6rdupBtRO3DGoxhhlMYVpMYR6DUs6w3QYtuMUnXvCGV9zjB2cSIIpabVYVyojcsAbwYHhWqVw0Yh3H2MMJVtCDNXl2hRS2cYkFbQmN8uEhdmWjZXRhRZ5d223gCavftgS5qUGtRo08b5DzqFUT3SNLkx3H6HWT0sjMTAhDsKVIAE45tRAc7R1PAAAAAElFTkSuQmCC" />
            
              <span>Add to Outline</span>
            </button>  
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