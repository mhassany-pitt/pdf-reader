import { firstValueFrom } from "rxjs";
import { PdfRegistry } from "./pdf-registry";
import { isSameOrigin, qparamsToString } from "./pdf-utils";
import { environment } from "src/environments/environment";

export class PdfStorage {

  private registry: PdfRegistry;
  private annotators: any;

  enabled = true;

  private _annots: any = {};
  private get annots() {
    return Object.values(this._annots)
      .reduce((arr: any[], annot: any) =>
        arr.concat(annot), []);
  }

  qparams: { [key: string]: string } = {};

  constructor({ registry }) {
    this.registry = registry;

    this.registry.register('storage', this);
    this.registry.register(`configs.default.storage`, () => PdfStorage.defaultConfigs());

    this.loadAnnotators();

    this._getPdfJS().eventBus.on('pagerendered', ($event: any) => this.loadPageAnnotations($event.pageNumber));
    this._getPdfJS().eventBus.on('pagesdestroy', ($event: any) => delete this._annots[$event.pageNumber]);
  }

  protected _configs() { return this.registry.get(`configs.storage`); }
  static defaultConfigs() {
    return { apiUrl: `${environment.apiUrl}/annotations` };
  }

  private _getPdfJS() { return this.registry.getPdfJS(); }
  private _getPdfDocId() { return this.registry.get('pdfDocId'); }
  private async getUserId() {
    const auth = this.registry.get('authUser');
    const user_id = !auth ? this.registry.get('userId') : null;
    return user_id ? { user_id } : {};
  }

  getAnnotators() { return this.annotators; }

  list() { return this.annots; }
  read(id: string) { return this.annots.filter(a => a.id == id)[0]; }

  private _apiUrl() {
    const apiUrl = this._configs()?.apiUrl || `${environment.apiUrl}/annotations`;
    return `${apiUrl}/${this._getPdfDocId()}`;
  }

  async loadAnnotators(force?: boolean) {
    if (!this.annotators || force) try {
      const api = `${this._apiUrl()}/annotators?${qparamsToString({ ...await this.getUserId() })}`;
      const req = this.registry.get('http').get(api, { withCredentials: isSameOrigin(api) });
      this.annotators = await firstValueFrom(req) as any;
    } catch (error) {
      this.annotators = [];
      console.error(error);
    }
    return this.annotators;
  }

  async loadAnnotations(qparams: any) {
    if (this.enabled) try {
      const api = `${this._apiUrl()}?${qparamsToString({ ...qparams, ...await this.getUserId() })}`;
      const req: any = this.registry.get('http').get(api, { withCredentials: isSameOrigin(api) });
      return await firstValueFrom(req);
    } catch (error) { console.error(error); }
    return [];
  }

  private async loadPageAnnotations(pageNum: number) {
    if (pageNum in this._annots == false)
      this._annots[pageNum] = await this.loadAnnotations({ ...this.qparams, pages: pageNum });

    if (this._annots[pageNum])
      this._getPdfJS().eventBus.dispatch('pageannotationsloaded', { pageNumber: pageNum });
  }

  async reload(force?: boolean) {
    const annots = this._annots;
    if (force) this._annots = {};
    for (const pageNum of Object.keys(annots))
      await this.loadPageAnnotations(parseInt(pageNum));
  }

  async create(annot: any, then?: () => void) {
    try {
      for (const key of this.registry.list('storage.oncreate.'))
        await this.registry.get(key)(annot);

      const api = `${this._apiUrl()}?${qparamsToString(await this.getUserId())}`;
      const req = this.registry.get('http').post(api, annot, { withCredentials: isSameOrigin(api) });
      const resp: any = await firstValueFrom(req);
      annot.id = resp.id;
      annot.pages.forEach(page => {
        if (page in this._annots == false)
          this._annots[page] = [];
        this._annots[page].push(annot);
      });
      then?.();
    } catch (error) { console.error(error); }
  }

  async update(annot: any, then?: () => void) {
    try {
      for (const key of this.registry.list('storage.onupdate.'))
        await this.registry.get(key)(annot);

      const api = `${this._apiUrl()}/${annot.id}?${qparamsToString(await this.getUserId())}`;
      const req = this.registry.get('http').patch(api, annot, { withCredentials: isSameOrigin(api) });
      await firstValueFrom(req);
      annot.pages
        .filter(page => page in this._annots)
        .forEach(page => {
          const index = this._annots[page].indexOf(annot);
          if (index > -1) this._annots[page][index] = annot;
        });
      then?.();
    } catch (error) { console.error(error); }
  }

  async delete(annot: any, then?: () => void) {
    try {
      for (const key of this.registry.list('storage.ondelete.'))
        await this.registry.get(key)(annot);

      const api = `${this._apiUrl()}/${annot.id}?${qparamsToString(await this.getUserId())}`;
      const req = this.registry.get('http').delete(api, { withCredentials: isSameOrigin(api) });
      await firstValueFrom(req);
      annot.pages
        .filter(page => page in this._annots)
        .forEach(page => {
          const index = this._annots[page].indexOf(annot);
          if (index > -1) this._annots[page].splice(index, 1);
        });
      then?.();
    } catch (error) { console.error(error); }
  }
}

// TODO: can we update the annotations? 