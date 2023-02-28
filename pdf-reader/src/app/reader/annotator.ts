import { v4 as uuid } from 'uuid';

const $: any = {
    iframe: null,
    pdfjs: null,
    window: null,
    document: null,
    annotations: [],
    selected: null,
    init: (iframe, pdfjs) => {
        $.iframe = iframe;
        $.pdfjs = pdfjs;
        $.window = $.iframe?.contentWindow;
        $.document = $.iframe?.contentDocument.documentElement;

        $.annotations = JSON.parse(localStorage.getItem('paws--annotations') || '[]');

        $._onPageRendered();
        $._onAnnotationClick();
        $._onCreateHighlight();
        $._onRemoveAnnotation();
    },
    _onPageRendered: () => {
        $.pdfjs.eventBus.on('pagerendered', ($event) => {
            const pageNum = $event.pageNumber;
            $.annotations.filter(annotation =>
                annotation.type == 'line-highlight' &&
                Object.keys(annotation.rects).map(parseInt).indexOf(pageNum) > -1
            ).forEach(annotation => $._renderHighlights({
                id: annotation.id,
                rects: { [pageNum]: annotation.rects[pageNum] }
            }));
        });
    },
    _removeAnnotation: (annotation) => {
        $.annotations.splice($.annotations.indexOf(annotation), 1);
        localStorage.setItem('paws--annotations', JSON.stringify($.annotations));
    },
    _onRemoveAnnotation: () => {
        $.document.addEventListener('keydown', $event => {
            if ($.selected && $event.key == 'Delete') {
                $._removeAnnotation($.selected)
                $.document.querySelectorAll(`.pdfViewer .page .paws__annotations [paws-annotation-id="${$.selected.id}"]`)
                    .forEach(el => el.remove());
                $.selected = null;
            }
        });
    },
    _layer: (pageNum) => {
        const pageEl = $.document.querySelector(`.pdfViewer .page[data-page-number="${pageNum}"]`);
        let viewerEl = pageEl.querySelector('.paws__annotations');
        if (viewerEl)
            return viewerEl;

        viewerEl = document.createElement('div');
        viewerEl.classList.add('paws__annotations');
        viewerEl.style.cssText = `
            position: absolute;
            left: 0;
            top: 0;
            right: 0;
            bottom: 0;
            line-height: 1;
            overflow: hidden;
            pointer-events: none; 
            text-size-adjust: none;
            forced-color-adjust: none;
            transform-origin: 0 0;
            z-index: 5;
        `;
        pageEl.appendChild(viewerEl);
        return viewerEl;
    },
    _onAnnotationClick: () => {
        $.document.addEventListener('click', $event => {
            const page = $event.target.closest('.pdfViewer .page');

            if (!page) return;

            if (!$event.target.classList.contains('paws__highlight-bound')) {
                $.selected = null;

                // remove all boundaries if user clicked on other than a bound
                page.querySelectorAll(`.paws__annotations .paws__highlight-bound`)
                    .forEach(boundEl => boundEl.remove());
            }

            if ($event.target.classList.contains('paws__highlight-rect')) {
                const id = $event.target.getAttribute('paws-annotation-id');
                const annotation = $.annotations.filter(a => a.id == id)[0];
                $.selected = annotation;

                // draw a boundary around the selected annotation' rects
                const pageNum = parseInt(page.getAttribute('data-page-number'));

                const boundEl = document.createElement('div');
                page.querySelector('.paws__annotations').appendChild(boundEl);
                boundEl.setAttribute('paws-annotation-id', annotation.id);
                boundEl.classList.add('paws__annotation-' + annotation.id);
                boundEl.classList.add('paws__highlight-bound');
                const bound = $._bound(annotation.rects[pageNum]);
                boundEl.style.cssText = `
                    position: absolute;
                    top: ${bound.top}%;
                    bottom: ${bound.bottom}%;
                    left: ${bound.left}%;
                    right: ${bound.right}%;
                    pointer-events: auto; 
                    border-radius: 5px;
                    border: 2px dashed blue;
                    opacity: 0.5;
                `;
            }
        });
    },
    _renderHighlights: (annotation) => {
        Object.keys(annotation.rects).map(parseInt).forEach(pageNum => {
            const annotationsEl = $._layer(pageNum);
            const rects = annotation.rects[pageNum];
            rects.forEach(rect => {
                const highlightEl = document.createElement('div');
                annotationsEl.appendChild(highlightEl);
                highlightEl.setAttribute('paws-annotation-id', annotation.id);
                highlightEl.classList.add('paws__annotation-' + annotation.id);
                highlightEl.classList.add('paws__highlight-rect');
                highlightEl.style.cssText = `
                    position: absolute;
                    top: ${rect.top}%;
                    bottom: ${rect.bottom}%;
                    left: ${rect.left}%;
                    right: ${rect.right}%;
                    background-color: rgb(255, 212, 0);
                    pointer-events: auto; 
                    border-radius: 5px;
                    opacity: 0.5;
                `;
            })
        })
    },
    _bound: (rects) => ({
        left: Math.min(...rects.map(rect => rect.left)),
        right: Math.min(...rects.map(rect => rect.right)),
        top: Math.min(...rects.map(rect => rect.top)),
        bottom: Math.min(...rects.map(rect => rect.bottom)),
    }),
    _selection: () => $.window.getSelection(),
    _onCreateHighlight: () => $.document.addEventListener('click', $event => {
        const selection = $._selection();
        if (selection.rangeCount < 1)
            return;

        const range = selection.getRangeAt(0);
        let rects = Array.from(range.getClientRects());
        selection.removeAllRanges();

        rects = $._attachPageNum(rects);
        rects = $._filterRects(rects);
        rects = $._mergeRects(rects);
        if (rects.length < 1)
            return;

        rects = $._groupByPageNum(rects);
        const annotation = { id: uuid(), type: 'line-highlight', rects };
        $._addAnnotation(annotation);

        $._renderHighlights(annotation);
    }),
    _addAnnotation: (annotation) => {
        $.annotations.push(annotation);
        localStorage.setItem('paws--annotations', JSON.stringify($.annotations));
    },
    _relative: ({ top, left, right, bottom, width, height, page }) => {
        const parent = $.document.querySelector(`.pdfViewer .page[data-page-number="${page}"]`);

        let pRect = parent.getBoundingClientRect();
        const b = parseFloat(getComputedStyle(parent).borderWidth);
        const pTop = pRect.top + b;
        const pLeft = pRect.left + b;
        const pBottom = pRect.bottom - b;
        const pRight = pRect.right - b;
        const pHeight = pRect.height - b * 2;
        const pWidth = pRect.width - b * 2;

        top = (top - pTop) / pHeight * 100;
        left = (left - pLeft) / pWidth * 100;
        bottom = (pBottom - bottom) / pHeight * 100;
        right = (pRight - right) / pWidth * 100;
        width = width / pWidth * 100;
        height = height / pHeight * 100;

        return { top, left, right, bottom, width, height, page };
    },
    _groupByPageNum: (rects) =>
        $._attachPageNum(rects)
            .map(rect => $._relative(rect))
            .reduce((groups, { left, top, bottom, right, width, height, page }) => {
                if (!groups[page])
                    groups[page] = [];
                groups[page].push({ left, top, bottom, right, width, height });
                return groups;
            }, {}),
    _attachPageNum: (rects) =>
        rects.map(({ left, top, right, bottom, width, height }) => {
            let pointEl = $.iframe.contentDocument.elementFromPoint(left, top);
            let page: any = null;
            // as PDF.js (3.4.112): everything is markedContent
            if (pointEl && pointEl.closest('.markedContent')) {
                pointEl = pointEl.closest('.pdfViewer .page');
                page = parseInt(pointEl.getAttribute('data-page-number'));
            }
            return { left, top, right, bottom, width, height, page };
        }),
    _filterRects: (rects) => rects.filter(rect => rect.page && rect.width > 0 && rect.height > 0),
    _mergeRects: (rects) => {
        rects = rects.sort((a, b) => (a.width * a.height) - (b.width * b.height));

        // TODO: using 'ignore' may not be efficient

        // merge horizontal rects
        for (var i = 1; i < rects.length; i++)
            for (var j = 0; j < i; j++) {
                const a = rects[i], b = rects[j];
                if (!b.ignore && a.top == b.top && a.bottom == b.bottom && b.right >= a.left) {
                    a.ignore = b.ignore = true;
                    const left = Math.min(a.left, b.left),
                        right = Math.max(a.right, b.right);
                    rects.push({
                        top: b.top,
                        bottom: b.bottom,
                        left,
                        right,
                        height: a.bottom - a.top,
                        width: right - left
                    });
                }
            }

        rects = rects.filter(rect => !rect.ignore);
        // merge completely-overlapping rects
        for (let i = 1; i < rects.length; i++)
            for (let j = 0; j < i; j++) {
                const a = rects[i], b = rects[j];
                if (!b.ignore && b.left >= a.left && b.top >= a.top && b.right <= a.right && b.bottom <= a.bottom) {
                    b.ignore = true;
                    break;
                }
            }

        rects = rects.filter(rect => !rect.ignore);
        return rects;
    },
}

const annotator = $;
export default annotator;