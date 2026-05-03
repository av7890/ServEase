import { Component, OnInit } from '@angular/core';
import { forkJoin } from 'rxjs';
import { AdminService } from '../../services/admin.service';

@Component({
  selector: 'app-admin-dashboard',
  templateUrl: './admin-dashboard.component.html',
  styleUrls: ['./admin-dashboard.component.css'],
})
export class AdminDashboardComponent implements OnInit {
  section = 'overview';
  loading = true;
  error = '';
  notice = '';
  overview: any = { stats: {} };
  providers: any[] = [];
  customers: any[] = [];
  bookings: any[] = [];
  reviews: any[] = [];

  constructor(private adminService: AdminService) {}

  ngOnInit(): void {
    this.loadData();
  }

  loadData(): void {
    this.loading = true;
    forkJoin({
      dashboard: this.adminService.getDashboard(),
      providers: this.adminService.getProviders(),
      customers: this.adminService.getCustomers(),
      bookings: this.adminService.getBookings(),
      reviews: this.adminService.getReviews(),
    }).subscribe({
      next: ({ dashboard, providers, customers, bookings, reviews }) => {
        this.overview = dashboard.data || { stats: {} };
        this.providers = providers.data || [];
        this.customers = customers.data || [];
        this.bookings = bookings.data || [];
        this.reviews = reviews.data || [];
        this.loading = false;
      },
      error: () => {
        this.error = 'Unable to load the admin dashboard.';
        this.loading = false;
      },
    });
  }

  approveProvider(providerId: number): void {
    this.adminService.approveProvider(providerId).subscribe({
      next: (response) => {
        this.notice = response.message;
        this.loadData();
      },
      error: (response) => {
        this.notice = response.error?.message || 'Unable to approve the provider.';
      },
    });
  }

  suspendProvider(providerId: number): void {
    this.adminService.suspendProvider(providerId).subscribe({
      next: (response) => {
        this.notice = response.message;
        this.loadData();
      },
      error: (response) => {
        this.notice = response.error?.message || 'Unable to suspend the provider.';
      },
    });
  }

  reinstateProvider(providerId: number): void {
    this.adminService.reinstateProvider(providerId).subscribe({
      next: (response) => {
        this.notice = response.message;
        this.loadData();
      },
      error: (response) => {
        this.notice = response.error?.message || 'Unable to reinstate the provider.';
      },
    });
  }
}
