import {
  WHRect, getAnnotEl, getAnnotElBound,
  getOrParent, getPageEl, getPageNum,
  htmlToElements, isLeftClick,
  relativeToPageEl, removeSelectorAll, uuid
} from './pdf-utils';
import { PdfStorage } from './pdf-storage';
import { PdfRegistry } from './pdf-registry';
import { PdfEmbedViewer } from './pdf-embed-viewer';

export class PdfEmbedEditor {

  protected registry: PdfRegistry;

  enabled: boolean = false;
  onPointDrop: any;

  constructor({ registry }) {
    this.registry = registry;

    this.registry.register('embed-editor', this);
    this.registry.register(`embed-move-elements`,
      ($event, action, payload) => this._handleMoveEvents($event, action, payload));

    this.registry.register(`storage.deleted.${Math.random()}`, (annot) => {
      if (annot.type == 'embed') {
        removeSelectorAll(this._getDocumentEl(),
          `.pdf-annotation__embed-editor-popup[data-embed-id="${annot.id}"]`);
      }
    });

    this.onAnnotClick();
    this._manageDroppingZone();
    this._attachStylesheet();
  }

  protected _configs() { return this.registry.get(`configs.embed`); }

  protected _getStorage(): PdfStorage { return this.registry.get('storage'); }
  protected _getDocument() { return this.registry.getDocument(); }
  protected _getDocumentEl() { return this.registry.getDocumentEl(); }
  private _getViewer(): PdfEmbedViewer { return this.registry.get('embed-viewer'); }

  setEnabled(enable: boolean) {
    this.enabled = enable;
    if (!this.enabled)
      this._removeDropzones();
  }

  private _handleMoveEvents($event, action: string, payload: any) {
    if (action == 'moving-completed') {
      const { top, left, right, bottom } = payload.rect;
      const annot = this._getStorage().read(payload.id);
      annot.rects = { [annot.pages[0]]: [{ top, left, right, bottom }] };
      this._getStorage().update(annot);
      const annotEl = this._getDocumentEl().querySelector(`[data-annotation-id="${annot.id}"]`);
      this._getViewer().fitIframeToParent(annotEl);
    } else if (action == 'moving-started') {
      this._getDocumentEl().querySelector('.pdfViewer')?.
        querySelectorAll('.pdf-annotation__embed-viewer-popup').forEach(el => el.remove());
    }
  }

  protected pointDropped(pageEl, $event) {
    this.onPointDrop?.();
    const { left, top } = relativeToPageEl({ left: $event.clientX, top: $event.clientY } as any, pageEl);
    const page = getPageNum(pageEl);
    const annot = {
      id: uuid(),
      type: 'embed',
      rects: { [page]: [{ left, top, right: 100 - left, bottom: 100 - top }] },
      pages: [page],
      resource: this._configs()?.resource,
      thumbnail: this._configs()?.thumbnail,
      target: 'popup-iframe',
    };
    this._getStorage().create(annot, () => this._getViewer().render(annot));
  }

  private _manageDroppingZone() {
    this._getDocument().addEventListener("mousemove", ($event: any) => {
      if (this.enabled)
        getPageEl($event.target)?.classList.add(`pdf-embed-editor__dropping-zone`);
    });

    this._getDocument().addEventListener("click", ($event: any) => {
      const pageEl = getPageEl($event.target);
      if (this.enabled && pageEl) {
        this.setEnabled(false);
        this.pointDropped(pageEl, $event);
      }
    });
  }

  private _removeDropzones() {
    [...this._getDocument().querySelectorAll(`.pdf-embed-editor__dropping-zone`)].forEach(el => {
      el.classList.remove(`pdf-embed-editor__dropping-zone`);
    });
  }

