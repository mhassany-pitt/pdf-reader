import { Annotations } from './annotations';
import {
  WHRect, getPageEl, getBound,
  getPageNum, getSelectionRects, htmlToElements,
  getAnnotEl, isLeftClick, isRightClick, rotateRect,
  rotation, uuid, getAnnotBound, removeSelectorAll
} from './annotator-utils';

// -- annotator

export const POPUP_ROW_ITEM_UI = 'POPUP_ROW_ITEM_UI';

export type Annotation = {
  id: string,
  type: string,
  color?: string,
  rects: { [pageNum: number]: WHRect[] },
  note?: string
}

type Location = {
  top: string,
  left: string,
  width?: string,
  height?: string
};

export type GetAnnotationBound = {
  className: string,
  getBound: (pageNum: number, annot: any) => WHRect,
};

export class Annotator {
  private window: any;
  private document: any;
  private documentEl: any;

  private pdfjs: any;
  private storage: Annotations;
  private toolbar: any;
  private configs: any;

  private selected: any;
  private pending: any;

  location: Location = null as any;

  private ebus: {
    [type: string]: {
      priority: number,
      callback: ((...args: any) => any),
    }[]
  } = {};
  register(type: string, callback: (...args: any) => any, priority = 0) {
    if (type in this.ebus == false)
      this.ebus[type] = [];
    this.ebus[type].push({ callback, priority });
    this.ebus[type].sort((a, b) => b.priority - a.priority); // descending
  }
  unregister(type: string, callback: (...args: any) => any) {
    if (type in this.ebus == false)
      return;

    const filtered = this.ebus[type].filter(cb => cb.callback == callback);
    if (filtered.length < 1)
      return;

    this.ebus[type].splice(this.ebus[type].indexOf(filtered[0]), 1);
  }

  onTextSelection = ($event: any) => {
    const rects = getSelectionRects(this.document, this.pdfjs);
    if (rects && Object.keys(rects).length) {
      const annot = { id: uuid(), type: 'highlight', rects };
      this.storage.create(annot, () => {
        this.clearSelection();
        this.render(annot);
      });
    }
  };

  constructor({ baseHref, iframe, pdfjs, storage, toolbar, configs }) {
    this.window = iframe?.contentWindow;
    this.document = iframe?.contentDocument;
    this.documentEl = this.document.documentElement;

    this.pdfjs = pdfjs;
    this.storage = storage;
    this.toolbar = toolbar;
    this.configs = configs;

    this._attachStylesheet(baseHref);
    this._renderOnPagerendered();
    this._setupOnTextSelection();
    this._toggleBoundaryOnClick();
    this._removeOnKeyBkSpaceOrDelete();
    // -- popup
    this._setupPopupOnMouseMove();
    this._setupPopupOnTextSelection();
    this._setupPopupOnClick();
    this._setupPopupOnContextMenu();
    this._hideOnKeyBkSpaceOrDelete();
    // -- popup row items
    this.register('hide', () => this.pending = null);
    this._registerPopupAnnotUserItemUI();
    this._registerPopupToBeAnnotItemUI();
    this._registerPopupAnnotTypeItemUI();
    this._registerPopupAnnotColorItemUI();
    this._registerPopupAnnotNoteItemUI();

    // -- toolbar
    // this._addToolbarUI();
  }

