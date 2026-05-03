import { Injectable } from '@angular/core';
import { ApiService } from './api.service';

@Injectable({ providedIn: 'root' })
export class CatalogService {
  constructor(private api: ApiService) {}

  getHome() {
    return this.api.get<any>('/public/home');
  }

  getCategories() {
    return this.api.get<any>('/public/categories');
  }

  getLocations() {
    return this.api.get<any>('/public/locations');
  }

  getServices(params?: { categoryId?: string; search?: string }) {
    const query = new URLSearchParams();
    if (params?.categoryId) query.set('category_id', params.categoryId);
    if (params?.search) query.set('search', params.search);
    const suffix = query.toString() ? `?${query.toString()}` : '';
    return this.api.get<any>(`/public/services${suffix}`);
  }

  getService(serviceId: number) {
    return this.api.get<any>(`/public/services/${serviceId}`);
  }

  getProvider(providerId: number) {
    return this.api.get<any>(`/public/providers/${providerId}`);
  }
}
