import { WHRect, getSelectionRects } from "./annotator-utils";

export class InteractionLogger {
  private document: any;

  private pdfjs: any;
  private configs: any;
  private timeouts: { [key: string]: any } = {}

  private startedAt: number;
  private persist: (logs: any[]) => void;
  private delay: any;
  private buffer: any[] = [];

  constructor({ iframe, pdfjs, persist, configs }) {
    this.document = iframe?.contentDocument;

    this.pdfjs = pdfjs;
    this.persist = persist;
    this.configs = configs;

    this.startedAt = new Date().getTime();

    this._setupOnClick();
    this._setupOnContextMenu();
    this._setupOnMouseDown();
    this._setupOnMouseMove();
    this._setupOnMouseUp();
    this._setupOnViewScroll();
    this._setupOnPDFJSEvents();
  }

  private _handleMouseEvents($event: any) {
    const pageEl = this._getPathEl($event.target);
    if (!pageEl)
      return;

    const log: any = {
      type: $event.type,
      button: $event.button,
      page: this._getPageNum($event.target),
      onElem: this._relativeTopLeft($event, $event.target),
      onPage: this._relativeTopLeft($event, pageEl),
    };

    if ($event.altKey) log.alt = true;
    if ($event.ctrlKey) log.ctrl = true;
    if ($event.metaKey) log.meta = true;
    if ($event.shiftKey) log.shift = true;

    const classes = Array.from($event.target.classList);
    if (classes.length) log.classes = classes;

    const analyticId = $event.target.getAttribute('data-analytic-id');
    if (analyticId) log.analyticId = analyticId;

    const selectionRects = getSelectionRects(this.document, this.pdfjs);
    if (selectionRects) {
      // remove width and height from rects
      Object.keys(selectionRects).forEach(pageNum => {
        selectionRects[pageNum].forEach((rect: any) => {
          delete rect['width'];
          delete rect['height'];
        });
      });
      log.selectionRects = selectionRects;
    }

    this._log(log);
  }

  private _setupOnClick() {
    if (this.configs.document_events?.includes('click'))
      this.document.addEventListener('click',
        ($event: any) => this._handleMouseEvents($event), true);
  }

  private _setupOnContextMenu() {
    if (this.configs.document_events?.includes('contextmenu'))
      this.document.addEventListener('contextmenu',
        ($event: any) => this._handleMouseEvents($event), true);
  }

  private _setupOnMouseDown() {
    if (this.configs.document_events?.includes('mousedown'))
      this.document.addEventListener('mousedown',
        ($event: any) => this._handleMouseEvents($event), true);
  }

  private _setupOnMouseMove() {
    if (this.configs.document_events?.includes('mousemove'))
      this.document.addEventListener('mousemove',
        ($event: any) => this._later('mousemove',
          () => this._handleMouseEvents($event), this.configs.mousemove_log_delay), true);
  }

  private _setupOnMouseUp() {
    if (this.configs.document_events?.includes('mouseup'))
      this.document.addEventListener('mouseup',
        ($event: any) => this._handleMouseEvents($event), true);
  }

  private _setupOnViewScroll() {
    var viewerContainer = this.document.getElementById('viewerContainer');
    viewerContainer.addEventListener('scroll', ($event: any) =>
      this._later('scroll', () => {
        const containerRect = viewerContainer.getBoundingClientRect();
        const visiblePageRects: any = {};
        this.pdfjs.pdfViewer._getVisiblePages().views.forEach((page: any) => {
          const pageEl = page.view.div;
          const pageNum = this._getPageNum(pageEl);
          const overlap = this._findIntersectionBound(containerRect, pageEl.getBoundingClientRect());
          if (overlap && pageNum)
            visiblePageRects[pageNum] = overlap;
        });
        this._log({ type: 'scroll', visiblePageRects });
      }, this.configs.scroll_log_delay));
  }

  private _handlePDFJSEvents(type: string, $event: any) {
    const event = { type };

    for (const key in $event) // only string/number values
      if (typeof $event[key] === 'string' || typeof $event[key] === 'number')
        event[key] = $event[key];

    this._log(event);
  }

