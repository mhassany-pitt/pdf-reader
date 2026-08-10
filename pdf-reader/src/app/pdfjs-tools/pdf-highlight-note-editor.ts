import {
  WHRect, getPageEl, getPageNum, htmlToElements,
  getAnnotEl, isLeftClick, getAnnotElBound, getOrParent,
  removeSelectorAll, annotAuthorHtml, annotIsMine
} from './pdf-utils';
import { PdfRegistry } from './pdf-registry';
import {
  HIGHLIGHT_COLORS, MARK_COLORS,
  ANNOTATION_POPUP_FONT, ensureAnnotationFonts,
  buildColorSwatches, bindColorSwatches
} from './pdf-annotation-colors';

export class PdfHighlightNoteEditor {

  private registry: PdfRegistry;

  constructor({ registry }) {
    this.registry = registry;

    this.registry.register('highlight-note-editor', this);
    this.registry.register(`configs.default.highlight-note`, () => PdfHighlightNoteEditor.defaultConfigs());

    for (const type of ['underline', 'highlight', 'strikethrough'])
      this.registry.register(`storage.deleted.${Math.random()}`, (annot) => {
        if (annot.type == type) {
          removeSelectorAll(this._getDocumentEl(),
            `.pdf-annotation__highlight-note-editor-popup[data-highlight-id="${annot.id}"]`);
        }
      });

    this._onHighlightClick();
  }

  protected _configs() { return this.registry.get(`configs.highlight-note`); }
  static defaultConfigs() {
    return true;
  }

  private _getDocument() { return this.registry.getDocument(); }
  private _getDocumentEl() { return this.registry.getDocumentEl(); }
  private _getPdfJS() { return this.registry.getPdfJS(); }
  private _getStorage() { return this.registry.get('storage'); }

  private _colorsFor(annot: any) {
    if (annot?.type === 'highlight')
      return this.registry.get('configs.highlight')?.colors || HIGHLIGHT_COLORS;
    return this.registry.get(`configs.${annot?.type}`)?.colors || MARK_COLORS;
  }

  private _onHighlightClick() {
    this._getDocument().addEventListener('click', async ($event: any) => {
      if (!this._configs())
        return;

      // Don't open notes while delete / place / draw tools are active
      const mode = this._getDocumentEl().querySelector('#mainContainer')
        ?.getAttribute('data-pdf-annot-mode');
      if (mode && ['delete', 'note', 'text', 'embed', 'freeform'].includes(mode))
        return;

      if ($event.target.closest('.pdf-annotation-swatches')
        || $event.target.closest('.pdf-annotation__highlight-note-editor-colors'))
        return;

      const viewerPopup = getOrParent($event, '.pdf-annotation__highlight-note-viewer-popup');
      if (isLeftClick($event) && (this.registry.get('highlight-note-viewer').isValidAnnotEl($event) || viewerPopup)) {
        const annotEl = getAnnotEl($event.target),
          /**/ pageEl = getPageEl($event.target);
        this.removePopups();

        const annotId = viewerPopup
          ? viewerPopup.getAttribute('data-highlight-id')
          : annotEl.getAttribute('data-annotation-id');
        const annot = this._getStorage().read(annotId);
        if (!annot || !annotIsMine(annot)) return;
        const bound = getAnnotElBound(pageEl.querySelector(`[data-annotation-id="${annotId}"]`));
        this._showEditorPopup(annot, getPageNum(pageEl), bound);
      } else if (!$event.target.closest('.pdf-annotation__highlight-note-editor-popup')) {
        this.removePopups();
      }
    });
  }

  removePopups() {
    this.registry.get('highlight-note-viewer').removePopups();
    this._getDocumentEl().querySelectorAll('.pdf-annotation__highlight-note-editor-popup').forEach(el => el.remove());
  }

  private _attachColorControls(popupEl: HTMLElement, annot: any) {
    const colorsHost = popupEl.querySelector('.pdf-annotation__highlight-note-editor-colors') as HTMLElement;
    if (!colorsHost) return;

    const swatches = buildColorSwatches({
      colors: this._colorsFor(annot),
      selected: annot.color,
      className: 'pdf-annotation-mark-color-swatches',
    });
    colorsHost.appendChild(swatches);
    bindColorSwatches(swatches, 'pdf-annotation-mark-color-swatches', (value) => {
      const latest = this._getStorage().read(annot.id) || annot;
      latest.color = value;
      this._getStorage().update(latest, () => {
        annot.color = value;
        this.registry.get('highlight-viewer').render(latest);
      });
    });
  }

