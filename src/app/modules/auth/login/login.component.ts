import { ChangeDetectionStrategy, Component } from '@angular/core';
import { CommonModule } from "@angular/common";
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from "@angular/forms";
import { Router } from "@angular/router";
import { AuthService, LoginResult } from "../services/auth.service";
import { ToastService } from "../../../shared/services/toast.service";

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
  ],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LoginComponent {
  constructor(
    private router: Router,
    private authService: AuthService,
    private toastService: ToastService,
  ) {
  }

  form: FormGroup = new FormGroup({
    email: new FormControl('user3@example.com', [Validators.required, Validators.email]),
    password: new FormControl('String3.', [Validators.required, Validators.minLength(6)]),
  });

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.authService.login(this.form.value.email, this.form.value.password)
      .subscribe((result: LoginResult) => {
        if (result.isAuth) {
          this.router.navigate(['/main']);
          return;
        }

        this.toastService.error(result.errorMessage || 'Ошибка авторизации');
      });
  }

  goToRegister(): void {
    this.router.navigate(['/register']);
  }
}
