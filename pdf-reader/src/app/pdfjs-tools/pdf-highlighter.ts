import { getSelectionRects, isLeftClick, uuid } from './pdf-utils';
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
  private _getPdfJS() { return this.registry.getPdfJS(); }
  private _getStorage() { return this.registry.get('storage'); }
  private _getViewer() { return this.registry.get('highlight-viewer'); }

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
        const text = this._getDocument().getSelection().toString();
        const rects = getSelectionRects(this._getDocument(), this._getPdfJS());
        if (rects && Object.keys(rects).length) {
          const annot = {
            id: uuid(),
            type: this.type,
            color: this.color,
            stroke: this.stroke,
            strokeStyle: this.strokeStyle,
            rects,
            text,
            pages: Object.keys(rects).map(k => parseInt(k))
          };
          this._getWindow().getSelection().removeAllRanges();
          this._getStorage().create(annot, () => this._getViewer().render(annot));
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
