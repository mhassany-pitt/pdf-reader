import { environment } from "src/environments/environment";
import { getSelectionRects, scale } from "./pdf-utils";
import { PdfRegistry } from "./pdf-registry";
import { isSameOrigin } from "./pdf-utils";

export class PdfILogger {

  private registry: PdfRegistry;
  private timeouts: { [key: string]: any } = {}
  private startedAt: number;

  constructor({ registry }) {
    this.registry = registry;

    this.registry.register('ilogger', this);
    this.registry.register(`configs.default.ilogger`, () => PdfILogger.defaultConfigs());

    this.startedAt = new Date().getTime();

    this._handleDocumentEvents();
    this._handlePdfJSEvents();
    this._handleAnntationEvents();
  }

  protected _configs() { return this.registry.get(`configs.ilogger`); }
  static defaultConfigs() {
    return {
      apiUrl: `${environment.apiUrl}/ilogs`,
      document: [
        'click', 'contextmenu', 'mousedown', 'mousemove', 'mouseup', 'scroll', 'change', 'keydown', 'keyup',
      ],
      pdfjs: [
        'currentoutlineitem', 'outlineloaded', 'toggleoutlinetree', 'find', 'findbarclose',
        'documentloaded', 'presentationmodechanged', 'pagenumberchanged', 'scalechanged', 'scrollmodechanged',
        'sidebarviewchanged', 'spreadmodechanged', 'zoomin', 'zoomout', 'resize', 'rotateccw', 'rotatecw'
      ],
      annotation: ['created', 'updated', 'deleted'],
      mousemove: { delay: 300 },
      scroll: { delay: 300 },
      resize: { delay: 300 },
    };
  }

  protected _getDocument() { return this.registry.getDocument(); }
  protected _getPdfJS() { return this.registry.getPdfJS(); }

  log($event: { event: string, [key: string]: any }) {
    const now = new Date().getTime();
    const log: any = {
      ...$event,
      pdfDocId: this.registry.get('pdfDocId'),
      elapsed: now - this.startedAt,
      datetime: now,
    };

    const apiUrl = this._configs()?.apiUrl;
    if (apiUrl) {
      if (!this.registry.get('authUser'))
        log.userId = this.registry.get('userId');

      if (!environment.production)
        console.log('ilogger:', JSON.stringify(log))

      this.registry.get('http')
        .post(apiUrl, log, { withCredentials: isSameOrigin(apiUrl) })
        .subscribe();
    }
  }

  private _onDocEvents($event: any) {
    const details: any = { event: $event.type };

    const pageEl = this._getPathEl($event.target);
    if (pageEl) {
      details.page = this._getPageNum($event.target);
      const onPage = this._relativeTopLeft($event, pageEl);
      if (onPage.left && onPage.top) details.onPage = onPage;
    }

    const onElem = this._relativeTopLeft($event, $event.target);
    if (onElem.left && onElem.top) details.onElem = onElem;

    if ($event.altKey) details.alt = true;
    if ($event.ctrlKey) details.ctrl = true;
    if ($event.metaKey) details.meta = true;
    if ($event.shiftKey) details.shift = true;

    if ($event.button) details.button = $event.button;
    if ($event.key) {
      details.key = $event.key;
      details.keyCode = $event.keyCode;
    }

    let elTag = $event.target.tagName;
    if (elTag) {
      elTag = elTag.toLowerCase(elTag);
      const attrType = $event.target.getAttribute('type');
      const attrName = $event.target.getAttribute('name');
      if (elTag == 'input' && attrType) elTag += `:type-${attrType}`;
      if (elTag == 'input' && attrName) elTag += `:name-${attrName}`;
      const attrFor = $event.target.getAttribute('for');
      if (elTag == 'label' && attrFor) elTag += `:for-${attrFor}`;
      details.elTag = elTag;
    }

    const elId = $event.target.getAttribute('id');
    if (elId) details.elId = elId;
    else {
      const elClosestId = $event.target.closest('[id]')?.getAttribute('id');
      if (elClosestId) details.elClosestId = elClosestId;
    }

    const elClasses = Array.from($event.target.classList);
    if (elClasses.length) details.elClasses = elClasses;
    else {
      const elClosestClasses = $event.target.closest('[class]')?.classList;
      if (elClosestClasses) details.elClosestClasses = Array.from(elClosestClasses);
    }

    const elTitle = $event.target.getAttribute('title');
    if (elTitle) details.elTitle = elTitle;

    const elPlaceholder = $event.target.getAttribute('placeholder');
    if (elPlaceholder) details.elPlaceholder = elPlaceholder;

    const elValue = $event.target.value;
    const elChecked = $event.target.checked;
    if ($event.type == 'change')
      if (elValue && elValue != 'void')
        details.elValue = elValue;
      else details.elValue = elChecked;

    const analytic = $event.target.getAttribute('data-analytic');
    if (analytic) details.analytic = analytic;

    const rects = getSelectionRects(this._getDocument(), this._getPdfJS());
    if (rects) {
      Object.keys(rects).forEach(pageNum => {
        rects[pageNum].forEach((rect: any) => {
          delete rect['width'];
          delete rect['height'];
        });
      });
      details.selectionRects = rects;
    }

    this.log(details);
  }

