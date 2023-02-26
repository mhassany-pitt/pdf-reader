import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from 'src/environments/environment';

@Injectable({
  providedIn: 'root'
})
export class DocumentService {

  constructor(
    private http: HttpClient
  ) { }

  get(id: string) {
    return this.http.get(`${environment.apiUrl}/documents/${id}`);
  }

  update(document: any) {
    return this.http.patch(`${environment.apiUrl}/documents/${document.id}`, document);
  }
  
  upload(id: string, file: any) {
    const form = new FormData();
    form.append('file', file);

    return this.http.post(`${environment.apiUrl}/documents/${id}/file`, form);
  }
}
