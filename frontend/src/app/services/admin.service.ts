import { Injectable } from '@angular/core';
import { ApiService } from './api.service';

@Injectable({ providedIn: 'root' })
export class AdminService {
  constructor(private api: ApiService) {}

  getDashboard() {
    return this.api.get<any>('/admin/dashboard');
  }

  getProviders(status?: string) {
    return this.api.get<any>(status ? `/admin/providers?status=${status}` : '/admin/providers');
  }

  approveProvider(providerId: number) {
    return this.api.patch<any>(`/admin/providers/${providerId}/approve`, {});
  }

  suspendProvider(providerId: number) {
    return this.api.patch<any>(`/admin/providers/${providerId}/suspend`, {});
  }

  reinstateProvider(providerId: number) {
    return this.api.patch<any>(`/admin/providers/${providerId}/reinstate`, {});
  }

  getCustomers() {
    return this.api.get<any>('/admin/customers');
  }

  getBookings() {
    return this.api.get<any>('/admin/bookings');
  }

  getReviews() {
    return this.api.get<any>('/admin/reviews');
  }
}
