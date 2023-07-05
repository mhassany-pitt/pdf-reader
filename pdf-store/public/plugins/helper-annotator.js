"use strict";
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
// Object.defineProperty(exports, "__esModule", { value: true });
// exports.HelperAnnotator = void 0;
var isRightClick = function ($event) {
    return (typeof $event.pointerType !== 'undefined') && $event.button === 2;
};
var htmlToElements = function (html) {
    var temp = document.createElement('div');
    temp.innerHTML = html;
    return temp.firstChild;
};
var HelperAnnotator = /** @class */ (function () {
    function HelperAnnotator(_a) {
        var iframe = _a.iframe, pdfjs = _a.pdfjs, storage = _a.storage, annotator = _a.annotator;
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
    HelperAnnotator.prototype.load = function () {
        this.annotation = JSON.parse(localStorage.getItem('helper-annotation') || '{}');
        this.annotation.red_flags = this.annotation.red_flags || [];
    };
    HelperAnnotator.prototype.persist = function () {
        localStorage.setItem('helper-annotation', JSON.stringify(this.annotation));
    };
    HelperAnnotator.prototype._attachStylesheet = function () {
        this.documentEl.querySelector('head').appendChild(htmlToElements("<style>\n        .helper-annotation * {\n          user-select: none;\n        }\n        .helper-annotation__title { \n          display: flex;\n          align-items: center;\n          cursor: pointer;\n        }\n        .helper-annotation__title > span {\n          flex-grow: 1;\n        }\n        .helper-annotation__controls { \n          width: 15rem; \n          display: flex;\n          flex-direction: column;\n          border-left: solid 2px #ccc;\n          padding-left: 0.5rem;\n          gap: 0.25rem;\n        }\n        .helper-annotation__control-label {\n          font-size: 0.85rem;\n          font-weight: bold;\n          margin-bottom: -0.125rem;\n        }\n        .helper-annotation__control-values { \n          display: flex; \n          align-items: center; \n          flex-wrap: wrap; \n          column-gap: 0.125rem; \n          row-gap: 0.125rem; \n        }\n        .helper-annotation__control-values button {\n          font-size: 0.7rem;\n        }\n        .helper-annotation__btn--selected {\n          font-weight: bold;\n          background-color: lightgray;\n        }\n      </style>"));
    };
    HelperAnnotator.prototype._registerAnnotatorItemUI = function () {
        var _this = this;
        this.annotator.register('POPUP_ROW_ITEM_UI', function ($event) {
            if (!isRightClick($event))
                return null;
            var expanded = localStorage.getItem('helper-annotation-expanded') == 'true';
            var containerEl = htmlToElements("<div class=\"helper-annotation\">\n          <div class=\"helper-annotation__title\" style=\"font-weight: ".concat(expanded ? 'bold' : 'normal', "\">\n            <span>HELPeR Annotator</span>\n\n            <img src=\"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAaUlEQVR4AWNwL/ChCA93A4BACYTJMgAITIH4PRC/AWIDXOoIaf4PwvgMIaiZkCHomo2A+C2Sps0gDOND5YywGgAETED8Ek0zGwQjDIGqYcLlgmZkzTBxNENaCIWBHbJmNEPsMMNgNC8AADFm7UCWb4SEAAAAAElFTkSuQmCC\" style=\"").concat(expanded ? '' : 'display: none', "\" />\n            <img src=\"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAQAAAC1+jfqAAAAXElEQVR4Ac3BwQmDMAAF0IeHDOIEQcjV5dqNMpUQcYRfeiiItD37nltZFR/F6uIpuuKt6OLhZLKJ6Iqii9hMTha7iK6L2C0uqiEi4tB8UQ0Rh+aHajg0f8xmt/MCXVog4rd+rrcAAAAASUVORK5CYII=\" style=\"").concat(expanded ? 'display: none' : '', "\"/>\n          </div>  \n\n          <div class=\"helper-annotation__controls\" style=\"").concat(expanded ? '' : 'display: none', "\">\n            <span class=\"helper-annotation__control-label\">Cancer Type</span>\n            <div class=\"helper-annotation__control-values helper-annotation__cancer-type\">\n              <button type=\"button\" value=\"ovarian-cancer\">Ovarian Cancer</button>\n              <button type=\"button\" value=\"gynecologic-cancer\">Gynecologic Cancer</button>\n              <button type=\"button\" value=\"childhood-cancer\">Childhood Cancer</button>\n              <button type=\"button\" value=\"all-types-of-cancer\">All Types of Cancer</button>\n              <button type=\"button\" value=\"not-cancer-related\">Not Cancer Related</button>\n            </div>\n\n            <span class=\"helper-annotation__control-label\">Audience Type</span>\n            <div class=\"helper-annotation__control-values helper-annotation__audience-type\">\n              <button type=\"button\" value=\"patient\">Patient</button>\n              <button type=\"button\" value=\"caregiver\">Caregiver</button>\n              <button type=\"button\" value=\"patient-and-caregiver\">Patient and Caregiver</button>\n              <button type=\"button\" value=\"health-professional\">Health Professional</button>\n              <button type=\"button\" value=\"others\">Others</button>\n            </div>\n\n            <span class=\"helper-annotation__control-label\">Knowledge Level</span>\n            <div class=\"helper-annotation__control-values helper-annotation__knowledge-level\">\n              <button type=\"button\" value=\"basic\">Basic</button>\n              <button type=\"button\" value=\"intermediate\">Intermediate</button>\n              <button type=\"button\" value=\"advanced\">Advanced</button>\n              <button type=\"button\" value=\"expert\">Expert</button>\n            </div>\n            \n            <span class=\"helper-annotation__control-label\">Trajectory</span>\n            <div class=\"helper-annotation__control-values helper-annotation__trajectory\">\n              <button type=\"button\" value=\"previvorship\">Previvorship</button>\n              <button type=\"button\" value=\"survivorship\">Survivorship</button>\n              <button type=\"button\" value=\"survivorship-during-progression/recurrence\">Survivorship during Progression/Recurrence</button>\n              <button type=\"button\" value=\"survivorship-after-treatment\">Survivorship after Treatment</button>\n              <button type=\"button\" value=\"end-of-life\">End of Life</button>\n              <button type=\"button\" value=\"any-phase\">Any Phase</button>\n              <button type=\"button\" value=\"any-phase-of-survivorship\">Any Phase of Survivorship</button>\n            </div>\n\n            <span class=\"helper-annotation__control-label\">Type of the Document</span>\n            <div class=\"helper-annotation__control-values helper-annotation__typeof-document\">\n              <button type=\"button\" value=\"provide-factual-information\">Provide Factual Information</button>\n              <button type=\"button\" value=\"narrative\">Narrative</button>\n              <button type=\"button\" value=\"research-news\">Research News</button>\n              <button type=\"button\" value=\"research-articles\">Research Articles</button>\n            </div>\n\n            <span class=\"helper-annotation__control-label\">Red Flags</span>\n            <div class=\"helper-annotation__control-values helper-annotation__red-flags\">\n              <button type=\"button\" value=\"questionable-resource\">Questionable Resource</button>\n              <button type=\"button\" value=\"poor-quality\">Poor Quality</button>\n            </div>\n          </div>\n        </div>"));
            // -- set initial state
            var select = function (elSelector, value, type) { return containerEl.querySelectorAll("".concat(elSelector, " button")).forEach(function (el) {
                if ((type == 'radio' && value == el.getAttribute('value'))
                    || (type == 'toggle' && value.includes(el.getAttribute('value'))))
                    el.classList.add('helper-annotation__btn--selected');
            }); };
            select('.helper-annotation__cancer-type', _this.annotation.cancer_type, 'radio');
            select('.helper-annotation__audience-type', _this.annotation.audience_type, 'radio');
            select('.helper-annotation__knowledge-level', _this.annotation.knowledge_level, 'radio');
            select('.helper-annotation__trajectory', _this.annotation.trajectory, 'radio');
            select('.helper-annotation__typeof-document', _this.annotation.typeof_document, 'radio');
            select('.helper-annotation__red-flags', _this.annotation.red_flags, 'toggle');
            // -- event listeners
            var radio = function (elSelector, setValue) {
                var parent = containerEl.querySelector(elSelector);
                parent.addEventListener('click', function ($event) {
                    var el = $event.target;
                    if (el.tagName.toLowerCase() == 'button') {
                        parent.querySelectorAll('button').forEach(function (button) { return button.classList.remove('helper-annotation__btn--selected'); });
                        el.classList.add('helper-annotation__btn--selected');
                        setValue(el.getAttribute('value'));
                    }
                });
            };
            var toggle = function (elSelector, addValue, removeValue) {
                var parent = containerEl.querySelector(elSelector);
                parent.addEventListener('click', function ($event) {
                    var el = $event.target;
                    if (el.tagName.toLowerCase() == 'button') {
                        el.classList.toggle('helper-annotation__btn--selected');
                        var contains = el.classList.contains('helper-annotation__btn--selected');
                        if (contains)
                            addValue(el.getAttribute('value'));
                        else /* */
                            removeValue(el.getAttribute('value'));
                    }
                });
            };
            var update = function (attr, value) {
                _this.annotation[attr] = value;
                _this.persist();
            };
            radio('.helper-annotation__cancer-type', function (value) { return update('cancer_type', value); });
            radio('.helper-annotation__audience-type', function (value) { return update('audience_type', value); });
            radio('.helper-annotation__knowledge-level', function (value) { return update('knowledge_level', value); });
            radio('.helper-annotation__trajectory', function (value) { return update('trajectory', value); });
            radio('.helper-annotation__typeof-document', function (value) { return update('typeof_document', value); });
            toggle('.helper-annotation__red-flags', function (value) { return update('red_flags', __spreadArray(__spreadArray([], _this.annotation.red_flags, true), [value], false)); }, function (value) { return update('red_flags', _this.annotation.red_flags.filter(function (v) { return v != value; })); });
            var titleEl = containerEl.querySelector('.helper-annotation__title');
            var toggleDisplay = function (display) { return display == 'none' ? 'block' : 'none'; };
            titleEl.addEventListener('click', function ($event) {
                expanded = !expanded;
                titleEl.style.fontWeight = expanded ? 'bold' : 'normal';
                titleEl.querySelectorAll('img')
                    .forEach(function (img) { return img.style.display = toggleDisplay(img.style.display); });
                var controlsEl = containerEl.querySelector('.helper-annotation__controls');
                controlsEl.style.display = toggleDisplay(controlsEl.style.display);
                localStorage.setItem('helper-annotation-expanded', expanded ? 'true' : 'false');
            });
            return containerEl;
        });
    };
    return HelperAnnotator;
}());
// exports.HelperAnnotator = HelperAnnotator;
window.helper_annotator = function init(_a) {
    var iframe = _a.iframe, pdfjs = _a.pdfjs, storage = _a.storage, annotator = _a.annotator;
    new HelperAnnotator({ iframe: iframe, pdfjs: pdfjs, storage: storage, annotator: annotator });
};
