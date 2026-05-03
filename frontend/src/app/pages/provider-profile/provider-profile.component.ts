import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CatalogService } from '../../services/catalog.service';

@Component({
  selector: 'app-provider-profile',
  templateUrl: './provider-profile.component.html',
  styleUrls: ['./provider-profile.component.css'],
})
export class ProviderProfileComponent implements OnInit {
  loading = true;
  error = '';
  provider: any = null;
  services: any[] = [];
  reviews: any[] = [];
  selectedServiceId = 0;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private catalog: CatalogService,
  ) {}

  ngOnInit(): void {
    this.route.paramMap.subscribe((params) => {
      this.loadProvider(Number(params.get('id')));
    });
  }

  loadProvider(providerId: number): void {
    this.loading = true;
    this.catalog.getProvider(providerId).subscribe({
      next: (response) => {
        this.provider = response.data?.provider;
        this.services = response.data?.services || [];
        this.reviews = response.data?.reviews || [];
        this.selectedServiceId = this.services[0]?.service_id || 0;
        this.loading = false;
      },
      error: () => {
        this.error = 'Unable to load that provider.';
        this.loading = false;
      },
    });
  }

  bookSelectedService(): void {
    if (this.selectedServiceId) {
      this.router.navigate(['/booking'], { queryParams: { service: this.selectedServiceId } });
    }
  }

  openService(serviceId: number): void {
    this.router.navigate(['/services', serviceId]);
  }
}
