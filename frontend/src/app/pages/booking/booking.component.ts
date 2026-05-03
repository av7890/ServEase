import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { BookingService } from '../../services/booking.service';
import { CatalogService } from '../../services/catalog.service';

@Component({
  selector: 'app-booking',
  templateUrl: './booking.component.html',
  styleUrls: ['./booking.component.css'],
})
export class BookingComponent implements OnInit {
  loading = true;
  submitting = false;
  error = '';
  step = 1;
  service: any = null;
  slots: any[] = [];
  selectedSlotId = 0;
  notes = '';
  paymentMethod = 'upi';
  successData: { bookingId: number; paymentId: number | null } | null = null;
  bookingNotice = '';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private catalog: CatalogService,
    private bookingService: BookingService,
  ) {}

  ngOnInit(): void {
    this.route.queryParamMap.subscribe((params) => {
      const serviceId = Number(params.get('service'));
      if (!serviceId) {
        this.router.navigate(['/services']);
        return;
      }
      this.loadService(serviceId);
    });
  }

  get selectedSlot(): any {
    return this.slots.find((slot) => slot.slot_id === this.selectedSlotId) || null;
  }

  loadService(serviceId: number): void {
    this.loading = true;
    this.catalog.getService(serviceId).subscribe({
      next: (response) => {
        this.service = response.data?.service;
        this.slots = response.data?.slots || [];
        this.selectedSlotId = this.slots[0]?.slot_id || 0;
        this.loading = false;
      },
      error: () => {
        this.error = 'Unable to load booking details.';
        this.loading = false;
      },
    });
  }

  scheduledDateTime(): string {
    if (!this.selectedSlot) return '';
    const rawDate = String(this.selectedSlot.available_date || '');
    const normalizedDate = rawDate.includes('T') ? rawDate.slice(0, 10) : rawDate;
    return `${normalizedDate} ${this.selectedSlot.start_time}`;
  }

  confirmBooking(): void {
    if (!this.service || !this.selectedSlot) {
      this.error = 'Please select an available slot before continuing.';
      return;
    }

    this.submitting = true;
    this.error = '';

    this.bookingService.createBooking({
      service_id: this.service.service_id,
      scheduled_time: this.scheduledDateTime(),
      notes: this.notes,
    }).subscribe({
      next: (bookingResponse) => {
        const bookingId = bookingResponse.data?.booking_id;

        if (this.paymentMethod === 'cash') {
          this.successData = {
            bookingId,
            paymentId: null,
          };
          this.submitting = false;
          this.step = 3;
          return;
        }

        this.bookingService.submitPayment(bookingId, Number(this.service.price), this.paymentMethod).subscribe({
          next: (paymentResponse) => {
            this.successData = {
              bookingId,
              paymentId: paymentResponse.data?.payment_id ?? null,
            };
            this.bookingNotice = '';
            this.submitting = false;
            this.step = 3;
          },
          error: () => {
            this.successData = {
              bookingId,
              paymentId: null,
            };
            this.bookingNotice = 'Booking created. Payment was not recorded online, so you can settle it offline.';
            this.submitting = false;
            this.step = 3;
          },
        });
      },
      error: (response) => {
        this.error = response.error?.message || 'Unable to complete the booking.';
        this.submitting = false;
      },
    });
  }
}
