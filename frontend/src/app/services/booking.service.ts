import { Injectable } from '@angular/core';
import { ApiService } from './api.service';

@Injectable({ providedIn: 'root' })
export class BookingService {
  constructor(private api: ApiService) {}

  getBookings() {
    return this.api.get<any>('/bookings');
  }

  createBooking(body: { service_id: number; scheduled_time: string; notes?: string }) {
    return this.api.post<any>('/bookings', body);
  }

  cancelBooking(bookingId: number) {
    return this.api.patch<any>(`/bookings/${bookingId}/cancel`, {});
  }

  updateStatus(bookingId: number, status: string) {
    return this.api.patch<any>(`/bookings/${bookingId}/status`, { status });
  }

  submitPayment(bookingId: number, amount: number, method: string) {
    return this.api.post<any>(`/bookings/${bookingId}/payment`, { amount, method });
  }

  submitReview(bookingId: number, rating: number, comment: string) {
    return this.api.post<any>(`/bookings/${bookingId}/review`, { rating, comment });
  }
}
