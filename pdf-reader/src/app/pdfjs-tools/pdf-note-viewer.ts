import {
  WHRect, htmlToElements, removeSelectorAll,
  rotation, rotateRect, getOrParent, getAnnotEl,
  getPageEl, getAnnotElBound, getPageNum, scale,
  annotTitleAttr, annotAuthorHtml, getAnnotDisplayName, escapeHtml, annotIsMine
} from './pdf-utils';
import { PdfRegistry } from './pdf-registry';
import { noteTheme, ANNOTATION_POPUP_FONT, ensureAnnotationFonts } from './pdf-annotation-colors';

export class PdfNoteViewer {

  protected registry: PdfRegistry;

  constructor({ registry }) {
    this.registry = registry;

    this.registry.register(this.getType().viewer, this);

    // remove popup on delete
    this.registry.register(`storage.deleted.${Math.random()}`, (annot) => {
      if (annot.type == 'note') {
        removeSelectorAll(this._getDocumentEl(),
          `.pdf-annotation__note-viewer-popup[data-note-id="${annot.id}"]`);
      }
    });

    this.onAnnotMouseOver();
    this._attachStylesheet();
    this._renderOnPagerendered();
  }

  protected _configs() { return this.registry.get(`configs.note`); }

  private _getDocument() { return this.registry.getDocument(); }
  private _getDocumentEl() { return this.registry.getDocumentEl(); }
  private _getStorage() { return this.registry.get('storage'); }
  protected _getPdfJS() { return this.registry.getPdfJS(); }
  private _getAnnotLayer() { return this.registry.get('annotation-layer'); }

  protected getType() { return { type: 'note', viewer: 'note-viewer' }; }

  private _renderOnPagerendered() {
    this._getPdfJS().eventBus.on('pageannotationsloaded', ($event: any) => {
      const pageNum = $event.pageNumber;
      const annotsLayerEl = this._getAnnotLayer().getOrAttachLayerEl(pageNum);
      removeSelectorAll(annotsLayerEl, `.pdf-annotation__${this.getType().type}`);

      this._getStorage().list()
        .filter(annot => annot.type == this.getType().type && annot.pages.includes($event.pageNumber))
        .forEach(annot => this.render({ ...annot }));
    });
  }

  render(annot: any) {
    const annotsLayerEl = this.registry.get('annotation-layer').getOrAttachLayerEl(annot.pages[0]);
    removeSelectorAll(annotsLayerEl, `[data-annotation-id="${annot.id}"].pdf-annotation__${this.getType().type}`);

    const degree = rotation(this._getPdfJS());
    const rect = rotateRect(degree, true, annot.rects[annot.pages[0]][0]);

    annotsLayerEl.appendChild(this.getRenderedEl(annot, rect));
  }

  protected getRenderedEl(annot: any, rect: WHRect) {
    const editor = this.registry.get('note-editor');
    const configs = this._configs();
    const scaleFactor = scale(this._getPdfJS());
    const color = noteTheme(annot.color).color;

    return htmlToElements(
      `<div 
        data-annotation-id="${annot.id}" 
        data-annotation-type="${annot.type}"
        data-analytic="note:${annot.id}"
        ${getAnnotDisplayName(annot) ? `data-annotator="${escapeHtml(getAnnotDisplayName(annot))}"` : ''}
        tabindex="-1"
        title="${annotTitleAttr(annot, annotIsMine(annot)
          ? (annot.note?.length ? 'Click to edit note' : 'Click to write a note')
          : (annot.note?.length ? 'View note' : 'Annotation'))}"
        class="
          pdf-annotation__note 
          ${editor && configs?.move && annotIsMine(annot) ? 'pdf-annotation--moveable' : ''}
          ${editor && configs?.delete && annotIsMine(annot) ? 'pdf-annotation--deletable' : ''}" 
        style="
          top: calc(${rect.top}%);
          left: calc(${rect.left}%);
          width: calc(${scaleFactor} * 32px);
          height: calc(${scaleFactor} * 32px);
          --note-color: ${color};
        ">
        <span class="pdf-annotation__note-sheet"></span>
      </div>`
    );
  }

