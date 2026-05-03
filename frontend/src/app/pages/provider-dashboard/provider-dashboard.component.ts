import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { AuthService } from '../../services/auth.service';
import { BookingService } from '../../services/booking.service';
import { CatalogService } from '../../services/catalog.service';
import { DashboardService } from '../../services/dashboard.service';

@Component({
  selector: 'app-provider-dashboard',
  templateUrl: './provider-dashboard.component.html',
  styleUrls: ['./provider-dashboard.component.css'],
})
export class ProviderDashboardComponent implements OnInit {
  section = 'overview';
  loading = true;
  error = '';
  notice = '';
  editingServiceId: number | null = null;
  profile: any = null;
  summary = { total_bookings: 0, pending_bookings: 0, confirmed_bookings: 0, completed_bookings: 0, total_earnings: 0, avg_rating: 0 };
  reviews: any[] = [];
  bookings: any[] = [];
  services: any[] = [];
  slots: any[] = [];
  categories: any[] = [];
  locations: any[] = [];

  serviceForm: FormGroup;
  slotForm: FormGroup;
  profileForm: FormGroup;
  passwordForm: FormGroup;

  constructor(
    private fb: FormBuilder,
    public auth: AuthService,
    private bookingService: BookingService,
    private catalogService: CatalogService,
    private dashboardService: DashboardService,
  ) {
    this.serviceForm = this.fb.group({
      service_name: ['', Validators.required],
      description: [''],
      price: [0, [Validators.required, Validators.min(1)]],
      category_id: ['', Validators.required],
    });
    this.slotForm = this.fb.group({
      service_id: ['', Validators.required],
      available_date: ['', Validators.required],
      start_time: ['', Validators.required],
      end_time: ['', Validators.required],
    });
    this.profileForm = this.fb.group({
      name: ['', Validators.required],
      phone: ['', Validators.required],
      experience_years: [0, Validators.required],
      location_id: ['', Validators.required],
      bio: [''],
    });
    this.passwordForm = this.fb.group({
      currentPassword: ['', Validators.required],
      newPassword: ['', [Validators.required, Validators.minLength(8)]],
    });
  }

  ngOnInit(): void {
    this.loadData();
  }

  loadData(): void {
    this.loading = true;
    forkJoin({
      dashboard: this.dashboardService.getProviderDashboard(),
      profile: this.dashboardService.getProviderProfile(),
      services: this.dashboardService.getProviderServices(),
      slots: this.dashboardService.getProviderSlots(),
      bookings: this.bookingService.getBookings(),
      categories: this.catalogService.getCategories(),
      locations: this.catalogService.getLocations(),
    }).subscribe({
      next: ({ dashboard, profile, services, slots, bookings, categories, locations }) => {
        this.summary = dashboard.data?.summary || this.summary;
        this.reviews = dashboard.data?.reviews || [];
        this.profile = profile.data;
        this.services = services.data || [];
        this.slots = slots.data || [];
        this.bookings = bookings.data || [];
        this.categories = categories.data || [];
        this.locations = locations.data || [];
        this.profileForm.patchValue({
          name: this.profile?.name,
          phone: this.profile?.phone,
          experience_years: this.profile?.experience_years,
          location_id: this.profile?.location_id,
          bio: this.profile?.bio,
        });
        this.loading = false;
      },
      error: () => {
        this.error = 'Unable to load the provider dashboard.';
        this.loading = false;
      },
    });
  }

  updateBookingStatus(bookingId: number, status: string): void {
    this.bookingService.updateStatus(bookingId, status).subscribe({
      next: (response) => {
        this.notice = response.message;
        this.loadData();
      },
      error: (response) => {
        this.notice = response.error?.message || 'Unable to update that booking.';
      },
    });
  }

  addService(): void {
    if (this.serviceForm.invalid) return;
    const request = this.editingServiceId
      ? this.dashboardService.updateProviderService(this.editingServiceId, this.serviceForm.value)
      : this.dashboardService.createProviderService(this.serviceForm.value);

    request.subscribe({
      next: (response) => {
        this.notice = response.message;
        this.cancelServiceEdit();
        this.loadData();
      },
      error: (response) => {
        this.notice = response.error?.message || (this.editingServiceId
          ? 'Unable to update the service.'
          : 'Unable to create the service.');
      },
    });
  }

  startServiceEdit(service: any): void {
    this.editingServiceId = service.service_id;
    this.serviceForm.patchValue({
      service_name: service.service_name || '',
      description: service.description || '',
      price: Number(service.price) || 0,
      category_id: service.category_id || '',
    });
  }

  cancelServiceEdit(): void {
    this.editingServiceId = null;
    this.serviceForm.reset({
      service_name: '',
      description: '',
      price: 0,
      category_id: '',
    });
  }

  removeService(serviceId: number): void {
    this.dashboardService.deleteProviderService(serviceId).subscribe({
      next: (response) => {
        this.notice = response.message;
        if (this.editingServiceId === serviceId) {
          this.cancelServiceEdit();
        }
        this.loadData();
      },
      error: (response) => {
        this.notice = response.error?.message || 'Unable to delete the service.';
      },
    });
  }

  addSlot(): void {
    if (this.slotForm.invalid) return;
    this.dashboardService.createProviderSlot(this.slotForm.value).subscribe({
      next: (response) => {
        this.notice = response.message;
        this.slotForm.reset({
          service_id: '',
          available_date: '',
          start_time: '',
          end_time: '',
        });
        this.loadData();
      },
      error: (response) => {
        this.notice = response.error?.message || 'Unable to create the slot.';
      },
    });
  }

  removeSlot(slotId: number): void {
    this.dashboardService.deleteProviderSlot(slotId).subscribe({
      next: (response) => {
        this.notice = response.message;
        this.loadData();
      },
      error: (response) => {
        this.notice = response.error?.message || 'Unable to remove the slot.';
      },
    });
  }

  saveProfile(): void {
    if (this.profileForm.invalid) return;
    this.dashboardService.updateProviderProfile(this.profileForm.value).subscribe({
      next: (response) => {
        this.notice = response.message;
        this.loadData();
      },
      error: (response) => {
        this.notice = response.error?.message || 'Unable to update the profile.';
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
