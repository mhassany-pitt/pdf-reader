import { AnnotationStorage } from './annotator-storage';
import {
  closestPageEl, uuid, getPageNum,
  htmlToElements, isRightClick, relativeToPageEl,
  WHRect, isLeftClick, getOrParent
} from './annotator-utils';
import { Annotator, POPUP_ROW_ITEM_UI } from './annotator';
import { EmbeddedResourceViewer, EmbeddedResource } from './embedded-resource-viewer';

export class EmbedResource {
  private document: any;
  private documentEl: any;

  private pdfjs: any;
  private storage: AnnotationStorage<EmbeddedResource>;
  private annotator: Annotator;
  private embedLinkViewer: EmbeddedResourceViewer;

  constructor({ iframe, pdfjs, annotator, embedLinkViewer, storage }) {
    this.document = iframe?.contentDocument;
    this.documentEl = this.document.documentElement;

    this.pdfjs = pdfjs;
    this.storage = storage;
    this.annotator = annotator;
    this.embedLinkViewer = embedLinkViewer;
    this.embedLinkViewer._clickguard = ($event: any) => {
      if ($event.ctrlKey)
        $event.preventDefault();
      return $event.ctrlKey;
    }

    this._attachStylesheet();
    this._registerToggleItemUI();
    this._registerEditorItemUI();
  }

  private _attachStylesheet() {
    this.documentEl.querySelector('head').appendChild(htmlToElements(
      `<link rel="stylesheet" type="text/css" href="/assets/embed-resource.css" />`
    ));
  }

  private _registerToggleItemUI() {
    this.annotator.register(POPUP_ROW_ITEM_UI, ($event: any) => {
      if (!isRightClick($event))
        return null as any;

      $event.preventDefault();
      const containerEl = htmlToElements(
        `<div class="pdfjs-embed-resource__embed-btns">
          <button type="button" class="pdfjs-embed-resource__embed-btn">embed resource</button>
        </div>`);
      const buttonEl = containerEl.querySelector('button') as any;
      buttonEl.onclick = ($ev) => {
        const pageEl = closestPageEl($event.target);
        const pageNum = getPageNum(pageEl);
        const { top, left, right, bottom } = relativeToPageEl({
          top: $event.y,
          left: $event.x,
          bottom: $event.y + 24,
          right: $event.x + 24,
          width: 24, height: 24
        } as any, pageEl);
        const annot = {
          id: uuid(),
          type: 'embed',
          bound: { top, left, right, bottom },
          page: pageNum,
          resource: '/default-resource',
          thumbnail: '/assets/info.png',
          target: 'popup-iframe',
        };
        this.storage.create(annot, () => {
          this.embedLinkViewer.render(annot);
          this.annotator.hidePopup();
        });
      }

      return containerEl;
    });
  }

  private _registerEditorItemUI() {
    this.annotator.register(POPUP_ROW_ITEM_UI, ($event: any) => {
      if (!isRightClick($event))
        return null as any;

      const embedEl = getOrParent($event, 'pdfjs-annotation__embed');
      const rectEl = getOrParent($event, 'pdfjs-annotation__rect');
      const freeformEl = getOrParent($event, 'pdfjs-annotation__freeform');
      const el = embedEl || rectEl || freeformEl;
      if (!el) return null as any;

      const annot = this.storage.read(el.getAttribute('data-annotation-id'));
      const style = getComputedStyle(el);
      this.annotator.location = {
        top: `calc(100% - ${style.bottom})`,
        left: `${style.left}`
      };

      const containerEl = this._getContainerEl(annot);
      const elems = {
        inline: containerEl.querySelector('.pdfjs-embed-resource__inline-iframe-option') as any,
        popup: containerEl.querySelector('.pdfjs-embed-resource__popup-iframe-option') as any,
        page: containerEl.querySelector('.pdfjs-embed-resource__new-page-option') as any,
        size: containerEl.querySelector('.pdfjs-embed-resource__target-size-options') as any,
        fullscreen: containerEl.querySelector('.pdfjs-embed-resource__fullscreen-option') as any,
        fullpage: containerEl.querySelector('.pdfjs-embed-resource__fullpage-option') as any,
        custom: containerEl.querySelector('.pdfjs-embed-resource__custom-size-option') as any,
        thumbnail: containerEl.querySelector('.pdfjs-embed-resource__thumbnail-url') as any,
        resource: containerEl.querySelector('.pdfjs-embed-resource__resource-url') as any,
      }

      if (!embedEl) {
        elems.inline.style.display = 'none';
        elems.thumbnail.style.display = 'none';
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
          if (embedEl) {
            elems.thumbnail.style.display = annot.target == 'inline-iframe' ? 'none' : 'block';
            this.storage.update(annot, () => this.embedLinkViewer.render(annot));
          } else {
            this.storage.update(annot);
          }
        });
      });

