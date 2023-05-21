import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import {
  ActivatedRouteSnapshot, CanActivate,
  Router, RouterStateSnapshot
} from '@angular/router';
import { environment } from 'src/environments/environment';
import { AppService } from '../app.service';
import { map } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class AuthenticatedGuard implements CanActivate {

  constructor(
    private app: AppService,
    private http: HttpClient,
    private router: Router,
  ) { }

  canActivate(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): any {
    return this.http.get(`${environment.apiUrl}/auth/handshake`, { withCredentials: true })
      .pipe(map((resp: any) => {
        this.app.user = resp.user;
        if (!resp.user) {
          this.router.navigate(['/login']);
        }
        return !!resp.user;
      }));
  }
}
