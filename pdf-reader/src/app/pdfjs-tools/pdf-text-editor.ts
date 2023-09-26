import {
  getAnnotEl, getOrParent, getPageNum,
  isLeftClick, relativeToPageEl, uuid
} from "./pdf-utils";
import { PdfNoteEditor } from "./pdf-note-editor";

export class PdfTextEditor extends PdfNoteEditor {

  private _annot: any;
  private _editor: any;

  constructor({ registry }) {
    super({ registry });

    this.registry.register(`storage.deleted.${Math.random()}`, (annot) => {
      if (annot.type == 'text' && annot.id == this._annot?.id) {
        this._editor = null;
      }
    });
  }

  protected override _getViewer() { return this.registry.get(this.getType().viewer); }

  protected override getType() { return { type: 'text', editor: 'text-editor', viewer: 'text-viewer' }; }

  protected override pointDropped(pageEl, $event) {
    this.onPointDrop?.();
    const { left, top } = relativeToPageEl({ left: $event.clientX, top: $event.clientY } as any, pageEl);
    const page = getPageNum(pageEl);
    const note = {
      id: uuid(),
      type: this.getType().type,
      rects: { [page]: [{ left, top, right: 100 - left - 20, bottom: 100 - top - 5 }] },
      pages: [page],
      note: '',
    };
    this._getStorage().create(note, () => this._getViewer().render(note));
  }

  protected override onAnnotClick() {
    this._getDocument().addEventListener('click', async ($event: any) => {
      const viewerEl = getOrParent($event, '.pdf-annotation__text');
      if (isLeftClick($event) && viewerEl) {
        const annotEl = getAnnotEl($event.target);
        const annotId: any = annotEl.getAttribute('data-annotation-id');
        this._annot = this._getStorage().read(annotId);
        this._editor = viewerEl.querySelector('textarea');
        this._editor.removeAttribute('readonly');
        this._editor.classList.remove('pdf-annotation__text-viewer-textarea');
        this._editor.classList.add('pdf-annotation__text-editor-textarea');
      } else if (this._editor) {
        this._annot.note = this._editor.value;
        this._getStorage().update(this._annot);
        this._editor.setAttribute('readonly', 'true');
        this._editor.classList.add('pdf-annotation__text-viewer-textarea');
        this._editor.classList.remove('pdf-annotation__text-editor-textarea');
        this._editor = null;
        this._annot = null;
      }
    });
  }
}