  private _addToolbarUI() {
    const toggle = (clazz, el) => el.onclick = () => {
      const selected = `${clazz}--selected`;
      const contains = el.classList.contains(selected);
      if (!contains) this.toolbar.getToolbarEl().querySelector(`.${selected}`)?.classList.remove(selected);
      el.classList.toggle(selected);
      this.toolbar.showDetailsContainer(!contains);
    }

    toggle('pdfjs-annotation-toolbar-btn', this.toolbar.addItem(htmlToElements('<span class="pdfjs-annotation-toolbar-btn" title="Highlight"><img src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAGQAAABkCAYAAABw4pVUAAAFEElEQVR4AWJwL/ABtHdOYbAjQRT+7l3btm3btm3br2vbtm3btm3b3pw9D7VO1yQ9k57qbJ3v+9+6+uKf7kpmAkM4kYWOC3EhjgtxXIgLcVwIgEHIABfSfxEjk3PIt+RLchQZyoX0R8Zo5Gn8N0e5ECMyJF+RgS7EgAzJ92QQF2JAhuQ837LsyHiOjOpCbMh4kYzlh70uoxYuw4W4DI2cZTyDzrmeDOFCUq8MPTeQIV2IARk5SslJxijkGcTn2hy2r1xkDEZuh54XyCdppLiQfSucgY9BZshdSg4yxibfVT20BTC9SGmop7iQ/RHO82SMkpoGV4oLeQ7l+YCMo9RlKcX+kVU4W+j1TUhxITMgnDFlXEIpLmQBhDOIjEsoxYXsgXAmkXGtkmJZxrDkM4Szt4xNJMWF7Ao9P5C52ibFqowhyHvonC/JHNXnjj15dCFbQU9rpViUMSh5nSB/Ke0Qsj70tFqKNRkDyfMoz4/kOuj5gsyec6O3JmQVhHMSGYSc1+aVYk3IIyjPr2QyGdNqKZZkLIlwzpVxpN1SLAm5G+UpyHQyrvVSrMiYF+Fc2eEQ+ZIcGj2ABcnl5HayGxnMspDrEYp8wnOWAmBbUuCfucCkEAAzkQLluUWvNyxFlyHBZPaE6P+RC8u4DKXoMiQLmhICYEryG8rzgF5vW0oFGV+TkawJORPhLCfjcpSyUwcZBdnAVA8BMB75CeV5Kv5GfwOHxHoKsp3MZ0rIcQhnTaU2Vym6DKFfMsYg36M8r5JBZWz+UnQZZoQciXA2UWqb6ilf9qqnKDK2MXmmDmBnhPM2GVzG5iLloDgZBoQA2Al6tlfqzW1fADYnRdQ2FcDEypB8RIYO1VtbKfp5hr4yNKzIKMgqoXprUgBsFyfDgBAAm1WQsbmMJ2akfEu2IUP+rW5MckJczzAgBMCs5GcTMiKkSL4jT5EXyW/xMmwIubXDX34zrd6MFEmjMoSmvxoplL/81oaex3heD2RsK3OaFbIOwtnS0E/Hc5HrEJ+fyMbmf8JVLpZ+1oiIRcnt6C5vkflkTvNCtkV5PiMj9UnCALICeQjd5RWySzYXOQCYkLyJcB4gwyfuE2tHPgniNXIQ2Y2sS6bK6kI5AONXvFj6UTJSwyIGJ+uTF1E/z0rtoClXcXoZCaQAGIbsQN5B/TxB1u/Xk0vTyUggBcBwIuID1M+9+s/GaWheRgIpAEYje5IvUD+3kLlbc5+6NPA3oOchvcnHNXoAQ5PDyPeol9/IhWQGmcsMKWQ8SEYgE/ZSCoCRyeMRJ3Gnkclb9zQg2aZeq7IVRdcEADAieQTV8yM5iYwnc5glmYzua6NkfE2OImNLvXmSyoidI0LGJ2RPSH1ONNYzejOX9JTqPeN9siMZJgsBJSSXETHny+SwSuNka8qZNNtU93Ojggx5mFnLhQAYPX5l9HSl2FgZBoQchc7Zr9tPKIAd7cuwIeRuVMuv5CayDhm6pow1yC+ol6d0Ge0Vcgbq52tyOlmADOilDBl7Ahk2fwFxQqYgnyM+b5C9yWSRMm6WlXcO2YlM+L9/0yeAickp5Ct0l/vIFmTEijL28Vev6mKGImuTG8iviM8PLqP3Xy6ORXYgj6P3OchfTtwFAKYhB5IPXYat39QHIYuSs8l3LsPWdVkjkvXJLaRwGbbuD5mC7Elecxk6/XiE3yLkDPICuZes5iIqCHFciONCXIjjQlyI40JciONCXIjjQpzfAYn3DrhYdJOXAAAAAElFTkSuQmCC"><span>')));
    toggle('pdfjs-annotation-toolbar-btn', this.toolbar.addItem(htmlToElements('<span class="pdfjs-annotation-toolbar-btn" title="Underline"><img src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAGQAAABkCAYAAABw4pVUAAAC/klEQVR4AezR0QmAMAyGQbcTxWGc2bpH7Aa2UImFC3zP4eeW9Tz0o75/IiBABASIgAAREAEBIiBAImKvlXi/UtvyxzftuYftSQAp0X7XBCAZe4aCdN0EIF0HZGhAgAABAgQIECBAgAABAgQIECBAgAABAgQIECBAgAABAgQIECBAgAABAgQIECBAgAABAgQIECBAgAABAgQIECBAgAABAgQIkKe9ewDVOwrjON61jTDmmpHtZocx14w028qcbWVNafZys/UizHvxrU5u231ePuf/f771iVen37XOT0iqVDxGFST90DhIBJJaFQ/SDkmfNQ7yApL6Kh6kPyQ90zjIHUiaoHiQSZB0S+MgxyBpo+JBtkDSYY2DrIKk64oHuQVJKzQOMhGSEuiucIyeSEDSeI2DdCAJSUsUDrIMkhJoUzeIO8wjSHqNKmVff7yBpHvu8VUOshPSZikaZB6kbdU8yFBIi6BDwRht+AJpA9QO4g72GNJOKhjkNKQ9dI+vepBFyKTZPr2rci3wYZA6fIa0P5hQhDFG4TekfUG9+kHcIVcik75hdAHHGI1vyKSl7ul4MUgzPiCTfmNOgd5N/UYmvUODN4O4A89ANp1CRx5erk6cRjZNcU/Pq0FKcBXZFMFcVOXg5anGPESRTZe8va6CF743osi2t1iGHhl+b2o53iLbIuipYJCsRhmHJHJRAjexGZPQH62odFoxAJOwBbeQQC5KYnQgLnThIJvge+sFZ1Y/SAn2wNcOo0T3IPJRynEBvnUe5YG8g4qDlWE3fOkgKgJ9KZh797UZSWgtifUoCc0tbRx2DCLQVhyTQnltnvs65Qq0dAk9Q3+Pofsm32sUq/eYgRK7WBJulEYsx2cUqk9Yhga76fPfP09ZiEfIVw+xAHV29apsnEHYhvtIINMSuIetGGh34ebuN9LHYwWO4jaeIoKfTgRPcRtHsALj0WaXExsbxAYxNogNEmY2iCnmTf2+9xojfBjkNcLSKxtEnA0yHK/CMAaGKxvEBHwQkwZZt6MzH89vawAAAABJRU5ErkJggg=="><span>')));
    toggle('pdfjs-annotation-toolbar-btn', this.toolbar.addItem(htmlToElements('<span class="pdfjs-annotation-toolbar-btn" title="Strikethrough"><img src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAGQAAABkCAYAAABw4pVUAAAEM0lEQVR4Ae3dY7DkXBhF4c+2bdu2bdu2bdvG2LZt27ZtZVbVWCdp5O0zyd5Vz9/byayLRiWzweUvXCMe0T+CgoiCKIgoiIKIgihIOiiIKIiCiIIoiChIEASb4xCci1txPx5b6m5cjWOwpYLEE+AIPIXS6IX5iLJ56IBfcS92VpDsIxyGj9EP+do81MA92FJBooU4G9WxEHFuLN7Bjgqy9hAHozKsNw1vYgsFWRJiQzyFGSjkBuHK1AZZGmNLlIIvW4S/sFXqgnDS26AFfFwXHJiaIEtfRzRFPjcFM5CvDcPOaQnydw7PjIrjVVyO/bD9al97C+yNy/E+6mM+stnniQ/CSd6CTDYTv+A8bJzlY+6Kp9ATmax1ooMs/bsxAlE2Fz9gjzw/o7sOvRFlrZIe5GVE2TCcEeNxbIY3MROufZbYIJzcxhiOsHXHLkbHdADaOL4pdklykHMRtvHWTzeX/rR8hmlgwULUwH62IeyDfI6w3VHAF6mb4iDsYPKYHgSpB9cGYkN9QGUXZBhc+04xbINMh2sPK4ZtkHlw7V7FsA0yGq59qBi2QbrCtUHYWEHsgvwN5ssrYwW5A2FbhPdsnv4qyNaYgCirhf0VJP4oHyLqZuIr7Kog8f6U9EMmm4NyuAQbKkj+o5yJcln6APumM4goiCiIgoiCKAjPhLbCjimxlbdBOLj70A9pW1/c61UQDuilQHvRiyAcyC6YHWizsLMPQW4CY9oNPgS5DYxpt/oQZD8sCLQF2NeXP+o/BdqPPj3L2gSfYSbSthn4FJvYBwkPsy1OxSUe+w7zEHXDHF/rVGyrt05y/8Y5Go0QdTfqvSybS7LfxiKEra2C2IV5ClF2lILYRfkHYXtdQeyC7IzpcK2SghiKcFeJvgpiG+Q5uDZeQWyD3AXX5iuIbZDH4dp0BbEN8jZcG6UgtkEqwbW2SbtxwEk4HVt6GGNTjINrxUyCGN1wZhSWbRpexIYeBbkZYXthvQ/CSVzluKFlSWzpQYxN0BlhOyYJQbrCtU44usBB3gLz48YGcZ7otoiy2XgPWxYgxp1YiLC9Y3VMcd/kciGibijuxaYGITbC6xGPbwb2sAoS94k3QqYbhlewfUzHdBKawT37q4NNgpyImchmc1AdD2DHPNzN7h7UxiJE3WBsax8k3iinYTRy2QJ0RxE8i/OwHzZbx9+uo3ANPkRtzMjyMS9I6mXR+6E94tgcTFpqLvK1Z5J+Fe6m+BQL4Ps+TtONlE9Ba/i4hXgljbca3xD3YwR82Rhckvb/HWEz3IdeKNQWoRh20zWGq75Quwk1MRcWW4iyOEEXfbrj7ISHUBfzke8NwAc4SFfhZvd+2BX4BDUwJIvXEr1RGs/gCF0WHc9VvofhPNyKu/HYUvfiVpyLQ7CFrlMXBbGnIAoiCiIKoiCiIAoiCqIgoiAKIgoiiwGjQFZMVHSNJgAAAABJRU5ErkJggg=="><span>')));

    this.toolbar.addItem(htmlToElements('<hr style="width: 75%; border: none; border-top: 1px solid #2a2a2e;"/>'));

    toggle('pdfjs-annotation-toolbar-btn', this.toolbar.addItem(htmlToElements('<span class="pdfjs-annotation-toolbar-btn" title="Note"><img src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAGQAAABkCAYAAABw4pVUAAACXklEQVR4Ae3dtZbVYBxFcazCShqcN8DpcHdrcKtwd3d9AtweBXepocShw8nldDh8M//ccDLZZ61djv6uW5qNXDmOjKr/DyFAACFAACFAACFACBBACBBAarVaDzVHrVUbKtJaNVt1twHRLzNEXamxy2pwGCQA0UIdUN/GMrVPtSgc5K8YbF9xIN8upjLFfr9MDS4MJOk6g12Og6RhdFNpY92LAJmj0sZmFQGyQaWNbSgCZKdKG9sJCCAMEEAAAQQQQACxGiCf1Qk1QvU2aYQ6pb5UDeSLmur6NKp+t+nqS5VATnz7nrYop6sEMqIEIKOqBNKrBCC9qgQyswQgs6sEcl21MsZopW5W7WbvBdXGEKOtuljVO4ZP1Qm1TW34z21TJ9Uz7qmbDxBAAAEEEEAAYYAAEt8rdU/dbEB31FOV4wB5pEaqFoF71X3VdUDie6465fRQRxt1H5D8X/MaQZkISGwDcgZpDwggTQpkU84gkwCJ7YXqnOOV+kNA4nusRgdv9vZXN7nZm+/eNPKO4TOVPEAYIIAwQAI7pqbXoSXqHSAN3/Q6vGSog3rAOcQAJAEDkDhIHAOQAEgA46FK2TxAYiDxc8a37Uj/3oBYYgBihgGIGQYgZhiAmGEAYoYBiBkGIGYYgJhhAGKGAYgXBiBGGIAYYQBihAGIDwYfNT7925NL8VeMxOPD+JdYYwRAuqsy7p0vRvyALpd5YZsXyGCVgeEA8g1lv7Kfwa2pQg+bt09lnDOU0YElB6nLYPgderW7mqU2qIMlaBEHJyZAACFAACFAACFACBBACBBAqPF9BRPtB7Gk2aW3AAAAAElFTkSuQmCC"><span>')));
    toggle('pdfjs-annotation-toolbar-btn', this.toolbar.addItem(htmlToElements('<span class="pdfjs-annotation-toolbar-btn" title="Text"><img src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAGQAAABkCAYAAABw4pVUAAABwklEQVR4Ae3dA4ycURTH0YZ1XDdWGdc2gyq2XcZoY6eMrSquEWtiW3Vcm7c3WmM879s5/+QXLQZnjXnT9p06rILquxsMRECACAgQAQEiIAICRECARMTO7HJ2uwc9yO736LIvZzuKAomIc9m/6N/9y84WARIRC7KfYT+z+SWAHGAxsAMlgJzgMLATQIAAAQIECJCuD0gtO9FitWxgBVxupUFut+GybmcDK/BygYwekKNR325UGORm1LejJYCsiPp2vsIgF6K+LS/lp733YuK9z5ZWGGRx9i4m3t2Sfvw+N7uWvYnh+5w9zlYNPH/lQAYue3X2NPscw/cmu5LNKQCk/qoG4le4QIAAAQIECBAgQIAAAQIECBAgQIAAAQIECBAgQIAAAQIECBAgQIAAAQIECBAgQIAAAQIECBAgQIAAAQIECBAgQIAAAQIECBAgQIAAAQIESETMzDZ14EEwN2UzgTSGsS57EZ3b82wtkPrfMwYwOowyA8jkIJuje9sEpKxHyj4BBAgQINU5QukAkHIOGfuRzQdSH8rZDh/D9y877fuQxlC2Z5c6cLDkpWyb79Q1pUCACIiAABEQIAICRECACIj+A4xa9WVc6wIDAAAAAElFTkSuQmCC"><span>')));

    this.toolbar.addItem(htmlToElements('<hr style="width: 75%; border: none; border-top: 1px solid #2a2a2e;"/>'));

    toggle('pdfjs-annotation-toolbar-btn', this.toolbar.addItem(htmlToElements('<span class="pdfjs-annotation-toolbar-btn" title="Freeform"><img src="data:image/png;base64,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"><span>')));
    toggle('pdfjs-annotation-toolbar-btn', this.toolbar.addItem(htmlToElements('<span class="pdfjs-annotation-toolbar-btn" title="Embed"><img src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAGQAAABkCAYAAABw4pVUAAAB5ElEQVR4AWJwLwC0dw+gdoBxGIc7zUhDWramMDPXrDxk2/MWx8wpNy9zyjamOGTjnnD1zrvW/6g9b/3y5XNx/O1XF+WbAKR7AiIgQAQEiIAAERABASIgQAQEyNDQ0PK0NR1KJ36kQ2lrWtY2kHywjelFaqbxZ830PK2vBRkJ0UiX00Cy6W0gXUiNVoDcTrOb3SwFyTs8luY2O1wCknc0P31Kc5t9TPMqQPammtmuCpCrqWZ2pQLkQaqZ3asAeZx6ZV/SqbSyHdeq83EWp53pVZrOHv9PIF/Smml9M+th5qVHQEbu1By+qRUoq1ITyK8V/JmqQHkD5NcKvqEVIE+AdBfIYyBAgAABAgQIECBAgAABAgQIECBAgAABAgSI+0NauFVdAPIWyN+d6TDGavepj9zXDj/q5HEaAjJy39KZtLpNEEvSnvQmZUC6fUCAGBAgBgQIECBAgAAxIEAMCBADUj4gBgSIAQFiQOoHxIAAMSBA7qea2V0vgtldu1wBsjvVzHZUgMxLH5PNbe/TvKqXGj+SbG47WP1i/DeTzW7XW3VcxcU0kKY3G0jnUqOVB7qsT89TX7Lx15eepnXtPPJoWdo84sgjHUqb01KHgjmlTUCACMj4AREQAQEiIEAEBIiAABEQDQMXeD06YD9UEQAAAABJRU5ErkJggg=="><span>')));

    this.toolbar.addItem(htmlToElements('<hr style="width: 75%; border: none; border-top: 1px solid #2a2a2e;"/>'));

    toggle('pdfjs-annotation-toolbar-btn', this.toolbar.addItem(htmlToElements('<span class="pdfjs-annotation-toolbar-btn" title="Add to Outline"><img src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAGQAAABkCAYAAABw4pVUAAACtUlEQVR4Ae3cA4wdUQCF4doNa9u2bdtGWDuqHde2G9a226C2G+2GtacnyRozy3unO/9Jvnj1/mredG669pO6wEfsfXEQhCAgCEFAEIKAIAQBQUAQgoAgBAFBCOI4TnqpIb2kb8B1lrzWguiLl5E7wiL3QxZLBqNB9AVzyxthcW+u6SATHOa2L5LTZJDtwtxXz2SQtcLcV9lkkM4Oc9sLSW/6X1n7hcXeD2lt45+9GWW6PJXfDvssx6UuV+pcqQcJQUAQgoAgBAFBuEFVQRbLPjkQcNtkrGSzdYNquPwUFn0PpKDp+yEViOG6o6aDLHbcxv5KIZNBdon7WEOTQRaJj8bvkPKuf4ewwzb+lTWUKHHunhSwdR1SThbJXofrkK0yWrJypc6VenKAIAQBQQgCx3GySzb7QQjRTG7I3zDXpImdIMRoHc8F8U9pafOBnUwyS57Lb/HDQmWrFE7FIA8lvt23EiTsUbaD4td9SI0ojj6neK2QjSBdxO/bmgpBKif9MQSeDwnxVxCeoPoSpCDjxe87H6QgueSV+HW/pUVggoR9c6XlpvhtIdI37PsMSpBo32R1H53k0Dw138qwHwQEsfRCF5QpslLWuzggXjvg8TlWymQpQJC4Y3STT2J6n6QrQaLHKCFfLR/BUZwgkUHmie3NIYi//kvsToJEBlkutrc0LZ8o11KyJ/Ia6o/ldxSqpvUT5UKlfyKiTJS/Ynp/ZHxQTpT7I60SEaW+rJPTHq6J1655fI5TslbqBe1EuYv/z5U690O4Y8gdQ06U2+yfIJwo914K2g/CiXIhslkK8vY790MIQhCClBCvFSeIuSAZ5L3Et7eSniBmowyR+DaIxxHsRBkloTH+dTfc7vMhRMkstcJkDsQTVCAIQUAQgoAgBAFBCAKCgCAEAUEIAoIQBAQhCCz4ByYkVnkJlQ7pAAAAAElFTkSuQmCC"><span>')));

    const details = htmlToElements(`<div style="display: flex; flex-direction: column; justify-content: stretch; gap: 0.5rem; padding: 0.1825rem 0.25rem; font-family: inherit; font-size: 0.8rem; color: white;"></div>`);
    this.toolbar.addItem(details, 2);

    this.toolbar.getToolbarEl().querySelector('.pdfjs-annotation-toolbar-btn')?.click();

    const colors = htmlToElements(
      `<div>
        <span>Color</span>
        <div class="pdfjs-annotation-toolbar__color-options">
          <span style="background-color: #ffd400"></span>
          <span style="background-color: #ff6563"></span>
          <span style="background-color: #5db221"></span>
          <span style="background-color: #2ba8e8"></span>
          <span style="background-color: #a28ae9"></span>
          <span style="background-color: #e66df2"></span>
          <span style="background-color: #f29823"></span>
          <span style="background-color: #aaaaaa"></span>
          <span style="background-color: black"></span>
        </div>
        <style>
          .pdfjs-annotation-toolbar__color-options {
            display: flex; 
            align-items: center; 
            gap: 0.125rem;
          }
          .pdfjs-annotation-toolbar__color-options > span {
            user-select: none;
            cursor: pointer; 
            width: 1rem; 
            height: 1rem;
            border: dashed 0.125rem transparent;
          }
        </style>
      </div>`);
    details.appendChild(colors);
    colors.querySelector('.pdfjs-annotation-toolbar__color-options')?.addEventListener('click', ($event: any) => {
      const el = $event.target;
      if (el.tagName.toLowerCase() != 'span') return;
      const clazz = el.classList,
        contains = clazz.contains(`pdfjs-annotation-toolbar__color--selected`);
      if (!contains) {
        colors.querySelectorAll('.pdfjs-annotation-toolbar__color-options > span').forEach((other: any) => {
          other.classList.remove(`pdfjs-annotation-toolbar__color--selected`);
          other.style.borderColor = 'transparent';
        });
        clazz.add(`pdfjs-annotation-toolbar__color--selected`);
        el.style.borderColor = 'white';
      }
    });
    (details.querySelector('.pdfjs-annotation-toolbar__color-options > span') as any).click();

    const opacity = htmlToElements(
      `<div>
        <span>Opacity: <span class="pdfjs-annotation-toolbar__opacity-val">100%</span></span>
        <div style="display: flex; gap: 0.125rem;">
          <input type="range" min="0" max="100" step="1" value="100" style="flex-grow: 1;" />
        </div>
      </div>`);
    details.appendChild(opacity);
    opacity.querySelector('input')?.addEventListener('input', ($event: any) =>
      opacity.querySelector('.pdfjs-annotation-toolbar__opacity-val')!.textContent = `${$event.target.value}%`);

    const storke = htmlToElements(
      `<div>
        <span>Stroke: <span class="pdfjs-annotation-toolbar__stroke-val">2pt</span></span>
        <div style="display: flex; gap: 0.125rem;">
          <input type="range" min="1" max="10" step="1" value="2" style="flex-grow: 1;" />
        </div>
      </div>`);
    details.appendChild(storke);
    storke.querySelector('input')?.addEventListener('input', ($event: any) =>
      storke.querySelector('.pdfjs-annotation-toolbar__stroke-val')!.textContent = `${$event.target.value}pt`);

    const style = htmlToElements(
      `<div>
        <span>Style</span>
        <div class="pdfjs-annotation-toolbar__style-options">
          <span style="border-style: solid">solid</span>
          <span style="border-style: dashed">dashed</span>
          <span style="border-style: dotted">dotted</span>
        </div>
        <style>
          .pdfjs-annotation-toolbar__style-options {
            display: flex; 
            align-items: center;
            gap: 0.125rem;
          }
          .pdfjs-annotation-toolbar__style-options > span {
            user-select: none;
            cursor: pointer; 
            border-width: 1px; 
            border-color: white; 
            padding: 0 0.25rem;
          }
        </style>
      </div>`);
    details.appendChild(style);
    style.querySelector('.pdfjs-annotation-toolbar__style-options')?.addEventListener('click', ($event: any) => {
      const el = $event.target;
      if (el.tagName.toLowerCase() != 'span') return;
      const clazz = el.classList,
        contains = clazz.contains(`pdfjs-annotation-toolbar__style--selected`);
      if (!contains) {
        style.querySelectorAll('.pdfjs-annotation-toolbar__style-options > span').forEach((other: any) => {
          other.classList.remove(`pdfjs-annotation-toolbar__style--selected`);
          other.style.backgroundColor = 'transparent';
        });
        clazz.add(`pdfjs-annotation-toolbar__style--selected`);
        el.style.backgroundColor = 'gray';
      }
    });
    (details.querySelector('.pdfjs-annotation-toolbar__style-options > span') as any).click();

    const font = htmlToElements(
      `<div>
        <span>Font Family</span>
        <div class="pdfjs-annotation-toolbar__font-options">
          <span style="font-family: serif;">serif</span>
          <span style="font-family: sans-serif;">sans-serif</span>
          <span style="font-family: monospace;">monospace</span>
        </div>
        <style>
          .pdfjs-annotation-toolbar__font-options {
            display: flex; 
            align-items: center;
            gap: 0.125rem;
          }
          .pdfjs-annotation-toolbar__font-options > span {
            user-select: none;
            cursor: pointer; 
            border: solid 1px white; 
            padding: 0 0.25rem; 
          }
        </style>
      </div>`);
    details.appendChild(font);
    font.querySelector('.pdfjs-annotation-toolbar__font-options')?.addEventListener('click', ($event: any) => {
      const el = $event.target;
      if (el.tagName.toLowerCase() != 'span') return;
      const clazz = el.classList,
        contains = clazz.contains(`pdfjs-annotation-toolbar__font--selected`);
      if (!contains) {
        font.querySelectorAll('.pdfjs-annotation-toolbar__font-options > span').forEach((other: any) => {
          other.classList.remove(`pdfjs-annotation-toolbar__font--selected`);
          other.style.backgroundColor = 'transparent';
        });
        clazz.add(`pdfjs-annotation-toolbar__font--selected`);
        el.style.backgroundColor = 'gray';
      }
    });
    (details.querySelector('.pdfjs-annotation-toolbar__font-options > span') as any).click();

    const fontSize = htmlToElements(
      `<div>
        <span>Font Size: <span class="pdfjs-annotation-toolbar__font-size-val">11px</span></span>
        <div style="display: flex; gap: 0.125rem;">
          <input type="range" min="1" max="64" step="1" value="11" style="flex-grow: 1;" />
        </div>
      </div>`);
    details.appendChild(fontSize);
    fontSize.querySelector('input')?.addEventListener('input', ($event: any) =>
      fontSize.querySelector('.pdfjs-annotation-toolbar__font-size-val')!.textContent = `${$event.target.value}px`);
  }

