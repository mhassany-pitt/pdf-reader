import {
  WHRect, getPageEl, getPageNum,
  getSelectionRects, htmlToElements,
  getAnnotEl, isLeftClick, rotateRect,
  rotation, uuid, getAnnotBound, removeSelectorAll
} from './annotator-utils';
import { Highlight } from './highlight.type';
import { PdfRegistry } from './pdf-registry';

export class PdfHighlighter {

  private registry: PdfRegistry;
  private selected: any;

  highlighting: boolean = false;
  color: string = '';

  constructor({ registry }) {
    this.registry = registry;

    this.registry.register('highlighter', this);

    this._attachStylesheet();
    this._highlightOnTextSelection();
    this._toggleBoundaryOnClick();
    this._removeOnKeyBkSpaceOrDelete();
  }

  private _getWindow() { return this.registry.getWindow(); }
  private _getDocument() { return this.registry.getDocument(); }
  private _getDocumentEl() { return this.registry.getDocumentEl(); }
  private _getPdfJS() { return this.registry.getPdfJS(); }
  private _getStorage() { return this.registry.get('storage'); }

  private _removeOnKeyBkSpaceOrDelete() {
    this._getDocument().addEventListener('keydown', ($event: any) => {
      if (this.selected
        && $event.key == 'Delete' || $event.key == 'Backspace'
        && $event.target.classList.contains('pdfjs-annotation__bound')) {
        removeSelectorAll(this._getDocumentEl(), `.pdfjs-annotations [data-annotation-id="${this.selected.id}"]`);
        this._getStorage().delete(this.selected, () => this.selected = null);
      }
    });
  }

  private _highlightOnTextSelection() {
    let mdown = false, mdragging = false;
    this._getDocument().addEventListener('mousedown', ($event: any) => {
      if (this.highlighting && isLeftClick($event)) {
        mdown = true;
      }
    });

    this._getDocument().addEventListener('mousemove', ($event: any) => {
      if (this.highlighting && isLeftClick($event)) {
        mdragging = mdown;
      }
    });

    const handle = ($event: any) => {
      mdown = false;

      if (mdragging) {
        const rects = getSelectionRects(this._getDocument(), this._getPdfJS());
        if (rects && Object.keys(rects).length) {
          const highlight = { id: uuid(), type: 'highlight', color: this.color, rects };
          this._getStorage().create(highlight, () => {
            this._getWindow().getSelection().removeAllRanges();
            this.registry.get('highlight-viewer').render(highlight);
          });
        }
      }
    };

    this._getDocument().addEventListener('mouseup', ($event: any) => {
      if (this.highlighting && isLeftClick($event)) {
        handle($event);
      }
    });
    this._getDocument().addEventListener('dblclick', ($event: any) => {
      if (this.highlighting) {
        mdragging = true;
        handle($event);
      }
    });
  }

  private _toggleBoundaryOnClick() {
    this._getDocument().addEventListener('click', ($event: any) => {
      const pageEl = getPageEl($event.target);
      if (!pageEl) return;

      const classList = $event.target.classList;

      // remove boundaries if clicked outside one
      if (!classList.contains('pdfjs-annotation__bound')) {
        removeSelectorAll(pageEl, '.pdfjs-annotation__bound');
        this.selected = null;
      }

      const annotEl = getAnnotEl($event.target);
      if (annotEl) {
        const annotId: any = annotEl.getAttribute('data-annotation-id');
        this.selected = this._getStorage().read(annotId);
        this._showBoundary(getPageNum(pageEl), this.selected, getAnnotBound($event));
      }
    });
  }

  private _showBoundary(pageNum: number, annot: Highlight, boundRect: WHRect) {
    boundRect = rotateRect(rotation(this._getPdfJS()), true, boundRect);

    const boundEl = htmlToElements(
      `<div data-annotation-id="${annot.id}"
        class="pdfjs-annotation__bound" 
        tabindex="-1"
        style="
          top: calc(${boundRect.top}% - 1px);
          bottom: calc(${boundRect.bottom}% - 1px);
          left: calc(${boundRect.left}% - 1px);
          right: calc(${boundRect.right}% - 1px);
        ">
      </div>`
    );

    this.registry.get('annotation-layer').getOrAttachLayerEl(pageNum).appendChild(boundEl);
    boundEl.focus();
  }

  private _attachStylesheet() {
    this.registry.getDocumentEl().querySelector('head').appendChild(htmlToElements(
      `<style>
        .pdfjs-annotation__bound {
          position: absolute;
          pointer-events: auto;
          border-radius: 5px;
          border: 1px dashed blue;
        }
      </style>`));
  }
}