  protected onAnnotClick() {
    this._getDocument().addEventListener('click', async ($event: any) => {
      const embed = getOrParent($event, '.pdf-annotation__embed'),
        editBtn = getOrParent($event, '.pdf-annotation__embed-edit-btn');
      if (isLeftClick($event) && embed && editBtn) {
        const annotEl = getAnnotEl($event.target),
        /* */  pageEl = getPageEl($event.target);
        this.removePopups();

        const annotId: any = annotEl.getAttribute('data-annotation-id');
        const annot = this._getStorage().read(annotId);
        if (!pageEl.querySelector(`.pdf-annotation__embed-editor-popup[data-embed-id="${annotId}"]`)) {
          const bound = getAnnotElBound(pageEl.querySelector(`[data-annotation-id="${annotId}"]`));
          this._showEditorPopup(annot, getPageNum(pageEl), bound);
        }
      } else if (!$event.target.closest('.pdf-annotation__embed-editor-popup')) {
        this.removePopups();
      }
    });
  }

  removePopups() {
    this._getDocumentEl().querySelectorAll('.pdf-annotation__embed-editor-popup').forEach(el => el.remove());
  }

  private _showEditorPopup(annot: any, pageNum: number, bound: WHRect) {
    if (!this._configs())
      return;

    const popupEl = htmlToElements(
      `<form class="pdf-annotation__embed-editor-popup" data-embed-id="${annot.id}" autocomplete="off">
        ${this._getContainerEl(annot)}
        <style>
          .pdf-annotation__embed-editor-popup {
            position: absolute;
            top: calc(100% - ${bound.bottom}%);
            left: ${bound.left}%;
            width: ${bound.width ? bound.width + '%' : 'fit-content'};
            height: ${bound.height ? bound.height + '%' : 'fit-content'};
            max-width: 50%;
            max-height: 50%;
            display: flex;
            flex-direction: column;
            text-align: left;
            pointer-events: auto;
            z-index: 6;
            box-shadow: rgba(0, 0, 0, 0.16) 0px 3px 6px, rgba(0, 0, 0, 0.23) 0px 3px 6px;
          }
        </style>
      </form>`);

    popupEl.onsubmit = () => false;

    this.registry.get('annotation-layer')
      .getOrAttachLayerEl(pageNum)
      .appendChild(popupEl);

    const containerEl = popupEl.querySelector('.pdf-annotation__embed-editor-popup-controls') as HTMLElement;
    const elems = {
      inline: containerEl.querySelector('.pdf-annotation__embed-editor-popup-inline-iframe-row') as any,
      popup: containerEl.querySelector('.pdf-annotation__embed-editor-popup-popup-iframe-row') as any,
      page: containerEl.querySelector('.pdf-annotation__embed-editor-popup-new-page-row') as any,
      size: containerEl.querySelector('.pdf-annotation__embed-editor-popup-target-size-row') as any,
      fullscreen: containerEl.querySelector('.pdf-annotation__embed-editor-popup-fullscreen-row') as any,
      fullpage: containerEl.querySelector('.pdf-annotation__embed-editor-popup-fullpage-row') as any,
      custom: containerEl.querySelector('.pdf-annotation__embed-editor-popup-custom-size-row') as any,
      thumbnail: containerEl.querySelector('.pdf-annotation__embed-editor-popup-thumbnail-url-row') as any,
      resource: containerEl.querySelector('.pdf-annotation__embed-editor-popup-resource-url-row') as any,
    };

    // update target based on radio button (new-page/inline-iframe/popup-iframe) selection 
    elems.page?.querySelector('input[type="radio"]')
      .addEventListener('change', ($ev: any) => annot.target = $ev.target.checked ? 'new-page' : annot.target);
    elems.inline?.querySelector('input[type="radio"]')
      .addEventListener('change', ($ev: any) => annot.target = $ev.target.checked ? 'inline-iframe' : annot.target);
    elems.popup?.querySelector('input[type="radio"]')
      .addEventListener('change', ($ev: any) => {
        annot.target = $ev.target.checked ? 'popup-iframe' : annot.target;
        if (elems.size) elems.size.style.display = $ev.target.checked ? 'block' : 'none';
      });

    const setTargetSize = (value: string) => {
      annot.targetSize = value;
      whinputs.forEach((input: HTMLInputElement) =>
        input.disabled = ['fullscreen', 'fullpage'].indexOf(value) >= 0);
    };

    // update targetSize based on radio button (fullscreen/fullpage/custom) selection
    elems.fullscreen?.querySelector('input[type="radio"]')
      .addEventListener('change', ($ev: any) => { if ($ev.target.checked) setTargetSize('fullscreen'); });
    elems.fullpage?.querySelector('input[type="radio"]')
      .addEventListener('change', ($ev: any) => { if ($ev.target.checked) setTargetSize('fullpage'); });
    elems.custom?.querySelector('input[type="radio"]')
      .addEventListener('change', ($ev: any) => {
        const configs = this._configs();
        if ($ev.target.checked && configs?.popup) {
          setTargetSize(configs.popup.customSize);
          whinputs.forEach((input: HTMLInputElement, i: number) =>
            input.value = configs.popup.customSize?.split(',')[i]);
        }
      });

    // update targetSize if custom width/height is changed
    const whinputs = elems.custom?.querySelectorAll('input[type="text"]');
    whinputs?.forEach((input: HTMLInputElement) => input
      .addEventListener('change', ($ev) => annot.targetSize = `${whinputs[0].value},${whinputs[1].value}`));

    // update resource/thumbnail url if changed
    elems.thumbnail?.querySelector('input[type="text"]')
      .addEventListener('change', ($ev: any) => annot.thumbnail = $ev.target.value);
    elems.resource?.querySelector('input[type="text"]')
      .addEventListener('change', ($ev: any) => annot.resource = $ev.target.value);

    // on any change, update (and render) the annotation
    containerEl.querySelectorAll('input').forEach((input: HTMLInputElement) => {
      input.addEventListener('change', ($ev: any) => {
        if (elems.size) /**/ elems.size.style.display = annot.target == 'popup-iframe' ? 'block' : 'none';
        if (elems.thumbnail) elems.thumbnail.style.display = annot.target == 'inline-iframe' ? 'none' : 'block';
        this._getStorage().update(annot, () => this._getViewer().render(annot));
      });
    });
  }