  private _attachStylesheet(baseHref: string) {
    this.documentEl.querySelector('head').appendChild(htmlToElements(
      `<link rel="stylesheet" type="text/css" href="${baseHref}assets/annotator.css" />`
    ));
  }

  private _removeOnKeyBkSpaceOrDelete() {
    this.document.addEventListener('keydown', ($event: any) => {
      if (this.selected
        && $event.key == 'Delete' || $event.key == 'Backspace'
        && $event.target.classList.contains('pdfjs-annotation__bound')) {
        removeSelectorAll(this.documentEl, `.pdfjs-annotations [data-annotation-id="${this.selected.id}"]`);
        this.storage.delete(this.selected, () => {
          this.selected = null;
        });
      }
    });
  }

  private _setupOnTextSelection() {
    let down = false, dragging = false;
    this.document.addEventListener('mousedown', ($event: any) => {
      if (isLeftClick($event)) down = true;
    });
    this.document.addEventListener('mousemove', ($event: any) => {
      if (isLeftClick($event)) dragging = down;
    });

    const handle = ($event: any) => {
      down = false;
      if (dragging && this.onTextSelection)
        this.onTextSelection($event)
    };

    this.document.addEventListener('mouseup', ($event: any) => {
      if (isLeftClick($event)) handle($event);
    });
    this.document.addEventListener('dblclick', ($event: any) => {
      dragging = true;
      handle($event);
    });
  }

