const isLeftClick = ($event: any, checkType = false) => (!checkType || $event.type == 'click') && $event.button === 0;
const removeSelectorAll = (el: HTMLElement, selector: string) => el?.querySelectorAll(selector).forEach((el: any) => el.remove());
const getOrParent = ($event: any, selector: string) => $event.target.classList?.contains(selector) ? $event.target : $event.target?.closest(selector);
const htmlToElements = (html: string) => {
  const temp = document.createElement('div');
  temp.innerHTML = html;
  return temp.firstChild as HTMLElement;
}

const topics = [
  "Caregiving: Anxiety",
  "Caregiving: Caregiver coping",
  "Caregiving: Communication",
  "Caregiving: General ",
  "Caregiving: Grief and loss",
  "Caregiving: Self care",
  "Caregiving: Stress",
  "Communication: General",
  "Communication: With children and grandchildren",
  "Communication: With family and friends",
  "Communication: With healthcare team/providers",
  "Complementary therapy/Integrative medicine: Acupuncture",
  "Complementary therapy/Integrative medicine: Aromatherapy",
  "Complementary therapy/Integrative medicine: Biofeedback",
  "Complementary therapy/Integrative medicine: General",
  "Complementary therapy/Integrative medicine: Herbal medicine ",
  "Complementary therapy/Integrative medicine: Hypnosis",
  "Complementary therapy/Integrative medicine: Massage therapy",
  "Complementary therapy/Integrative medicine: Visualization/Imagery ",
  "Complementary therapy/Integrative medicine: Yoga ",
  "Diagnosis: Signs and Symptoms",
  "Diagnosis: Testing",
  "Disease Management: Advance care planning/Advance directives",
  "Disease Management: Finding gynecologic oncologist ",
  "Disease Management: Management of recurrence",
  "Disease Management: Monitoring for recurrence",
  "Disease Management: Preparing for visit ",
  "Disease Management: Seeking a second opinion",
  "Disease Management: Supportive Care/Palliative Care",
  "Emotional Management: Anxiety",
  "Emotional Management: Coping",
  "Emotional Management: Depression",
  "Emotional Management: Fear of recurrence",
  "Emotional Management: General",
  "Emotional Management: Grief and loss",
  "Emotional Management: Mood swings/changes ",
  "End of Life: General",
  "End of Life: Hospice ",
  "End of Life: Physical changes at EOL",
  "End of Life: Transitioning to EOL care",
  "Fertility: Fertility preservation",
  "Fertility: General ",
  "Fertility: Reproductive/Fertility assistance",
  "General Information: Causes, Risk Factors and Prevention",
  "General Information: Latest research",
  "General Information: Overview: Borderline malignant tumors/Low malignant potential ",
  "General Information: Overview: Ovarian epithelial cancer, fallopian tube cancer, primary peritoneal cancer ",
  "General Information: Overview: Ovarian Germ Cell tumors",
  "General Information: Quality of Life ",
  "General Information: Statistics",
  "Genetics: Genetic counseling ",
  "Genetics: Germline genetic testing ",
  "Genetics: Hereditary breast and ovarian cancer syndrome ",
  "Genetics: Lynch syndrome ",
  "Genetics: Tumor genomic testing ",
  "Practical Needs: Employment ",
  "Practical Needs: Financial ",
  "Practical Needs: Insurance ",
  "Practical Needs: Legal ",
  "Practical Needs: Support services/Community resources ",
  "Prognosis: Stages",
  "Prognosis: Survival rates",
  "Rehabilitation: General ",
  "Rehabilitation: Occupational therapy ",
  "Rehabilitation: Pelvic floor",
  "Rehabilitation: Physical therapy  ",
  "Self-management: General ",
  "Self-management: Nutrition",
  "Self-management: Physical activity ",
  "Self-management: Spiritual support ",
  "Sexuality: General ",
  "Sexuality: Sexual Intimacy/Activity/Relationships ",
  "Sexuality: Sexual side effects ",
  "Sexuality: Sexual therapist/psychologist",
  "Symptom/Treatment related/Side Effect Management: Appearance: Hair loss",
  "Symptom/Treatment related/Side Effect Management: Appearance: Nail changes",
  "Symptom/Treatment related/Side Effect Management: Appearance: Skin care/Skin changes/scars",
  "Symptom/Treatment related/Side Effect Management: Bladder/Urinary: Incontinence",
  "Symptom/Treatment related/Side Effect Management: Bladder/Urinary: Urinary retention",
  "Symptom/Treatment related/Side Effect Management: Blood clots",
  "Symptom/Treatment related/Side Effect Management: Blood Counts: Low platelet counts",
  "Symptom/Treatment related/Side Effect Management: Blood Counts: Low red blood cells",
  "Symptom/Treatment related/Side Effect Management: Blood Counts: Low white blood cells",
  "Symptom/Treatment related/Side Effect Management: Early menopause",
  "Symptom/Treatment related/Side Effect Management: Fatigue ",
  "Symptom/Treatment related/Side Effect Management: General ",
  "Symptom/Treatment related/Side Effect Management: GI/Abdominal: Ascites",
  "Symptom/Treatment related/Side Effect Management: GI/Abdominal: Bloating",
  "Symptom/Treatment related/Side Effect Management: GI/Abdominal: Bowel: Constipation",
  "Symptom/Treatment related/Side Effect Management: GI/Abdominal: Bowel: Diarrhea",
  "Symptom/Treatment related/Side Effect Management: GI/Abdominal: Bowel: Incontinence",
  "Symptom/Treatment related/Side Effect Management: GI/Abdominal: Bowel: Ostomy management ",
  "Symptom/Treatment related/Side Effect Management: GI/Abdominal: Dehydration",
  "Symptom/Treatment related/Side Effect Management: GI/Abdominal: Heartburn",
  "Symptom/Treatment related/Side Effect Management: GI/Abdominal: Hiccups",
  "Symptom/Treatment related/Side Effect Management: GI/Abdominal: Loss of appetite",
  "Symptom/Treatment related/Side Effect Management: GI/Abdominal: Mouth and throat problems: Dry mouth",
  "Symptom/Treatment related/Side Effect Management: GI/Abdominal: Mouth and throat problems: Mouth sores/Mucositis",
  "Symptom/Treatment related/Side Effect Management: GI/Abdominal: Mouth and throat problems: Sensitivity to hot or cold foods",
  "Symptom/Treatment related/Side Effect Management: GI/Abdominal: Mouth and throat problems: Swallowing problems",
  "Symptom/Treatment related/Side Effect Management: GI/Abdominal: Mouth and throat problems: Taste/Smell changes",
  "Symptom/Treatment related/Side Effect Management: GI/Abdominal: Mouth and throat problems: Tooth decay",
  "Symptom/Treatment related/Side Effect Management: GI/Abdominal: Nausea ",
  "Symptom/Treatment related/Side Effect Management: GI/Abdominal: Vomiting",
  "Symptom/Treatment related/Side Effect Management: GI/Abdominal: Weight changes",
  "Symptom/Treatment related/Side Effect Management: Hypersensitivity reactions/Allergic reactions",
  "Symptom/Treatment related/Side Effect Management: Infections",
  "Symptom/Treatment related/Side Effect Management: Lymphedema ",
  "Symptom/Treatment related/Side Effect Management: Neuro: Balance problems and falls",
  "Symptom/Treatment related/Side Effect Management: Neuro: Cognitive/Memory Problems ",
  "Symptom/Treatment related/Side Effect Management: Neuro: Confusion/Delirium",
  "Symptom/Treatment related/Side Effect Management: Neuro: Hearing loss",
  "Symptom/Treatment related/Side Effect Management: Neuro: Neuropathy ",
  "Symptom/Treatment related/Side Effect Management: Neuro: Seizures",
  "Symptom/Treatment related/Side Effect Management: Pain",
  "Symptom/Treatment related/Side Effect Management: Second cancers",
  "Symptom/Treatment related/Side Effect Management: Shortness of breath ",
  "Symptom/Treatment related/Side Effect Management: Skin Problems: Dry skin",
  "Symptom/Treatment related/Side Effect Management: Skin Problems: Hand foot syndrome ",
  "Symptom/Treatment related/Side Effect Management: Skin Problems: Pressure sores",
  "Symptom/Treatment related/Side Effect Management: Skin Problems: Rashes",
  "Symptom/Treatment related/Side Effect Management: Skin Problems: Scars and wounds ",
  "Symptom/Treatment related/Side Effect Management: Skin Problems: Skin Itchiness",
  "Symptom/Treatment related/Side Effect Management: Sleep problems",
  "Symptom/Treatment related/Side Effect Management: Swelling/Edema ",
  "Treatment: Chemotherapy ",
  "Treatment: Clinical Trails",
  "Treatment: General",
  "Treatment: Hormone therapy ",
  "Treatment: Immunotherapy",
  "Treatment: Intraperitoneal Chemotherapy ",
  "Treatment: Prophylactic surgery",
  "Treatment: Radiation ",
  "Treatment: Surgery",
  "Treatment: Targeted therapies ",
]

