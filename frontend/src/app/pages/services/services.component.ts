import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CatalogService } from '../../services/catalog.service';

@Component({
  selector: 'app-services',
  templateUrl: './services.component.html',
  styleUrls: ['./services.component.css'],
})
export class ServicesComponent implements OnInit {
  loading = true;
  error = '';
  searchQ = '';
  activeCategory = '';
  categories: any[] = [];
  services: any[] = [];

  constructor(
    private catalog: CatalogService,
    private route: ActivatedRoute,
    private router: Router,
  ) {}

  ngOnInit(): void {
    this.catalog.getCategories().subscribe({
      next: (response) => {
        this.categories = response.data || [];
      },
    });

    this.route.queryParamMap.subscribe((params) => {
      this.activeCategory = params.get('category') || '';
      this.searchQ = params.get('search') || '';
      this.fetchServices();
    });
  }

  get filteredServices(): any[] {
    return this.services.filter((service) => {
      const matchesSearch = !this.searchQ || [service.service_name, service.category_name, service.provider_name]
        .join(' ')
        .toLowerCase()
        .includes(this.searchQ.toLowerCase());
      return matchesSearch;
    });
  }

  fetchServices(): void {
    this.loading = true;
    this.catalog.getServices({ categoryId: this.activeCategory || undefined, search: this.searchQ || undefined }).subscribe({
      next: (response) => {
        this.services = response.data || [];
        this.loading = false;
      },
      error: () => {
        this.error = 'Unable to load services from the server.';
        this.loading = false;
      },
    });
  }

  applyFilters(): void {
    this.router.navigate(['/services'], {
      queryParams: {
        category: this.activeCategory || null,
        search: this.searchQ || null,
      },
      queryParamsHandling: 'merge',
    });
  }

  clearFilters(): void {
    this.activeCategory = '';
    this.searchQ = '';
    this.router.navigate(['/services']);
  }

  openService(serviceId: number): void {
    this.router.navigate(['/services', serviceId]);
  }
}
