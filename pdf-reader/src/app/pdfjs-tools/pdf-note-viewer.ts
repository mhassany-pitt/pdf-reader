import {
  WHRect, htmlToElements, removeSelectorAll,
  rotation, rotateRect, getOrParent, getAnnotEl,
  getPageEl, getAnnotElBound, getPageNum
} from './annotator-utils';
import { PdfRegistry } from './pdf-registry';

export class PdfNoteViewer {

  protected registry: PdfRegistry;

  attachMoveElClass: boolean = false;

  constructor({ registry }) {
    this.registry = registry;

    this.registry.register(this.getType().viewer, this);

    this.onAnnotMouseOver();
    this._attachStylesheet();
    this._renderOnPagerendered();
  }

  protected getType() {
    return { type: 'note', viewer: 'note-viewer' };
  }

  private _getDocument() { return this.registry.getDocument(); }
  private _getPdfJS() { return this.registry.getPdfJS(); }
  private _getStorage() { return this.registry.get('storage'); }

  private _renderOnPagerendered() {
    this._getPdfJS().eventBus.on('pageannotationsloaded', ($event: any) => {
      this._getStorage().list()
        .filter(annot => annot.type == this.getType().type && annot.pages.includes($event.pageNumber))
        .forEach(annot => this.render({ ...annot }));
    });
  }

  render(annot: any) {
    const annotsLayerEl = this.registry.get('annotation-layer').getOrAttachLayerEl(annot.pages[0]);
    removeSelectorAll(annotsLayerEl, `[data-annotation-id="${annot.id}"].pdfjs-annotation__${this.getType().type}`);

    const degree = rotation(this._getPdfJS());
    const rect = rotateRect(degree, true, annot.rects[annot.pages[0]][0]);

    annotsLayerEl.appendChild(this.getRenderedEl(annot, rect));
  }

  protected getRenderedEl(annot: any, rect: WHRect) {
    return htmlToElements(
      `<div data-annotation-id="${annot.id}" 
        data-analytic-id="annot-note-${annot.id}"
        class="pdfjs-annotation__note ${this.attachMoveElClass ? 'pdf-movable-el' : ''}" 
        ${this.attachMoveElClass ? `data-movable-type="note"` : ''}
        style="
          top: calc(${rect.top}%);
          left: calc(${rect.left}%);
          width: 32px;
          height: 32px;
        ">
        <img src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAGAAAABgCAMAAADVRocKAAAAsVBMVEVHcEz/1AD/1gD/0wD/0wD83gD/1QB8bCV8bSj93gD/1wD/2wD/1gD83AB7ayb/0QD/0gDqvRH/0AD+3gD/1QA9PT0/Pz9BQUFFRUX/1gDouhP/0wBDQ0P+1wD+2gBHR0frxAn+2QCGeDNTUUY+Pj7/1wBJSUlAQEA8PDz+3ABCQkJERET+2ABGRkZISEjqvBH4zAb3zwb4ywb+3QD30Ab+2wD4zgZYVUZKSkr/1AD3zgYbzkgXAAAAD3RSTlMA8q/xHfKqv7+sJx3u7cDxp3syAAABwklEQVR4Xu3WR04DQRSE4WcDBhtD98w4Z3LOmfsfjFk0ai+YMiXXAqSuA3y/9Fq2xv7c0tLS0nabW0VRPH3vIuwlbBZ2EHYdNi13Um5YrlZvAX+vWNcv196sDDQV/rDTqAyse58Q2KgMaPxOBwQEPgoofBgQ+Dgg8HFA4OOAyP8AAYkPAhIfBCQ+Cih8GBD4OCDwcUDg44DIH4OAxAcBiQ8CEh8Hov+cjYhl99FHgejPSp/ZXfBxIPp8IPg4EH3+RMHHgXXfN8yDgMQHAYkPAhIfBRQ+DAh8HBD4OCDxcSD6D9wP7XHJdyAQ78P+VSz5MBB8PhB9GIj3Z08UfRAQvK+DAYGPAwIfBwQ+Doj8HAQkPghIfBCQ+DgQ/c9s5ffP4vDo9PR2Pr8ZDK4mk8t+/6zXO+52z3eqA9GfZiu/fxZv76Rv0YeBcJ9D2rfl+79mq75/jmjfuPf90d82NMof875Rvud9o3zP+0b5nveN8j3vG+V73jfK97xvlO953yjf875RvuN9o3zH+0b5jveN8h3vG+U73jfKd7xvlO943yjf8b7VGD/nfaszfs771moTfs77ZpuNjV/7+b79l6WlpaV9Af0vZG6wBzc2AAAAAElFTkSuQmCC" />  
      </div>`
    );
  }

