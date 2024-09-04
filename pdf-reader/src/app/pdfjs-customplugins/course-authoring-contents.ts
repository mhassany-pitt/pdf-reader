const scale = (pdfjs: any) => pdfjs.pdfViewer.currentScale;
const removeSelectorAll = (el: HTMLElement, selector: string) => el?.querySelectorAll(selector).forEach((el: any) => el.remove());
const htmlToElements = (html: string) => {
  const temp = document.createElement('div');
  temp.innerHTML = html;
  return temp.firstChild as HTMLElement;
}

export class CourseAuthoringContents {

  private registry: any;
  private contents: any[] = null as any;
  private _afterContentsLoaded: any = {};

  constructor({ registry }) {
    this.registry = registry;

    this.registry.register('course-authoring-contents', this);

    let configs = this._configs();
    if (!this.registry.get('env').production) {
      configs = this._defaultConfigs();
    }

    if (configs) {
      this._loadContents(configs.url);
      this._renderOnPagerendered();
      this._attachStylesheet();
      this._loadGroupContentsOnClick();
    }
  }

  private _configs() { return this.registry.get(`configs.course-authoring-contents`); }
  private _defaultConfigs() { return CourseAuthoringContents.defaultConfigs(); }
  static defaultConfigs() {
    return { url: 'http://localhost:3000/plugins/course-authoring-contents.json' };
  }

  private _getPdfJS() { return this.registry.getPdfJS(); }
  private _getDocumentEl() { return this.registry.getDocumentEl(); }

  private _attachStylesheet() {
    this._getDocumentEl().querySelector('head').appendChild(htmlToElements(
      `<style>
        .course-authoring-contents {
          position: absolute;
          left: calc(100% + 2px);
          top: 0;
          padding: calc(0.25rem * var(--course-authoring-contents-scale));
          width: max-content;
          display: flex;
          flex-direction: column;
          align-items: stretch;
          gap: calc(0.25rem * var(--course-authoring-contents-scale));
          pointer-events: auto;
          background-color: white;
        }
        .course-authoring-contents__groups {
          display: flex;
          flex-direction: column;
          align-items: stretch;
          gap: calc(0.125rem * var(--course-authoring-contents-scale));
          min-width: 5rem;
        }
        .course-authoring-contents__groups button {
          font-size: calc(var(--course-authoring-contents-scale) * 75%);
          text-align: left;
          text-transform: capitalize;
        }
        .course-authoring-contents__group.active {
          text-decoration: underline;
          font-weight: bold;
        }
        .course-authoring-contents__group-contents {
          display: flex;
          flex-direction: column;
          gap: calc(0.125rem * var(--course-authoring-contents-scale));
          padding: calc(0.25rem * var(--course-authoring-contents-scale));
          padding-left: 1.25rem;
          font-size: calc(var(--course-authoring-contents-scale) * 75%);
          border: solid 1px #ccc;
        }
        .course-authoring-contents__group-content {
          text-transform: capitalize;
        }
        .course-authoring-contents__group-content-iframe-modal {
          position: absolute;
          inset: 0;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          z-index: 6;
          width: 100%;
          height: 100%;
        }
        .course-authoring-contents__group-content-iframe-modal-overlay {
          position: absolute;
          inset: 0;
          background-color: rgba(0, 0, 0, 0.5);
        }
        .course-authoring-contents__group-content-iframe-modal-content {
          position: relative;
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
          padding: 0.5rem;
          background-color: white;
          border: solid 1px #ccc;
          border-radius: 0.25rem;
          width: 90%;
          height: 90%;
        }
        .course-authoring-contents__group-content-iframe-title {
          display: flex;
          align-items: center;
          gap: 0.25rem;
        }
        .course-authoring-contents__group-content-iframe-title > span {
          flex-grow: 1;
          text-transform: capitalize;
        }
        .course-authoring-contents__group-content-iframe {
          flex-grow: 1;
          border: none;
        }
      </style>`
    ));
  }

  private _loadContents(url: string) {
    this.registry.get('http').get(url).subscribe({
      next: (contents: any) => {
        this.contents = contents;
        for (const pageNum of Object.keys(this._afterContentsLoaded)) {
          this._afterContentsLoaded[parseInt(pageNum)]();
          delete this._afterContentsLoaded[pageNum];
        };
      },
      error: (error) => console.log(error)
    });
  }

  private _renderOnPagerendered() {
    this._getPdfJS().eventBus.on('pagerendered', ($event: any) => {
      if (this.contents) this._render($event);
      else this._afterContentsLoaded[$event.pageNumber] = () => this._render($event);
    });
  }

