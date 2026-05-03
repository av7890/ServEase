import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, tap } from 'rxjs';
import { resolveApiBase } from './api.service';

export interface User {
  id: number;
  name: string;
  email: string;
  role: 'customer' | 'provider' | 'admin';
  status?: string;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly api = `${resolveApiBase()}/auth`;
  private readonly tokenKey = 'serveease_token';
  private readonly userKey = 'serveease_user';

  constructor(private http: HttpClient, private router: Router) {}

  login(role: User['role'], email: string, password: string): Observable<any> {
    return this.http.post<any>(`${this.api}/login`, { role, email, password }).pipe(
      tap((response) => {
        if (response?.success) {
          this.setSession({
            token: response.token,
            user: {
              id: response.id,
              name: response.name,
              email,
              role: response.role,
              status: response.status,
            },
          });
        }
      }),
    );
  }

  register(body: unknown): Observable<any> {
    const payload = body as { role: string };
    const endpoint = payload.role === 'provider' ? '/register/provider' : '/register/customer';
    return this.http.post<any>(`${this.api}${endpoint}`, body);
  }

  resetPassword(body: unknown): Observable<any> {
    return this.http.post<any>(`${this.api}/reset-password`, body);
  }

  changePassword(currentPassword: string, newPassword: string): Observable<any> {
    return this.http.post<any>(
      `${this.api}/change-password`,
      { currentPassword, newPassword },
      { headers: this.authHeaders() },
    );
  }

  logout(): void {
    localStorage.removeItem(this.tokenKey);
    localStorage.removeItem(this.userKey);
    this.router.navigate(['/login']);
  }

  currentUser(): User | null {
    const serialized = localStorage.getItem(this.userKey);
    return serialized ? JSON.parse(serialized) : null;
  }

  getToken(): string | null {
    return localStorage.getItem(this.tokenKey);
  }

  isLoggedIn(): boolean {
    return Boolean(this.getToken());
  }

  redirectByRole(): void {
    const user = this.currentUser();
    if (!user) {
      this.router.navigate(['/login']);
      return;
    }

    const destination = {
      customer: '/customer-dashboard',
      provider: '/provider-dashboard',
      admin: '/admin-dashboard',
    }[user.role] || '/';

    this.router.navigate([destination]);
  }

  private setSession(session: { token: string; user: User }): void {
    localStorage.setItem(this.tokenKey, session.token);
    localStorage.setItem(this.userKey, JSON.stringify(session.user));
  }

  private authHeaders(): HttpHeaders {
    const token = this.getToken();
    return token ? new HttpHeaders({ Authorization: `Bearer ${token}` }) : new HttpHeaders();
  }
}
