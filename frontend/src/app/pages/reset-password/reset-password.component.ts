import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-reset-password',
  templateUrl: './reset-password.component.html',
  styleUrls: ['./reset-password.component.css'],
})
export class ResetPasswordComponent {
  form: FormGroup;
  loading = false;
  error = '';
  success = '';

  constructor(private fb: FormBuilder, private auth: AuthService, private router: Router) {
    this.form = this.fb.group({
      role: ['customer', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      phone: [''],
      newPassword: ['', [Validators.required, Validators.minLength(8)]],
      confirmPassword: ['', Validators.required],
    });
  }

  submit(): void {
    const { role, email, phone, newPassword, confirmPassword } = this.form.value;
    if (newPassword !== confirmPassword) {
      this.error = 'Passwords must match.';
      return;
    }

    if (role !== 'admin' && !phone) {
      this.error = 'Phone verification is required for customer and provider resets.';
      return;
    }

    this.loading = true;
    this.error = '';
    this.success = '';

    this.auth.resetPassword({ role, email, phone, newPassword }).subscribe({
      next: (response) => {
        this.loading = false;
        this.success = response.message || 'Password reset complete.';
        setTimeout(() => this.router.navigate(['/login']), 1400);
      },
      error: (response) => {
        this.loading = false;
        this.error = response.error?.message || 'Reset failed.';
      },
    });
  }
}