const keywords = [
  "Cancer and Caregiver anxiety",
  "Cancer and Caregiver coping",
  "Cancer and Caregiver communication",
  "General caregiver information, ovarian cancer",
  "Cancer and Caregiver grief and loss",
  "Cancer and Caregiver self-care",
  "Cancer and Caregiver stress",
  "Communication, ovarian cancer",
  "Cancer communication, family",
  "Cancer communication, family",
  "Cancer communication, healthcare providers or clinicians",
  "Acupuncture and ovarian cancer",
  "Aromatherapy and ovarian cancer",
  "Biofeedback and ovarian cancer",
  "Complementary therapy or integrative medicine, ovarian cancer",
  "Herbal medicine, ovarian cancer",
  "Hypnosis, ovarian cancer",
  "Massage therapy, ovarian cancer",
  "Visualization/Imagery, ovarian cancer",
  "Yoga, ovarian cancer",
  "Ovarian cancer, signs or symptoms",
  "Ovarian cancer testing",
  "Cancer, Advance care planning or Advance directives",
  "Finding gynecologic oncologist",
  "Manage ovarian cancer recurrence",
  "Monitor ovarian cancer recurrence",
  "Preparing for visit, ovarian cancer",
  "Seeking a second opinion, cancer",
  "Supportive care or Palliative care for ovarian cancer",
  "Cancer, Anxiety management",
  "Cancer, Coping",
  "Cancer, Depression management",
  "Ovarian Cancer, Fear of recurrence",
  "Cancer emotional management",
  "Cancer, Grief and loss",
  "Cancer, Mood swings or changes",
  "Ovarian cancer, end of life or palliative care",
  "Ovarian cancer, Hospice",
  "Physical changes, end of life, ovarian cancer",
  "Transition to end of life care or palliative care",
  "Fertility preservation, ovarian cancer",
  "Fertility and ovarian cancer",
  "Reproductive or Fertility assistance, ovarian cancer",
  "Causes of ovarian cancer",
  "Risk factors of ovarian cancer",
  "Ovarian cancer prevention",
  "Ovarian cancer, latest research",
  "Borderline malignant tumors or Low malignant potential, ovarian cancer",
  "Ovarian epithelial cancer",
  "Fallopian tube cancer",
  "Primary peritoneal cancer",
  "Ovarian Germ Cell tumors",
  "Quality of life, ovarian cancer",
  "Ovarian cancer statistics",
  "Genetic counseling, ovarian cancer",
  "Germline genetic testing, ovarian cancer",
  "Hereditary breast and ovarian cancer syndrome",
  "Lynch syndrome",
  "Tumor genomic testing, ovarian cancer",
  "Employment, cancer",
  "Financial, cancer",
  "Insurance, cancer",
  "Legal issue, cancer",
  "Support services, ovarian cancer",
  "Community resources, ovarian cancer",
  "Ovarian cancer stages",
  "Ovarian cancer survival rates",
  "Ovarian cancer, rehabilitation",
  "Cancer, rehabilitation",
  "Occupational therapy, ovarian cancer",
  "Pelvic floor rehabilitation, ovarian cancer",
  "Physical therapy, ovarian cancer",
  "Self-management, ovarian cancer",
  "Nutrition, ovarian cancer",
  "Physical activity, ovarian cancer",
  "Spiritual support, cancer",
  "Sexuality, ovarian cancer",
  "Sexual intimacy, ovarian cancer",
  "Sexual activity, ovarian cancer",
  "Sexual relationships, ovarian cancer",
  "Sexual side effects, ovarian cancer",
  "Sexual therapist, gynecologic cancer",
  "Sexual psychologist, gynecologic cancer",
  "Hair loss, chemotherapy",
  "Nail changes, chemotherapy",
  "Skin care, chemotherapy",
  "Skin changes, chemotherapy",
  "Scars, chemotherapy",
  "Incontinence, chemotherapy",
  "Urinary retention, chemotherapy",
  "Blood clots, chemotherapy",
  "Low platelet counts, chemotherapy",
  "Low red blood cells, chemotherapy",
  "Low white blood cells, chemotherapy",
  "Early menopause, chemotherapy",
  "Early menopause, ovarian cancer",
  "Fatigue, chemotherapy",
  "Ovarian cancer, symptom management",
  "Ovarian cancer, treatment related side effects",
  "Ascites, chemotherapy",
  "Bloating, chemotherapy",
  "Constipation, chemotherapy",
  "Diarrhea, chemotherapy",
  "Incontinence, chemotherapy",
  "Ostomy management, chemotherapy",
  "Dehydration, chemotherapy",
  "Heartburn, chemotherapy",
  "Hiccups, chemotherapy",
  "Loss of appetite, chemotherapy",
  "Dry mouth, chemotherapy",
  "Mouth sores, chemotherapy",
  "Mucositis, chemotherapy",
  "Sensitivity to hot or cold foods, chemotherapy",
  "Swallowing problems, chemotherapy",
  "Taste changes, chemotherapy",
  "Smell changes, chemotherapy",
  "Tooth decay, chemotherapy",
  "Nausea, chemotherapy",
  "Vomiting, chemotherapy",
  "Weight changes, chemotherapy",
  "Hypersensitivity reactions, chemotherapy",
  "Allergic reactions, chemotherapy",
  "Infections, chemotherapy",
  "Lymphedema, chemotherapy",
  "Balance problems, chemotherapy",
  "Falls, chemotherapy",
  "Cognitive problems, chemotherapy",
  "Memory problems, chemotherapy",
  "Confusion, chemotherapy",
  "Delirium, chemotherapy",
  "Hearing loss, chemotherapy",
  "Neuropathy, chemotherapy",
  "Seizures, chemotherapy",
  "Pain, chemotherapy",
  "Second cancers, ovarian cancer",
  "Shortness of breath, chemotherapy",
  "Dry skin, chemotherapy",
  "Hand foot syndrome, chemotherapy",
  "Pressure sores, chemotherapy",
  "Rashes, chemotherapy",
  "Scars and wounds, chemotherapy",
  "Skin Itchiness, chemotherapy",
  "Sleep problems, chemotherapy",
  "Swelling, chemotherapy",
  "Edema, chemotherapy",
  "Chemotherapy, ovarian cancer",
  "Clinical trials, ovarian cancer",
  "Ovarian cancer treatment",
  "Hormone therapy, ovarian cancer",
  "Immunotherapy, ovarian cancer",
  "Intraperitoneal Chemotherapy, ovarian cancer",
  "Prophylactic surgery, ovarian cancer",
  "Radiation, ovarian cancer",
  "Surgery, ovarian cancer",
  "Targeted therapies, ovarian cancer",
]