  private _toggleBoundaryOnClick() {
    this.document.addEventListener('click', ($event: any) => {
      const pageEl = getPageEl($event.target);
      if (!pageEl) return;

      const classList = $event.target.classList;

      // remove boundaries if clicked outside one
      if (!classList.contains('pdfjs-annotation__bound')) {
        removeSelectorAll(pageEl, '.pdfjs-annotation__bound');
        this.selected = null;
      }

      const annotEl = getAnnotEl($event.target);
      if (annotEl) {
        const annotId: any = annotEl.getAttribute('data-annotation-id');
        this.selected = this.storage.read(annotId);
        this.showBoundary(getPageNum(pageEl), this.selected, getAnnotBound($event));
      }
    });
  }

  private _renderOnPagerendered() {
    this.pdfjs.eventBus.on('pageannotationsloaded', ($event: any) => {
      const pageNum = $event.pageNumber;
      const annotsLayerEl = this.getOrAttachLayerEl(pageNum);
      removeSelectorAll(annotsLayerEl, '.pdfjs-annotation__rect');
      removeSelectorAll(annotsLayerEl, '.pdfjs-annotation__bound');
      annotsLayerEl.setAttribute('data-rotation-degree', rotation(this.pdfjs));

      // current page and only annotations with rects
      this.storage.list()
        .filter(annot => annot.rects)
        .filter(annot => Object.keys(annot.rects)
          .map(pageNum => parseInt(pageNum))
          .indexOf(pageNum) > -1)
        .forEach(annot => this.render({ ...annot, rects: { [pageNum]: annot.rects[pageNum] } }));
    });
  }

