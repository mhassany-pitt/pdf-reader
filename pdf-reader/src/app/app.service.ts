import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { map } from 'rxjs';
import { environment } from 'src/environments/environment';

@Injectable({ providedIn: 'root' })
export class AppService {

  user: any;

  constructor(private http: HttpClient) { }

  handshake() {
    return this.http
      .get(`${environment.apiUrl}/auth/handshake`, { withCredentials: true })
      .pipe(map((resp: any) => {
        this.user = resp?.user;
        return resp;
      }));
  }
}