export class HelperAnnotator {

  private registry: any;
  private toolbarBtn: any;
  private enabled = false;

  private topic: string = '';
  private keywords: string[] = [];
  private sectionStart: any;
  private sectionEnd: any;

  private annotation: any = {};
  private defAnnot = {
    title: '',
    cancer_type: '',
    audience_type: '',
    knowledge_level: '',
    trajectory: '',
    typeof_document: '',
    red_flags: [] as string[],
    sections: [] as any[],
  };

  constructor({ registry }) {
    this.registry = registry;

    this.load();

    this._addToolbarBtn();

    this._attachStylesheet();
    this._showSectionAnnotUIOnHighlight();
    this._renderOnPagerendered();
  }

  private load() {
    this.annotation = JSON.parse(localStorage.getItem('helper-annotation-sections') || JSON.stringify(this.defAnnot));
  }
  private persist() {
    localStorage.setItem('helper-annotation-sections', JSON.stringify(this.annotation));
  }

  private _getPdfJS() { return this.registry.getPdfJS(); }
  private _getDocument() { return this.registry.getDocument(); }
  private _getDocumentEl() { return this.registry.getDocumentEl(); }
  private _getToolbarEl() { return this.registry.get('toolbar'); }

  private _attachStylesheet() {
    this._getDocumentEl().querySelector('head').appendChild(htmlToElements(
      `<style>
        .helper-annotation {
          position: absolute;
          background-color: #d3d3d3;
          box-shadow: rgba(60, 64, 67, 0.3) 0px 1px 2px 0px, rgba(60, 64, 67, 0.15) 0px 1px 3px 1px;
          border-radius: 0.125rem;
          z-index: 9999;
        }
        .helper-annotation * {
          user-select: none;
        }
        .helper-annotation--hidden {
          display: none !important;
        }

        .helper-annotation__ctrl2 {
          position: relative;
          border-radius: 0.25rem;
          padding: 0.25rem;
          z-index: 9999;
          background-color: #d3d3d3;
          pointer-events: auto;
          max-width: 15rem;
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
        }

        .helper-annotation .helper-annotation__drop-arrow {
          box-shadow: rgba(60, 64, 67, 0.3) 0px 1px 2px 0px, rgba(60, 64, 67, 0.15) 0px 1px 3px 1px;
          position: absolute;
          background-color: #d3d3d3;
          width: 0.325rem; 
          height: 0.325rem;
          transform: rotate(45deg);
          z-index: 1;
        }
        .helper-annotation .helper-annotation__start-drop-arrow {
          bottom: -0.1625rem;
          left: 0.25rem;
        }
        .helper-annotation .helper-annotation__end-drop-arrow {
          top: -0.1625rem;
          right: 0.25rem;
        }

        .helper-annotation__section-topic {
          font-family: monospace;
          border-radius: 0.25rem;
          padding: 0.125rem 0.25rem;
          font-size: 0.65rem;
          position: relative;
          z-index: 2;
          pointer-events: auto;
          display: flex;
          flex-flow: row;
          align-items: center;
          gap: 0.25rem;
        }
        .helper-annotation__section-start .helper-annotation__section-topic,
        .helper-annotation__section-start .helper-annotation__start-drop-arrow,
        .helper-annotation__section-start .helper-annotation__end-drop-arrow { 
          background-color: lightgreen;
        }
        .helper-annotation__section-end .helper-annotation__section-topic,
        .helper-annotation__section-end .helper-annotation__start-drop-arrow,
        .helper-annotation__section-end .helper-annotation__end-drop-arrow { 
          background-color: pink;
        }
        .helper-annotation__section-remove-btn {
          color: red;
          cursor: pointer;
        }
        .helper-annotation__section-remove-btn:hover {
          font-weight: bold;
        }

        .helper-annotation__set-start-btn {
          color: green;
        }
        .helper-annotation__set-end-btn {
          color: red;
        }
        .helper-annotation__options {
          display: flex; 
          gap: 0.25rem;
        }
        .helper-annotation__keyword-options, 
        .helper-annotation__topic-options {
          width: 100%;
        }

        .helper-annotation__title,
        .helper-annotation__sections {
          margin-left: 0.5rem;
        }
        .helper-annotation__title {
          color: white;
        }
        .helper-annotation__sections li {
          list-style-type: auto;
          margin-left: 1.5rem;
          color: white;
          cursor: pointer;
        }
        .helper-annotation__sections li:hover {
          text-decoration: underline;
        }
        .helper-annotation__ctrls1 { 
          width: 25rem; 
          display: flex;
          flex-direction: column;
          padding: 0.125rem;
          gap: 0.25rem;
        }
        .helper-annotation__ctrl1-label {
          color: lightblue;
          font-family: monospace;
        }
        .helper-annotation__ctrl1-values { 
          display: flex; 
          align-items: center; 
          flex-wrap: wrap; 
          column-gap: 0.125rem; 
          row-gap: 0.125rem;
          margin-left: 0.5rem;
          font-family: monospace;
        }
        .helper-annotation__ctrl1-values:not(:last-child) {
          margin-bottom: 0.25rem;
        }
        .helper-annotation__ctrl1-values button,
        .helper-annotation__ctrl1-values li,
        .helper-annotation__ctrl1-values span {
          font-size: 0.65rem;
          color: #ededed;
        }
        .helper-annotation__ctrl1-values button {
          background-color: transparent;
          padding: 0.125rem 0.25rem;
          border: solid 1px darkgray;
          border-radius: 0.25rem;
          font-family: monospace;
          cursor: pointer;
        }
        .helper-annotation__ctrl1-values button:hover {
          font-weight: bold;
          border: solid 1px orange;
          color: white;
        }
        .helper-annotation__--selected {
          font-weight: bold !important;
          border: solid 2px orange !important;
          color: lightgray !important;
        }
      </style>`
    ));
  }