  clearSelection() {
    this.window.getSelection().removeAllRanges();
  }

  getOrAttachLayerEl(pageNum: number) {
    const pageEl = getPageEl(this.documentEl, pageNum);
    if (!pageEl.querySelector('.pdfjs-annotations'))
      pageEl.appendChild(htmlToElements(`<div class="pdfjs-annotations"></div>`));
    return pageEl.querySelector('.pdfjs-annotations');
  }

  showBoundary(pageNum: number, annot: Annotation, boundRect: WHRect) {
    boundRect = rotateRect(rotation(this.pdfjs), true, boundRect);

    const boundEl = htmlToElements(
      `<div data-annotation-id="${annot.id}"
        class="pdfjs-annotation__bound" 
        tabindex="-1"
        style="
          top: calc(${boundRect.top}% - 1px);
          bottom: calc(${boundRect.bottom}% - 1px);
          left: calc(${boundRect.left}% - 1px);
          right: calc(${boundRect.right}% - 1px);
        ">
      </div>`
    );

    this.getOrAttachLayerEl(pageNum).appendChild(boundEl);
    boundEl.focus();
  }

  render(annot: Annotation) {
    Object.keys(annot.rects)
      .map(pageNum => parseInt(pageNum))
      .forEach(pageNum => {
        const annotsLayerEl = this.getOrAttachLayerEl(pageNum);

        removeSelectorAll(annotsLayerEl, `[data-annotation-id="${annot.id}"].pdfjs-annotation__rect`);

        const degree = rotation(this.pdfjs);
        const rects: WHRect[] = annot.rects[pageNum];
        rects.forEach(rect => {
          rect = rotateRect(degree, true, rect);
          const rectEl = htmlToElements(
            `<div data-annotation-id="${annot.id}" 
              data-analytic-id="annot${annot.type ? '-' + annot.type : ''}-${annot.id}"
              class="pdfjs-annotation__rect ${annot.type ? 'pdfjs-annotation__' + annot.type : ''}" 
              style="
                top: calc(${rect.top}% + 1px);
                bottom: calc(${rect.bottom}% + 1px);
                left: ${rect.left}%;
                right: ${rect.right}%;
                --annotation-color: ${annot.color || 'rgb(255, 212, 0)'};
              ">
            </div>`
          );

          annotsLayerEl.appendChild(rectEl);
        })
      });
  }

