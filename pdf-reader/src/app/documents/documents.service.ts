import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from 'src/environments/environment';

@Injectable({
  providedIn: 'root'
})
export class DocumentsService {

  constructor(
    private http: HttpClient,
  ) { }

  list() {
    return this.http.get(`${environment.apiUrl}/documents`);
  }

  create(file: any) {
    const form = new FormData();
    form.append('file', file);

    return this.http.post(`${environment.apiUrl}/documents`, form);
  }
}