      return containerEl;
    });
  }

  private _getContainerEl(annot: EmbeddedResource) {
    const id = Math.random().toString(36).substring(2);
    const checked = (bool: boolean) => bool ? 'checked' : '';
    const customTargetSize = annot.targetSize && ['fullscreen', 'fullpage'].indexOf(annot.targetSize) < 0
      ? annot.targetSize.split(',')
      : '640px,480px'.split(',');

    const fullscreen = checked(annot.targetSize == 'fullscreen')
    const fullpage = checked(annot.targetSize == 'fullpage')
    const custom = checked(['fullscreen', 'fullpage'].indexOf(annot.targetSize || '') < 0)

    return htmlToElements
      (`<div class="pdfjs-embed-resource__popup">
          <div class="pdfjs-embed-resource__resource-url">
            <span>Resource:</span>
            <input type="text" placeholder="url" value="${annot.resource || ''}" autocomplete="off"/>
          </div>
          <div class="pdfjs-embed-resource__inline-iframe-option">
            <input id="${id}-inline-iframe" type="radio" name="pdfjs-embed-resource-target" ${checked(annot.target == 'inline-iframe')}/>
            <label for="${id}-inline-iframe">Embed Inline</label>
          </div>
          <div class="pdfjs-embed-resource__popup-iframe-option">
            <input id="${id}-popup-iframe" type="radio" name="pdfjs-embed-resource-target" ${checked(annot.target == 'popup-iframe')}/>
            <label for="${id}-popup-iframe">Open in Popup</label>
          </div>
          <div class="pdfjs-embed-resource__target-size-options" 
            style="${annot.target != 'popup-iframe' ? 'display: none;' : ''}">
            <div class="pdfjs-embed-resource__fullscreen-option">
              <input id="${id}-fullscreen" type="radio" name="target-size" ${fullscreen}/>
              <label for="${id}-fullscreen">Fullscreen</label>
            </div>
            <div class="pdfjs-embed-resource__fullpage-option">
              <input id="${id}-fullpage" type="radio" name="target-size" ${fullpage}/>
              <label for="${id}-fullpage">Fullpage</label>
            </div>
            <div class="pdfjs-embed-resource__custom-size-option">
              <input id="${id}-custom" type="radio" name="target-size" ${custom}/>
              <label for="${id}-custom">
                <span>Custom width:</span>
                <input type="text" placeholder="640px" value="${customTargetSize[0]}" ${custom ? '' : 'disabled'} />
                <span> height:</span>
                <input type="text" placeholder="480px" value="${customTargetSize[1]}" ${custom ? '' : 'disabled'} />
              </label>
            </div>
          </div>
          <div class="pdfjs-embed-resource__new-page-option">
            <input id="${id}-new-page" type="radio" name="pdfjs-embed-resource-target" ${checked(annot.target == 'new-page')}/>
            <label for="${id}-new-page">Open in New Page</label>
          </div>
          <div class="pdfjs-embed-resource__thumbnail-url">
            <span>Thumbnail:</span>
            <input type="text" placeholder="url" value="${annot.thumbnail || ''}" autocomplete="off"/>
          </div>
        </div>`);
  }
}
