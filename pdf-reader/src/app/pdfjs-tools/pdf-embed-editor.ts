import {
  WHRect, getAnnotEl, getAnnotElBound,
  getOrParent, getPageEl, getPageNum,
  htmlToElements, isLeftClick,
  relativeToPageEl, uuid
} from './annotator-utils';
import { Annotations } from './annotations';
import { PdfRegistry } from './pdf-registry';
import { PdfEmbedViewer } from './pdf-embed-viewer';

export class PdfEmbedEditor {

  protected registry: PdfRegistry;

  enabled: boolean = false;
  onPointDrop: any;

  constructor({ registry }) {
    this.registry = registry;

    this.registry.register('embed-editor', this);
    this._getViewer().attachMoveElClass = true;
    this.registry.register(`embed-move-elements`,
      ($event, action, payload) => this._handleMoveEvents($event, action, payload));

    this.onAnnotClick();
    this._manageDroppingZone();
    this._attachStylesheet();
  }

  protected _getStorage(): Annotations { return this.registry.get('storage'); }
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
        querySelectorAll('.pdfjs-annotation__embed-viewer-popup').forEach(el => el.remove());
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
      resource: '/#/default-resource',
      thumbnail: '/assets/info.png',
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
      const isEmbed = getOrParent($event, 'pdfjs-annotation__embed'),
        isEditBtn = getOrParent($event, 'pdfjs-annotation__embed .edit-btn');
      if (isLeftClick($event) && isEmbed && isEditBtn) {
        const annotEl = getAnnotEl($event.target),
        /* */  pageEl = getPageEl($event.target);
        this._removePopups($event);

        const annotId: any = annotEl.getAttribute('data-annotation-id');
        const annot = this._getStorage().read(annotId);
        if (!pageEl.querySelector(`.pdfjs-annotation__embed-editor-popup[data-embed-id="${annotId}"]`)) {
          const bound = getAnnotElBound(pageEl.querySelector(`[data-annotation-id="${annotId}"]`));
          this._showEditorPopup(annot, getPageNum(pageEl), bound);
        }
      } else if (!$event.target.closest('.pdfjs-annotation__embed-editor-popup')) {
        this._removePopups($event);
      }
    });
  }

  private _removePopups($event: any) {
    $event.target.closest('.pdfViewer')?.querySelectorAll('.pdfjs-annotation__embed-editor-popup').forEach(el => el.remove());
  }

  private _showEditorPopup(annot: any, pageNum: number, bound: WHRect) {
    const popupEl = htmlToElements(
      `<div class="pdfjs-annotation__embed-editor-popup" data-embed-id="${annot.id}">
        ${this._getContainerEl(annot)}
        <style>
          .pdfjs-annotation__embed-editor-popup {
            position: absolute;
            top: calc(100% - ${bound.bottom}%);
            left: ${bound.left}%;
            width: ${bound.width ? bound.width + '%' : 'fit-content'};
            height: ${bound.height ? bound.height + '%' : 'fit-content'};
            max-width: 50%;
            max-height: 50%;
            display: flex;
            flex-direction: column;
            pointer-events: auto;
            z-index: 6;
            box-shadow: rgba(0, 0, 0, 0.16) 0px 3px 6px, rgba(0, 0, 0, 0.23) 0px 3px 6px;
          }
        </style>
      </div>`);

    this.registry.get('annotation-layer')
      .getOrAttachLayerEl(pageNum)
      .appendChild(popupEl);

    const containerEl = popupEl.querySelector('.pdfjs-annotation__embed-editor-popup-controls') as HTMLElement;

    const elems = {
      inline: containerEl.querySelector('.pdfjs-annotation__embed-editor-popup-inline-iframe-option') as any,
      popup: containerEl.querySelector('.pdfjs-annotation__embed-editor-popup-popup-iframe-option') as any,
      page: containerEl.querySelector('.pdfjs-annotation__embed-editor-popup-new-page-option') as any,
      size: containerEl.querySelector('.pdfjs-annotation__embed-editor-popup-target-size-options') as any,
      fullscreen: containerEl.querySelector('.pdfjs-annotation__embed-editor-popup-fullscreen-option') as any,
      fullpage: containerEl.querySelector('.pdfjs-annotation__embed-editor-popup-fullpage-option') as any,
      custom: containerEl.querySelector('.pdfjs-annotation__embed-editor-popup-custom-size-option') as any,
      thumbnail: containerEl.querySelector('.pdfjs-annotation__embed-editor-popup-thumbnail-url') as any,
      resource: containerEl.querySelector('.pdfjs-annotation__embed-editor-popup-resource-url') as any,
    }

    // update target based on radio button (new-page/inline-iframe/popup-iframe) selection 
    elems.page.querySelector('input[type="radio"]').addEventListener('change',
      ($ev: any) => annot.target = $ev.target.checked ? 'new-page' : annot.target);
    elems.inline.querySelector('input[type="radio"]').addEventListener('change',
      ($ev: any) => annot.target = $ev.target.checked ? 'inline-iframe' : annot.target);
    elems.popup.querySelector('input[type="radio"]').addEventListener('change',
      ($ev: any) => {
        annot.target = $ev.target.checked ? 'popup-iframe' : annot.target;
        elems.size.style.display = $ev.target.checked ? 'block' : 'none';
      });

    const setTargetSize = (value: string) => {
      annot.targetSize = value;
      whinputs.forEach((input: HTMLInputElement) =>
        input.disabled = ['fullscreen', 'fullpage'].indexOf(value) >= 0);
    };

    // update targetSize based on radio button (fullscreen/fullpage/custom) selection
    elems.fullscreen.querySelector('input[type="radio"]').addEventListener('change',
      ($ev: any) => { if ($ev.target.checked) setTargetSize('fullscreen'); });
    elems.fullpage.querySelector('input[type="radio"]').addEventListener('change',
      ($ev: any) => { if ($ev.target.checked) setTargetSize('fullpage'); });
    elems.custom.querySelector('input[type="radio"]').addEventListener('change',
      ($ev: any) => {
        if ($ev.target.checked) {
          setTargetSize('640px,480px');
          whinputs.forEach((input: HTMLInputElement, i: number) =>
            input.value = '640px,480px'.split(',')[i]);
        }
      });

    // update targetSize if custom width/height is changed
    const whinputs = elems.custom.querySelectorAll('input[type="text"]');
    whinputs.forEach((input: HTMLInputElement) => input.addEventListener('change',
      ($ev) => annot.targetSize = `${whinputs[0].value},${whinputs[1].value}`));

    // update resource/thumbnail url if changed
    elems.thumbnail.querySelector('input[type="text"]').addEventListener('change',
      ($ev: any) => annot.thumbnail = $ev.target.value);
    elems.resource.querySelector('input[type="text"]').addEventListener('change',
      ($ev: any) => annot.resource = $ev.target.value);

    // on any change, update (and render) the annotation
    containerEl.querySelectorAll('input').forEach((input: HTMLInputElement) => {
      input.addEventListener('change', ($ev: any) => {
        elems.size.style.display = annot.target == 'popup-iframe' ? 'block' : 'none';
        elems.thumbnail.style.display = annot.target == 'inline-iframe' ? 'none' : 'block';
        this._getStorage().update(annot, () => this._getViewer().render(annot));
      });
    });
  }

  private _getContainerEl(annot: any) {
    const checked = (bool: boolean) => bool ? 'checked' : '';
    const customTargetSize = annot.targetSize && ['fullscreen', 'fullpage'].indexOf(annot.targetSize) < 0
      ? annot.targetSize.split(',')
      : '320px,240px'.split(',');

    const fullscreen = checked(annot.targetSize == 'fullscreen')
    const fullpage = checked(annot.targetSize == 'fullpage')
    const custom = checked(['fullscreen', 'fullpage'].indexOf(annot.targetSize || '') < 0)

    const tmpid = Math.random().toString(36).substring(2);

    return `<div class="pdfjs-annotation__embed-editor-popup-controls"> 
        <div class="pdfjs-annotation__embed-editor-popup-resource-url">
          <span>Resource:</span>
          <input type="text" placeholder="url" value="${annot.resource || ''}" autocomplete="off"/>
        </div>
        <div class="pdfjs-annotation__embed-editor-popup-inline-iframe-option">
          <input id="${tmpid}-inline-iframe" type="radio" name="pdfjs-embed-resource-target" ${checked(annot.target == 'inline-iframe')}/>
          <label for="${tmpid}-inline-iframe">Embed Inline</label>
        </div>
        <div class="pdfjs-annotation__embed-editor-popup-popup-iframe-option">
          <input id="${tmpid}-popup-iframe" type="radio" name="pdfjs-embed-resource-target" ${checked(annot.target == 'popup-iframe')}/>
          <label for="${tmpid}-popup-iframe">Open in Popup</label>
        </div>
        <div class="pdfjs-annotation__embed-editor-popup-target-size-options" 
          style="${annot.target != 'popup-iframe' ? 'display: none;' : ''}">
          <div class="pdfjs-annotation__embed-editor-popup-fullscreen-option">
            <input id="${tmpid}-fullscreen" type="radio" name="target-size" ${fullscreen}/>
            <label for="${tmpid}-fullscreen">Fullscreen</label>
          </div>
          <div class="pdfjs-annotation__embed-editor-popup-fullpage-option">
            <input id="${tmpid}-fullpage" type="radio" name="target-size" ${fullpage}/>
            <label for="${tmpid}-fullpage">Fullpage</label>
          </div>
          <div class="pdfjs-annotation__embed-editor-popup-custom-size-option">
            <input id="${tmpid}-custom" type="radio" name="target-size" ${custom}/>
            <label for="${tmpid}-custom">
              <span>Custom </span>
              <input type="text" placeholder="640px" value="${customTargetSize[0]}" ${custom ? '' : 'disabled'} />
              <span>x</span>
              <input type="text" placeholder="480px" value="${customTargetSize[1]}" ${custom ? '' : 'disabled'} />
            </label>
          </div>
        </div>
        <div class="pdfjs-annotation__embed-editor-popup-new-page-option">
          <input id="${tmpid}-new-page" type="radio" name="pdfjs-embed-resource-target" ${checked(annot.target == 'new-page')}/>
          <label for="${tmpid}-new-page">Open in New Page</label>
        </div>
        <div class="pdfjs-annotation__embed-editor-popup-thumbnail-url">
          <span>Thumbnail:</span>
          <input type="text" placeholder="url" value="${annot.thumbnail || ''}" autocomplete="off"/>
        </div>
      </div>`;
  }

  private _attachStylesheet() {
    this.registry.getDocumentEl().querySelector('head').appendChild(htmlToElements(
      `<style>
        .pdf-embed-editor__dropping-zone .textLayer {
          cursor: grabbing;
        }
        
        .pdfjs-annotation__embed-editor-popup-embed-btns {
          display: flex;
          align-items: center;
          justify-content: space-evenly;
          column-gap: 0.125rem;
          z-index: 1;
        }
        
        .pdfjs-annotation__embed-editor-popup-embed-btns button {
          flex-grow: 1;
          display: flex;
          align-items: center;
          column-gap: 0.25rem;
        }
        
        .pdfjs-annotation__embed:active {
          cursor: grabbing;
        }
        
        .pdfjs-annotation__embed-editor-popup-title {
          font-weight: bold;
        }
        
        .pdfjs-annotation__embed-editor-popup-controls {
          width: 15rem;
          display: flex;
          flex-direction: column;
          border-left: solid 2px #ccc;
          padding: 0.5rem;
          background-color: white;
          gap: 0.25rem;
        }
        
        .pdfjs-annotation__embed-editor-popup-target-size-options {
          margin-left: 10px;
        }
        
        .pdfjs-annotation__embed-editor-popup-custom-size-option input[type="text"] {
          width: 40px;
        }
        
        .pdfjs-annotation__embed-editor-popup-resource-url,
        .pdfjs-annotation__embed-editor-popup-thumbnail-url {
          display: flex;
        }
        
        .pdfjs-annotation__embed-editor-popup-resource-url input,
        .pdfjs-annotation__embed-editor-popup-thumbnail-url input {
          flex-grow: 1;
          margin-left: 0.125rem;
        }        
      </style>`));
  }
}