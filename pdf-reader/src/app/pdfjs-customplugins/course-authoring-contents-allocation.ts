const scale = (pdfjs: any) => pdfjs.pdfViewer.currentScale;
const removeSelectorAll = (el: HTMLElement, selector: string) => el?.querySelectorAll(selector).forEach((el: any) => el.remove());
const htmlToElements = (html: string) => {
  const temp = document.createElement('div');
  temp.innerHTML = html;
  return temp.firstChild as HTMLElement;
}

export class CourseAuthoringContentsAllocation {

  private registry: any;
  private button: HTMLElement = null as any;

  private course: any = null as any;

  constructor({ registry }) {
    this.registry = registry;

    this._addToolbarUI();
    this._attachStylesheet();
    this._startAllocationOnClick();
    this._loadActivitiesOnUnitSelect();
    this._navToSectionOnClick();

    // only for dev
    // this.button.click();
  }

  private _getPdfJS() { return this.registry.getPdfJS(); }
  private _getDocumentEl() { return this.registry.getDocumentEl(); }
  private _getToolbarEl() { return this.registry.get('toolbar'); }

  private _addToolbarUI() {
    this.button = htmlToElements(
      `<span 
        class="pdf-toolbar-btn pdf-toolbar__course-authoring-contents-btn" 
        title="Course Authoring Contents">
        <img src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAA4AAAAOCAQAAAC1QeVaAAAAzklEQVR42lXQMUoDURSF4ZcUmkIY4mQEC9FF6BK0cxXaC1pZ2wbdgmCXfWgr2GQFplEmARUZZ/TzGkaSnMM7977/dDf9SUcn8kLpzdWcdNO/rMU7BnA6J221Lou8xod33MVvQy8t5ATA5TI+DHdj3oDblh3F0DfF2Hns23Yiz4wx008KU8CT3KZHwEyR5F5QqfEaplYRdJAMlGhQ02aDUpS5CSrwHYYKE1EWftD41LCybSU9I8+ArzAIMmrPILNvqAKVoQNZWpVd9x7sLcgv0ef932HH9KMAAAAASUVORK5CYII=">
       <span>`);
    this._getToolbarEl().addItem(this.button);

    this.button.addEventListener('click', () => {
      this.button.classList.toggle('selected');
      if (this.button.classList.contains('selected')) {
        this._getToolbarEl().deselect(this.button);
        this._getToolbarEl().showDetails(this._getMappingPanelEl());
      } else {
        this._getToolbarEl().showDetails(null as any);
      }
    });
  }

  private _attachStylesheet() {
    this._getDocumentEl().querySelector('head').appendChild(htmlToElements(
      `<style>
        .course-authoring-contents-allocation__container {
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
          color: white;
          max-width: 30rem;
        }
        .course-authoring-contents-allocation__container a {
          color: white;
        }
      </style>`
    ));
  }

  private _getMappingPanelEl() {
    const panel = htmlToElements(
      `<form autocomplete="off" class="course-authoring-contents-allocation__container">
        <span>Paste in the course link:</span>
        <div style="display:flex; align-items:center; gap:0.25rem;">
          <input type="text" placeholder="Course link" style="flex-grow: 1;" value="http://localhost:3001/api/hub/66ab7f7bc5ce4c32b8c69b05"/>
          <button type="button" class="load-course-btn">load course</button>
        </div>
      </form>`
    );

    const loadbtn = panel.querySelector('button.load-course-btn') as HTMLButtonElement;
    loadbtn.addEventListener('click', () => {
      const url = panel.querySelector('input')?.value;
      this.registry.get('http').get(url).subscribe(
        (res: any) => {
          this.course = res;
          this._prepContentsAllocation(panel);
        },
        (err: any) => console.error(err)
      );
    });

    // setTimeout(() => loadbtn.click(), 0);

    return [panel];
  }

