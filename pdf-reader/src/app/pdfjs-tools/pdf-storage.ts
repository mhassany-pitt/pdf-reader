import { firstValueFrom } from "rxjs";
import { PdfRegistry } from "./pdf-registry";
import { isSameOrigin, qparamsToString } from "./pdf-utils";
import { environment } from "src/environments/environment";

export class PdfStorage {

  // TODO: multiple annotation source, with one primary for create/update/delete?!

  private registry: PdfRegistry;
  private annotators: any;

  enabled = true;

  private _annots: { [page: number]: any[] } = {};
  private get annots() {
    const seen = new Set<string>();
    const out: any[] = [];
    for (const pageAnnots of Object.values(this._annots)) {
      for (const annot of pageAnnots) {
        if (!annot?.id || seen.has(annot.id)) continue;
        seen.add(annot.id);
        out.push(annot);
      }
    }
    return out;
  }

  qparams: { [key: string]: string } = {};

  constructor({ registry }) {
    this.registry = registry;

    this.registry.register('storage', this);
    this.registry.register(`configs.default.storage`, () => PdfStorage.defaultConfigs());

    this.loadAnnotators();

    this._getPdfJS().eventBus.on('pagerendered', ($event: any) => this.loadPageAnnotations($event.pageNumber));
    // PDF.js pagesdestroy has no pageNumber — clear the whole cache on document teardown.
    this._getPdfJS().eventBus.on('pagesdestroy', () => { this._annots = {}; });
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
  read(id: string) { return this.annots.find(a => a.id == id); }

  /** Current user owns this annotation (API `isMine`). */
  isMine(annot: any) {
    const cached = annot?.id ? this.read(annot.id) : null;
    return (cached || annot)?.isMine === true;
  }

  /** Reuse one object per annotation id across pages so updates stay consistent. */
  private _canonical(annot: any) {
    if (!annot?.id) return annot;
    const existing = this.read(annot.id);
    if (existing && existing !== annot) {
      Object.assign(existing, annot);
      return existing;
    }
    return annot;
  }

  private _findIndexById(pageAnnots: any[], id: string) {
    return pageAnnots.findIndex(a => a?.id == id);
  }

  private _pagesOf(annot: any): number[] {
    const pages = annot?.pages;
    if (!Array.isArray(pages)) return [];
    return pages.map((p: any) => parseInt(p, 10)).filter((p: number) => !Number.isNaN(p));
  }

  private _upsertInCache(annot: any) {
    const canonical = this._canonical(annot);
    for (const page of this._pagesOf(canonical)) {
      if (!(page in this._annots)) this._annots[page] = [];
      const index = this._findIndexById(this._annots[page], canonical.id);
      if (index > -1) this._annots[page][index] = canonical;
      else this._annots[page].push(canonical);
    }
    return canonical;
  }

  private _removeFromCache(annot: any) {
    const id = annot?.id;
    if (!id) return;
    for (const page of Object.keys(this._annots).map(p => parseInt(p, 10))) {
      const index = this._findIndexById(this._annots[page], id);
      if (index > -1) this._annots[page].splice(index, 1);
    }
  }

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

  async loadAnnotations(qparams: any): Promise<any[]> {
    if (this.enabled) try {
      const api = `${this._apiUrl()}?${qparamsToString({ ...qparams, ...await this.getUserId() })}`;
      const req: any = this.registry.get('http').get(api, { withCredentials: isSameOrigin(api) });
      return (await firstValueFrom(req)) as any[];
    } catch (error) { console.error(error); }
    return [];
  }

  private async loadPageAnnotations(pageNum: number) {
    if (pageNum in this._annots == false) {
      const loaded = await this.loadAnnotations({ ...this.qparams, pages: pageNum });
      this._annots[pageNum] = loaded.map((a: any) => this._canonical(a));
    }

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
      // Keep the caller's object as the canonical cache entry (UI holds this ref).
      Object.assign(annot, resp);
      if (annot.isMine !== false) annot.isMine = true;
      this._upsertInCache(annot);

      for (const key of this.registry.list('storage.created.'))
        await this.registry.get(key)(annot);

      then?.();
    } catch (error) { console.error(error); }
  }

  async update(annot: any, then?: () => void) {
    try {
      if (!annot?.id) return;
      if (!this.isMine(annot)) return;

      for (const key of this.registry.list('storage.onupdate.'))
        await this.registry.get(key)(annot);

      const api = `${this._apiUrl()}/${annot.id}?${qparamsToString(await this.getUserId())}`;
      const req = this.registry.get('http').patch(api, annot, { withCredentials: isSameOrigin(api) });
      const resp: any = await firstValueFrom(req);
      // Merge into the existing cached object (and the caller's object) by id.
      const cached = this.read(annot.id) || annot;
      Object.assign(cached, annot, resp);
      if (annot !== cached) Object.assign(annot, cached);
      this._upsertInCache(cached);

      for (const key of this.registry.list('storage.updated.'))
        await this.registry.get(key)(cached);

      then?.();
    } catch (error) { console.error(error); }
  }

  async delete(annot: any, then?: () => void) {
    try {
      if (!annot?.id) return;
      if (!this.isMine(annot)) return;

      for (const key of this.registry.list('storage.ondelete.'))
        await this.registry.get(key)(annot);

      const api = `${this._apiUrl()}/${annot.id}?${qparamsToString(await this.getUserId())}`;
      const req = this.registry.get('http').delete(api, { withCredentials: isSameOrigin(api) });
      await firstValueFrom(req);
      this._removeFromCache(annot);

      for (const key of this.registry.list('storage.deleted.'))
        await this.registry.get(key)(annot);

      then?.();
    } catch (error) { console.error(error); }
  }
}