  private _addToolbarBtn(): void {
    this.registry.get('toolbar').addSeparator();

    // add toolbar button
    this.toolbarBtn = htmlToElements(`<span class="pdf-toolbar-btn helper-annotator" title="HELPeR Annotator" style="color: yellow;">H<span>`);
    this._getToolbarEl().addItem(this.toolbarBtn);

    // toggle details on click
    this.toolbarBtn.addEventListener('click', () => {
      this.toolbarBtn.classList.toggle('selected');
      if (this.toolbarBtn.classList.contains('selected')) {
        this.enabled = true;
        this._getToolbarEl().deselect(this.toolbarBtn);
        this._getToolbarEl().showDetails(this._getToolbarDetailsEl());
      } else {
        this.enabled = false;
        this._getToolbarEl().showDetails(null as any);
      }
    });

    this.toolbarBtn.addEventListener('mouseover', () => {
      if (this.enabled && !this._getToolbarEl().hasDetails()) {
        this._getToolbarEl().showDetails(this._getToolbarDetailsEl());
      }
    });

    this._getDocument().addEventListener('mousedown', ($event: any) => {
      if (this.enabled && isLeftClick($event)) {
        if (!$event.target.closest('.pdf-toolbar')) {
          this._getToolbarEl().showDetails(null as any);
        }
      }
    });
  }

