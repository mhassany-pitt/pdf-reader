import { PdfStorage } from './pdf-storage';
import { htmlToElements, isRightClick } from './pdf-utils';
import { Annotator, POPUP_ROW_ITEM_UI } from './annotator';
import { environment } from 'src/environments/environment';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

export class AnnotationFilter {
  private document: any;
  private documentEl: any;

  private storage: PdfStorage;
  private annotator: Annotator;

  private http: HttpClient;
  private groupId: string;

  private annotators;
  private selecteds: string[] = [];

  private checkpoint;

  constructor({ http, iframe, annotator, storage, groupId }) {
    this.document = iframe?.contentDocument;
    this.documentEl = this.document.documentElement;

    this.storage = storage;
    this.annotator = annotator;
    this.http = http;
    this.groupId = groupId;

    this._load();

    this._attachStylesheet();
    this._registerPopupFilterAnnotsItemUI();
  }

  async loadAnnotators() {
    try {
      const api = `${environment.apiUrl}/annotations/${this.groupId}/annotators`;
      const req = this.http.get(api, { withCredentials: true });
      this.annotators = await firstValueFrom(req) as any;
    } catch (error) {
      console.error(error);
    }
  }

  private _attachStylesheet() {
    this.documentEl.querySelector('head').appendChild(htmlToElements(
      `<style>
        .pdfjs-annotation-filter {
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
        }

        .pdfjs-annotation-filter__header {
          display: flex;
          align-items: center;
          gap: 0.25rem;
        }

        .pdfjs-annotation-filter__header > img {
          width: 0.85rem;
          height: 0.85rem;
        }
        .pdfjs-annotation-filter__header > select {
          flex: 1;
        }
        .pdfjs-annotation-filter__header > button {
          display: none;
        }

        .pdfjs-annotation-filter__content {
          display: none;
          border-left: 2px solid lightgray;
          padding-left: 0.25rem;
        }
        
        .pdfjs-annotation-filter__selected {
          display: inline-flex;
          align-items: center;
          gap: 0.25rem;
          border: 1px solid lightgray;
          border-radius: 0.25rem;
          font-size: 0.85rem;
        }

        .pdfjs-annotation-filter__selected > button {
          height: 0.75rem;
          line-height: 0;
        }
      </style>`
    ));
  }

  private _load() {
    this.selecteds = JSON.parse(localStorage.getItem('pdfjs-annotation-filter') || '[]');
  }

  private _persist() {
    localStorage.setItem('pdfjs-annotation-filter', JSON.stringify(this.selecteds));
  }

  private _registerPopupFilterAnnotsItemUI() {
    this.annotator.register(POPUP_ROW_ITEM_UI, ($event: any) => {
      if (isRightClick($event)) {
        const containerEl = htmlToElements(
          `<div class="pdfjs-annotation-filter">
            <div class="pdfjs-annotation-filter__header">
              <img src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAA+klEQVR4AaXSNU4FURTG8cHdnQZnCbg0OJS41Tj0bAB3p8UdNoHrivi/5Ezy4fJO8ptr3x13qAA0Yxi96PtBr2Wbba+TgyvUoBttaP9Cm2VqbE+uUz3S4FDjqPf0f4OqxaSnr5P7aLZ+KPzgb/wQamtNOJB9jp8MjlBt/UCZD7S2Escy7+d2/N0gLlD8yW0X4RxBukcD7kmicIoCJJh8m4vWrJwAoAKsTccLlswLMjTz1Ql8rI3BgswvIkYzX53A19pErMv8OhIl8+MJEqAnWEPCX0+w5O0J9GfZ+NUJFDWKTaRiFkl/OoGFy7CNe4T99BWU/lh+KNcrq1dAtKfIAniV1AAAAABJRU5ErkJggg=="/>

              <select>
                <option value="none">My Annotations</option>
                <option value="all">All Annotations</option>
                ${this.annotators.map(user => `<option value="${user.id}">${user.fullname}</option>`).join('')}
              </select>
              <button type="button">Show</button>
            </div>
            <div class="pdfjs-annotation-filter__content"></div>
          </div>`);

        const selectEl = containerEl.querySelector('.pdfjs-annotation-filter__header select') as HTMLSelectElement;
        const addBtnEl = containerEl.querySelector('.pdfjs-annotation-filter__header button') as HTMLButtonElement;
        const contentEl = containerEl.querySelector('.pdfjs-annotation-filter__content') as HTMLDivElement;

        this.checkpoint = JSON.stringify(this.selecteds);

        const excludeNoneAll = () => this.selecteds.filter(id => id != 'none' && id != 'all');
        const refreshContentListUI = async () => {
          const listHtml = excludeNoneAll().map(id => {
            const fullname = this.annotators.filter(user => user.id == id)[0].fullname;
            return `<div class="pdfjs-annotation-filter__selected" data-annotator-id="${id}">
                <span>${fullname}</span>
                <button type="button">x</button>
              </div>`;
          }).join('')
          contentEl.innerHTML = listHtml;
          contentEl.style.display = listHtml ? 'block' : 'none';
          addBtnEl.style.display = ['none', 'all'].indexOf(selectEl.value) >= 0 ? 'none' : 'block';
          addBtnEl.disabled = this.selecteds.length >= 10;
          this._persist();
          this.storage.qparams['annotators'] = this.selecteds.join(',');
          this.storage.reload();
        }

        refreshContentListUI();

        selectEl.value = this.selecteds.length ? this.selecteds[0] : 'none';
        selectEl.addEventListener('change', () => {
          this.selecteds = ['none', 'all'].indexOf(selectEl.value) >= 0
            ? [selectEl.value]
            : excludeNoneAll();
          refreshContentListUI();
        });

        addBtnEl.addEventListener('click', () => {
          if (this.selecteds.indexOf(selectEl.value) < 0)
            this.selecteds.push(selectEl.value);
          refreshContentListUI();
        });

        contentEl.addEventListener('click', ($event: any) => {
          if ($event.target.tagName == 'BUTTON') {
            $event.stopPropagation();
            const divEl = $event.target.closest('div');
            const annotatorId = divEl.getAttribute('data-annotator-id');
            this.selecteds.splice(this.selecteds.indexOf(annotatorId), 1);
            refreshContentListUI();
          }
        });

        return containerEl;
      }

      return null as any;
    }, 999 /* top in popup list */);
  }
}

// TODO: add annotation filter