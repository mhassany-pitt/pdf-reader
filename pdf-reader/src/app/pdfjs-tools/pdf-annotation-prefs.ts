import { PdfFilter } from './pdf-filter';
import { PdfStorage } from './pdf-storage';
import { getOrParent, htmlToElements } from './pdf-utils';

export type AnnotationPrefsTab = 'you' | 'visible';

function escapeHtml(value: string) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Shared Preferences panel for identity (config) + visibility filter.
 * Both toolbar buttons open this; `activeTab` picks the starting section.
 */
export function buildAnnotationPrefsPanel(opts: {
  filter: PdfFilter;
  storage: PdfStorage;
  activeTab?: AnnotationPrefsTab;
  onReplayTour?: () => void;
}): HTMLElement {
  const { filter, storage } = opts;
  const activeTab: AnnotationPrefsTab = opts.activeTab || 'you';
  const displayName = filter.getDisplayName() || '';
  const isPrivate = filter.getVisibility() == 'private';
  const selecteds = () => filter.getSelecteds() || [];

  const preset = (() => {
    const s = selecteds();
    if (!s.length || s[0] === 'none') return 'none';
    if (s[0] === 'mine') return 'mine';
    if (s[0] === 'all') return 'all';
    return 'people';
  })();

  const panel = htmlToElements(
    `<div class="pdf-annotation-panel pdf-annotation-prefs">
      <div class="pdf-annotation-panel__header">Annotation preferences</div>
      <div class="pdf-annotation-panel__hint">
        Set how you’re identified when creating notes, and which annotations appear on this document.
      </div>

      <div class="pdf-annotation-prefs__tabs" role="tablist">
        <button type="button" class="pdf-annotation-prefs__tab ${activeTab === 'you' ? 'is-active' : ''}"
          data-tab="you" role="tab" aria-selected="${activeTab === 'you'}">You</button>
        <button type="button" class="pdf-annotation-prefs__tab ${activeTab === 'visible' ? 'is-active' : ''}"
          data-tab="visible" role="tab" aria-selected="${activeTab === 'visible'}">Visible</button>
      </div>

      <div class="pdf-annotation-prefs__panel ${activeTab === 'you' ? 'is-active' : ''}" data-panel="you" role="tabpanel">
        <form class="pdf-annotation-panel__section pdf-annotation-toolbar__display-name-form" autocomplete="off">
          <div class="pdf-annotation-panel__section-label">Display name</div>
          <input placeholder="e.g. Jane Doe"
            title="Name shown on annotations you create"
            value="${displayName.replace(/"/g, '&quot;')}"
            class="pdf-annotation-field pdf-annotation-toolbar__display-name"/>
          <div class="pdf-annotation-panel__hint">
            Attached to annotations you create. Used by “My annotations only” on the Visible tab.
          </div>
        </form>

        <div class="pdf-annotation-panel__section pdf-annotation-toolbar__visibility">
          <div class="pdf-annotation-panel__section-label">Default privacy for new annotations</div>
          <div class="pdf-annotation-prefs__choices" role="radiogroup" aria-label="Default privacy">
            <label class="pdf-annotation-prefs__choice">
              <input type="radio" name="pdf-annot-privacy" value="public" ${!isPrivate ? 'checked' : ''}/>
              <span class="pdf-annotation-prefs__choice-text">
                <span class="pdf-annotation-prefs__choice-title">Shared</span>
                <span class="pdf-annotation-prefs__choice-hint">Others can see what you add</span>
              </span>
            </label>
            <label class="pdf-annotation-prefs__choice">
              <input type="radio" name="pdf-annot-privacy" value="private" ${isPrivate ? 'checked' : ''}/>
              <span class="pdf-annotation-prefs__choice-text">
                <span class="pdf-annotation-prefs__choice-title">Private</span>
                <span class="pdf-annotation-prefs__choice-hint">Only you can see new annotations</span>
              </span>
            </label>
          </div>
        </div>
      </div>

      <div class="pdf-annotation-prefs__panel ${activeTab === 'visible' ? 'is-active' : ''}" data-panel="visible" role="tabpanel">
        <div class="pdf-annotation-panel__section">
          <div class="pdf-annotation-panel__section-label">Show annotations from</div>
          <div class="pdf-annotation-prefs__choices pdf-annotation-toolbar__filter-presets" role="radiogroup" aria-label="Show annotations from">
            <label class="pdf-annotation-prefs__choice">
              <input type="radio" name="pdf-annot-filter" value="mine" ${preset === 'mine' ? 'checked' : ''}/>
              <span class="pdf-annotation-prefs__choice-text">
                <span class="pdf-annotation-prefs__choice-title">Only me</span>
                <span class="pdf-annotation-prefs__choice-hint">Annotations you created on this document</span>
              </span>
            </label>
            <label class="pdf-annotation-prefs__choice">
              <input type="radio" name="pdf-annot-filter" value="all" ${preset === 'all' ? 'checked' : ''}/>
              <span class="pdf-annotation-prefs__choice-text">
                <span class="pdf-annotation-prefs__choice-title">Everyone</span>
                <span class="pdf-annotation-prefs__choice-hint">All shared annotations on this document</span>
              </span>
            </label>
            <label class="pdf-annotation-prefs__choice">
              <input type="radio" name="pdf-annot-filter" value="none" ${preset === 'none' ? 'checked' : ''}/>
              <span class="pdf-annotation-prefs__choice-text">
                <span class="pdf-annotation-prefs__choice-title">Nobody</span>
                <span class="pdf-annotation-prefs__choice-hint">Hide all annotations</span>
              </span>
            </label>
            <label class="pdf-annotation-prefs__choice">
              <input type="radio" name="pdf-annot-filter" value="people" ${preset === 'people' ? 'checked' : ''}/>
              <span class="pdf-annotation-prefs__choice-text">
                <span class="pdf-annotation-prefs__choice-title">Specific people</span>
                <span class="pdf-annotation-prefs__choice-hint">Pick authors to include</span>
              </span>
            </label>
          </div>
        </div>

        <div class="pdf-annotation-panel__section pdf-annotation-toolbar__annotator-picker"
          style="${preset === 'people' ? '' : 'display: none;'}">
          <div class="pdf-annotation-panel__section-label">Authors</div>
          <div class="pdf-annotation-toolbar__annotator-options">
            <select class="pdf-annotation-field pdf-annotation-toolbar__annotators-select">
              <option value="">Choose an author…</option>
              ${filter.getAnnotators().map(name =>
      `<option value="${escapeHtml(name)}">${escapeHtml(name)}</option>`).join('')}
            </select>
            <button type="button" class="pdf-annotation-btn pdf-annotation-btn--primary pdf-annotation-toolbar__annotator-select-btn">Add</button>
          </div>
          <div class="pdf-annotation-chips pdf-annotation-toolbar__annotators"></div>
          <div class="pdf-annotation-panel__hint">Add up to 10 authors. Remove a chip to stop showing that person.</div>
        </div>
      </div>

      ${opts.onReplayTour
      ? `<div class="pdf-annotation-panel__section">
          <div class="pdf-annotation-panel__section-label">Help</div>
          <div class="pdf-annotation-panel__hint">Walk through the full reader interface again.</div>
          <div class="pdf-annotation-panel__actions">
            <button type="button" class="pdf-annotation-btn" data-action="replay-tour">Replay interface tour</button>
          </div>
        </div>`
      : ''}

      <style>
        .pdf-annotation-prefs {
          gap: 0.6rem;
        }
        .pdf-annotation-prefs__tabs {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 0.2rem;
          padding: 0.15rem;
          border-radius: 0.5rem;
          background: color-mix(in srgb, var(--pdf-annot-text, #2c2c2c) 8%, transparent);
        }
        .pdf-annotation-prefs__tab {
          appearance: none;
          border: none;
          background: transparent;
          color: var(--pdf-annot-muted, #6b7280);
          font: inherit;
          font-size: 0.72rem;
          font-weight: 650;
          padding: 0.35rem 0.4rem;
          border-radius: 0.4rem;
          cursor: pointer;
          line-height: 1.2;
        }
        .pdf-annotation-prefs__tab:hover { color: var(--pdf-annot-text, #2c2c2c); }
        .pdf-annotation-prefs__tab.is-active {
          background: var(--pdf-annot-field-bg, #ffffff);
          color: var(--pdf-annot-text, #1f2937);
          box-shadow: 0 1px 3px rgba(16, 24, 40, 0.1);
        }
        .pdf-annotation-prefs__panel {
          display: none;
          flex-direction: column;
          gap: 0.65rem;
        }
        .pdf-annotation-prefs__panel.is-active { display: flex; }
        .pdf-annotation-prefs__choices {
          display: flex;
          flex-direction: column;
          gap: 0.3rem;
        }
        .pdf-annotation-prefs__choice {
          display: flex;
          align-items: flex-start;
          gap: 0.45rem;
          margin: 0;
          padding: 0.45rem 0.5rem;
          border-radius: 0.5rem;
          border: 1px solid color-mix(in srgb, var(--pdf-annot-border, #ccc) 90%, transparent);
          background: var(--pdf-annot-field-bg, #ffffff);
          cursor: pointer;
        }
        .pdf-annotation-prefs__choice:hover {
          border-color: color-mix(in srgb, var(--pdf-annot-accent, #3d6df0) 45%, transparent);
        }
        .pdf-annotation-prefs__choice:has(input:checked) {
          border-color: var(--pdf-annot-accent, #3d6df0);
          box-shadow: 0 0 0 2px color-mix(in srgb, var(--pdf-annot-accent, #3d6df0) 18%, transparent);
          background: color-mix(in srgb, var(--pdf-annot-accent, #3d6df0) 6%, white);
        }
        .pdf-annotation-prefs__choice input {
          margin-top: 0.12rem;
          accent-color: var(--pdf-annot-accent, #3d6df0);
          flex-shrink: 0;
        }
        .pdf-annotation-prefs__choice-text {
          display: flex;
          flex-direction: column;
          gap: 0.08rem;
          min-width: 0;
        }
        .pdf-annotation-prefs__choice-title {
          font-size: 0.78rem;
          font-weight: 650;
          color: var(--pdf-annot-text, #1f2937);
          line-height: 1.25;
        }
        .pdf-annotation-prefs__choice-hint {
          font-size: 0.68rem;
          color: var(--pdf-annot-muted, #6b7280);
          line-height: 1.3;
        }
        .pdf-annotation-toolbar__annotator-options {
          display: flex;
          align-items: stretch;
          gap: 0.35rem;
        }
        .pdf-annotation-toolbar__annotators-select {
          flex: 1;
          min-width: 0;
        }
      </style>
    </div>`);

  // Tabs
  const tabs = panel.querySelectorAll('.pdf-annotation-prefs__tab');
  const panels = panel.querySelectorAll('.pdf-annotation-prefs__panel');
  tabs.forEach((tab) => {
    tab.addEventListener('click', ($event: any) => {
      $event.preventDefault();
      $event.stopPropagation();
      const name = tab.getAttribute('data-tab');
      tabs.forEach(t => {
        const on = t === tab;
        t.classList.toggle('is-active', on);
        t.setAttribute('aria-selected', on ? 'true' : 'false');
      });
      panels.forEach(p => p.classList.toggle('is-active', p.getAttribute('data-panel') === name));
    });
  });

  panel.querySelector('[data-action="replay-tour"]')?.addEventListener('click', ($event: any) => {
    $event.preventDefault();
    $event.stopPropagation();
    opts.onReplayTour?.();
  });

  // Display name
  const form = panel.querySelector('.pdf-annotation-toolbar__display-name-form') as HTMLFormElement;
  form.onsubmit = () => false;
  const displayNameEl = form.querySelector('input') as HTMLInputElement;
  if (!filter.getDisplayName()) {
    filter.setDisplayName(`user:${Date.now()}`);
    displayNameEl.value = filter.getDisplayName();
  }
  displayNameEl.addEventListener('blur', () => {
    displayNameEl.value = displayNameEl.value.replaceAll(',', '');
    filter.setDisplayName(displayNameEl.value);
    filter.persist();
  });

  // Privacy
  panel.querySelectorAll('input[name="pdf-annot-privacy"]').forEach((input: Element) => {
    input.addEventListener('change', ($ev: any) => {
      if (!$ev.target.checked) return;
      filter.setVisibility($ev.target.value);
      filter.persist();
    });
  });

  // Filter presets + people picker
  const pickerEl = panel.querySelector('.pdf-annotation-toolbar__annotator-picker') as HTMLElement;
  const selectEl = panel.querySelector('.pdf-annotation-toolbar__annotators-select') as HTMLSelectElement;
  const showBtnEl = panel.querySelector('.pdf-annotation-toolbar__annotator-select-btn') as HTMLButtonElement;
  const annotatorsEl = panel.querySelector('.pdf-annotation-toolbar__annotators') as HTMLElement;

  const peopleOnly = () => selecteds().filter(id => !['none', 'mine', 'all'].includes(id));

  const applyReload = () => {
    const ids = selecteds();
    // Empty selection must not fall through to backend's default "mine".
    if (!ids.length) filter.setSelecteds(['none']);
    filter.persist();
    storage.qparams['annotators'] = (filter.getSelecteds() || []).join(',') || 'none';
    storage.reload(true);
  };

  const renderChips = () => {
    const people = peopleOnly();
    annotatorsEl.innerHTML = people.map(name =>
      `<div class="pdf-annotation-chip pdf-annotation-toolbar__annotator" data-annotator-id="${escapeHtml(name)}">
        <span class="pdf-annotation-toolbar__annotator-display-name">${escapeHtml(name)}</span>
        <button type="button" class="pdf-annotation-toolbar__annotator-unselect-btn" title="Remove" aria-label="Remove">×</button>
      </div>`).join('');
    annotatorsEl.style.display = people.length ? 'flex' : 'none';
    showBtnEl.disabled = selecteds().length >= 10 || !selectEl.value;
  };

  const setPreset = (value: string) => {
    pickerEl.style.display = value === 'people' ? '' : 'none';
    if (value === 'people') {
      filter.setSelecteds(peopleOnly());
    } else {
      filter.setSelecteds([value]);
    }
    renderChips();
    applyReload();
  };

  panel.querySelectorAll('input[name="pdf-annot-filter"]').forEach((input: Element) => {
    input.addEventListener('change', ($ev: any) => {
      if ($ev.target.checked) setPreset($ev.target.value);
    });
  });

  showBtnEl.addEventListener('click', () => {
    if (!selectEl.value) return;
    const next = peopleOnly();
    if (!next.includes(selectEl.value)) next.push(selectEl.value);
    filter.setSelecteds(next);
    renderChips();
    applyReload();
    selectEl.value = '';
    showBtnEl.disabled = true;
  });

  selectEl.addEventListener('change', () => {
    showBtnEl.disabled = selecteds().length >= 10 || !selectEl.value;
  });

  annotatorsEl.addEventListener('click', ($event: any) => {
    if (getOrParent($event, '.pdf-annotation-toolbar__annotator-unselect-btn')) {
      const annotId = $event.target.closest('div').getAttribute('data-annotator-id');
      const next = peopleOnly().filter(id => id !== annotId);
      filter.setSelecteds(next);
      renderChips();
      applyReload();
    }
  });

  renderChips();
  return panel;
}
