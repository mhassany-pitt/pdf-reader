import { Injectable } from '@angular/core';
import { ActivatedRouteSnapshot, CanActivate, Router, RouterStateSnapshot } from '@angular/router';
import { map } from 'rxjs';
import { AppService } from '../app.service';
import { HttpClient } from '@angular/common/http';
import { environment } from 'src/environments/environment';

@Injectable({ providedIn: 'root' })
export class AuthenticatedAuthorGuard implements CanActivate {

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
        } else if (!resp.user.roles?.includes('author')) {
          this.router.navigate(['/unauthorized']);
        }
        return !!resp.user;
      }));
  }
}
