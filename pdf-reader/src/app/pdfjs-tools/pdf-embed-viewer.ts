import {
  getOrParent, getPageEl, htmlToElements,
  removeSelectorAll, rotateRect, rotation, scale
} from './pdf-utils';
import { PdfRegistry } from './pdf-registry';
import { PdfToolbar } from './pdf-toolbar';
import { baseHref } from 'src/environments/environment';

export class PdfEmbedViewer {

  private registry: PdfRegistry;
  private timeout: any = null;

  constructor({ registry }) {
    this.registry = registry;

    this.registry.register('embed-viewer', this);
    this.registry.register(`storage.deleted.${Math.random()}`, (annot) => {
      if (annot.type == 'embed') {
        removeSelectorAll(this._getDocumentEl(),
          `.pdf-annotation__embed-viewer-popup[data-embed-id="${annot.id}"]`);
      }
    });

    this._attachStylesheet();
    this._renderOnPagerendered();
    this._onAnnotClick();
  }

  protected _configs() { return this.registry.get(`configs.embed`); }

  private _getPdfJS() { return this.registry.getPdfJS(); }
  private _getToolbar(): PdfToolbar { return this.registry.get('toolbar'); }
  private _getDocument() { return this.registry.getDocument(); }
  private _getDocumentEl() { return this.registry.getDocumentEl(); }
  private _getStorage() { return this.registry.get('storage'); }
  private _getAnnotLayer() { return this.registry.get('annotation-layer'); }

  private _renderOnPagerendered() {
    this._getPdfJS().eventBus.on('pageannotationsloaded', ($event: any) => {
      const pageNum = $event.pageNumber;
      const annotsLayerEl = this._getAnnotLayer().getOrAttachLayerEl(pageNum);
      removeSelectorAll(annotsLayerEl, '.pdf-annotation__embed');

      this._getStorage().list()
        .filter(annot => annot.type == 'embed')
        .filter(annot => annot.pages.includes(pageNum))
        .forEach(annot => this.render(annot));
    });
  }

  render(annot: any) {
    const annotsLayerEl = this._getAnnotLayer().getOrAttachLayerEl(annot.pages[0]);
    annotsLayerEl.querySelectorAll(`[data-annotation-id="${annot.id}"].pdf-annotation__embed`)
      .forEach((el: any) => el.remove());

    const editor = this.registry.get('embed-editor');
    const configs = this._configs();

    const degree = rotation(this._getPdfJS());
    const bound = rotateRect(degree, true, annot.rects[annot.pages[0]][0] as any);
    const scaleFactor = scale(this._getPdfJS());

    const editable = editor && configs;
    const movable = editor && configs?.move && annot.target == 'inline-iframe';

    const viewerEl = htmlToElements(
      `<div 
        data-annotation-id="${annot.id}" 
        data-annotation-type="${annot.type}"
        data-analytic-id="embed-${annot.id}"
        tabindex="-1"
        class="${[
          'pdf-annotation__embed',
          annot.openOn == 'hover' ? 'pdf-annotation__embed--open-on-hover' : '',
          editor && configs?.move ? 'pdf-annotation--moveable' : '',
          editor && configs?.delete ? 'pdf-annotation--deletable' : ''
        ].filter(c => c).join(' ')}" 
        style="
          top: ${bound.top}%;
          left: ${bound.left}%;
          bottom: calc(${bound.bottom + bound.top == 100 ? `${100 - bound.top}% - 32px` : `${bound.bottom}%`});
          right: calc(${bound.right + bound.left == 100 ? `${100 - bound.left}% - 32px` : `${bound.right}%`});
          min-width: calc(${scaleFactor} * 16px);
          min-height: calc(${scaleFactor} * 16px);
          ${editable && configs?.move ? 'border: solid 1px lightgray;' : ''}
        ">
        <div class="top-right">
          ${movable ? `<div class="pdf-annotation__embed-move-btn" style="font-size: calc(${scaleFactor} * 1rem);">✥</div>` : ''}
          ${editable ? `<div class="pdf-annotation__embed-edit-btn" style="font-size: calc(${scaleFactor} * 1.25rem);">⚙</div>` : ''}
        </div>
        ${editable ? '<img class="resize-icon" draggable="false" src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAcAAAAHAQMAAAD+nMWQAAAABlBMVEVHcExmZmZEBjuPAAAAAXRSTlMAQObYZgAAABRJREFUeAFjYAICFiYOJiEmJSYXAAHyAJWhegUKAAAAAElFTkSuQmCC"/>' : ''}
      </div>`);
    annotsLayerEl.appendChild(viewerEl);

    if (annot.target == 'inline-iframe') {
      const iframeEl = htmlToElements(`<iframe src="${annot.resource}"></iframe>`);
      viewerEl.appendChild(iframeEl);
      this.fitIframeToParent(viewerEl);
    } else if (annot.thumbnail) {
      const src = (annot.thumbnail == '/assets/info.png' ? baseHref : '') + annot.thumbnail;
      viewerEl.appendChild(htmlToElements(`<img class="pdf-annotation__embed-thumb-icon" draggable="false" src="${src}"/>`));
    }

    if (
      annot.target == 'popup-iframe' &&
      !['fullscreen', 'fullpage'].includes(annot.targetSize) &&
      annot.openOn == 'hover'
    ) {
      viewerEl.addEventListener('mouseenter', $event => {
        this.timeout = setTimeout(() => this._showAnnotInPopupOrBlank($event), 600);
      });
      viewerEl.addEventListener('mouseleave', $event => {
        if (this.timeout)
          clearTimeout(this.timeout);
      });
      // user needs to click close button to close popup
    } else {
      viewerEl.addEventListener('click', $event => {
        if (getOrParent($event, '.pdf-annotation__embed-edit-btn'))
          return; // ignore edit button click/hover
        this._showAnnotInPopupOrBlank($event);
      });
    }
  }