  rerender() {
    const querySelector = '#viewerContainer .pdfViewer .page[data-loaded="true"]';
    this.documentEl.querySelectorAll(querySelector).forEach(el => {
      const pageNumber = parseInt(el.getAttribute('data-page-number'));
      this.pdfjs.eventBus.dispatch("pagerendered", { pageNumber });
    });
  }

  // -- annotator popup 

  getOrAttachPopupLayerEl(pageEl: HTMLElement) {
    if (!pageEl.querySelector('.pdfjs-annotation-popup'))
      pageEl.appendChild(htmlToElements(`<div class="pdfjs-annotation-popup"></div>`));
    return pageEl.querySelector('.pdfjs-annotation-popup') as HTMLElement;
  }

  private _hideOnKeyBkSpaceOrDelete() {
    this.document.addEventListener('keydown', ($event: any) => {
      if (($event.key == 'Delete' || $event.key == 'Backspace')
        && $event.target.classList.contains('pdfjs-annotation__bound'))
        this.hidePopup();
    });
  }

  private _setupPopupOnTextSelection() {
    this.onTextSelection = ($event: any) => this._prepareAndShowPopup($event);
  }

  private _setupPopupOnClick() {
    this.document.addEventListener('click', ($event: any) => {
      if (getAnnotEl($event.target))
        this.location = null as any; // let popup decide its location

      if (!this._getPopupContainerEl($event.target)
        && this._prepareAndShowPopup($event).length < 1) {
        this.hidePopup();  // hide popup if clicked outside it
      }
    });
  }

