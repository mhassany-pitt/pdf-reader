import { PdfFilter } from './pdf-filter';
import { PdfStorage } from './pdf-storage';
import { PdfToolbarBtn } from './pdf-toolbar-btn';
import { getOrParent, htmlToElements, isLeftClick } from './pdf-utils';

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
  private _getDocumentEl() { return this.registry.getDocumentEl(); }
  private _getStorage(): PdfStorage { return this.registry.get('storage'); }

  private _getFilter(): PdfFilter { return this.registry.get('filter'); }

  protected override getIcon() { return '<img src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABgAAAAYCAQAAABKfvVzAAABrklEQVR42p2Uv0oDQRDG9y5a6AvERrDxzztYWQhJISoYEFsREUWtxE6wFDst9T18A1HT5wkkJARjI+aSu/zcfEyWI2ICfsPt7sx+Mzc7+8cNQYHIfwXnWAcyL7A2sGsmdnkQEdloxn/XQOIFLmQRiIkCXXHPeWVR+gPQ9QL30pd448j30+aC77gE4IsdtmmElOpsscc3AMfOKTEUXZQEQWNrDR21+wO2vHgGEoubiph6QZp0uTwFB+b5AFH6gaw+WKDJnJKioMpsAJkmewC0vWBaX/bSoGKhvOyiSX01yhS9lKnlrBWjUuaKR1ooY9FnnYFZuaRWsVvOWHUYbKlQ1q8jLzMKhy3f4EhJ6MrQU+5F7YztD0XaNpOJ149d7CKHGyIK7S+I1/9HSquccsP7xEW3eOSKkk1RGVvWNF/WWL8ujd24DNhUqnY05mhOPBqfLNjR8N0T0LFVjB6+THoCvKjUcjgAufx1vBONz53YSooTc9ljizpY3AbbVOwCXSq+XdEp3x5SZUX6XbiiD9KXqaLo+Vsd5x6BCzkkwLUsIw+FgTg8M2shpfXwzBSGvB+7o/AROnmHbAAAAABJRU5ErkJggg==">'; }

  protected override getClassName() { return 'filter'; }
  protected override getTitle() { return 'Filter'; }

  protected override selected() {
    this._visible = true;
    this._getToolbarEl().showDetails(this.getToolbarDetailsEl());
  }

  protected override unselected() {
    this._visible = false;
    this._getToolbarEl().showDetails(null as any);
  }

  protected override _addToolbarUI() {
    if (!this._configs())
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
    return [this._getSeparatorEl(), this._getDisplayNameEl(), this._getVisibilityEl()];
  }

  private _getSeparatorEl() {
    return htmlToElements(
      `<div class="pdf-annotation-toolbar__filter-new-annots">
        <span>New Annotations</span>
        <style>
          .pdf-annotation-toolbar__filter-new-annots {
            color: white; 
            font-size: 0.85rem;
          }
        </style>
      </div>`);
  }

  private _getDisplayNameEl() {
    if (!this._getFilter().getDisplayName())
      this._getFilter().setDisplayName(`user:${Date.now()}`);

    const containerEl = htmlToElements(
      `<form class="pdf-annotation-toolbar__display-name-form" autocomplete="off">
        <input placeholder="Display Name" 
          title="Use a display name to mark your annotations" 
          value="${this._getFilter().getDisplayName()}" 
          class="pdf-annotation-toolbar__display-name"/>
        <style>
          .pdf-annotation-toolbar__display-name-form {
            display: flex;
            flex-direction: column;
          }
          .pdf-annotation-toolbar__display-name {
            outline: none;
          }
        </style>
      </form>`);

    containerEl.onsubmit = () => false;

    const displayNameEl = containerEl.querySelector('input') as HTMLInputElement;
    displayNameEl.addEventListener('blur', () => {
      displayNameEl.value = displayNameEl.value.replaceAll(',', '');
      this._getFilter().setDisplayName(displayNameEl.value);
      this._getFilter().persist();
    });

    return containerEl;
  }

  private _getVisibilityEl() {
    const containerEl = htmlToElements(
      `<div class="pdf-annotation-toolbar__visibility">
        <label>
          <input type="checkbox" ${this._getFilter().getVisibility() == 'private' ? 'checked' : ''} value="void" />
          <span>Private (others can't view)</span>  
        </label>
        <style>
          .pdf-annotation-toolbar__visibility > label {
            display: flex;
            align-items: center;
            gap: 0.25rem;
          }
          .pdf-annotation-toolbar__visibility span {
            font-size: 0.85rem;
            color: white;
          }
        </style>
      </div>`);

    const visibilityEl = containerEl.querySelector('input') as HTMLInputElement;
    visibilityEl.addEventListener('click', () => {
      this._getFilter().setVisibility(visibilityEl.checked ? 'private' : 'public');
      this._getFilter().persist();
    });

    return containerEl;
  }
}