  fitIframeToParent(annotEl: HTMLElement) {
    const iframe = annotEl.querySelector('iframe') as HTMLIFrameElement;
    if (iframe == null)
      return;

    const degree = rotation(this._getPdfJS());
    const scaleFactor = scale(this._getPdfJS());
    iframe.style.position = 'absolute';
    iframe.style.transform = `scale(${scaleFactor}) rotate(${degree}deg)`;

    const computedStyle = getComputedStyle(annotEl);
    let width: any = parseFloat(computedStyle.width.replace('px', '')) / scaleFactor;
    let height: any = parseFloat(computedStyle.height.replace('px', '')) / scaleFactor;
    width = degree == 90 || degree == 270 ? height : width;
    height = degree == 90 || degree == 270 ? width : height;
    iframe.style.width = `${width}px`;
    iframe.style.height = `${height}px`;
  }

  private _onAnnotClick() {
    this._getDocument().addEventListener('click', ($event: any) => {
      const embedEl = getOrParent($event, '.pdf-annotation__embed'),
        viewerPopup = getOrParent($event, '.pdf-annotation__embed-viewer-popup');
      if (!embedEl && !viewerPopup)
        this.removePopups();
    });
  }

  private _showAnnotInPopupOrBlank($event: any) {
    const annotEl = getOrParent($event, '.pdf-annotation__embed');
    const annotId = annotEl.getAttribute('data-annotation-id');
    const annot = this._getStorage().read(annotId);

    if (annot.target == 'new-page') {
      window.open(annot.resource, '_blank');
      return;
    }

    const popupEl = getPageEl($event.target)?.querySelector('.pdf-annotation__embed-viewer-popup');
    if (annot.target == 'popup-iframe' && !popupEl) {
      const popupEl = htmlToElements(
        `<div class="pdf-annotation__embed-viewer-popup" data-embed-id="${annotId}">
          ${annot.ctrls?.filter(c => ['open-in-blank', 'close'].includes(c)).length ?
          `<div class="pdf-annotation__embed-viewer-popup-header">
            ${annot.ctrls?.includes('open-in-blank') ? `<a href="${annot.resource}" target="_blank" class="pdf-annotation__embed-viewer-popup-openinnewtab">open in new tab</a>` : ''}
            <span style="flex-grow: 1;"></span>
            ${annot.ctrls?.includes('close') ? `<button type="button" class="pdf-annotation__embed-viewer-popup-close close-btn">close</button>` : ''}
          </div>` : ''}
          <iframe src="${annot.resource}" class="pdf-annotation__embed-viewer-popup-iframe" style="flex-grow: 1; height: 0%;"></iframe>
        </div>`);
      this._getAnnotLayer().getOrAttachLayerEl(annot.pages[0]).appendChild(popupEl);
      popupEl.querySelector('.close-btn')?.addEventListener('click', $event => {
        if (annot.targetSize == 'fullscreen')
          this._getToolbar().toggle(true);
        this.removePopups();
      });

      if (annot.targetSize == 'fullscreen') {
        popupEl.style.position = 'fixed';
        popupEl.style.inset = '32px 0 0 0';
        popupEl.style.zIndex = '100';
        this._getToolbar().toggle(false);
      } else if (annot.targetSize == 'fullpage') {
        popupEl.style.position = 'absolute';
        popupEl.style.inset = '0';
      } else { // custom size popup
        const style = getComputedStyle(annotEl);
        const targetSize = annot.targetSize ? annot.targetSize.split(',') : ['320px', '240px'];
        popupEl.style.position = 'absolute';
        popupEl.style.top = `calc(100% - ${style.bottom} + 5px)`;
        popupEl.style.left = `calc(${style.left} + (${style.width} / 2) - (${targetSize[0]} / 2))`;
        popupEl.style.width = `${targetSize[0]}`;
        popupEl.style.height = `${targetSize[1]}`;
      }

      return popupEl;
    }

    return null;
  }

