import { Component, HostListener, OnInit } from '@angular/core';
import { AuthService, User } from '../../services/auth.service';

@Component({
  selector: 'app-navbar',
  templateUrl: './navbar.component.html',
  styleUrls: ['./navbar.component.css'],
})
export class NavbarComponent implements OnInit {
  user: User | null = null;
  mobileOpen = false;

  constructor(public auth: AuthService) {}

  ngOnInit(): void {
    this.user = this.auth.currentUser();
  }

  dashboardLink(): string {
    if (!this.user) return '/';
    return {
      customer: '/customer-dashboard',
      provider: '/provider-dashboard',
      admin: '/admin-dashboard',
    }[this.user.role] || '/';
  }

  closeMobileMenu(): void {
    this.mobileOpen = false;
  }

  logout(): void {
    this.closeMobileMenu();
    this.auth.logout();
  }

  @HostListener('window:resize')
  onResize(): void {
    if (window.innerWidth > 768) {
      this.mobileOpen = false;
    }
  }
}
