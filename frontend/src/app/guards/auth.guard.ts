import { Injectable } from '@angular/core';
import { CanActivate, ActivatedRouteSnapshot, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

@Injectable({ providedIn: 'root' })
export class AuthGuard implements CanActivate {
  constructor(private auth: AuthService, private router: Router) {}

  canActivate(route: ActivatedRouteSnapshot): boolean {
    const user = this.auth.currentUser();
    if (!user) {
      this.router.navigate(['/login']);
      return false;
    }
    const allowed: string[] = route.data['roles'] || [];
    if (allowed.length && !allowed.includes(user.role)) {
      this.router.navigate(['/']);
      return false;
    }
    return true;
  }
}
