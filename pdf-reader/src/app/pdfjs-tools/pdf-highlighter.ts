import { getSelectionRects, isLeftClick, uuid } from './annotator-utils';
import { PdfRegistry } from './pdf-registry';

export class PdfHighlighter {

  private registry: PdfRegistry;

  enabled: boolean = false;
  type = 'highlight';
  color: string = 'transparent';
  stroke = '0.125rem';
  strokeStyle = 'solid';

  constructor({ registry }) {
    this.registry = registry;

    this.registry.register('highlighter', this);

    this._highlightOnTextSelection();
  }

  private _getWindow() { return this.registry.getWindow(); }
  private _getDocument() { return this.registry.getDocument(); }
  private _getDocumentEl() { return this.registry.getDocumentEl(); }
  private _getPdfJS() { return this.registry.getPdfJS(); }
  private _getStorage() { return this.registry.get('storage'); }

  private _highlightOnTextSelection() {
    let mdown = false, mdragging = false;
    this._getDocument().addEventListener('mousedown', ($event: any) => {
      if (this.enabled && isLeftClick($event)) {
        mdown = true;
      }
    });

    this._getDocument().addEventListener('mousemove', ($event: any) => {
      if (this.enabled && isLeftClick($event)) {
        mdragging = mdown;
      }
    });

    const handle = ($event: any) => {
      mdown = false;

      if (mdragging) {
        const rects = getSelectionRects(this._getDocument(), this._getPdfJS());
        if (rects && Object.keys(rects).length) {
          const highlight = {
            id: uuid(),
            type: this.type,
            color: this.color,
            stroke: this.stroke,
            strokeStyle: this.strokeStyle,
            rects,
            pages: Object.keys(rects).map(k => parseInt(k))
          };
          this._getStorage().create(highlight, () => {
            this._getWindow().getSelection().removeAllRanges();
            this.registry.get('highlight-viewer').render(highlight);
          });
        }
      }
    };

    this._getDocument().addEventListener('mouseup', ($event: any) => {
      if (this.enabled && isLeftClick($event)) {
        handle($event);
      }
    });
    this._getDocument().addEventListener('dblclick', ($event: any) => {
      if (this.enabled) {
        mdragging = true;
        handle($event);
      }
    });
  }
}