  private _renderOnPagerendered() {
    this._getPdfJS().eventBus.on('pageannotationsloaded', ($event: any) => {
      const pageNum = $event.pageNumber;
      const annotsLayerEl = this.registry.get('annotation-layer').getOrAttachLayerEl(pageNum);
      removeSelectorAll(annotsLayerEl, '.helper-annotation');

      this.render(pageNum);
    });
  }

  render(pageNum?: number) {
    this.annotation.sections.forEach((section) => {
      const { page: sspage } = section.sectionStart;
      const { page: sepage } = section.sectionEnd;
      if (!pageNum || sspage == pageNum || sepage == pageNum)
        try { this._renderSection(section); }
        catch (exp) { console.log(exp); }
    });
  }

  private _showSectionAnnotUIOnHighlight() {
    let mdown = false, mdragging = false;
    this._getDocument().addEventListener('mousedown', ($event: any) => {
      if (this.enabled && isLeftClick($event)) mdown = true;
    });

    this._getDocument().addEventListener('mousemove', ($event: any) => {
      if (this.enabled && isLeftClick($event)) mdragging = mdown;
    });

    const handle = ($event: any) => {
      mdown = false;
      const pending = getOrParent($event, '.helper-annotation-pending');

      let handled = false;
      if (mdragging && !pending) {
        const rects = this.registry.get('reader').getSelectionRects(this._getDocument(), this._getPdfJS());
        const text = this._getDocument().getSelection().toString();
        if (rects && Object.keys(rects).length) {
          this._renderPendingSection(text, rects);
          handled = true;
        }
      }

      if (!handled && !pending)
        removeSelectorAll(this._getDocumentEl(), `.helper-annotation-pending`);
    };

    this._getDocument().addEventListener('mouseup', ($event: any) => {
      if (this.enabled && isLeftClick($event))
        handle($event);
    });
    this._getDocument().addEventListener('dblclick', ($event: any) => {
      if (this.enabled) {
        mdragging = true;
        handle($event);
      }
    });
  }

