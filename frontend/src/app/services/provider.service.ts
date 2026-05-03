import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';

@Injectable({ providedIn: 'root' })
export class ProviderService {
  constructor(private api: ApiService) {}

  getAll(params?: any): Observable<any>         { return this.api.get('/providers'); }
  getOne(id: number): Observable<any>           { return this.api.get(`/providers/${id}`); }
  createSlot(body: any): Observable<any>        { return this.api.post('/providers/slots', body); }
  getMyBookings(): Observable<any>              { return this.api.get('/providers/bookings'); }
  updateProfile(body: any): Observable<any>     { return this.api.put('/providers/profile', body); }
  rateCustomer(bookingId: number, rating: number, comment: string): Observable<any> {
    return this.api.post('/providers/customer-review', { booking_id: bookingId, rating, comment });
  }
}
