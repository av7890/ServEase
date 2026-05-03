import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CatalogService } from '../../services/catalog.service';

@Component({
  selector: 'app-service-detail',
  templateUrl: './service-detail.component.html',
  styleUrls: ['./service-detail.component.css'],
})
export class ServiceDetailComponent implements OnInit {
  loading = true;
  error = '';
  service: any = null;
  reviews: any[] = [];
  slots: any[] = [];
  relatedServices: any[] = [];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private catalog: CatalogService,
  ) {}

  ngOnInit(): void {
    this.route.paramMap.subscribe((params) => {
      const serviceId = Number(params.get('id'));
      this.loadService(serviceId);
    });
  }

  loadService(serviceId: number): void {
    this.loading = true;
    this.catalog.getService(serviceId).subscribe({
      next: (response) => {
        this.service = response.data?.service;
        this.reviews = response.data?.reviews || [];
        this.slots = response.data?.slots || [];
        this.relatedServices = response.data?.relatedServices || [];
        this.loading = false;
      },
      error: () => {
        this.error = 'Unable to load that service.';
        this.loading = false;
      },
    });
  }

  goToProvider(): void {
    if (this.service?.provider_id) {
      this.router.navigate(['/provider', this.service.provider_id]);
    }
  }

  goToBooking(): void {
    if (this.service?.service_id) {
      this.router.navigate(['/booking'], { queryParams: { service: this.service.service_id } });
    }
  }

  openRelated(serviceId: number): void {
    this.router.navigate(['/services', serviceId]);
  }
}
