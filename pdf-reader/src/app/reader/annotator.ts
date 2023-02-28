const $: any = {
    iframe: null,
    pdfjs: null,
    window: null,
    document: null,
    rects: {},
    init: (iframe, pdfjs) => {
        $.iframe = iframe;
        $.pdfjs = pdfjs;
        $.window = $.iframe?.contentWindow;
        $.document = $.iframe?.contentDocument.documentElement;

        $._onSelection();
        $._onPageRendered();
    },
    _onPageRendered: () => {
        $.pdfjs.eventBus.on('pagerendered', ($event) => {
            const num = $event.pageNumber;
            const rects = {};
            rects[num] = $.rects[num];
            if (rects[num])
                $._render(rects);
        });
    },
    _ensure: (pageNum) => {
        const page = $.document.querySelector(`.pdfViewer .page[data-page-number="${pageNum}"]`);
        let viewer = page.querySelector('.annotation-viewer');
        if (viewer)
            return viewer;

        viewer = document.createElement('div');
        viewer.classList.add('annotation-viewer');
        viewer.style.cssText = `
            position: absolute;
            left: 0;
            top: 0;
            right: 0;
            bottom: 0;
            overflow: hidden;
            opacity: 1;
            line-height: 1;
            -webkit-text-size-adjust: none;
            -moz-text-size-adjust: none;
            text-size-adjust: none;
            forced-color-adjust: none;
            transform-origin: 0 0;
            z-index: 1;
        `;
        page.appendChild(viewer);

        return viewer;
    },
    _render: (pages) => Object
        .keys(pages).forEach(page => {
            const viewer = $._ensure(page);

            pages[page].forEach(rect => {
                const el = document.createElement('div');
                el.style.cssText = `
                    position: absolute;
                    top: ${rect.top}%;
                    left: ${rect.left}%;
                    width: ${rect.width}%;
                    height: ${rect.height}%;
                    background-color: yellow;
                    border: solid 1px black;
                `;
                viewer.appendChild(el);
            })
        }),
    _append: (rects) => {
        Object.keys(rects).forEach(page => {
            if (!(page in $.rects))
                $.rects[page] = [];

            rects[page].forEach(rect => $.rects[page].push(rect));
        })
    },
    _selection: () => $.window.getSelection(),
    _onSelection: () => {
        $.document.onclick = ($event) => {
            const selection = $._selection();
            if (selection.rangeCount < 1)
                return;

            const range = selection.getRangeAt(0);
            let rects = Array.from(range.getClientRects());
            selection.removeAllRanges();

            rects = $._attachPageNum(rects);
            rects = $._filterRects(rects);
            if (rects.length < 1)
                return;

            rects = $._groupByPageNum(rects);
            $._render(rects);
            $._append(rects);
        }
    },
    _relative: ({ top, left, width, height, page }) => {
        const parent = $.document.querySelector(`.pdfViewer .page[data-page-number="${page}"]`);
        const rect = parent.getBoundingClientRect();
        top = (top - (rect.top - 9)) / (rect.height + 18) * 100;
        left = (left - (rect.left - 9)) / (rect.width + 18) * 100;
        width = (width / (rect.width + 18)) * 100;
        height = (height / (rect.height + 18)) * 100;
        return { top, left, width, height, page };
    },
    _groupByPageNum: (rects) =>
        $._attachPageNum(rects)
            .map(rect => $._relative(rect))
            .reduce((res, { left, top, width, height, page }) => {
                if (!res[page])
                    res[page] = [];
                res[page].push({ left, top, width, height });
                return res;
            }, {}),
    _attachPageNum: (rects) =>
        rects.map(({ left, top, width, height }) => {
            let el = $.iframe.contentDocument.elementFromPoint(left, top);
            let page: any = null;
            // as PDF.js (3.4.112): everything is markedContent
            if (el && el.closest('.markedContent')) {
                el = el.closest('.pdfViewer .page');
                page = parseInt(el.getAttribute('data-page-number'));
            }
            return { left, top, width, height, page };
        }),
    _filterRects: (rects) =>
        rects.filter(rect => rect.page && rect.width > 0 && rect.height > 0),
}

const annotator = $;
export default annotator;