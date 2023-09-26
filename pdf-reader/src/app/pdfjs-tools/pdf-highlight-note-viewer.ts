import {
  WHRect, getPageEl, getPageNum,
  htmlToElements, getAnnotEl, getAnnotElBound,
  getOrParent, scale
} from './pdf-utils';
import { PdfRegistry } from './pdf-registry';

export class PdfHighlightNoteViewer {

  private registry: PdfRegistry;

  constructor({ registry }) {
    this.registry = registry;

    this.registry.register('highlight-note-viewer', this);

    this._onHighlightClick();
  }

  private _getDocument() { return this.registry.getDocument(); }
  private _getDocumentEl() { return this.registry.getDocumentEl(); }
  private _getPdfJS() { return this.registry.getPdfJS(); }

  isValidAnnotEl($event: any) {
    const el = $event.target;
    const check = (cname: string) => el.classList.contains(cname) || el.closest(`.${cname}`);

    if (!check('pdf-annotation__rect'))
      return false;

    for (const className of [
      'pdf-annotation__underline',
      'pdf-annotation__highlight',
      'pdf-annotation__strikethrough'
    ]) if (check(className))
        return true;

    return false;
  }

  private _onHighlightClick() {
    let timeout: any = null;
    this._getDocument().addEventListener('mouseover', ($event: any) => {
      if (timeout) clearTimeout(timeout);
      timeout = setTimeout(async () => {
        const editorPopup = getOrParent($event, '.pdf-annotation__highlight-note-editor-popup');
        if (this.isValidAnnotEl($event) || editorPopup) {
          const annotEl = getAnnotEl($event.target),
        /* */  pageEl = getPageEl($event.target);
          this.removePopups();

          const annotId = editorPopup
            ? editorPopup.getAttribute('data-highlight-id')
            : annotEl.getAttribute('data-annotation-id');
          const annot = this.registry.get('storage').read(annotId);
          if (annot && annot.note && !pageEl.querySelector(`.pdf-annotation__highlight-note-editor-popup[data-highlight-id="${annotId}"]`)) {
            const bound = getAnnotElBound(pageEl.querySelector(`[data-annotation-id="${annotId}"]`));
            this._showViewerPopup(annot, getPageNum(pageEl), bound);
          }
        } else if (!$event.target.closest('.pdf-annotation__highlight-note-viewer-popup')) {
          this.removePopups();
        }
        timeout = null;
      }, 600);
    });
  }

  removePopups() {
    this._getDocumentEl().querySelectorAll('.pdf-annotation__highlight-note-viewer-popup').forEach(el => el.remove());
  }

  private _showViewerPopup(annot: any, pageNum: number, bound: WHRect) {
    const lines = (annot.note || '').split('\n');
    const rows = Math.min(5, lines.length),
      cols = Math.min(35, Math.max(...lines.map(line => line.length)));

    const popupEl = htmlToElements(
      `<div class="pdf-annotation__highlight-note-viewer-popup" data-highlight-id="${annot.id}">
        <textarea rows="${rows}" cols="${cols}" placeholder="Note ..." readonly="true" resizable="false"
          class="pdf-annotation__highlight-note-viewer-textarea"
          style="font-size: ${scale(this._getPdfJS()) * 100}%;"
        >${annot.note || ''}</textarea>
        <style>
          .pdf-annotation__highlight-note-viewer-popup {
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

          .pdf-annotation__highlight-note-viewer-textarea {
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
}