  private _renderPendingSection(text: string, rects: { [pageNum: number]: any[]; }) {
    const diff = (a, b, tt, rr) => {
      const diff = a[tt] - b[tt];
      return diff == 0 ? a[rr] - b[rr] : diff;
    };

    const page = Math.min(...Object.keys(rects).map((page) => parseInt(page)));
    const blocks = rects[page].sort((a, b) => this.sectionStart ? diff(a, b, 'top', 'left') : diff(a, b, 'bottom', 'right'));
    const { top, left, bottom, right } = blocks[0];

    removeSelectorAll(this._getDocumentEl(), `.helper-annotation-pending`);

    const startEl = htmlToElements(
      `<div class="helper-annotation helper-annotation-pending">
        <div class="helper-annotation__drop-arrow helper-annotation__start-drop-arrow"></div>
        <div class="helper-annotation__ctrl2">
          <div style="display: flex; gap: 0.25rem;">
            <button class="helper-annotation__keyword-add-btn">+Keyword</button>
            <button class="helper-annotation__set-start-btn">[[</button>
            <button class="helper-annotation__set-end-btn">]]</button>
            <button class="helper-annotation__set-title-btn">+Title</button>
          </div>
          <div class="helper-annotation__options helper-annotation--hidden">
            <select class="helper-annotation__keyword-options helper-annotation--hidden">
              <option value="">select a keyword</option>${keywords.map(t => `<option value="${t}">${t}</option>`)}
            </select>
            <select class="helper-annotation__topic-options helper-annotation--hidden">
              <option value="">select topic</option>${topics.map(t => `<option value="${t}">${t}</option>`)}
            </select>
            <button class="helper-annotation__option-add-btn">add</button>
          </div>
        </div>
      </div>`
    );
    const startAnnotLayerEl = this.registry.get('annotation-layer').getOrAttachLayerEl(page);
    startAnnotLayerEl.appendChild(startEl);
    startAnnotLayerEl.appendChild(htmlToElements(
      `<style>
        .helper-annotation-pending {
          bottom: calc(100% - ${top}% + 0.125rem);
          left: calc(${left}% - 0.5rem);
        }
      </style>`
    ));

    const addKeywordBtn = startEl.querySelector('.helper-annotation__keyword-add-btn') as HTMLElement;
    const setStartBtn = startEl.querySelector('.helper-annotation__set-start-btn') as HTMLElement;
    const setEndBtn = startEl.querySelector('.helper-annotation__set-end-btn') as HTMLElement;
    const setTitle = startEl.querySelector('.helper-annotation__set-title-btn') as HTMLElement;

    const options = startEl.querySelector('.helper-annotation__options') as HTMLElement;
    const topicOptions = startEl.querySelector('.helper-annotation__topic-options') as HTMLSelectElement;
    const keywordOptions = startEl.querySelector('.helper-annotation__keyword-options') as HTMLSelectElement;
    const addbtn = startEl.querySelector('.helper-annotation__option-add-btn') as HTMLElement;
    let type: 'keyword' | 'bound' = 'keyword';

    addKeywordBtn.addEventListener('click', () => {
      topicOptions.classList.add('helper-annotation--hidden');
      keywordOptions.classList.remove('helper-annotation--hidden');
      options.classList.remove('helper-annotation--hidden');
      addbtn.textContent = 'add';
      type = 'keyword';
    });

    if (this.sectionStart)
      setStartBtn.setAttribute('disabled', 'disabled');
    setStartBtn.addEventListener('click', () => {
      keywordOptions.classList.add('helper-annotation--hidden');
      topicOptions.classList.remove('helper-annotation--hidden');
      options.classList.remove('helper-annotation--hidden');
      addbtn.textContent = 'set';
      type = 'bound';
    });

    addbtn.addEventListener('click', () => {
      if (type == 'keyword') {
        this.keywords.push(keywordOptions.value);
        keywordOptions.value = '';
      } else if (type == 'bound') {
        this.topic = topicOptions.value;
        topicOptions.value = '';
        this.sectionStart = { page, top, left };
        removeSelectorAll(this._getDocumentEl(), `.helper-annotation-pending`);
        this._renderSection({
          id: 'pending-start',
          sectionStart: this.sectionStart,
          sectionEnd: this.sectionEnd,
          topic: this.topic,
        });
      }
      options.classList.add('helper-annotation--hidden');
    });

    if (!this.sectionStart)
      setEndBtn.setAttribute('disabled', 'disabled');
    setEndBtn.addEventListener('click', () => {
      this.sectionEnd = { page, bottom, right };

      this.annotation.sections.push({
        id: Math.random().toString(36).substring(2, 9),
        sectionStart: this.sectionStart,
        sectionEnd: this.sectionEnd,
        topic: this.topic,
        keywords: this.keywords,
      });
      this.persist();
      this.topic = '';
      this.keywords = [];
      this.sectionStart = null;
      this.sectionEnd = null;
      removeSelectorAll(this._getDocumentEl(), `.helper-annotation-pending-start`);
      removeSelectorAll(this._getDocumentEl(), `.helper-annotation-pending`);
      this.render();
    });

    setTitle.addEventListener('click', () => {
      this.annotation.title = text;
      setTitle.textContent = 'Title is updated!';
      setTimeout(() => setTitle.textContent = '+Title', 3000);
    });
  }

