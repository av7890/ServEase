import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { CatalogService } from '../../services/catalog.service';

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.css'],
})
export class HomeComponent implements OnInit {
  loading = true;
  error = '';
  contactForm: FormGroup;
  contactMessage = '';
  contactTone: 'success' | 'error' | '' = '';
  stats = { providers: 0, services: 0, bookings: 0, average_rating: 0 };
  categories: any[] = [];
  testimonials: any[] = [];

  constructor(
    private catalog: CatalogService,
    private fb: FormBuilder,
    private router: Router,
  ) {
    this.contactForm = this.fb.group({
      firstName: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      message: ['', Validators.required],
    });
  }

  ngOnInit(): void {
    this.catalog.getHome().subscribe({
      next: (response) => {
        this.stats = response.data?.stats || this.stats;
        this.categories = response.data?.categories || [];
        this.testimonials = response.data?.testimonials || [];
        this.loading = false;
      },
      error: () => {
        this.error = 'Unable to load live homepage data right now.';
        this.loading = false;
      },
    });
  }

  openCategory(categoryId: number): void {
    this.router.navigate(['/services'], { queryParams: { category: categoryId } });
  }

  submitContact(): void {
    if (this.contactForm.invalid) {
      this.contactTone = 'error';
      this.contactMessage = 'Please complete the required contact fields.';
      return;
    }

    this.contactTone = 'success';
    this.contactMessage = 'Message noted. Contact handling is kept on-page in this build.';
    this.contactForm.reset();
  }
}
