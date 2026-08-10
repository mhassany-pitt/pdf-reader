import {
  WHRect, getPageEl, getPageNum,
  htmlToElements, getAnnotEl, getAnnotElBound,
  getOrParent, annotAuthorHtml
} from './pdf-utils';
import { PdfRegistry } from './pdf-registry';
import { ANNOTATION_POPUP_FONT, ensureAnnotationFonts } from './pdf-annotation-colors';

export class PdfHighlightNoteViewer {

  private registry: PdfRegistry;

  constructor({ registry }) {
    this.registry = registry;

    this.registry.register('highlight-note-viewer', this);

    this._onHighlightHover();
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

  private _onHighlightHover() {
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
    ensureAnnotationFonts(this._getDocumentEl());
    const lines = (annot.note || '').split('\n');
    const rows = Math.min(5, lines.length),
      cols = Math.min(35, Math.max(...lines.map(line => line.length)));

    const popupEl = htmlToElements(
      `<div class="pdf-annotation__highlight-note-viewer-popup" data-highlight-id="${annot.id}">
        <div class="pdf-annotation__highlight-note-viewer-header">
          <span class="pdf-annotation__highlight-note-viewer-title">Note</span>
          ${annotAuthorHtml(annot)}
        </div>
        <textarea rows="${rows}" cols="${cols}" placeholder="Note" readonly="true" resizable="false"
          class="pdf-annotation__highlight-note-viewer-textarea"
        >${annot.note || ''}</textarea>
        <style>
          .pdf-annotation__highlight-note-viewer-popup {
            --popup-ink: #171a21;
            --popup-muted: #6b7280;
            --popup-line: rgba(23, 26, 33, 0.08);
            position: absolute;
            top: calc(100% - ${bound.bottom}%);
            left: ${bound.left}%;
            width: ${bound.width ? bound.width + '%' : 'fit-content'};
            height: ${bound.height ? bound.height + '%' : 'fit-content'};
            max-width: min(50%, 22rem);
            max-height: 50%;
            display: flex;
            flex-direction: column;
            pointer-events: auto;
            z-index: 6;
            border-radius: 0.85rem;
            overflow: hidden;
            background: #ffffff;
            box-shadow:
              0 18px 40px rgba(16, 24, 40, 0.16),
              0 2px 6px rgba(16, 24, 40, 0.06),
              0 0 0 1px var(--popup-line);
            font-family: ${ANNOTATION_POPUP_FONT};
            letter-spacing: -0.011em;
            min-width: 12rem;
          }

          .pdf-annotation__highlight-note-viewer-header {
            padding: 0.7rem 0.85rem 0.55rem;
            background: #ffffff;
            border-bottom: 1px solid var(--popup-line);
          }

          .pdf-annotation__highlight-note-viewer-title {
            display: block;
            font-size: 0.8125rem;
            font-weight: 650;
            color: var(--popup-ink);
            letter-spacing: -0.02em;
          }

          .pdf-annotation__highlight-note-viewer-textarea {
            background: #ffffff;
            color: var(--popup-ink);
            border: none;
            outline: none;
            font-family: inherit;
            font-size: 0.875rem;
            font-weight: 450;
            line-height: 1.55;
            padding: 0.75rem 0.85rem;
            resize: none;
          }
        </style>
      </div>`);

    this.registry.get('annotation-layer')
      .getOrAttachLayerEl(pageNum)
      .appendChild(popupEl);
  }
}
