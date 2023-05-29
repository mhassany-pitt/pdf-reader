import { Injectable } from '@angular/core';
import { ActivatedRouteSnapshot, CanActivate, RouterStateSnapshot, UrlTree } from '@angular/router';
import { Observable } from 'rxjs';
import { AppService } from '../app.service';

@Injectable({ providedIn: 'root' })
export class HandshakeGuard implements CanActivate {

  constructor(private app: AppService) { }

  canActivate(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): any {
    return this.app.handshake();
  }
}