  private _getContainerEl(annot: any) {
    const configs = this._configs();

    const checked = (bool: boolean) => bool ? 'checked' : '';
    const customTargetSize = (
      annot.targetSize &&
      ['fullscreen', 'fullpage'].indexOf(annot.targetSize) < 0
    ) ? annot.targetSize.split(',')
      : configs?.popup?.customSize?.split(',');

    const fullscreen = checked(annot.targetSize == 'fullscreen')
    const fullpage = checked(annot.targetSize == 'fullpage')
    const custom = checked(['fullscreen', 'fullpage'].indexOf(annot.targetSize || '') < 0)

    const tmpid = Math.random().toString(36).substring(2);

    return `
      <div class="pdf-annotation__embed-editor-popup-controls"> 
        <div class="pdf-annotation__embed-editor-popup-resource-url-row">
          <span>Resource:</span>
          <input type="text" placeholder="url" value="${annot.resource || configs?.resource}" 
            class="pdf-annotation__embed-editor-popup-resource-url"/>
        </div>
        ${configs?.inline ?
        `<div class="pdf-annotation__embed-editor-popup-inline-iframe-row">
          <input id="${tmpid}-inline-iframe" type="radio" value="void" name="pdf-embed-resource-target" ${checked(annot.target == 'inline-iframe')}
            class="pdf-annotation__embed-editor-popup-inline-iframe-option"/>
          <label for="${tmpid}-inline-iframe">Embed Inline</label>
        </div>` : ''}
        ${configs?.popup ?
        `<div class="pdf-annotation__embed-editor-popup-popup-iframe-row">
          <input id="${tmpid}-popup-iframe" type="radio" value="void" name="pdf-embed-resource-target" ${checked(annot.target == 'popup-iframe')} 
            class="pdf-annotation__embed-editor-popup-popup-iframe-option"/>
          <label for="${tmpid}-popup-iframe">Open in Popup</label>
        </div>
        <div class="pdf-annotation__embed-editor-popup-target-size-row" 
          style="${annot.target != 'popup-iframe' ? 'display: none;' : ''}">
          ${configs?.popup.fullscreen ?
          `<div class="pdf-annotation__embed-editor-popup-fullscreen-row">
            <input id="${tmpid}-fullscreen" type="radio" value="void" name="target-size" ${fullscreen} 
              class="pdf-annotation__embed-editor-popup-fullscreen-option"/>
            <label for="${tmpid}-fullscreen">Fullscreen</label>
          </div>`: ''}
          ${configs?.popup.fullpage ?
          `<div class="pdf-annotation__embed-editor-popup-fullpage-row">
            <input id="${tmpid}-fullpage" type="radio" value="void" name="target-size" ${fullpage} 
              class="pdf-annotation__embed-editor-popup-fullpage-option"/>
            <label for="${tmpid}-fullpage">Fullpage</label>
          </div>`: ''}
          ${configs?.popup.custom ?
          `<div class="pdf-annotation__embed-editor-popup-custom-size-row">
            <input id="${tmpid}-custom" type="radio" value="void" name="target-size" ${custom} 
              class="pdf-annotation__embed-editor-popup-custom-size-option"/>
            <label for="${tmpid}-custom">
              <span>Custom </span>
              <input type="text" placeholder="${customTargetSize[0]}" value="${customTargetSize[0]}" ${custom ? '' : 'disabled'} 
                class="pdf-annotation__embed-editor-popup-custom-size-width"/>
              <span>x</span>
              <input type="text" placeholder="${customTargetSize[1]}" value="${customTargetSize[1]}" ${custom ? '' : 'disabled'} 
                class="pdf-annotation__embed-editor-popup-custom-size-height"/>
            </label>
          </div>` : ''}
        </div>`: ''}
        ${configs?.newPage ?
        `<div class="pdf-annotation__embed-editor-popup-new-page-row">
          <input id="${tmpid}-new-page" type="radio" value="void" name="pdf-embed-resource-target" ${checked(annot.target == 'new-page')}
            class="pdf-annotation__embed-editor-popup-new-page-option"/>
          <label for="${tmpid}-new-page">Open in New Page</label>
        </div>` : ''}
        <div class="pdf-annotation__embed-editor-popup-thumbnail-url-row">
          <span>Thumbnail:</span>
          <input type="text" placeholder="url" value="${annot.thumbnail || configs?.thumbnail}" 
            class="pdf-annotation__embed-editor-popup-thumbnail-url"/>
        </div>
      </div>`.trim();
  }

  private _attachStylesheet() {
    this.registry
      .getDocumentEl()
      .querySelector('head')
      .appendChild(htmlToElements(
        `<style>
          .pdf-embed-editor__dropping-zone .textLayer {
            cursor: grabbing;
          }
          
          .pdf-annotation__embed:active {
            cursor: grabbing;
          }
          
          .pdf-annotation__embed-editor-popup-controls {
            width: 15rem;
            display: flex;
            flex-direction: column;
            border-left: solid 2px #ccc;
            padding: 0.5rem;
            background-color: white;
            gap: 0.25rem;
          }
          
          .pdf-annotation__embed-editor-popup-target-size-row {
            margin-left: 10px;
          }
          
          .pdf-annotation__embed-editor-popup-custom-size-row input[type="text"] {
            width: 40px;
          }
          
          .pdf-annotation__embed-editor-popup-resource-url-row,
          .pdf-annotation__embed-editor-popup-thumbnail-url-row {
            display: flex;
          }
          
          .pdf-annotation__embed-editor-popup-resource-url-row input,
          .pdf-annotation__embed-editor-popup-thumbnail-url-row input {
            flex-grow: 1;
            margin-left: 0.125rem;
          }        
        </style>`));
  }
}