  private _renderSection(section: any) {
    removeSelectorAll(this._getDocumentEl(), `.helper-annotation-${section.id}`);

    const removeSection = () => {
      if (confirm('Are you sure you want to remove this section?')) {
        this.annotation.sections = this.annotation.sections.filter((s) => s.id != section.id);
        removeSelectorAll(this._getDocumentEl(), `.helper-annotation-${section.id}`);
        this.persist();
      }
    };

    const startEl = htmlToElements(
      `<div class="helper-annotation helper-annotation-${section.id} helper-annotation__section-start">
        <div class="helper-annotation__drop-arrow helper-annotation__start-drop-arrow"></div>
        <div class="helper-annotation__section-topic">
          <span>Section [${section.topic}]</span>
          <span class="helper-annotation__section-remove-btn">x<span>
        </div>
        <style>
          .helper-annotation-${section.id}.helper-annotation__section-start {
            bottom: calc(100% - ${section.sectionStart.top}% + 0.125rem);
            left: calc(${section.sectionStart.left}% - 0.5rem);
          }
        </style>
      </div>`
    );
    startEl.querySelector('.helper-annotation__section-remove-btn')?.addEventListener('click', ($event) => removeSection());
    const startAnnotLayerEl = this.registry.get('annotation-layer').getOrAttachLayerEl(section.sectionStart.page);
    startAnnotLayerEl.appendChild(startEl);

    if (section.sectionEnd) {
      const endEl = htmlToElements(
        `<div class="helper-annotation helper-annotation-${section.id} helper-annotation__section-end">
          <div class="helper-annotation__drop-arrow helper-annotation__end-drop-arrow"></div>
          <div class="helper-annotation__section-topic">
            <span>Section [${section.topic}]</span>
            <span class="helper-annotation__section-remove-btn">x<span>
          </div>
          <style>
            .helper-annotation-${section.id}.helper-annotation__section-end {
              top: calc(100% - ${section.sectionEnd.bottom}% + 0.125rem);
              right: calc(${section.sectionEnd.right}% - 0.5rem);
            }
          </style>
        </div>`
      );
      endEl.querySelector('.helper-annotation__section-remove-btn')?.addEventListener('click', ($event) => removeSection());
      const endAnnotLayerEl = this.registry.get('annotation-layer').getOrAttachLayerEl(section.sectionEnd.page);
      endAnnotLayerEl.appendChild(endEl);
    }
  }