  private _onDoc(event: string, handler: ($event: any) => void) {
    if (this._configs()?.document?.includes(event))
      this._getDocument().addEventListener(event, handler, true);
  }

  private _handleDocumentEvents() {
    this._onDoc('click', ($event: any) => this._onDocEvents($event));
    this._onDoc('contextmenu', ($event: any) => this._onDocEvents($event));
    this._onDoc('mousedown', ($event: any) => this._onDocEvents($event));
    this._onDoc('mousemove', ($event: any) => this._later('mousemove', () =>
      this._onDocEvents($event), this._configs()?.mousemove?.delay || 300));
    this._onDoc('mouseup', ($event: any) => this._onDocEvents($event));
    this._onDoc('change', ($event: any) => this._onDocEvents($event));
    this._onDoc('keydown', ($event: any) => this._onDocEvents($event));
    this._onDoc('keyup', ($event: any) => this._onDocEvents($event));

    var viewerContainer = this._getDocument().getElementById('viewerContainer');
    viewerContainer.addEventListener('scroll',
      ($event: any) => this._later('scroll', () => {
        const visiblePageRects: any = {};
        const containerRect = viewerContainer.getBoundingClientRect();
        this._getPdfJS().pdfViewer._getVisiblePages().views.forEach((page: any) => {
          const pageEl = page.view.div;
          const pageNum = pageEl?.getAttribute('data-page-number');
          const overlap = this._getVisiblePageRect(containerRect, pageEl.getBoundingClientRect());
          if (overlap && pageNum) visiblePageRects[pageNum] = overlap;
        });
        this.log({ event: 'scroll', visiblePageRects });
      }, this._configs()?.scroll?.delay || 300));
  }

  private _onPdfJSEvents(event: string, $event: any) {
    const payload = { event };
    for (const key in $event) // only string/number values
      if (['string', 'number'].includes(typeof $event[key]))
        payload[key == 'event' ? `$${key}` : key] = $event[key];

    this.log(payload);
  }

  private _onPdfJS(event: string, handler: ($event: any) => void) {
    if (this._configs()?.pdfjs?.includes(event))
      this._getPdfJS().eventBus.on(event, handler);
  }