  private _showEditorPopup(annot: any, pageNum: number, bound: WHRect) {
    ensureAnnotationFonts(this._getDocumentEl());
    const popupEl = htmlToElements(
      `<div class="pdf-annotation__highlight-note-editor-popup" data-highlight-id="${annot.id}">
        <div class="pdf-annotation__highlight-note-editor-header">
          <span class="pdf-annotation__highlight-note-editor-title">Note</span>
          ${annotAuthorHtml(annot)}
        </div>
        <div class="pdf-annotation__highlight-note-editor-colors"></div>
        <textarea rows="5" cols="35" placeholder="Write a note…"
          class="pdf-annotation__highlight-note-editor-textarea"
        >${annot.note || ''}</textarea>
        <div class="pdf-annotation__highlight-note-editor-footer">
          <span class="pdf-annotation__highlight-note-editor-hint">Click outside to save</span>
        </div>
        <style>
          .pdf-annotation__highlight-note-editor-popup {
            --popup-ink: #171a21;
            --popup-muted: #6b7280;
            --popup-line: rgba(23, 26, 33, 0.08);
            --popup-soft: #f6f7f9;
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
            min-width: 15rem;
          }

          .pdf-annotation__highlight-note-editor-header {
            padding: 0.7rem 0.85rem 0.15rem;
            background: #ffffff;
          }

          .pdf-annotation__highlight-note-editor-title {
            display: block;
            font-size: 0.8125rem;
            font-weight: 650;
            color: var(--popup-ink);
            letter-spacing: -0.02em;
          }

          .pdf-annotation__highlight-note-editor-colors {
            padding: 0.55rem 0.85rem 0.65rem;
            background: #ffffff;
            border-bottom: 1px solid var(--popup-line);
          }
          .pdf-annotation__highlight-note-editor-colors .pdf-annotation-panel__section {
            gap: 0.35rem;
          }
          .pdf-annotation__highlight-note-editor-colors .pdf-annotation-panel__section-label {
            font-size: 0.6875rem;
            font-weight: 550;
            color: var(--popup-muted);
            letter-spacing: 0.01em;
          }
          .pdf-annotation__highlight-note-editor-colors .pdf-annotation-swatches {
            display: flex;
            align-items: center;
            gap: 0.4rem;
            flex-wrap: wrap;
          }
          .pdf-annotation__highlight-note-editor-colors .pdf-annotation-swatches > span {
            user-select: none;
            cursor: pointer;
            width: 1.2rem;
            height: 1.2rem;
            border-radius: 999px;
            border: 2px solid transparent;
            box-shadow: inset 0 0 0 1px rgba(0, 0, 0, 0.12);
            transition: transform 0.12s ease, box-shadow 0.12s ease;
          }
          .pdf-annotation__highlight-note-editor-colors .pdf-annotation-swatches > span:hover {
            transform: scale(1.1);
          }
          .pdf-annotation__highlight-note-editor-colors .pdf-annotation-swatches > span.selected {
            box-shadow: 0 0 0 2px #ffffff, 0 0 0 3.5px #3d6df0;
            transform: scale(1.08);
          }

          .pdf-annotation__highlight-note-editor-textarea {
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
            min-height: 5.25rem;
          }
          .pdf-annotation__highlight-note-editor-textarea::placeholder {
            color: #9aa1ad;
          }

          .pdf-annotation__highlight-note-editor-footer {
            background: var(--popup-soft);
            padding: 0.45rem 0.85rem;
            border-top: 1px solid var(--popup-line);
          }

          .pdf-annotation__highlight-note-editor-hint {
            font-size: 0.6875rem;
            font-weight: 500;
            color: var(--popup-muted);
          }
        </style>
      </div>`);

    this._attachColorControls(popupEl, annot);

    this.registry.get('annotation-layer')
      .getOrAttachLayerEl(pageNum)
      .appendChild(popupEl);

    const textarea = popupEl.querySelector('textarea');
    textarea?.addEventListener('blur', async () => {
      if (!this._getDocumentEl().querySelector(`[data-annotation-id="${annot.id}"]`)) return;
      const latest = this._getStorage().read(annot.id) || annot;
      latest.note = textarea.value;
      this._getStorage().update(latest, () => {
        this.registry.get('highlight-viewer').render(latest);
      });
    });
  }
}
