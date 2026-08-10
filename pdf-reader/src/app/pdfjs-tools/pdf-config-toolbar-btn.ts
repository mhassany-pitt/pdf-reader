import { PdfFilter } from './pdf-filter';
import { PdfToolbarBtn } from './pdf-toolbar-btn';
import { isLeftClick } from './pdf-utils';
import { buildAnnotationPrefsPanel } from './pdf-annotation-prefs';

/** Single prefs toolbar button (identity + visibility). Replaces separate filter/config icons. */
export class PdfConfigToolbarBtn extends PdfToolbarBtn {

  private _visible: boolean = false;

  constructor({ registry }) {
    super({ registry });

    this.registry.register(`configs.default.config`, () => this._defaultConfigs());

    this._addToolbarUI();
  }

  protected _configs() { return this.registry.get(`configs.config`); }
  protected _defaultConfigs() { return PdfConfigToolbarBtn.defaultConfigs(); }
  static defaultConfigs() {
    return true;
  }

  private _getDocument() { return this.registry.getDocument(); }
  private _getFilter(): PdfFilter { return this.registry.get('filter'); }
  private _getStorage() { return this.registry.get('storage'); }

  private _shouldShow() {
    return !!(this.registry.get('configs.config') || this.registry.get('configs.filter'));
  }

  protected override getIcon() { return '<img src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABgAAAAYCAQAAABKfvVzAAABrklEQVR42p2Uv0oDQRDG9y5a6AvERrDxzztYWQhJISoYEFsREUWtxE6wFDst9T18A1HT5wkkJARjI+aSu/zcfEyWI2ICfsPt7sx+Mzc7+8cNQYHIfwXnWAcyL7A2sGsmdnkQEdloxn/XQOIFLmQRiIkCXXHPeWVR+gPQ9QL30pd448j30+aC77gE4IsdtmmElOpsscc3AMfOKTEUXZQEQWNrDR21+wO2vHgGEoubiph6QZp0uTwFB+b5AFH6gaw+WKDJnJKioMpsAJkmewC0vWBaX/bSoGKhvOyiSX01yhS9lKnlrBWjUuaKR1ooY9FnnYFZuaRWsVvOWHUYbKlQ1q8jLzMKhy3f4EhJ6MrQU+5F7YztD0XaNpOJ149d7CKHGyIK7S+I1/9HSquccsP7xEW3eOSKkk1RGVvWNF/WWL8ujd24DNhUqnY05mhOPBqfLNjR8N0T0LFVjB6+THoCvKjUcjgAufx1vBONz53YSooTc9ljizpY3AbbVOwCXSq+XdEp3x5SZUX6XbiiD9KXqaLo+Vsd5x6BCzkkwLUsIw+FgTg8M2shpfXwzBSGvB+7o/AROnmHbAAAAABJRU5ErkJggg==">'; }

  protected override getClassName() { return 'config'; }
  protected override getTitle() { return 'Preferences'; }

  protected override selected() {
    this._visible = true;
    this._getToolbarEl().setActiveMode('config');
    this._getToolbarEl().showDetails(this.getToolbarDetailsEl());
  }

  protected override unselected() {
    this._visible = false;
    this._getToolbarEl().setActiveMode(null);
    this._getToolbarEl().showDetails(null as any);
  }

  protected override _addToolbarUI() {
    if (!this._shouldShow())
      return;

    super._addToolbarUI();

    this.button.addEventListener('mouseover', () => {
      if (this._visible && !this._getToolbarEl().hasDetails())
        this._getToolbarEl().showDetails(this.getToolbarDetailsEl());
    });

    this._getDocument().addEventListener('mousedown', ($event: any) => {
      if (this._visible && isLeftClick($event) && !$event.target.closest('.pdf-toolbar'))
        this._getToolbarEl().showDetails(null as any);
    });
  }

  private getToolbarDetailsEl() {
    return [buildAnnotationPrefsPanel({
      filter: this._getFilter(),
      storage: this._getStorage(),
      activeTab: 'you',
      onReplayTour: () => {
        this.button.classList.remove('selected');
        this.unselected();
        this.registry.get('tour')?.start?.(true);
      },
    })];
  }
}
