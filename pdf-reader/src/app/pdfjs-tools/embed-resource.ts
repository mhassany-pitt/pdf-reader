import { AnnotationStorage } from './annotator-storage';
import {
  closestPageEl, uuid, getPageNum,
  htmlToElements, isRightClick, relativeToPageEl,
  WHRect, isLeftClick
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
    this.embedLinkViewer._clickguard = ($event: any) => $event.detail === 2;

    this._attachStylesheet();
    this._enableMoveOnDrag();
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
      const containerEl = htmlToElements(`<div style="display: flex; gap: 5px;"></div>`);
      const buttonEl = htmlToElements(`<button class="pdfjs-embed-resource__embed-btn">embed resource</button>`);
      containerEl.appendChild(buttonEl);
      buttonEl.onclick = ($ev) => {
        const pageEl = closestPageEl($event.target);;
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
          resource: '',
          target: 'popup-iframe',
        };
        this.storage.create(annot);
        this.embedLinkViewer.render(annot);
        this.annotator.hidePopup();
      }

      return containerEl;
    });
  }

  private _registerEditorItemUI() {
    this.annotator.register(POPUP_ROW_ITEM_UI, ($event: any) => {
      const embedEl = $event.target.classList.contains('pdfjs-annotation__embed')
        ? $event.target : $event.target.closest('.pdfjs-annotation__embed');

      if (embedEl && isRightClick($event, true)) {
        const annot = this.storage.read(embedEl.getAttribute('data-annotation-id'));
        const style = getComputedStyle(embedEl);
        this.annotator.location = { top: `calc(100% - ${style.bottom})`, left: `${style.left}` };

        const containerEl = htmlToElements(`<div class="pdfjs-embed-resource__popup"></div>`);

        const createOptionRowEl = (target: string, label: string) => {
          const inputEl = htmlToElements(
            `<div>
              <input type="radio" name="pdfjs-embed-resource-target" 
                id="pdfjs-embed-resource-${target}" ${annot.target == target ? 'checked' : ''}
                class="pdfjs-embed-resource__embed-resource-as-${target}"/>
              <label for="pdfjs-embed-resource-${target}">${label}</label>
            </div>`);
          containerEl.appendChild(inputEl);
          const input: any = inputEl.querySelector('input');
          input.onclick = ($ev: any) => {
            annot.target = target;
            if (target == 'popup-iframe')
              annot.targetSize = annot.targetSize || 'fullpage';
            this.storage.update(annot);
            targetOptionsEl.style.display = annot.target == 'popup-iframe' ? 'block' : 'none';
            thumbnailEl.style.display = annot.target == 'inline-iframe' ? 'none' : 'block';
            this.embedLinkViewer.render(annot);
          }
          return inputEl;
        };
        const isCustomTargetSize = () => annot.targetSize && ['fullpage', 'fullscreen'].indexOf(annot.targetSize) < 0;
        const updateTargetSize = (radioInputEl: any, targetSize: string) => {
          annot.targetSize = radioInputEl.checked ? targetSize : annot.target;
          customTargetSizeEl.querySelectorAll('input[type="text"]')
            .forEach((el: any) => el.disabled = !isCustomTargetSize());
          this.storage.update(annot);
          this.embedLinkViewer.render(annot);
        }

        // create inline-iframe, popup-iframe options
        createOptionRowEl('inline-iframe', 'Embed Inline');
        createOptionRowEl('popup-iframe', 'Open in Popup');

        // create target-size options
        const targetOptionsEl = htmlToElements(
          `<div style="${annot.target != 'popup-iframe' ? 'display: none;' : ''} margin-left: 10px;"></div>`);
        containerEl.appendChild(targetOptionsEl);
        const createTargetOptionEl = (label: string, type: string, checked: any, value: () => any) => {
          const targetOptionEl = htmlToElements(
            `<div >
              <input type="radio" name="target-size" 
                id="pdfjs-embed-resource-${type}" ${checked ? 'checked' : ''}
                class="pdfjs-embed-resource__embed-as-${type}-iframe"/>
              <label for="pdfjs-embed-resource-${type}">
                ${label}
              </label>
            </div>`);
          targetOptionsEl.appendChild(targetOptionEl);
          const radioInputEl: any = targetOptionEl.querySelector('input[type="radio"]');
          radioInputEl.onclick = ($ev: any) => updateTargetSize(radioInputEl, value());
          return targetOptionEl;
        }

        // create fullpage/screen options
        [{ type: 'fullscreen', label: 'Fullscreen' },
        { type: 'fullpage', label: 'Fullpage' }].forEach(option =>
          createTargetOptionEl(option.label, option.type,
            annot.targetSize == option.type, () => option.type));

        // create custom target size option
        const defCustomTargetSize = ['640px', '480px'];
        const curTargetSize = annot.targetSize ? annot.targetSize.split(',') : defCustomTargetSize;
        const customTargetSizeEl = createTargetOptionEl('Custom', 'custom', isCustomTargetSize(), () => getCustomTargetSize());
        (customTargetSizeEl.querySelector('label') as any).replaceChildren(htmlToElements(
          `<span>
            <span>Custom width:</span>
            <input type="text" placeholder="640px" value="${curTargetSize[0]}" style="width: 50px;" />
            <span> height:</span>
            <input type="text" placeholder="480px" value="${curTargetSize[1]}" style="width: 50px;" />
          </span>`));
        // update target size on width/height change
        const customTargetSizeInputEls: any[] = Array.from(customTargetSizeEl.querySelectorAll('input[type="text"]'));
        const getCustomTargetSize = () => customTargetSizeInputEls.map((el: any, i) => el.value || defCustomTargetSize[i]).join(',');
        customTargetSizeInputEls.forEach((el: any) => el.onchange = ($ev: any) => annot.targetSize = getCustomTargetSize());

        // create target=new-page option
        createOptionRowEl('new-page', 'Open in New Page');

        const createInputRowEl = (
          type: string, label: string,
          placeholder: string, value?: string
        ) => {
          const resourceEl = htmlToElements(
            `<div>
              <div style="display: flex; align-items: center;">
                <span style="width: 5rem;">${label}</span>
                <input type="url" placeholder="${placeholder}" value="${value || ''}" 
                  class="pdfjs-embed-resource__${type}-url-input"
                  style="flex-grow: 1"/>
              </div>
            </div>`);
          containerEl.appendChild(resourceEl);
          const inputEl: any = resourceEl.querySelector('input');
          inputEl.onchange = ($ev: any) => {
            annot[type] = $ev.target.value;
            this.storage.update(annot);
            this.embedLinkViewer.render(annot);
          };
          return resourceEl;
        };

        // create resource-url, thumbnail-url input
        createInputRowEl('resource', 'Resource: ', 'resource url', annot.resource);
        const thumbnailEl = createInputRowEl('thumbnail', 'Thumbnail: ', 'thumbnail url', annot.thumbnail);

        return containerEl;
      }

      return null as any;
    });
  }

  private _enableMoveOnDrag() {
    let embedEl: HTMLElement;
    let isResizing: boolean;
    let startBound: DOMRect;
    let offsetBound: { left: number, top: number };

    this.documentEl.addEventListener("mousedown", ($event: any) => {
      if (!isLeftClick($event))
        return;
      else if ($event.target.classList.contains('pdfjs-annotation__embed'))
        embedEl = $event.target;
      else if ($event.target.parentNode.classList.contains('pdfjs-annotation__embed'))
        embedEl = $event.target.parentNode;

      startBound = embedEl?.getBoundingClientRect();
      offsetBound = embedEl ? {
        top: $event.clientY - startBound.top,
        left: $event.clientX - startBound.left
      } : null as any;

      isResizing = embedEl
        && (embedEl.offsetHeight - offsetBound.top) <= 16
        && (embedEl.offsetWidth - offsetBound.left) <= 16;
    });

    let lastBound: WHRect;
    let fitIframeToParentTimeout: any;
    this.documentEl.addEventListener("mousemove", ($event: any) => {
      if (!isLeftClick($event) || !embedEl)
        return;

      if (isResizing) {
        lastBound = relativeToPageEl({
          top: startBound.top,
          left: startBound.left,
          right: $event.clientX,
          bottom: $event.clientY,
          width: parseFloat((embedEl.style.width).replace('px', '')),
          height: parseFloat((embedEl.style.height).replace('px', '')),
        } as any, closestPageEl(embedEl));
      } else { // isMoving
        const top = $event.clientY - offsetBound.top;
        const left = $event.clientX - offsetBound.left;
        lastBound = relativeToPageEl({
          top,
          left,
          right: left + startBound.width,
          bottom: top + startBound.height,
          height: startBound.height,
          width: startBound.width,
        } as any, closestPageEl(embedEl));
      }

      if (lastBound) {
        embedEl.style.top = `${lastBound.top}%`;
        embedEl.style.left = `${lastBound.left}%`;
        embedEl.style.right = `${lastBound.right}%`;
        embedEl.style.bottom = `${lastBound.bottom}%`;
      }

      if ($event.target.classList.contains('pdfjs-annotation__embed')) {
        if (fitIframeToParentTimeout)
          clearTimeout(fitIframeToParentTimeout);

        fitIframeToParentTimeout = setTimeout(() =>
          this.embedLinkViewer.fitIframeToParent($event.target)
          , 300);
      }
    });

    this.documentEl.addEventListener("mouseup", ($event: any) => {
      if (isLeftClick($event) && embedEl && lastBound) {
        const annotId = embedEl.getAttribute('data-annotation-id') as string;
        const annot = this.storage.read(annotId);
        annot.bound = lastBound;
        this.storage.update(annot);
      }
      embedEl = null as any;
    });
  }
}