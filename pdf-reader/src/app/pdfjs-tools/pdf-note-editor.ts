import { Annotations } from "./annotations";
import {
  WHRect, getAnnotEl, getAnnotElBound, getOrParent,
  getPageEl, getPageNum, htmlToElements,
  isLeftClick, relativeToPageEl, uuid
} from "./annotator-utils";
import { PdfRegistry } from "./pdf-registry";

export class PdfNoteEditor {

  protected registry: PdfRegistry;

  enabled: boolean = false;
  onPointDrop: any;

  constructor({ registry }) {
    this.registry = registry;

    this.registry.register(this.getType().editor, this);
    this.registry.get(this.getType().viewer).attachMoveElClass = true;
    this.registry.register(`${this.getType().type}-move-elements`,
      ($event, action, payload) => this._handleMoveEvents($event, action, payload));

    this.onAnnotClick();
    this._manageDroppingZone();
    this._attachStylesheet();
  }

  protected _getStorage(): Annotations { return this.registry.get('storage'); }
  protected _getDocument() { return this.registry.getDocument(); }
  protected _getDocumentEl() { return this.registry.getDocumentEl(); }

  setEnabled(enable: boolean) {
    this.enabled = enable;
    if (!this.enabled)
      this._removeDropzones();
  }

  private _handleMoveEvents($event, action: string, payload: any) {
    if (action == 'moving-completed') {
      const { top, left, right, bottom } = payload.rect;
      const annot = this._getStorage().read(payload.id);
      annot.rects = { [annot.pages[0]]: [{ top, left, right, bottom }] };
      this._getStorage().update(annot);
    } else if (action == 'moving-started') {
      this._getDocumentEl().querySelector('.pdfViewer')?.
        querySelectorAll('.pdfjs-annotation__note-viewer-popup').forEach(el => el.remove());
    }
  }

  protected getType() {
    return { type: 'note', editor: 'note-editor', viewer: 'note-viewer' };
  }

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
    };
    this._getStorage().create(note, () => this.registry.get(this.getType().viewer).render(note));
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
      const isThumbIcon = getOrParent($event, '.pdfjs-annotation__note-thumb-icon'),
        isViewer = getOrParent($event, '.pdfjs-annotation__note-viewer-popup');
      if (isLeftClick($event) && (isThumbIcon || isViewer)) {
        const annotEl = getAnnotEl($event.target),
        /* */  pageEl = getPageEl($event.target);
        this._removePopups($event);

        const annotId = isViewer
          ? isViewer.getAttribute('data-note-id')
          : annotEl.getAttribute('data-annotation-id');
        const annot = this._getStorage().read(annotId);
        if (!pageEl.querySelector(`.pdfjs-annotation__note-editor-popup[data-note-id="${annotId}"]`)) {
          const bound = getAnnotElBound(pageEl.querySelector(`[data-annotation-id="${annotId}"]`));
          this._showEditorPopup(annot, getPageNum(pageEl), bound);
        }
      } else if (!$event.target.closest('.pdfjs-annotation__note-editor-popup')) {
        this._removePopups($event);
      }
    });
  }

  private _removePopups($event: any) {
    $event.target.closest('.pdfViewer')?.querySelectorAll('.pdfjs-annotation__note-editor-popup').forEach(el => el.remove());
  }

  private _showEditorPopup(annot: any, pageNum: number, bound: WHRect) {
    const popupEl = htmlToElements(
      `<div class="pdfjs-annotation__note-editor-popup" data-note-id="${annot.id}">
        <textarea rows="5" cols="35" placeholder="Note ...">${annot.note || ''}</textarea>
        <style>
          .pdfjs-annotation__note-editor-popup {
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

          .pdfjs-annotation__note-editor-popup textarea {
            box-shadow: rgba(0, 0, 0, 0.16) 0px 3px 6px, rgba(0, 0, 0, 0.23) 0px 3px 6px;
            background-color: white;
            border-radius: 0.125rem;
            border-color: lightgray;
            outline: none;
            font-family: inherit;
            padding: 0.125rem;
            resize: none;
          }
        </style>
      </div>`);

    this.registry.get('annotation-layer')
      .getOrAttachLayerEl(pageNum)
      .appendChild(popupEl);

    const textarea = popupEl.querySelector('textarea');
    textarea?.addEventListener('blur', async () => {
      if (this._getDocumentEl().querySelector(`[data-annotation-id="${annot.id}"]`)) {
        annot.note = textarea.value;
        this._getStorage().update(annot);
      }
    });
  }

  private _attachStylesheet() {
    this.registry.getDocumentEl().querySelector('head').appendChild(htmlToElements(
      `<style>
        .pdf-${this.getType().editor}__dropping-zone .textLayer {
          cursor: grabbing;
        }
      </style>`));
  }
}