  private _getToolbarDetailsEl() {
    const containerEl = htmlToElements(
      `<div class="helper-annotation__ctrls1">
        <span class="helper-annotation__ctrl1-label">Title</span>
        <div class="helper-annotation__ctrl1-values helper-annotation__title">
          <span>${this.annotation.title || 'not specified'}</span>
        </div>

        <span class="helper-annotation__ctrl1-label">Sections</span>
        <div class="helper-annotation__ctrl1-values helper-annotation__sections">
          <ul>${this.annotation.sections?.length
        ? this.annotation.sections.map((s) => `<li data-section-id="${s.id}">${s.topic}</li>`).join('')
        : '<span>empty list</span>'}</ul>
        </div>

        <span class="helper-annotation__ctrl1-label">Cancer Type</span>
        <div class="helper-annotation__ctrl1-values helper-annotation__cancer-type">
          <button type="button" value="ovarian-cancer">Ovarian Cancer</button>
          <button type="button" value="gynecologic-cancer">Gynecologic Cancer</button>
          <button type="button" value="childhood-cancer">Childhood Cancer</button>
          <button type="button" value="all-types-of-cancer">All Types of Cancer</button>
          <button type="button" value="not-cancer-related">Not Cancer Related</button>
        </div>

        <span class="helper-annotation__ctrl1-label">Audience Type</span>
        <div class="helper-annotation__ctrl1-values helper-annotation__audience-type">
          <button type="button" value="patient">Patient</button>
          <button type="button" value="caregiver">Caregiver</button>
          <button type="button" value="patient-and-caregiver">Patient and Caregiver</button>
          <button type="button" value="health-professional">Health Professional</button>
          <button type="button" value="others">Others</button>
        </div>

        <span class="helper-annotation__ctrl1-label">Knowledge Level</span>
        <div class="helper-annotation__ctrl1-values helper-annotation__knowledge-level">
          <button type="button" value="basic">Basic</button>
          <button type="button" value="intermediate">Intermediate</button>
          <button type="button" value="advanced">Advanced</button>
          <button type="button" value="expert">Expert</button>
        </div>

        <span class="helper-annotation__ctrl1-label">Trajectory</span>
        <div class="helper-annotation__ctrl1-values helper-annotation__trajectory">
          <button type="button" value="previvorship">Previvorship</button>
          <button type="button" value="survivorship">Survivorship</button>
          <button type="button" value="survivorship-during-progression/recurrence">Survivorship during Progression/Recurrence</button>
          <button type="button" value="survivorship-after-treatment">Survivorship after Treatment</button>
          <button type="button" value="end-of-life">End of Life</button>
          <button type="button" value="any-phase">Any Phase</button>
          <button type="button" value="any-phase-of-survivorship">Any Phase of Survivorship</button>
        </div>

        <span class="helper-annotation__ctrl1-label">Type of the Document</span>
        <div class="helper-annotation__ctrl1-values helper-annotation__typeof-document">
          <button type="button" value="provide-factual-information">Provide Factual Information</button>
          <button type="button" value="narrative">Narrative</button>
          <button type="button" value="research-news">Research News</button>
          <button type="button" value="research-articles">Research Articles</button>
        </div>

        <span class="helper-annotation__ctrl1-label">Red Flags</span>
        <div class="helper-annotation__ctrl1-values helper-annotation__red-flags">
          <button type="button" value="questionable-resource">Questionable Resource</button>
          <button type="button" value="poor-quality">Poor Quality</button>
        </div>
      </div>`);

    const sections = containerEl.querySelector('.helper-annotation__sections') as HTMLElement;
    sections.addEventListener('click', ($event: any) => {
      const id = $event.target.getAttribute('data-section-id');
      const { sectionStart } = this.annotation.sections.find((s) => s.id == id);
      const { page, top, left } = sectionStart;
      this.registry.get('reader').scrollTo(this._getDocument(), this._getPdfJS(), { page, top, left });
      this._getToolbarEl().showDetails(null as any);
    });

    // -- set initial state
    const select = (elSelector, value, type) => containerEl.querySelectorAll(`${elSelector} button`).forEach((el: any) => {
      if ((type == 'radio' && value == el.getAttribute('value'))
        || (type == 'toggle' && value.includes(el.getAttribute('value'))))
        el.classList.add('helper-annotation__--selected');
    });
    select('.helper-annotation__cancer-type', this.annotation.cancer_type, 'radio');
    select('.helper-annotation__audience-type', this.annotation.audience_type, 'radio');
    select('.helper-annotation__knowledge-level', this.annotation.knowledge_level, 'radio');
    select('.helper-annotation__trajectory', this.annotation.trajectory, 'radio');
    select('.helper-annotation__typeof-document', this.annotation.typeof_document, 'radio');
    select('.helper-annotation__red-flags', this.annotation.red_flags, 'toggle');

    // -- event listeners
    const radio = (elSelector, setValue) => {
      const parent = containerEl.querySelector(elSelector) as HTMLElement;
      parent.addEventListener('click', ($event: any) => {
        const el = $event.target;
        if (el.tagName.toLowerCase() == 'button') {
          parent.querySelectorAll('button').forEach((button: any) => button.classList.remove('helper-annotation__--selected'));
          el.classList.add('helper-annotation__--selected');
          setValue(el.getAttribute('value'));
        }
      });
    }

    const toggle = (elSelector, addValue, removeValue) => {
      const parent = containerEl.querySelector(elSelector) as HTMLElement;
      parent.addEventListener('click', ($event: any) => {
        const el = $event.target;
        if (el.tagName.toLowerCase() == 'button') {
          el.classList.toggle('helper-annotation__--selected');
          const contains = el.classList.contains('helper-annotation__--selected');
          if (contains) addValue(el.getAttribute('value'));
          else /* */ removeValue(el.getAttribute('value'));
        }
      });
    }

    const update = (attr, value) => {
      this.annotation[attr] = value;
      this.persist();
    }

    radio('.helper-annotation__cancer-type', (value) => update('cancer_type', value));
    radio('.helper-annotation__audience-type', (value) => update('audience_type', value));
    radio('.helper-annotation__knowledge-level', (value) => update('knowledge_level', value));
    radio('.helper-annotation__trajectory', (value) => update('trajectory', value));
    radio('.helper-annotation__typeof-document', (value) => update('typeof_document', value));
    toggle('.helper-annotation__red-flags',
      (value) => update('red_flags', [...this.annotation.red_flags, value]),
      (value) => update('red_flags', this.annotation.red_flags.filter((v) => v != value)));

    return [containerEl];
  }
}

(window as any).helper_annotator = ({ registry }) => {
  new HelperAnnotator({ registry });
};