  private _setupOnPDFJSEvents() {
    if (this.configs.pdfjs_events?.includes('currentoutlineitem'))
      this.pdfjs.eventBus.on('currentoutlineitem',
        ($event) => this._handlePDFJSEvents('currentoutlineitem', $event));

    if (this.configs.pdfjs_events?.includes('outlineloaded'))
      this.pdfjs.eventBus.on('outlineloaded',
        ($event) => this._handlePDFJSEvents('outlineloaded', $event));

    if (this.configs.pdfjs_events?.includes('toggleoutlinetree'))
      this.pdfjs.eventBus.on('toggleoutlinetree',
        ($event) => this._handlePDFJSEvents('toggleoutlinetree', $event));

    if (this.configs.pdfjs_events?.includes('find'))
      this.pdfjs.eventBus.on('find',
        ($event) => this._handlePDFJSEvents('find', $event));

    if (this.configs.pdfjs_events?.includes('findbarclose'))
      this.pdfjs.eventBus.on('findbarclose',
        ($event) => this._handlePDFJSEvents('findbarclose', $event));

    if (this.configs.pdfjs_events?.includes('documentloaded'))
      this.pdfjs.eventBus.on('documentloaded',
        ($event) => this._handlePDFJSEvents('documentloaded', $event));

    if (this.configs.pdfjs_events?.includes('presentationmodechanged'))
      this.pdfjs.eventBus.on('presentationmodechanged',
        ($event) => this._handlePDFJSEvents('presentationmodechanged', $event));

    if (this.configs.pdfjs_events?.includes('pagenumberchanged'))
      this.pdfjs.eventBus.on('pagenumberchanged',
        ($event) => this._handlePDFJSEvents('pagenumberchanged', $event));

    if (this.configs.pdfjs_events?.includes('scalechanged'))
      this.pdfjs.eventBus.on('scalechanged',
        ($event) => this._handlePDFJSEvents('scalechanged', $event));

    if (this.configs.pdfjs_events?.includes('scrollmodechanged'))
      this.pdfjs.eventBus.on('scrollmodechanged',
        ($event) => this._handlePDFJSEvents('scrollmodechanged', $event));

    if (this.configs.pdfjs_events?.includes('sidebarviewchanged'))
      this.pdfjs.eventBus.on('sidebarviewchanged',
        ($event) => this._handlePDFJSEvents('sidebarviewchanged', $event));

    if (this.configs.pdfjs_events?.includes('spreadmodechanged'))
      this.pdfjs.eventBus.on('spreadmodechanged',
        ($event) => this._handlePDFJSEvents('spreadmodechanged', $event));

    if (this.configs.pdfjs_events?.includes('zoomin'))
      this.pdfjs.eventBus.on('zoomin',
        ($event) => this._handlePDFJSEvents('zoomin', $event));

    if (this.configs.pdfjs_events?.includes('zoomout'))
      this.pdfjs.eventBus.on('zoomout',
        ($event) => this._handlePDFJSEvents('zoomout', $event));

    if (this.configs.pdfjs_events?.includes('resize'))
      this.pdfjs.eventBus.on('resize',
        ($event) => this._later('resize', () =>
          this._handlePDFJSEvents('resize', {
            ...$event,
            width: this.pdfjs.pdfViewer.container.clientWidth,
            height: this.pdfjs.pdfViewer.container.clientHeight
          }), this.configs.resize_log_delay));

    if (this.configs.pdfjs_events?.includes('rotateccw'))
      this.pdfjs.eventBus.on('rotateccw',
        ($event) => this._handlePDFJSEvents('rotateccw',
          { ...$event, rotation: this.pdfjs.pdfViewer.pagesRotation }));

    if (this.configs.pdfjs_events?.includes('rotatecw'))
      this.pdfjs.eventBus.on('rotatecw',
        ($event) => this._handlePDFJSEvents('rotatecw',
          { ...$event, rotation: this.pdfjs.pdfViewer.pagesRotation }));
  }

  // -- util functions

  private _later(type: string, then: () => void, after: number = 100) {
    if (type in this.timeouts)
      clearTimeout(this.timeouts[type]);
    this.timeouts[type] = setTimeout(() => {
      then();
      delete this.timeouts[type];
    }, after);
  }

  private _log($event: any) {
    $event.timestamp = new Date().getTime() - this.startedAt;
    this.buffer.push($event);

    if (this.delay)
      clearTimeout(this.delay);
    this.delay = setTimeout(() => {
      const buffer = this.buffer;
      this.buffer = [];
      this.persist(buffer);
    }, 1000);
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

  private _findIntersectionBound(container: DOMRect, element: DOMRect) {
    const intersection = {
      top: Math.max(container.top, element.top),
      left: Math.max(container.left, element.left),
      bottom: Math.min(container.top + container.height, element.top + element.height),
      right: Math.min(container.left + container.width, element.left + element.width),
    };

    if (intersection.right - intersection.left <= 0
      || intersection.bottom - intersection.top <= 0) {
      return null;
    }

    intersection.top = this._round((intersection.top - element.top) / element.height * 100);
    intersection.left = this._round((intersection.left - element.left) / element.width * 100);
    intersection.right = this._round((element.width - (intersection.right - element.left)) / element.width * 100);
    intersection.bottom = this._round((element.height - (intersection.bottom - element.top)) / element.height * 100);

    return intersection;
  }
}