  private _handlePdfJSEvents() {
    this._onPdfJS('currentoutlineitem', ($event) => this._onPdfJSEvents('currentoutlineitem', $event));
    this._onPdfJS('outlineloaded', ($event) => this._onPdfJSEvents('outlineloaded', $event));
    this._onPdfJS('toggleoutlinetree', ($event) => this._onPdfJSEvents('toggleoutlinetree', $event));
    this._onPdfJS('find', ($event) => this._later('find', () => this._onPdfJSEvents('find', $event), 300));
    this._onPdfJS('findbarclose', ($event) => this._onPdfJSEvents('findbarclose', $event));
    this._onPdfJS('documentloaded', ($event) => this._onPdfJSEvents('documentloaded', $event));
    this._onPdfJS('presentationmodechanged', ($event) => this._onPdfJSEvents('presentationmodechanged', $event));
    this._onPdfJS('pagenumberchanged', ($event) => this._onPdfJSEvents('pagenumberchanged', $event));
    this._onPdfJS('scalechanged', ($event) => this._onPdfJSEvents('scalechanged', $event));
    this._onPdfJS('scrollmodechanged', ($event) => this._onPdfJSEvents('scrollmodechanged', $event));
    this._onPdfJS('sidebarviewchanged', ($event) => this._onPdfJSEvents('sidebarviewchanged', $event));
    this._onPdfJS('spreadmodechanged', ($event) => this._onPdfJSEvents('spreadmodechanged', $event));
    this._onPdfJS('zoomin', ($event) => this._onPdfJSEvents('zoomin', { ...$event, scale: scale(this._getPdfJS()) }));
    this._onPdfJS('zoomout', ($event) => this._onPdfJSEvents('zoomout', { ...$event, scale: scale(this._getPdfJS()) }));

    const resizeDelay = this._configs()?.resize?.delay || 300;
    const container = this._getPdfJS().pdfViewer.container;
    this._onPdfJS('resize', ($event) => this._later('resize', () =>
      this._onPdfJSEvents('resize', { ...$event, width: container.clientWidth, height: container.clientHeight }),
      resizeDelay));

    const rotation = () => this._getPdfJS().pdfViewer.pagesRotation;
    this._onPdfJS('rotateccw', ($event) => this._onPdfJSEvents('rotateccw', { ...$event, rotation: rotation() }));
    this._onPdfJS('rotatecw', ($event) => this._onPdfJSEvents('rotatecw', { ...$event, rotation: rotation() }));
  }

  private _handleAnntationEvents() {
    if (this._configs()?.annotation?.includes('created'))
      this.registry.register(`storage.created.${Math.random()}`,
        (annot) => this.log({ event: 'annotCreated', annot }));

    if (this._configs()?.annotation?.includes('updated'))
      this.registry.register(`storage.updated.${Math.random()}`,
        (annot) => this.log({ event: 'annotUpdated', annot }));

    if (this._configs()?.annotation?.includes('deleted'))
      this.registry.register(`storage.deleted.${Math.random()}`,
        (annot) => this.log({ event: 'annotDeleted', annot }));
  }

  // -- util functions

  private _later(event: string, then: () => void, after: number = 100) {
    if (event in this.timeouts)
      clearTimeout(this.timeouts[event]);
    this.timeouts[event] = setTimeout(() => {
      then();
      delete this.timeouts[event];
    }, after);
  }

  private _getPageNum(element: any) {
    const page = this._getPathEl(element);
    const pageNum = page?.getAttribute('data-page-number');
    return pageNum ? parseInt(pageNum) : null;
  }

  private _getPathEl(element: any) {
    return element.closest('#viewerContainer > .pdfViewer > .page');
  }

  private _round(num: number, decimals: number = 3) {
    const div = Math.pow(10, decimals);
    return Math.round(num * div) / div;
  }

  private _relativeTopLeft(event: any, parent: any) {
    var rect = parent.getBoundingClientRect();
    return {
      left: this._round((event.clientX - rect.left) / rect.width * 100),
      top: this._round((event.clientY - rect.top) / rect.height * 100),
    }
  }

  private _getVisiblePageRect(container: DOMRect, page: DOMRect) {
    const union = {
      top: Math.max(container.top, page.top),
      left: Math.max(container.left, page.left),
      bottom: Math.min(container.top + container.height, page.top + page.height),
      right: Math.min(container.left + container.width, page.left + page.width),
    };

    if (union.right - union.left <= 0 || union.bottom - union.top <= 0)
      return null;

    union.top = this._round((union.top - page.top) / page.height * 100);
    union.left = this._round((union.left - page.left) / page.width * 100);
    union.right = this._round((page.width - (union.right - page.left)) / page.width * 100);
    union.bottom = this._round((page.height - (union.bottom - page.top)) / page.height * 100);

    return union;
  }
}
