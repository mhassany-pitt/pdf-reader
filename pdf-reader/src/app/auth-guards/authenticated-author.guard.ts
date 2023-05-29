import { Injectable } from '@angular/core';
import { ActivatedRouteSnapshot, CanActivate, Router, RouterStateSnapshot } from '@angular/router';
import { map } from 'rxjs';
import { AppService } from '../app.service';

@Injectable({ providedIn: 'root' })
export class AuthenticatedAuthorGuard implements CanActivate {

  constructor(
    private app: AppService,
    private router: Router,
  ) { }

  canActivate(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): any {
    return this.app.handshake().pipe(map((resp: any) => {
      if (!resp.user) {
        this.router.navigate(['/login']);
      } else if (!resp.user.roles?.includes('author')) {
        this.router.navigate(['/unauthorized']);
      }
      return !!resp.user;
    }));
  }
}
