import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css'],
})
export class LoginComponent {
  form: FormGroup;
  loading = false;
  error = '';

  constructor(private fb: FormBuilder, private auth: AuthService) {
    if (this.auth.isLoggedIn()) {
      this.auth.redirectByRole();
    }

    this.form = this.fb.group({
      role: ['customer', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]],
    });
  }

  submit(): void {
    if (this.form.invalid) {
      this.error = 'Enter a valid role, email, and password.';
      return;
    }

    const { role, email, password } = this.form.value;
    this.loading = true;
    this.error = '';

    this.auth.login(role, email, password).subscribe({
      next: () => {
        this.loading = false;
        this.auth.redirectByRole();
      },
      error: (response) => {
        this.loading = false;
        this.error = response.error?.message || 'Login failed.';
      },
    });
  }
}