  private _render($event: any) {
    const pageNum = $event.pageNumber;
    const layerEl = this.registry.get('annotation-layer').getOrAttachLayerEl(pageNum);
    removeSelectorAll(layerEl, `.course-authoring-contents[data-page="${pageNum}"]`);

    const contents = this.contents.filter(c => c.page === pageNum);
    if (contents.length < 1)
      return;

    const panelEl = htmlToElements(
      `<div class="course-authoring-contents" data-page="${pageNum}" style="--course-authoring-contents-scale: ${scale(this._getPdfJS())}">
        <h4>${contents[0].section || ''}</h4>
        <div class="course-authoring-contents__groups"></div>
      </div>`
    );
    layerEl.appendChild(panelEl);

    const groups: string[] = [];
    contents.forEach((c: any) => {
      if (groups.indexOf(c.group) < 0)
        groups.push(c.group);
    });

    const groupsEl = panelEl.querySelector('.course-authoring-contents__groups') as HTMLElement;
    groups.sort().forEach((g: any) => {
      groupsEl.appendChild(htmlToElements(
        `<button data-page="${pageNum}" data-group="${g}" class="course-authoring-contents__group">
          ${g.indexOf(':') >= 0 && g.indexOf(':') <= 2 ? g.split(':')[1] : g}
         </button>`
      ));
    });
  }

  private _loadGroupContentsOnClick() {
    const documentEl = this._getDocumentEl();
    documentEl.addEventListener('click', ($event: any) => {
      const target = $event.target as HTMLElement;
      if (target.classList.contains('course-authoring-contents__group'))
        this._loadGroupContents($event, target);
      else if (target.classList.contains('course-authoring-contents__group-content'))
        this._loadGroupContent($event, target);
      else if (target.classList.contains('course-authoring-contents__group-content-iframe-close'))
        target.closest('.course-authoring-contents__group-content-iframe-modal')?.remove();
    });
  }

  private _loadGroupContents($event: any, target: HTMLElement) {
    const parent = target.closest('.course-authoring-contents') as HTMLElement;
    parent.querySelectorAll('.course-authoring-contents__group').forEach((el: any) => el.classList.remove('active'));
    target.classList.add('active');

    parent.querySelector('.course-authoring-contents__group-contents')?.remove();

    const pageNum = parseInt(target.getAttribute('data-page') as string);
    const group = target.getAttribute('data-group');
    const contents = this.contents.filter(c => c.page === pageNum && c.group === group);
    const userEmail = this.registry.get('authUser')?.email;
    const innerHTML = contents.map((c: any) => {
      const url = c.url.replace('${user.email}', userEmail || '${user.email}');
      return `<li><a href="${url}" target="_blank" class="course-authoring-contents__group-content">${c.title}</a></li>`;
    }).join('');
    target.after(htmlToElements(`<ul class="course-authoring-contents__group-contents">${innerHTML}</ul>`));
  }

  private _loadGroupContent($event: any, target: HTMLElement) {
    $event.preventDefault();

    const nohttp = (url: string) => url.replace(/^https?:\/\//, '');

    const page = target.closest('.page') as HTMLElement;
    page.querySelector('.course-authoring-contents__group-content-iframe-modal')?.remove();

    const url = target.getAttribute('href') as string;
    if (nohttp(url).split('/')[0] == nohttp(location.href).split('/')[0]) {
      page.appendChild(htmlToElements(
        `<div class="course-authoring-contents__group-content-iframe-modal">
          <div class="course-authoring-contents__group-content-iframe-modal-overlay"></div>
          <div class="course-authoring-contents__group-content-iframe-modal-content">
            <div class="course-authoring-contents__group-content-iframe-title">
              <span>${(target.textContent as string).trim()}</span>
              <button class="course-authoring-contents__group-content-iframe-open-in-newtab">
                <a href="${url}" target="_blank">open in new tab</a>
              </button>
              <button class="course-authoring-contents__group-content-iframe-close">close</button>
            </div>
            <iframe src="${url}" class="course-authoring-contents__group-content-iframe"></iframe>
          </div>
         </div>
        `
      ));
      page.querySelector('.course-authoring-contents__group-content-iframe-modal')?.scrollIntoView()
    } else {
      window.open(url, '_blank');
    }
  }
}

(window as any).course_authoring_contents = ({ registry }) => {
  new CourseAuthoringContents({ registry });
};
