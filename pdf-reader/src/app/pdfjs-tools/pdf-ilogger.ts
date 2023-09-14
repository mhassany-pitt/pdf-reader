import { environment } from "src/environments/environment";
import { getSelectionRects } from "./pdf-utils";
import { PdfRegistry } from "./pdf-registry";
import { inSameOrigin } from "./pdf-utils";

export class PdfILogger {

  private registry: PdfRegistry;
  private timeouts: { [key: string]: any } = {}

  private startedAt: number;
  private delay: any;
  private buffer: any[] = [];

  constructor({ registry }) {
    this.registry = registry;

    this.registry.register('ilogger', this);

    this.startedAt = new Date().getTime();
    this.registry.register(`configs.default.ilogger`, () => this._defaultConfigs());

    this._setupOnClick();
    this._setupOnContextMenu();
    this._setupOnMouseDown();
    this._setupOnMouseMove();
    this._setupOnMouseUp();
    this._setupOnViewScroll();
    this._setupOnPDFJSEvents();
  }

  protected _configs() { return this.registry.get(`configs.ilogger`) || this._defaultConfigs(); }
  protected _defaultConfigs() {
    return {
      apiUrl: `${environment.apiUrl}/interaction-logs`,
      document_events: [
        'click', 'contextmenu', 'mousedown', 'mousemove', 'mouseup', 'scroll'
      ],
      pdfjs_events: [
        'currentoutlineitem', 'outlineloaded', 'toggleoutlinetree', 'find', 'findbarclose',
        'documentloaded', 'presentationmodechanged', 'pagenumberchanged', 'scalechanged', 'scrollmodechanged',
        'sidebarviewchanged', 'spreadmodechanged', 'zoomin', 'zoomout', 'resize', 'rotateccw', 'rotatecw'
      ],
      mousemove: { delay: 100 },
      scroll: { delay: 100 },
      resize: { delay: 100 },
    };
  }

  protected _getDocument() { return this.registry.getDocument(); }
  protected _getPdfJs() { return this.registry.getPdfJS(); }

  private async _persist(logs: any[]) {
    const apiUrl = this._configs().apiUrl;
    const userId = this.registry.get('userId');
    logs = logs.map(log => {
      log = { ...log, pdf_doc_id: this.registry.get('pdfDocId') };
      if (apiUrl) log.user_id = userId;
      return log;
    });
    if (apiUrl) {
      const api = apiUrl;
      this.registry.get('http').post(api, logs, { withCredentials: inSameOrigin(api) }).subscribe();
    }
  }

  private _log($event: any) {
    const now = new Date().getTime();
    $event.elapsed = now - this.startedAt;
    $event.datetime = now;
    this.buffer.push($event);

    if (this.delay)
      clearTimeout(this.delay);
    this.delay = setTimeout(() => {
      const buffer = this.buffer;
      this.buffer = [];
      this._persist(buffer);
    }, 1000);
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

    const rects = getSelectionRects(this._getDocument(), this._getPdfJs());
    if (rects) {
      Object.keys(rects).forEach(pageNum => {
        rects[pageNum].forEach((rect: any) => {
          delete rect['width'];
          delete rect['height'];
        });
      });
      log.selectionRects = rects;
    }

    this._log(log);
  }

  private _setupOnClick() {
    if (this._configs().document_events?.includes('click'))
      this._getDocument().addEventListener('click', ($event: any) => this._handleMouseEvents($event), true);
  }

  private _setupOnContextMenu() {
    if (this._configs().document_events?.includes('contextmenu'))
      this._getDocument().addEventListener('contextmenu', ($event: any) => this._handleMouseEvents($event), true);
  }

  private _setupOnMouseDown() {
    if (this._configs().document_events?.includes('mousedown'))
      this._getDocument().addEventListener('mousedown', ($event: any) => this._handleMouseEvents($event), true);
  }

  private _setupOnMouseMove() {
    if (this._configs().document_events?.includes('mousemove'))
      this._getDocument().addEventListener('mousemove', ($event: any) =>
        this._later('mousemove', () => this._handleMouseEvents($event), this._configs().mousemove?.delay), true);
  }

  private _setupOnMouseUp() {
    if (this._configs().document_events?.includes('mouseup'))
      this._getDocument().addEventListener('mouseup', ($event: any) => this._handleMouseEvents($event), true);
  }

