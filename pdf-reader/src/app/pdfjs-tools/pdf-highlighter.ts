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

  /** Create a mark from an existing selection (or provided rects/text). */
  createMark(opts: {
    type?: string;
    color?: string;
    stroke?: string;
    strokeStyle?: string;
    text?: string;
    rects?: any;
    clearSelection?: boolean;
  } = {}): boolean {
    const selection = this._getDocument().getSelection();
    const text = opts.text ?? selection?.toString() ?? '';
    const rects = opts.rects ?? getSelectionRects(this._getDocument(), this._getPdfJS());
    if (!rects || !Object.keys(rects).length) return false;

    const annot = {
      id: uuid(),
      type: opts.type || this.type,
      color: opts.color ?? this.color,
      stroke: opts.stroke ?? this.stroke,
      strokeStyle: opts.strokeStyle ?? this.strokeStyle,
      rects,
      text,
      pages: Object.keys(rects).map(k => parseInt(k, 10)),
    };

    if (opts.clearSelection !== false) {
      try { this._getWindow().getSelection()?.removeAllRanges(); }
      catch { selection?.removeAllRanges(); }
    }

    this._getStorage().create(annot, () => this._getViewer().render(annot));
    return true;
  }

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
        this.createMark();
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