  private _setupPopupOnContextMenu() {
    this.document.addEventListener('contextmenu', ($event: any) => {
      const pageEl = getPageEl($event.target);
      if (!pageEl) return;

      $event.preventDefault();

      if (getAnnotEl($event.target))
        this.location = null as any; // let popup decide its location
      else {
        const bound = pageEl.getBoundingClientRect();
        this.location = { top: `${$event.y - bound.y}px`, left: `${$event.x - bound.x}px` };
      }

      this._prepareAndShowPopup($event);
    });
  }

  private _prepareAndShowPopup($event: any) {
    const pageEl = getPageEl($event.target);
    if (!pageEl) return [];

    const cbs = this.ebus[POPUP_ROW_ITEM_UI] || [];
    const rowItemUIs = cbs.map(cb => cb.callback($event)).filter(rowItemEl => rowItemEl);
    if (rowItemUIs.length)
      this.showPopup(pageEl, rowItemUIs, $event);

    return rowItemUIs;
  }

  hidePopup() {
    this.location = null as any;
    removeSelectorAll(this.documentEl, '.pdfjs-annotation-popup');
    this.ebus['hide']?.forEach(cb => cb.callback());
  }

  showPopup(pageEl: HTMLElement, elements: HTMLElement[], $event: any) {
    if (this.location == null) {
      const bound = getAnnotBound($event);;
      this.location = { top: `calc(100% - ${bound.bottom}%)`, left: `${bound.left}%` };
    }

    const popupEl = htmlToElements(
      `<form class="pdfjs-annotation-popup__container" style="
          top: ${this.location.top};
          left: ${this.location.left};
          width: ${this.location.width || 'fit-content'};
          height: ${this.location.height || 'fit-content'};
        " autocomplete="off">
      </form>`);

    const popupLayerEl = this.getOrAttachPopupLayerEl(pageEl);
    popupLayerEl.replaceChildren();
    popupLayerEl.appendChild(popupEl);
    elements.forEach(rowItemUI => popupEl.appendChild(rowItemUI));
    this.ebus['show']?.forEach(cb => cb.callback());
  }

  private _getPopupContainerEl(target: HTMLElement, closest = true) {
    return !target.classList.contains('pdfjs-annotation-popup__container')
      ? (closest ? target.closest('.pdfjs-annotation-popup__container') : null) as HTMLElement
      : target;
  }

  // move popup on mouse move
  private _setupPopupOnMouseMove() {
    let isdragging = false;
    let offset = { left: 0, top: 0 };
    let popupContainerEl: HTMLElement;
    this.document.addEventListener('mousedown', ($event) => {
      this._renderNoteTmpHighlight($event);

      popupContainerEl = this._getPopupContainerEl($event.target, false);
      if (isLeftClick($event) && popupContainerEl) {
        isdragging = true;
        offset.left = $event.clientX - popupContainerEl.offsetLeft;
        offset.top = $event.clientY - popupContainerEl.offsetTop;
        $event.preventDefault();
      }
    });

    this.document.addEventListener('mousemove', ($event) => {
      if (isLeftClick($event) && isdragging) {
        popupContainerEl.style.left = `${$event.clientX - offset.left}px`;
        popupContainerEl.style.top = `${$event.clientY - offset.top}px`;
      }
    });

    this.document.addEventListener('mouseup', () => isdragging = false);
  }

