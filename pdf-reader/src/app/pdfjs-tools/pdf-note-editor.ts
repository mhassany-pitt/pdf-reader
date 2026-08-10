import { PdfStorage } from "./pdf-storage";
import {
  WHRect, getAnnotEl, getAnnotElBound, getOrParent,
  getPageEl, getPageNum, htmlToElements,
  isLeftClick, relativeToPageEl, removeSelectorAll, uuid,
  annotAuthorHtml, annotIsMine
} from "./pdf-utils";
import { PdfRegistry } from "./pdf-registry";
import {
  DEFAULT_NOTE_COLOR, NOTE_COLORS, noteTheme,
  ANNOTATION_POPUP_FONT, ensureAnnotationFonts,
  buildColorSwatches, bindColorSwatches
} from "./pdf-annotation-colors";

export class PdfNoteEditor {

  protected registry: PdfRegistry;

  enabled: boolean = false;
  onPointDrop: any;

  constructor({ registry }) {
    this.registry = registry;

    this.registry.register(this.getType().editor, this);
    this.registry.register(`${this.getType().type}-move-elements`,
      ($event, action, payload) => this._handleMoveEvents($event, action, payload));

    // remove popup on delete
    this.registry.register(`storage.deleted.${Math.random()}`, (annot) => {
      if (annot.type == 'note') {
        removeSelectorAll(this._getDocumentEl(),
          `.pdf-annotation__note-editor-popup[data-note-id="${annot.id}"]`);
      }
    });

    this.onAnnotClick();
    this._manageDroppingZone();
    this._attachStylesheet();
  }

  protected _configs() { return this.registry.get(`configs.${this.getType().type}`); }
  protected _getDocument() { return this.registry.getDocument(); }
  protected _getDocumentEl() { return this.registry.getDocumentEl(); }
  protected _getStorage(): PdfStorage { return this.registry.get('storage'); }
  private _getPdfJS() { return this.registry.getPdfJS(); }
  protected _getViewer() { return this.registry.get(this.getType().viewer); }

  setEnabled(enable: boolean) {
    this.enabled = enable;
    if (!this.enabled)
      this._removeDropzones();
  }

  private _handleMoveEvents($event, action: string, payload: any) {
    if (action == 'moving-completed') {
      const { top, left, right, bottom } = payload.rect;
      const annot = this._getStorage().read(payload.id);
      if (!annot || !this._getStorage().isMine(annot)) return;
      annot.rects = { [annot.pages[0]]: [{ top, left, right, bottom }] };
      this._getStorage().update(annot);
    } else if (action == 'moving-started') {
      this._getDocumentEl().querySelector('.pdfViewer')?.
        querySelectorAll('.pdf-annotation__note-viewer-popup').forEach(el => el.remove());
    }
  }

  protected getType() { return { type: 'note', editor: 'note-editor', viewer: 'note-viewer' }; }

  protected pointDropped(pageEl, $event) {
    this.onPointDrop?.();
    const { left, top } = relativeToPageEl({ left: $event.clientX, top: $event.clientY } as any, pageEl);
    const page = getPageNum(pageEl);
    const note = {
      id: uuid(),
      type: this.getType().type,
      rects: { [page]: [{ left, top, right: 100 - left, bottom: 100 - top }] },
      pages: [page],
      note: '',
      color: this._configs()?.defaultColor || DEFAULT_NOTE_COLOR,
    };
    this._getStorage().create(note, () => {
      this._getViewer().render(note);
      const annotEl = this._getDocumentEl().querySelector(`[data-annotation-id="${note.id}"]`);
      if (annotEl) {
        const bound = getAnnotElBound(annotEl);
        this._showEditorPopup(note, page, bound);
        requestAnimationFrame(() => {
          const textarea = this._getDocumentEl()
            .querySelector(`.pdf-annotation__note-editor-popup[data-note-id="${note.id}"] textarea`) as HTMLTextAreaElement;
          textarea?.focus();
        });
      }
    });
  }

  private _manageDroppingZone() {
    this._getDocument().addEventListener("mousemove", ($event: any) => {
      if (this.enabled)
        getPageEl($event.target)?.classList.add(`pdf-${this.getType().editor}__dropping-zone`);
    });

    this._getDocument().addEventListener("click", ($event: any) => {
      const pageEl = getPageEl($event.target);
      if (this.enabled && pageEl) {
        this.setEnabled(false);
        this.pointDropped(pageEl, $event);
      }
    });
  }

