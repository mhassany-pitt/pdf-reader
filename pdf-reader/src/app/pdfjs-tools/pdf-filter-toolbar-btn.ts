import { PdfFilter } from './pdf-filter';
import { PdfStorage } from './pdf-storage';
import { PdfToolbarBtn } from './pdf-toolbar-btn';
import { getOrParent, htmlToElements, isLeftClick } from './pdf-utils';

export class PdfFilterToolbarBtn extends PdfToolbarBtn {

  private _visible: boolean = false;

  constructor({ registry }) {
    super({ registry });

    this.registry.register(`configs.default.filter`, () => this._defaultConfigs());

    this._addToolbarUI();
  }

  protected _configs() { return this.registry.get(`configs.filter`); }
  protected _defaultConfigs() { return PdfFilterToolbarBtn.defaultConfigs(); }
  static defaultConfigs() {
    return true;
  }

  private _getDocument() { return this.registry.getDocument(); }
  private _getDocumentEl() { return this.registry.getDocumentEl(); }
  private _getStorage(): PdfStorage { return this.registry.get('storage'); }

  private _getFilter(): PdfFilter { return this.registry.get('filter'); }

  protected override getIcon() { return '<img src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADIAAAAyCAQAAAC0NkA6AAABIUlEQVR42mNgGGbg/6n/tAAnUC2hERiulhyniR3HUS0R+X+V6lbc+i+Onr6k/9+jqhWP/stjS8bK/59SzYqX/9Vx5Rad/2+oYsX7/wb4MqXp/08UW/HlvxWhvG/1/wtFVnz770BMEeP2/wfZVvz670NsSRb0/w9ZVvz9H0lKgZnw/x/JVvz7n05quZxHsiVl5BT/zSRZ0URuLdNDtBVTyK/KGP/PJsqKRf+ZKKkxmf+vJGjF+v8slFbMbP+34rVi9392atT/nP8P4rTi2H8eajUz+P/vw2rF0f/8DKMAS4AR01AYtWTUklFLRi0ZtWRIW3KKHpZw/m/4/53GlkB7YptpbgnYIl/UniWtKmKUgKNljQ8POFo3Lfz+3/p/dKQ1qAA6UjA1uNo39gAAAABJRU5ErkJggg==">'; }

  protected override getClassName() { return 'filter'; }
  protected override getTitle() { return 'Filter'; }

  private _getSelecteds() { return this._getFilter().getSelecteds(); }
  private _setSelecteds(selected: any) { return this._getFilter().setSelecteds(selected); }

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
    return [this._getFilterEl(), this._getDisplayNameEl()];
  }

  private _getFilterEl() {
    const containerEl = htmlToElements(
      `<div class="pdf-annotation-toolbar__filter">
        <div class="pdf-annotation-toolbar__annotator-options">
          <select>
            <option value="none">Hide Annotations</option>
            <option value="mine">My Annotations</option>
            <option value="all">All Annotations</option>
            ${this._getFilter().getAnnotators().map(displayName =>
        `<option value="${displayName}">${displayName}</option>`).join('')}
          </select>
          <button type="button">Show</button>
        </div>
        <div class="pdf-annotation-toolbar__annotators"></div>
        <style>
          .pdf-annotation-toolbar__filter {
            display: flex;
            flex-direction: column;
            gap: 0.125rem;
            width: 12.5rem;
          }

          .pdf-annotation-toolbar__annotator-options {
            display: flex;
            align-items: center;
            gap: 0.125rem;
          }
          .pdf-annotation-toolbar__annotator-options > select {
            flex-grow: 1;
          }
          .pdf-annotation-toolbar__annotator-options > span {
            display: none;
          }

          .pdf-annotation-toolbar__annotators {
            border-left: 2px solid lightgray;
            padding-left: 0.125rem;
          }

          .pdf-annotation-toolbar__annotator {
            display: inline-flex;
            align-items: center;
            gap: 0.25rem;
            font-size: 0.85rem;
            padding: 0 0.125rem;
            background-color: #38383d;
            color: white;
          }
  
          .pdf-annotation-toolbar__annotator > button {
            height: 0.75rem;
            line-height: 0;
          }
        </style>
      </div>`);

    const selectEl = containerEl.querySelector('.pdf-annotation-toolbar__annotator-options select') as HTMLSelectElement;
    const showBtnEl = containerEl.querySelector('.pdf-annotation-toolbar__annotator-options button') as HTMLButtonElement;
    const annotatorsEl = containerEl.querySelector('.pdf-annotation-toolbar__annotators') as HTMLElement;

    const filtered = () => this._getSelecteds().filter(id => ['none', 'mine', 'all'].includes(id) === false);
    const updateFilterUI = async (force?: boolean) => {
      const html = filtered().map(displayName =>
        `<div class="pdf-annotation-toolbar__annotator" data-annotator-id="${displayName}">
          <span>${displayName}</span>
          <button type="button" class="pdf-annotation-toolbar__annotator-unselect-btn">x</button>
        </div>`).join('')

      annotatorsEl.innerHTML = html;
      annotatorsEl.style.display = html ? 'block' : 'none';

      const nma = ['none', 'mine', 'all'].includes(selectEl.value);
      showBtnEl.style.display = nma ? 'none' : 'block';
      showBtnEl.disabled = this._getSelecteds().length >= 10;

      this._getFilter().persist();
      if (nma || force) {
        this._getStorage().qparams['annotators'] = this._getSelecteds().join(',');
        this._getStorage().reload(true);
      }
    }

    updateFilterUI(true);

    selectEl.value = this._getSelecteds().length ? this._getSelecteds()[0] : 'none';
    selectEl.addEventListener('change', () => {
      const nma = ['none', 'mine', 'all'].includes(selectEl.value);
      this._setSelecteds(nma ? [selectEl.value] : filtered());
      updateFilterUI(nma);
    });

    showBtnEl.addEventListener('click', () => {
      if (!this._getSelecteds().includes(selectEl.value))
        this._getSelecteds().push(selectEl.value);
      updateFilterUI(true);
    });

    annotatorsEl.addEventListener('click', ($event: any) => {
      if (getOrParent($event, '.pdf-annotation-toolbar__annotator-unselect-btn')) {
        const annotId = $event.target.closest('div').getAttribute('data-annotator-id');
        this._getSelecteds().splice(this._getSelecteds().indexOf(annotId), 1);
        updateFilterUI(true);
      }
    });

    return containerEl;
  }

  private _getDisplayNameEl() {
    const containerEl = htmlToElements(
      `<form class="pdf-annotation-toolbar__display-name" autocomplete="off">
        <input placeholder="Display Name" value="${this._getFilter().getDisplayName()}" />
        <span>it will be used to mark your annotations.</span>
        <style>
          .pdf-annotation-toolbar__display-name {
            display: flex;
            flex-direction: column;
            border-top: solid 1px lightgray;
            margin-top: 0.25rem;
            padding-top: 0.25rem;
          }

          .pdf-annotation-toolbar__display-name > input {
            outline: none;
          }
          .pdf-annotation-toolbar__display-name > span {
            font-size: 0.75rem;
            color: lightgray;
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
}