  private _prepContentsAllocation(panel: HTMLElement) {
    const attrs = [
      "user_email:Author",
      "code:Code", "name:Name",
      "domain:Domain",
      "description:Description",
      "institution:Institution",
      "created_at:Created at",
      "tags:Tags"
    ];
    const ginfo = attrs.map(attr => attr.split(':', 2))
      .map(attr => {
        let value = this.course[attr[0]];
        if (Array.isArray(value))
          value = value.join(', ');
        value = value.trim().length ? value : '[unspecified]';
        if (attr[0] === 'created_at')
          value = new Date(value).toLocaleString();
        return `<div><b>${attr[1]}:</b> ${value}</div>`;
      })
      .join('');

    const ginfoEl = htmlToElements(`<div class="course-ginfo" style="font-size: 0.8rem; padding:0.25rem;">${ginfo}</div>`);
    panel.appendChild(ginfoEl);

    let toggleBtnEl = htmlToElements(`<div><button type="button">↑ hide course info</button></div>`);
    panel.appendChild(toggleBtnEl);

    toggleBtnEl = toggleBtnEl.querySelector('button') as HTMLButtonElement;
    toggleBtnEl.addEventListener('click', () => {
      ginfoEl.classList.toggle('hidden');
      toggleBtnEl.textContent = ginfoEl.classList.contains('hidden') ? '↓ show course info' : '↑ hide course info';
    });
    // toggleBtnEl.click();

    const outline = this.registry.get('pdfDoc').outline;
    const allocationsEl = outline.map(o =>
      `<tr>
        <td>${o.page}</td>
        <td colspan="2">
          <div style="display:flex; align-items:center; gap:0.25rem;">
            <button type="button" data-outline-id="${o.id}" class="outline-btn" 
              style="margin-left: ${o.level * 0.75}rem; flex-grow:1; text-align:left;">
              ${o.title}
            </button>
            <button type="button" data-outline-id="${o.id}" data-outline-level="${o.level}" class="allocate-btn">
              allocate
            </button>
          </div>
        </td>
      </tr>`).join('');
    panel.appendChild(htmlToElements(
      `<div style="height: 20rem; overflow-y: auto;">
        <table class="course-units" style="font-size: 0.8rem; width: 100%;">
          <thead>
            <tr>
              <th style="text-align: left;">Page</th>
              <th style="text-align: left;">Sections</th>
            </tr>
          </thead>
          <tbody>${allocationsEl}</tbody>
        </table>
      </div>`
    ));
  }

  private _startAllocationOnClick() {
    this._getDocumentEl().addEventListener('click', (e: any) => {
      if (e.target.classList.contains('allocate-btn')) {
        const id = e.target.getAttribute('data-outline-id');
        const level = e.target.getAttribute('data-outline-level');
        const nexttr = document.createElement('tr');
        nexttr.classList.add('allocation-el');
        nexttr.setAttribute('data-outline-id', id);
        nexttr.innerHTML = `
            <td></td>
            <td>
              <div style="display:flex; align-items:center; gap: 0.25rem; margin-left: ${parseInt(level) * 0.75}rem;"> 
                <span>→</span>
                <select class="units-select" style="width: 12rem;">
                  <option value="">Select unit</option>
                  ${this.course.units.map(u => `<option value="${u.id}" title="${u.description}">${u.name}</option>`).join('')}
                </select>
                <select class="activities-select" disabled="true" style="width: 10rem;">
                  <option value="">Select activity</option>
                </select>
              </div>
            </td>
          `;
        let tr = e.target.closest('tr');
        while (tr.nextElementSibling?.getAttribute('data-outline-id') == id)
          tr = tr.nextElementSibling;
        tr.after(nexttr);
      }
    });
  }

  private _loadActivitiesOnUnitSelect() {
    this._getDocumentEl().addEventListener('change', (e: any) => {
      if (e.target.classList.contains('units-select')) {
        const tr = e.target.closest('tr');
        const activites = tr.querySelector('.activities-select') as HTMLSelectElement;
        activites.disabled = false;
        activites.innerHTML = `<option value="">Select activity</option>`;
        if (e.target.value) {
          const id = parseInt(e.target.value);
          const unit = this.course.units.find(u => u.id == id);
          activites.innerHTML += this.course.resources
            .map(r => unit.activities[r.id])
            .map(activities =>
              activities.map(a => `<option value="${a.id}">${a.name}</option>`).join('')
            ).join('');
        }
      }
    });
  }

  private _navToSectionOnClick() {
    this._getDocumentEl().addEventListener('click', (e: any) => {
      if (e.target.classList.contains('outline-btn')) {
        const outlineId = e.target.getAttribute('data-outline-id');
        const entry = this.registry.get('pdfDoc').outline.find(o => o.id == outlineId);
        this.registry.get('reader').scrollToEntry(entry);
      }
    });
  }
}

(window as any).course_authoring_contents_allocation = ({ registry }) => {
  new CourseAuthoringContentsAllocation({ registry });
};