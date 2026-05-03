import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { AuthService } from '../../services/auth.service';
import { BookingService } from '../../services/booking.service';
import { DashboardService } from '../../services/dashboard.service';

@Component({
  selector: 'app-customer-dashboard',
  templateUrl: './customer-dashboard.component.html',
  styleUrls: ['./customer-dashboard.component.css'],
})
export class CustomerDashboardComponent implements OnInit {
  section = 'overview';
  loading = true;
  error = '';
  notice = '';
  bookingsFilter = 'all';
  profile: any = null;
  stats = { total_bookings: 0, completed_bookings: 0, active_bookings: 0, total_spent: 0 };
  bookings: any[] = [];
  reviews: any[] = [];
  reviewModal = false;
  reviewTarget: any = null;

  profileForm: FormGroup;
  passwordForm: FormGroup;
  reviewForm: FormGroup;

  constructor(
    private fb: FormBuilder,
    public auth: AuthService,
    private dashboardService: DashboardService,
    private bookingService: BookingService,
  ) {
    this.profileForm = this.fb.group({
      name: ['', Validators.required],
      phone: ['', Validators.required],
      address: ['', Validators.required],
    });
    this.passwordForm = this.fb.group({
      currentPassword: ['', Validators.required],
      newPassword: ['', [Validators.required, Validators.minLength(8)]],
    });
    this.reviewForm = this.fb.group({
      rating: [5, Validators.required],
      comment: [''],
    });
  }

  ngOnInit(): void {
    this.loadData();
  }

  get filteredBookings(): any[] {
    return this.bookingsFilter === 'all'
      ? this.bookings
      : this.bookings.filter((booking) => booking.status === this.bookingsFilter);
  }

  loadData(): void {
    this.loading = true;
    forkJoin({
      dashboard: this.dashboardService.getCustomerDashboard(),
      bookings: this.bookingService.getBookings(),
    }).subscribe({
      next: ({ dashboard, bookings }) => {
        this.profile = dashboard.data?.profile;
        this.stats = dashboard.data?.stats || this.stats;
        this.reviews = dashboard.data?.reviews || [];
        this.bookings = bookings.data || [];
        this.profileForm.patchValue({
          name: this.profile?.name || '',
          phone: this.profile?.phone || '',
          address: this.profile?.address || '',
        });
        this.loading = false;
      },
      error: () => {
        this.error = 'Unable to load the customer dashboard.';
        this.loading = false;
      },
    });
  }

  openReview(booking: any): void {
    this.reviewTarget = booking;
    this.reviewForm.reset({ rating: 5, comment: '' });
    this.reviewModal = true;
  }

  submitReview(): void {
    if (!this.reviewTarget) return;
    const { rating, comment } = this.reviewForm.value;
    this.bookingService.submitReview(this.reviewTarget.booking_id, rating, comment).subscribe({
      next: (response) => {
        this.notice = response.message;
        this.reviewModal = false;
        this.loadData();
      },
      error: (response) => {
        this.notice = response.error?.message || 'Unable to submit the review.';
      },
    });
  }

  cancelBooking(bookingId: number): void {
    this.bookingService.cancelBooking(bookingId).subscribe({
      next: (response) => {
        this.notice = response.message;
        this.loadData();
      },
      error: (response) => {
        this.notice = response.error?.message || 'Unable to cancel that booking.';
      },
    });
  }

  saveProfile(): void {
    if (this.profileForm.invalid) return;
    this.dashboardService.updateCustomerProfile(this.profileForm.value).subscribe({
      next: (response) => {
        this.notice = response.message;
        this.loadData();
      },
      error: (response) => {
        this.notice = response.error?.message || 'Unable to save profile changes.';
      },
    });
  }

  changePassword(): void {
    if (this.passwordForm.invalid) return;
    const { currentPassword, newPassword } = this.passwordForm.value;
    this.auth.changePassword(currentPassword, newPassword).subscribe({
      next: (response) => {
        this.notice = response.message;
        this.passwordForm.reset();
      },
      error: (response) => {
        this.notice = response.error?.message || 'Unable to update the password.';
      },
    });
  }
}