  removePopups() {
    if (this.timeout)
      clearTimeout(this.timeout);
    this._getDocumentEl()
      .querySelectorAll('.pdf-annotation__embed-viewer-popup')
      .forEach(el => el.remove());
  }

  private _attachStylesheet() {
    this.registry
      .getDocumentEl()
      .querySelector('head')
      .appendChild(htmlToElements(
        `<style>
          .pdf-annotation__embed {
            position: absolute;
            pointer-events: auto;
            user-select: none;
            cursor: pointer;
            /* higher than highlights and ... */
            z-index: 6;
            display: flex;
            align-items: center;
            justify-content: center;
            border-radius: 0.125rem;
          }
          
          .pdf-annotation__embed img.pdf-annotation__embed-thumb-icon {
            max-width: 80%; 
            max-height: 80%; 
            object-fit: contain;
            user-select: none;
          }
          .pdf-annotation__embed img.pdf-annotation__embed-thumb-icon:hover {
            max-width: 85%;
            max-height: 85%;
          }

          .pdf-annotation__embed img.resize-icon {
            position: absolute;
            bottom: 0;
            right: 0;
            cursor: se-resize;
            z-index: 2;
          }

          .pdf-annotation__embed .top-right {
            position: absolute;
            top: 2px;
            right: 1px;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            z-index: 2;
          }

          .pdf-annotation__embed .pdf-annotation__embed-move-btn { 
            color: gray;
            cursor: move;
          }
          
          .pdf-annotation__embed .pdf-annotation__embed-move-btn:hover { 
            color: black; 
          }
  
          .pdf-annotation__embed .pdf-annotation__embed-edit-btn {
            color: gray;
          }

          .pdf-annotation__embed .pdf-annotation__embed-edit-btn:hover { 
            color: black; 
          }

          .pdf-annotation__embed iframe,
          .pdf-annotation__embed-viewer-popup-iframe {
            background-color: white;
            border: none; 
            z-index: 1;
          }
          
          .pdf-annotation__embed-viewer-popup {
            display: flex;
            flex-flow: column;
            gap: 0.25rem;
            width: 100%;
            height: 100%;
            background-color: white;
            box-shadow: rgba(0, 0, 0, 0.16) 0px 3px 6px, rgba(0, 0, 0, 0.23) 0px 3px 6px 3px;
            border-radius: 0.125rem;
            z-index: 6;
            pointer-events: auto;
          }
          
          .pdf-annotation__embed-viewer-popup-header {
            display: flex;
            align-items: center;
            border-bottom: solid 1px lightgray;
            padding: 0.25rem;
          }
        </style>`
      ));
  }
}
