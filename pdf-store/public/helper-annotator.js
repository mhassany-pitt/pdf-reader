const isRightClick = ($event) => {
  return (typeof $event.pointerType !== 'undefined') && $event.button === 2;
};
const htmlToElements = (html) => {
  const temp = document.createElement('div');
  temp.innerHTML = html;
  return temp.firstChild;
};
class HelperAnnotator {
  constructor({ iframe, pdfjs, storage, annotator }) {
      this.annotation = {
          cancer_type: '',
          audience_type: '',
          knowledge_level: '',
          trajectory: '',
          typeof_document: '',
          red_flags: [],
      };
      this.document = iframe === null || iframe === void 0 ? void 0 : iframe.contentDocument;
      this.documentEl = this.document.documentElement;
      this.pdfjs = pdfjs;
      this.storage = storage;
      this.annotator = annotator;
      this._attachStylesheet();
      this._registerAnnotatorItemUI();
      this.load();
  }
  load() {
      this.annotation = JSON.parse(localStorage.getItem('helper-annotation') || '{}');
      this.annotation.red_flags = this.annotation.red_flags || [];
  }
  persist() {
      localStorage.setItem('helper-annotation', JSON.stringify(this.annotation));
  }
  _attachStylesheet() {
      this.documentEl.querySelector('head').appendChild(htmlToElements(`<style>
      .helper-annotation__title { 
        font-weight: bold;
      }
      .helper-annotation__controls { 
        width: 15rem; 
        display: flex;
        flex-direction: column;
        border-left: solid 2px #ccc;
        padding-left: 0.5rem;
        gap: 0.25rem;
      }
      .helper-annotation__control-label {
        font-size: 0.85rem;
        font-weight: bold;
        margin-bottom: -0.125rem;
      }
      .helper-annotation__control-values { 
        display: flex; 
        align-items: center; 
        flex-wrap: wrap; 
        column-gap: 0.125rem; 
        row-gap: 0.125rem; 
      }
      .helper-annotation__control-values button {
        font-size: 0.7rem;
      }
      .helper-annotation__btn--selected {
        font-weight: bold;
        background-color: lightgray;
      }
    </style>`));
  }
  _registerAnnotatorItemUI() {
      this.annotator.register('POPUP_ROW_ITEM_UI', ($event) => {
          if (!isRightClick($event))
              return null;
          const containerEl = htmlToElements(`<div class="helper-annotation">
        <div class="helper-annotation__title">HELPeR Annotator</div>  

        <div class="helper-annotation__controls">
          <span class="helper-annotation__control-label">Cancer Type</span>
          <div class="helper-annotation__control-values helper-annotation__cancer-type">
            <button type="button" value="ovarian-cancer">Ovarian Cancer</button>
            <button type="button" value="gynecologic-cancer">Gynecologic Cancer</button>
            <button type="button" value="childhood-cancer">Childhood Cancer</button>
            <button type="button" value="all-types-of-cancer">All Types of Cancer</button>
            <button type="button" value="not-cancer-related">Not Cancer Related</button>
          </div>

          <span class="helper-annotation__control-label">Audience Type</span>
          <div class="helper-annotation__control-values helper-annotation__audience-type">
            <button type="button" value="patient">Patient</button>
            <button type="button" value="caregiver">Caregiver</button>
            <button type="button" value="patient-and-caregiver">Patient and Caregiver</button>
            <button type="button" value="health-professional">Health Professional</button>
            <button type="button" value="others">Others</button>
          </div>

          <span class="helper-annotation__control-label">Knowledge Level</span>
          <div class="helper-annotation__control-values helper-annotation__knowledge-level">
            <button type="button" value="basic">Basic</button>
            <button type="button" value="intermediate">Intermediate</button>
            <button type="button" value="advanced">Advanced</button>
            <button type="button" value="expert">Expert</button>
          </div>
          
          <span class="helper-annotation__control-label">Trajectory</span>
          <div class="helper-annotation__control-values helper-annotation__trajectory">
            <button type="button" value="previvorship">Previvorship</button>
            <button type="button" value="survivorship">Survivorship</button>
            <button type="button" value="survivorship-during-progression/recurrence">Survivorship during Progression/Recurrence</button>
            <button type="button" value="survivorship-after-treatment">Survivorship after Treatment</button>
            <button type="button" value="end-of-life">End of Life</button>
            <button type="button" value="any-phase">Any Phase</button>
            <button type="button" value="any-phase-of-survivorship">Any Phase of Survivorship</button>
          </div>

          <span class="helper-annotation__control-label">Type of the Document</span>
          <div class="helper-annotation__control-values helper-annotation__typeof-document">
            <button type="button" value="provide-factual-information">Provide Factual Information</button>
            <button type="button" value="narrative">Narrative</button>
            <button type="button" value="research-news">Research News</button>
            <button type="button" value="research-articles">Research Articles</button>
          </div>

          <span class="helper-annotation__control-label">Red Flags</span>
          <div class="helper-annotation__control-values helper-annotation__red-flags">
            <button type="button" value="questionable-resource">Questionable Resource</button>
            <button type="button" value="poor-quality">Poor Quality</button>
          </div>
        </div>
      </div>`);
          // -- set initial state
          const select = (elSelector, value, type) => containerEl.querySelectorAll(`${elSelector} button`).forEach((el) => {
              if ((type == 'radio' && value == el.getAttribute('value'))
                  || (type == 'toggle' && value.includes(el.getAttribute('value'))))
                  el.classList.add('helper-annotation__btn--selected');
          });
          select('.helper-annotation__cancer-type', this.annotation.cancer_type, 'radio');
          select('.helper-annotation__audience-type', this.annotation.audience_type, 'radio');
          select('.helper-annotation__knowledge-level', this.annotation.knowledge_level, 'radio');
          select('.helper-annotation__trajectory', this.annotation.trajectory, 'radio');
          select('.helper-annotation__typeof-document', this.annotation.typeof_document, 'radio');
          select('.helper-annotation__red-flags', this.annotation.red_flags, 'toggle');
          // -- event listeners
          const radio = (elSelector, setValue) => {
              const parent = containerEl.querySelector(elSelector);
              parent.addEventListener('click', ($event) => {
                  const el = $event.target;
                  if (el.tagName.toLowerCase() == 'button') {
                      parent.querySelectorAll('button').forEach((button) => button.classList.remove('helper-annotation__btn--selected'));
                      el.classList.add('helper-annotation__btn--selected');
                      setValue(el.getAttribute('value'));
                  }
              });
          };
          const toggle = (elSelector, addValue, removeValue) => {
              const parent = containerEl.querySelector(elSelector);
              parent.addEventListener('click', ($event) => {
                  const el = $event.target;
                  if (el.tagName.toLowerCase() == 'button') {
                      el.classList.toggle('helper-annotation__btn--selected');
                      const contains = el.classList.contains('helper-annotation__btn--selected');
                      if (contains)
                          addValue(el.getAttribute('value'));
                      else /* */
                          removeValue(el.getAttribute('value'));
                  }
              });
          };
          const update = (attr, value) => {
              this.annotation[attr] = value;
              this.persist();
          };
          radio('.helper-annotation__cancer-type', (value) => update('cancer_type', value));
          radio('.helper-annotation__audience-type', (value) => update('audience_type', value));
          radio('.helper-annotation__knowledge-level', (value) => update('knowledge_level', value));
          radio('.helper-annotation__trajectory', (value) => update('trajectory', value));
          radio('.helper-annotation__typeof-document', (value) => update('typeof_document', value));
          toggle('.helper-annotation__red-flags', (value) => update('red_flags', [...this.annotation.red_flags, value]), (value) => update('red_flags', this.annotation.red_flags.filter((v) => v != value)));
          return containerEl;
      });
  }
}
window.helper_annotator = function init({ iframe, pdfjs, storage, annotator }) {
  new HelperAnnotator({ iframe, pdfjs, storage, annotator });
};