  private _renderNoteTmpHighlight($event) {
    const noteEl = $event.target;
    if (!noteEl.classList.contains('pdfjs-annotation-popup__annot-note'))
      return;

    const id = 'tmpid' + Math.random().toString().substring(2);
    const rects: any = getSelectionRects(this.document, this.pdfjs);
    this.render({ id, type: 'highlight', rects });

    const removeTmpHighlight = ($event) => {
      removeSelectorAll(this.documentEl, `.pdfjs-annotations [data-annotation-id="${id}"]`);
      noteEl.removeEventListener('blur', removeTmpHighlight);
    }
    noteEl.addEventListener('blur', removeTmpHighlight);
  }

  // -- popup row items

  private _registerPopupToBeAnnotItemUI() {
    this.register(POPUP_ROW_ITEM_UI, ($event: any) => {
      const rects = getSelectionRects(this.document, this.pdfjs);
      if (isLeftClick($event) && rects && Object.keys(rects).length) {
        const pageNum = getPageNum(getPageEl($event.target));
        const bound = getBound(rects[pageNum]);
        this.location = { top: `calc(100% - ${bound.bottom}%)`, left: `${bound.left}%` };

        this.pending = { id: uuid(), rects };
      }
      return null as any;
    });
  }

  private _setAnnotationAttr(annot: any, attr: string, value: any) {
    if (!annot.type)
      annot.type = 'highlight';
    annot[attr] = value;
    const then = () => {
      this.clearSelection();
      this.render(annot);
      this.hidePopup();
    };
    if (annot == this.pending)
      this.storage.create(annot, then);
    else
      this.storage.update(annot, then);
  }

  private _isPendingAnnotOrRect($event: any) {
    const selectionRects = getSelectionRects(this.document, this.pdfjs);
    const isPendingAnnot = this.pending && selectionRects && Object.keys(selectionRects).length;
    const isAnnotRect = $event.target.classList.contains('pdfjs-annotation__rect');
    return isPendingAnnot || (isAnnotRect && (
      (this.configs.onleftclick && isLeftClick($event)) || isRightClick($event)
    ));
  }

  private _registerPopupAnnotTypeItemUI() {
    this.register(POPUP_ROW_ITEM_UI, ($event: any) => {
      if (this._isPendingAnnotOrRect($event)) {
        const typeBtnHtmls: any = {};
        if (this.configs.highlight) /*  */ typeBtnHtmls.highlight = '<span style="background: orange;">Highlight</span>';
        if (this.configs.underline) /*  */ typeBtnHtmls.underline = '<span style="text-decoration: underline;">Underline</span>';
        if (this.configs.linethrough) /**/ typeBtnHtmls.linethrough = '<span style="text-decoration: line-through;">Strikethrough</span>';
        if (this.configs.redact) /*     */ typeBtnHtmls.redact = '<span style="background: darkgray;">Redact</span>';

        if (Object.keys(typeBtnHtmls).length < 1)
          return null;

        const annot = this.pending || this.storage.read($event.target.getAttribute('data-annotation-id'));
        const typesEl = htmlToElements(`<div class="pdfjs-annotation-popup__annot-type-btns"></div>`);
        Object.keys(typeBtnHtmls).forEach(type => {
          const buttonEl = htmlToElements(`<button type="button" class="pdfjs-annotation-popup__annot-type-btn--${type}">${typeBtnHtmls[type]}</button>`);
          buttonEl.onclick = ($ev) => this._setAnnotationAttr(annot, 'type', type);
          typesEl.appendChild(buttonEl);
        });

        return typesEl;
      }
      return null as any;
    });
  }

  private _registerPopupAnnotColorItemUI() {
    this.register(POPUP_ROW_ITEM_UI, ($event: any) => {
      if (this._isPendingAnnotOrRect($event)) {
        if (!this.configs.highlight
          && !this.configs.underline
          && !this.configs.linethrough
          && !this.configs.redact)
          return null;

        const annot = this.pending || this.storage.read($event.target.getAttribute('data-annotation-id'));
        const colorsEl = htmlToElements(`<div class="pdfjs-annotation-popup__annot-color-btns"></div>`);
        this.configs.annotation_colors.split(',').forEach(color => {
          const colorEl = htmlToElements(`<button type="button" class="pdfjs-annotation-popup__annot-color-btn--${color.replace('#', '')}"></button>`);
          colorEl.style.backgroundColor = color;
          colorEl.onclick = ($ev) => this._setAnnotationAttr(annot, 'color', color);
          colorsEl.appendChild(colorEl);
        });
        return colorsEl;
      }
      return null as any;
    });
  }

  private _registerPopupAnnotNoteItemUI() {
    this.register(POPUP_ROW_ITEM_UI, ($event: any) => {
      if (this._isPendingAnnotOrRect($event)) {
        const annot = this.pending || this.storage.read($event.target.getAttribute('data-annotation-id'));
        if (this.configs.notes) {
          const noteEl = htmlToElements(`<textarea class="pdfjs-annotation-popup__annot-note" rows="5">${annot.note || ''}</textarea>`);
          noteEl.onchange = ($ev: any) => this._setAnnotationAttr(annot, 'note', $ev.target.value);
          return noteEl;
        } else if (annot.note) {
          return htmlToElements(`<span class="pdfjs-annotation-popup__annot-note">${annot.note}</span>`);
        }
      }
      return null as any;
    });
  }

  private _registerPopupAnnotUserItemUI() {
    this.register(POPUP_ROW_ITEM_UI, ($event: any) => {
      const target: any = getAnnotEl($event.target);
      if (target) {
        const annot: any = this.storage.read(target.getAttribute('data-annotation-id'));
        if (annot.user_fullname)
          return htmlToElements(`<span class="pdfjs-annotation-popup__user-fullname">${annot.user_fullname}</span>`);
      }
      return null as any;
    });
  }
}
