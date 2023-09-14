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

    // remove editor on delete
    this.registry.register(`text.deleted.${Math.random()}`, (annot) => {
      if (annot.id == this._annot?.id)
        this._editor = null;
    });
  }

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
    this._getStorage().create(note, () => this.registry.get(this.getType().viewer).render(note));
  }

  protected override onAnnotClick() {
    this._getDocument().addEventListener('click', async ($event: any) => {
      const viewerEl = getOrParent($event, '.pdfjs-annotation__text');
      if (isLeftClick($event) && viewerEl) {
        const annotEl = getAnnotEl($event.target);
        const annotId: any = annotEl.getAttribute('data-annotation-id');
        this._annot = this._getStorage().read(annotId);
        this._editor = viewerEl.querySelector('textarea');
        this._editor.removeAttribute('readonly');
      } else if (this._editor) {
        this._annot.note = this._editor.value;
        this._getStorage().update(this._annot);
        this._editor.setAttribute('readonly', 'true');
        this._editor = null;
        this._annot = null;
      }
    });
  }
}