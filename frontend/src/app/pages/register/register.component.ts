import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { CatalogService } from '../../services/catalog.service';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-register',
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.css'],
})
export class RegisterComponent implements OnInit {
  step = 1;
  role: 'customer' | 'provider' = 'customer';
  loading = false;
  error = '';
  success = '';
  locations: any[] = [];

  accountForm: FormGroup;
  detailForm: FormGroup;

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private auth: AuthService,
    private catalog: CatalogService,
  ) {
    this.accountForm = this.fb.group({
      firstName: ['', Validators.required],
      lastName: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      phone: ['', [Validators.required, Validators.pattern(/^\d{10}$/)]],
      password: ['', [Validators.required, Validators.minLength(8)]],
      confirmPassword: ['', Validators.required],
    });

    this.detailForm = this.fb.group({
      address: [''],
      experience_years: [0],
      location_id: ['', Validators.required],
      bio: [''],
    });
  }

  ngOnInit(): void {
    this.catalog.getLocations().subscribe({
      next: (response) => {
        this.locations = response.data || [];
      },
    });

    this.route.queryParamMap.subscribe((params) => {
      const role = params.get('role');
      if (role === 'provider') {
        this.role = 'provider';
      }
    });
  }

  nextStep(): void {
    if (this.step === 1 && this.accountForm.invalid) {
      this.error = 'Complete the basic account fields first.';
      return;
    }

    if (this.accountForm.value.password !== this.accountForm.value.confirmPassword) {
      this.error = 'Passwords must match.';
      return;
    }

    this.error = '';
    this.step = 2;
  }

  submit(): void {
    if (!this.detailForm.value.location_id) {
      this.error = 'Choose a service location.';
      return;
    }

    if (this.role === 'customer' && !this.detailForm.value.address?.trim()) {
      this.error = 'Address is required for customer accounts.';
      return;
    }

    const account = this.accountForm.value;
    const details = this.detailForm.value;
    const payload: any = {
      role: this.role,
      name: `${account.firstName} ${account.lastName}`.trim(),
      email: account.email,
      phone: account.phone,
      password: account.password,
      location_id: details.location_id,
    };

    if (this.role === 'customer') {
      payload.address = details.address;
    } else {
      payload.experience_years = Number(details.experience_years || 0);
      payload.bio = details.bio;
    }

    this.loading = true;
    this.error = '';
    this.success = '';

    this.auth.register(payload).subscribe({
      next: (response) => {
        this.loading = false;
        this.success = response.message || 'Registration completed.';
        setTimeout(() => this.router.navigate(['/login']), 1200);
      },
      error: (response) => {
        this.loading = false;
        this.error = response.error?.message || 'Registration failed.';
      },
    });
  }
}
