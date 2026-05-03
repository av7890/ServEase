import { Component, Input } from '@angular/core';
import { AuthService, User } from '../../services/auth.service';

export interface SidebarLink {
  label: string;
  icon: string;
  section: string;
}

@Component({
  selector: 'app-sidebar',
  templateUrl: './sidebar.component.html',
})
export class SidebarComponent {
  @Input() links: SidebarLink[] = [];
  @Input() portalLabel = 'Portal';
  @Input() activeSection = '';
  user: User | null;

  constructor(public auth: AuthService) {
    this.user = auth.currentUser();
  }

  setActiveSection(section: string): void {
    this.activeSection = section;
  }
}