  protected onAnnotMouseOver() {
    let timeout: any = null;
    this._getDocument().addEventListener('mouseover', ($event: any) => {
      if (timeout) clearTimeout(timeout);
      timeout = setTimeout(async () => {
        const isNote = getOrParent($event, 'pdfjs-annotation__note'),
          isEditor = getOrParent($event, 'pdfjs-annotation__note-editor-popup');
        if (isNote || isEditor) {
          const annotEl = getAnnotEl($event.target),
        /* */  pageEl = getPageEl($event.target);
          this._removePopups($event);

          const annotId = isEditor
            ? isEditor.getAttribute('data-note-id')
            : annotEl.getAttribute('data-annotation-id');
          const annot = this.registry.get('storage').read(annotId);
          if (annot.note && !pageEl.querySelector(`.pdfjs-annotation__note-editor-popup[data-note-id="${annotId}"]`)) {
            const bound = getAnnotElBound(pageEl.querySelector(`[data-annotation-id="${annotId}"]`));
            this._showNoteViewerPopup(annot, getPageNum(pageEl), bound);
          }
        } else if (!$event.target.closest('.pdfjs-annotation__note-viewer-popup')) {
          this._removePopups($event);
        }
        timeout = null;
      }, 300);
    });
  }

  private _removePopups($event: any) {
    $event.target.closest('.pdfViewer')?.querySelectorAll('.pdfjs-annotation__note-viewer-popup').forEach(el => el.remove());
  }

  private _showNoteViewerPopup(annot: any, pageNum: number, bound: WHRect) {
    const lines = (annot.note || '').split('\n');
    const rows = Math.min(5, lines.length),
      cols = Math.min(35, Math.max(...lines.map(line => line.length)));
    const popupEl = htmlToElements(
      `<div class="pdfjs-annotation__note-viewer-popup" data-note-id="${annot.id}">
        <textarea rows="${rows}" cols="${cols}" placeholder="Note ..." readonly="true" resizable="false">${annot.note || ''}</textarea>
        <style>
          .pdfjs-annotation__note-viewer-popup {
            position: absolute;
            top: calc(100% - ${bound.bottom}%);
            left: ${bound.left}%;
            width: ${bound.width ? bound.width + '%' : 'fit-content'};
            height: ${bound.height ? bound.height + '%' : 'fit-content'};
            max-width: 50%;
            max-height: 50%;
            display: flex;
            flex-direction: column;
            pointer-events: auto;
            z-index: 6;
          }

          .pdfjs-annotation__note-viewer-popup textarea {
            box-shadow: rgba(0, 0, 0, 0.16) 0px 3px 6px, rgba(0, 0, 0, 0.23) 0px 3px 6px;
            background-color: white;
            border-radius: 0.125rem;
            border-color: lightgray;
            font-family: inherit;
            padding: 0.125rem;
            resize: none;
          }
        </style>
      </div>`);

    this.registry.get('annotation-layer')
      .getOrAttachLayerEl(pageNum)
      .appendChild(popupEl);
  }

  protected _attachStylesheet() {
    const styles =
      `<style>
        .pdfjs-annotation__note {
          position: absolute;
          pointer-events: auto;
          border-radius: 0.125rem;
          z-index: 5;
          cursor: pointer;
        }

        .pdfjs-annotation__note img {
          width: 32px;
          height: 32px;
          user-select: none;
          pointer-events: none;
        }
      </style>`;
    this.registry.getDocumentEl().querySelector('head').appendChild(htmlToElements(styles));
  }
}
