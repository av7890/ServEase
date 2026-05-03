import { Injectable } from '@angular/core';
import { ApiService } from './api.service';

@Injectable({ providedIn: 'root' })
export class DashboardService {
  constructor(private api: ApiService) {}

  getCustomerDashboard() {
    return this.api.get<any>('/customers/dashboard');
  }

  getCustomerProfile() {
    return this.api.get<any>('/customers/profile');
  }

  updateCustomerProfile(body: unknown) {
    return this.api.put<any>('/customers/profile', body);
  }

  getProviderDashboard() {
    return this.api.get<any>('/providers/dashboard');
  }

  getProviderProfile() {
    return this.api.get<any>('/providers/profile');
  }

  updateProviderProfile(body: unknown) {
    return this.api.put<any>('/providers/profile', body);
  }

  getProviderServices() {
    return this.api.get<any>('/providers/services');
  }

  createProviderService(body: unknown) {
    return this.api.post<any>('/providers/services', body);
  }

  updateProviderService(serviceId: number, body: unknown) {
    return this.api.put<any>(`/providers/services/${serviceId}`, body);
  }

  deleteProviderService(serviceId: number) {
    return this.api.delete<any>(`/providers/services/${serviceId}`);
  }

  getProviderSlots() {
    return this.api.get<any>('/providers/slots');
  }

  createProviderSlot(body: unknown) {
    return this.api.post<any>('/providers/slots', body);
  }

  deleteProviderSlot(slotId: number) {
    return this.api.delete<any>(`/providers/slots/${slotId}`);
  }
}