  private _setupOnViewScroll() {
    var viewerContainer = this._getDocument().getElementById('viewerContainer');
    viewerContainer.addEventListener('scroll', ($event: any) =>
      this._later('scroll', () => {
        const containerRect = viewerContainer.getBoundingClientRect();
        const visiblePageRects: any = {};
        this._getPdfJs().pdfViewer._getVisiblePages().views.forEach((page: any) => {
          const pageEl = page.view.div;
          const pageNum = this._getPageNum(pageEl);
          const overlap = this._findIntersectionBound(containerRect, pageEl.getBoundingClientRect());
          if (overlap && pageNum)
            visiblePageRects[pageNum] = overlap;
        });
        this._log({ type: 'scroll', visiblePageRects });
      }, this._configs().scroll?.delay));
  }

  private _handlePDFJSEvents(type: string, $event: any) {
    const event = { type };

    for (const key in $event) // only string/number values
      if (typeof $event[key] === 'string' || typeof $event[key] === 'number')
        event[key] = $event[key];

    this._log(event);
  }

  private _setupOnPDFJSEvents() {
    if (this._configs().pdfjs_events?.includes('currentoutlineitem'))
      this._getPdfJs().eventBus.on('currentoutlineitem', ($event) => this._handlePDFJSEvents('currentoutlineitem', $event));

    if (this._configs().pdfjs_events?.includes('outlineloaded'))
      this._getPdfJs().eventBus.on('outlineloaded', ($event) => this._handlePDFJSEvents('outlineloaded', $event));

    if (this._configs().pdfjs_events?.includes('toggleoutlinetree'))
      this._getPdfJs().eventBus.on('toggleoutlinetree', ($event) => this._handlePDFJSEvents('toggleoutlinetree', $event));

    if (this._configs().pdfjs_events?.includes('find'))
      this._getPdfJs().eventBus.on('find', ($event) => this._handlePDFJSEvents('find', $event));

    if (this._configs().pdfjs_events?.includes('findbarclose'))
      this._getPdfJs().eventBus.on('findbarclose', ($event) => this._handlePDFJSEvents('findbarclose', $event));

    if (this._configs().pdfjs_events?.includes('documentloaded'))
      this._getPdfJs().eventBus.on('documentloaded', ($event) => this._handlePDFJSEvents('documentloaded', $event));

    if (this._configs().pdfjs_events?.includes('presentationmodechanged'))
      this._getPdfJs().eventBus.on('presentationmodechanged', ($event) => this._handlePDFJSEvents('presentationmodechanged', $event));

    if (this._configs().pdfjs_events?.includes('pagenumberchanged'))
      this._getPdfJs().eventBus.on('pagenumberchanged', ($event) => this._handlePDFJSEvents('pagenumberchanged', $event));

    if (this._configs().pdfjs_events?.includes('scalechanged'))
      this._getPdfJs().eventBus.on('scalechanged', ($event) => this._handlePDFJSEvents('scalechanged', $event));

    if (this._configs().pdfjs_events?.includes('scrollmodechanged'))
      this._getPdfJs().eventBus.on('scrollmodechanged', ($event) => this._handlePDFJSEvents('scrollmodechanged', $event));

    if (this._configs().pdfjs_events?.includes('sidebarviewchanged'))
      this._getPdfJs().eventBus.on('sidebarviewchanged', ($event) => this._handlePDFJSEvents('sidebarviewchanged', $event));

    if (this._configs().pdfjs_events?.includes('spreadmodechanged'))
      this._getPdfJs().eventBus.on('spreadmodechanged', ($event) => this._handlePDFJSEvents('spreadmodechanged', $event));

    if (this._configs().pdfjs_events?.includes('zoomin'))
      this._getPdfJs().eventBus.on('zoomin', ($event) => this._handlePDFJSEvents('zoomin', $event));

    if (this._configs().pdfjs_events?.includes('zoomout'))
      this._getPdfJs().eventBus.on('zoomout', ($event) => this._handlePDFJSEvents('zoomout', $event));

    if (this._configs().pdfjs_events?.includes('resize'))
      this._getPdfJs().eventBus.on('resize',
        ($event) => this._later('resize', () =>
          this._handlePDFJSEvents('resize', {
            ...$event,
            width: this._getPdfJs().pdfViewer.container.clientWidth,
            height: this._getPdfJs().pdfViewer.container.clientHeight
          }), this._configs().resize?.delay));

    if (this._configs().pdfjs_events?.includes('rotateccw'))
      this._getPdfJs().eventBus.on('rotateccw', ($event) => this._handlePDFJSEvents('rotateccw',
        { ...$event, rotation: this._getPdfJs().pdfViewer.pagesRotation }));

    if (this._configs().pdfjs_events?.includes('rotatecw'))
      this._getPdfJs().eventBus.on('rotatecw', ($event) => this._handlePDFJSEvents('rotatecw',
        { ...$event, rotation: this._getPdfJs().pdfViewer.pagesRotation }));
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
