import { Component } from '@angular/core';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-footer',
  templateUrl: './footer.component.html',
  styleUrls: ['./footer.component.css'],
})
export class FooterComponent {
  constructor(public auth: AuthService) {}

  dashboardLink(): string {
    const user = this.auth.currentUser();
    if (!user) return '/login';
    return {
      customer: '/customer-dashboard',
      provider: '/provider-dashboard',
      admin: '/admin-dashboard',
    }[user.role] || '/';
  }
}