  private _removeDropzones() {
    [...this._getDocument().querySelectorAll(`.pdf-${this.getType().editor}__dropping-zone`)].forEach(el => {
      el.classList.remove(`pdf-${this.getType().editor}__dropping-zone`);
    });
  }

  protected onAnnotClick() {
    this._getDocument().addEventListener('click', async ($event: any) => {
      if ($event.target.closest('.pdf-annotation-swatches')
        || $event.target.closest('.pdf-annotation__note-editor-colors'))
        return;

      const thumbIcon = getOrParent($event, '.pdf-annotation__note-thumb-icon')
        || getOrParent($event, '.pdf-annotation__note-sheet'),
        viewerPopup = getOrParent($event, '.pdf-annotation__note-viewer-popup');
      if (isLeftClick($event) && (thumbIcon || viewerPopup)) {
        const annotEl = getAnnotEl($event.target),
        /* */  pageEl = getPageEl($event.target);
        this.removePopups();

        const annotId = viewerPopup
          ? viewerPopup.getAttribute('data-note-id')
          : annotEl.getAttribute('data-annotation-id');
        const annot = this._getStorage().read(annotId);
        if (!annot || !annotIsMine(annot)) return;
        if (!pageEl.querySelector(`.pdf-annotation__note-editor-popup[data-note-id="${annotId}"]`)) {
          const bound = getAnnotElBound(pageEl.querySelector(`[data-annotation-id="${annotId}"]`));
          this._showEditorPopup(annot, getPageNum(pageEl), bound);
        }
      } else if (!$event.target.closest('.pdf-annotation__note-editor-popup')) {
        this.removePopups();
      }
    });
  }

  removePopups() {
    this._getViewer().removePopups();
    this._getDocumentEl().querySelectorAll('.pdf-annotation__note-editor-popup').forEach(el => el.remove());
  }

  applyColor(annot: any) {
    const theme = noteTheme(annot.color);
    const popup = this._getDocumentEl()
      .querySelector(`.pdf-annotation__note-editor-popup[data-note-id="${annot.id}"]`) as HTMLElement;
    if (popup) this._paintNotePopup(popup, theme);
  }

  private _paintNotePopup(popup: HTMLElement, theme: ReturnType<typeof noteTheme>) {
    popup.style.setProperty('--note-color', theme.color);
    popup.style.setProperty('--note-header-bg', theme.header);
    popup.style.setProperty('--note-body-bg', theme.body);
    popup.style.setProperty('--note-footer-bg', theme.footer);
    popup.style.setProperty('--note-ink', theme.ink);
    popup.style.setProperty('--note-muted', theme.muted);
    popup.style.setProperty('--note-border', theme.border);
  }

