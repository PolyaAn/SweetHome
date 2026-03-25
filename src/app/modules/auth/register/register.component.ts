import { ChangeDetectionStrategy, Component } from '@angular/core';
import { CommonModule } from "@angular/common";
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from "@angular/forms";
import { Router } from "@angular/router";
import { AuthService, RegisterResult } from "../services/auth.service";
import { ToastService } from "../../../shared/services/toast.service";

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
  ],
  templateUrl: './register.component.html',
  styleUrl: './register.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RegisterComponent {
  private readonly passwordPattern: RegExp = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{6,}$/;

  constructor(
    private router: Router,
    private authService: AuthService,
    private toastService: ToastService,
  ) {
  }

  form: FormGroup = new FormGroup({
    name: new FormControl('', [Validators.required, Validators.minLength(2)]),
    email: new FormControl('', [Validators.required, Validators.email]),
    password: new FormControl('', [Validators.required, Validators.pattern(this.passwordPattern)]),
    repeatPassword: new FormControl('', [Validators.required, Validators.minLength(6)]),
  });

  submit(): void {
    if (this.form.invalid || !this.passwordsMatch) {
      this.form.markAllAsTouched();
      return;
    }

    this.authService.register(
      this.form.value.name,
      this.form.value.email,
      this.form.value.password,
      this.form.value.repeatPassword,
    ).subscribe((result: RegisterResult) => {
      if (result.isRegistered) {
        this.router.navigate(['/login']);
        return;
      }

      this.toastService.error(result.errorMessage || 'Ошибка регистрации');
    });
  }

  get passwordsMatch(): boolean {
    return this.form.value.password === this.form.value.repeatPassword;
  }

  goToLogin(): void {
    this.router.navigate(['/login']);
  }
}