  protected onAnnotMouseOver() {
    let timeout: any = null;
    this._getDocument().addEventListener('mouseover', ($event: any) => {
      if (timeout) clearTimeout(timeout);
      timeout = setTimeout(async () => {
        const note = getOrParent($event, '.pdf-annotation__note'),
          editorPopup = getOrParent($event, '.pdf-annotation__note-editor-popup');
        if (note || editorPopup) {
          const annotEl = getAnnotEl($event.target),
        /* */  pageEl = getPageEl($event.target);
          this.removePopups();

          const annotId = editorPopup
            ? editorPopup.getAttribute('data-note-id')
            : annotEl.getAttribute('data-annotation-id');
          const annot = this.registry.get('storage').read(annotId);
          if (annot && annot.note && !pageEl.querySelector(`.pdf-annotation__note-editor-popup[data-note-id="${annotId}"]`)) {
            const bound = getAnnotElBound(pageEl.querySelector(`[data-annotation-id="${annotId}"]`));
            this._showViewerPopup(annot, getPageNum(pageEl), bound);
          }
        } else if (!$event.target.closest('.pdf-annotation__note-viewer-popup')) {
          this.removePopups();
        }
        timeout = null;
      }, 600);
    });
  }

  removePopups() {
    this._getDocumentEl().querySelectorAll('.pdf-annotation__note-viewer-popup').forEach(el => el.remove());
  }

  private _showViewerPopup(annot: any, pageNum: number, bound: WHRect) {
    const lines = (annot.note || '').split('\n');
    const rows = Math.min(5, lines.length),
      cols = Math.min(35, Math.max(...lines.map(line => line.length)));
    const theme = noteTheme(annot.color);

    const popupEl = htmlToElements(
      `<div class="pdf-annotation__note-viewer-popup" data-note-id="${annot.id}"
            style="--note-color: ${theme.color}; --note-header-bg: ${theme.header}; --note-body-bg: ${theme.body}; --note-ink: ${theme.ink}; --note-border: ${theme.border}; --note-muted: ${theme.muted};">
        <div class="pdf-annotation__note-viewer-header">
          <span class="pdf-annotation__note-viewer-title">Note</span>
          ${annotAuthorHtml(annot)}
        </div>
        <textarea rows="${rows}" cols="${cols}" placeholder="Note" readonly="true" resizable="false"
          class="pdf-annotation__note-viewer-textarea"
        >${annot.note || ''}</textarea>
        <style>
          .pdf-annotation__note-viewer-popup {
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
            box-shadow:
              0 18px 40px rgba(16, 24, 40, 0.16),
              0 2px 6px rgba(16, 24, 40, 0.06),
              0 0 0 1px var(--note-border);
            font-family: ${ANNOTATION_POPUP_FONT};
            letter-spacing: -0.011em;
            min-width: 12rem;
          }

          .pdf-annotation__note-viewer-header {
            background: var(--note-header-bg);
            padding: 0.7rem 0.85rem 0.55rem;
          }

          .pdf-annotation__note-viewer-title {
            font-size: 0.8125rem;
            font-weight: 650;
            color: var(--note-ink);
            letter-spacing: -0.02em;
          }

          .pdf-annotation__note-viewer-textarea {
            background-color: var(--note-body-bg);
            color: var(--note-ink);
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

  protected _attachStylesheet() {
    ensureAnnotationFonts(this._getDocumentEl());
    this.registry
      .getDocumentEl()
      .querySelector('head')
      .appendChild(htmlToElements(
        `<style>
          .pdf-annotation__note {
            position: absolute;
            pointer-events: auto;
            border-radius: 0.2rem;
            cursor: pointer;
            z-index: 5;
          }

          .pdf-annotation__note-sheet {
            display: block;
            width: 100%;
            height: 100%;
            background:
              linear-gradient(135deg, transparent 55%, rgba(0,0,0,0.12) 55.5%, rgba(0,0,0,0.12) 100%) top right / 34% 34% no-repeat,
              linear-gradient(160deg, color-mix(in srgb, var(--note-color, #e8d48a) 78%, white), var(--note-color, #e8d48a));
            border-radius: 0.15rem 0.15rem 0.2rem 0.15rem;
            box-shadow: 0 1px 3px rgba(0, 0, 0, 0.22), inset 0 0 0 1px rgba(0, 0, 0, 0.06);
            user-select: none;
          }
        </style>`
      ));
  }
}