  private _showEditorPopup(annot: any, pageNum: number, bound: WHRect) {
    const theme = noteTheme(annot.color);
    const colors = this._configs()?.colors || NOTE_COLORS;
    const popupEl = htmlToElements(
      `<div class="pdf-annotation__note-editor-popup" data-note-id="${annot.id}"
            style="--note-color: ${theme.color}; --note-header-bg: ${theme.header}; --note-body-bg: ${theme.body}; --note-footer-bg: ${theme.footer}; --note-ink: ${theme.ink}; --note-muted: ${theme.muted}; --note-border: ${theme.border};">
        <div class="pdf-annotation__note-editor-header">
          <span class="pdf-annotation__note-editor-title">Sticky note</span>
          ${annotAuthorHtml(annot)}
        </div>
        <div class="pdf-annotation__note-editor-colors"></div>
        <textarea rows="5" cols="35" placeholder="Write your note…"
          class="pdf-annotation__note-editor-textarea"
        >${annot.note || ''}</textarea>
        <div class="pdf-annotation__note-editor-footer">
          <span class="pdf-annotation__note-editor-hint">Click outside to save</span>
        </div>
        <style>
          .pdf-annotation__note-editor-popup {
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
            min-width: 15rem;
          }

          .pdf-annotation__note-editor-header {
            background: var(--note-header-bg);
            padding: 0.7rem 0.85rem 0.2rem;
            display: flex;
            align-items: center;
            justify-content: space-between;
          }

          .pdf-annotation__note-editor-title {
            font-size: 0.8125rem;
            font-weight: 650;
            color: var(--note-ink);
            letter-spacing: -0.02em;
          }

          .pdf-annotation__note-editor-colors {
            background: var(--note-header-bg);
            padding: 0.45rem 0.85rem 0.7rem;
            border-bottom: 1px solid var(--note-border);
          }
          .pdf-annotation__note-editor-colors .pdf-annotation-panel__section-label {
            display: none;
          }
          .pdf-annotation__note-editor-colors .pdf-annotation-swatches {
            display: flex;
            align-items: center;
            gap: 0.4rem;
            flex-wrap: wrap;
          }
          .pdf-annotation__note-editor-colors .pdf-annotation-swatches > span {
            user-select: none;
            cursor: pointer;
            width: 1.15rem;
            height: 1.15rem;
            border-radius: 999px;
            border: 2px solid transparent;
            box-shadow: inset 0 0 0 1px rgba(0, 0, 0, 0.14);
            transition: transform 0.12s ease, box-shadow 0.12s ease;
          }
          .pdf-annotation__note-editor-colors .pdf-annotation-swatches > span:hover {
            transform: scale(1.1);
          }
          .pdf-annotation__note-editor-colors .pdf-annotation-swatches > span.selected {
            box-shadow: 0 0 0 2px var(--note-body-bg), 0 0 0 3.5px rgba(0, 0, 0, 0.28);
            transform: scale(1.08);
          }

          .pdf-annotation__note-editor-textarea {
            flex: 1;
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
            min-width: 14rem;
            min-height: 5.25rem;
          }
          .pdf-annotation__note-editor-textarea::placeholder {
            color: color-mix(in srgb, var(--note-ink) 45%, transparent);
          }

          .pdf-annotation__note-editor-footer {
            background-color: var(--note-footer-bg);
            padding: 0.45rem 0.85rem;
            border-top: 1px solid var(--note-border);
          }

          .pdf-annotation__note-editor-hint {
            font-size: 0.6875rem;
            font-weight: 500;
            color: var(--note-muted);
          }
        </style>
      </div>`);

    const colorsHost = popupEl.querySelector('.pdf-annotation__note-editor-colors') as HTMLElement;
    const swatches = buildColorSwatches({
      colors,
      selected: noteTheme(annot.color).color,
      className: 'pdf-annotation-note-color-swatches',
    });
    colorsHost.appendChild(swatches);
    bindColorSwatches(swatches, 'pdf-annotation-note-color-swatches', (value) => {
      const latest = this._getStorage().read(annot.id) || annot;
      latest.color = value;
      this._paintNotePopup(popupEl, noteTheme(value));
      this._getStorage().update(latest, () => {
        annot.color = value;
        this._getViewer().render(latest);
      });
    });

    this.registry.get('annotation-layer')
      .getOrAttachLayerEl(pageNum)
      .appendChild(popupEl);

    const textarea = popupEl.querySelector('textarea');
    textarea?.addEventListener('blur', async () => {
      if (!this._getDocumentEl().querySelector(`[data-annotation-id="${annot.id}"]`)) return;
      const latest = this._getStorage().read(annot.id) || annot;
      latest.note = textarea.value;
      this._getStorage().update(latest);
    });
  }

  private _attachStylesheet() {
    ensureAnnotationFonts(this._getDocumentEl());
    this.registry
      .getDocumentEl()
      .querySelector('head')
      .appendChild(htmlToElements(
        `<style>
          .pdf-${this.getType().editor}__dropping-zone .textLayer {
            cursor: crosshair !important;
          }

          .pdf-${this.getType().editor}__dropping-zone {
            outline: 2px dashed rgba(61, 109, 240, 0.35);
            outline-offset: -2px;
          }

          .pdf-annotation__note:active {
            cursor: grabbing;
          }

          .pdf-annotation__note {
            transition: transform 0.12s ease, box-shadow 0.12s ease;
          }

          .pdf-annotation__note:hover {
            transform: scale(1.06);
            z-index: 6;
          }
        </style>`));
  }
}
