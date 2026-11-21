import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { finalize, timer } from 'rxjs';
import { ToastService } from '../../../shared/services/toast.service';
import { AdminMonitoringComponent } from './admin-monitoring/admin-monitoring.component';
import { AccountProfile, AuthService, RegistrationDecision, RegistrationRequest } from '../services/auth.service';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, AdminMonitoringComponent],
  templateUrl: './profile.component.html',
  styleUrl: './profile.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProfileComponent implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly toast = inject(ToastService);
  private readonly destroyRef = inject(DestroyRef);

  readonly profile = signal<AccountProfile | null>(null);
  readonly loadError = signal<string | null>(null);
  readonly saving = signal<'nickname' | 'password' | null>(null);
  readonly registrationRequests = signal<RegistrationRequest[] | null>(null);
  readonly requestsError = signal<string | null>(null);
  readonly requestsLoading = signal(false);
  readonly reviewingRequest = signal<string | null>(null);

  readonly nicknameForm = new FormGroup({
    name: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.maxLength(256)],
    }),
  });

  readonly passwordForm = new FormGroup({
    currentPassword: new FormControl('', { nonNullable: true, validators: Validators.required }),
    newPassword: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.minLength(6)],
    }),
    confirmPassword: new FormControl('', { nonNullable: true, validators: Validators.required }),
  });

  ngOnInit(): void {
    this.loadProfile();
    timer(30_000, 30_000).pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {
      if (this.profile()?.isAdmin) {
        this.loadRegistrationRequests();
      }
    });
  }

  loadProfile(): void {
    this.loadError.set(null);
    this.auth.getProfile().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: profile => {
        this.nicknameForm.reset({ name: profile.name });
        this.profile.set(profile);
        if (profile.isAdmin) {
          this.loadRegistrationRequests();
        }
      },
      error: error => this.loadError.set(this.auth.extractErrorMessage(error, 'Не удалось загрузить профиль.')),
    });
  }

  loadRegistrationRequests(): void {
    if (!this.profile()?.isAdmin || this.requestsLoading() || this.reviewingRequest()) {
      return;
    }

    this.requestsLoading.set(true);
    this.auth.getRegistrationRequests().pipe(
      takeUntilDestroyed(this.destroyRef),
      finalize(() => this.requestsLoading.set(false)),
    ).subscribe({
      next: requests => {
        this.requestsError.set(null);
        this.registrationRequests.set(requests);
      },
      error: error => this.requestsError.set(
        this.auth.extractErrorMessage(error, 'Не удалось загрузить заявки.'),
      ),
    });
  }

  reviewRegistration(request: RegistrationRequest, decision: RegistrationDecision): void {
    if (this.requestsLoading() || this.reviewingRequest()) {
      return;
    }

    this.reviewingRequest.set(request.id);
    this.auth.reviewRegistration(request.id, decision).pipe(
      takeUntilDestroyed(this.destroyRef),
      finalize(() => this.reviewingRequest.set(null)),
    ).subscribe({
      next: () => {
        this.removeRegistrationRequest(request.id);
        this.toast.success(decision === 'Approved' ? 'Заявка одобрена' : 'Заявка отклонена');
      },
      error: error => {
        if (error.status === 404 || error.status === 409) {
          this.removeRegistrationRequest(request.id);
        }
        this.toast.error(this.auth.extractErrorMessage(error, 'Не удалось обработать заявку.'));
      },
    });
  }

  private removeRegistrationRequest(id: string): void {
    this.registrationRequests.update(requests => requests?.filter(request => request.id !== id) ?? null);
  }

  get canSaveNickname(): boolean {
    const name = this.nicknameForm.controls.name.value.trim();
    return this.nicknameForm.valid && !!name && name !== this.profile()?.name;
  }

  get passwordsMatch(): boolean {
    const { newPassword, confirmPassword } = this.passwordForm.getRawValue();
    return newPassword === confirmPassword;
  }

  saveNickname(): void {
    if (this.saving() || !this.canSaveNickname) {
      return;
    }

    const name = this.nicknameForm.controls.name.value.trim();
    this.saving.set('nickname');
    this.auth.updateNickname(name).pipe(
      takeUntilDestroyed(this.destroyRef),
      finalize(() => this.saving.set(null)),
    ).subscribe({
      next: profile => {
        this.nicknameForm.reset({ name: profile.name });
        this.profile.set(profile);
        this.toast.success('Ник сохранён');
      },
      error: error => this.toast.error(this.auth.extractErrorMessage(error, 'Не удалось сохранить ник.')),
    });
  }

  savePassword(): void {
    if (this.saving() || this.passwordForm.invalid || !this.passwordsMatch) {
      return;
    }

    const { currentPassword, newPassword } = this.passwordForm.getRawValue();
    this.saving.set('password');
    this.auth.changePassword(currentPassword, newPassword).pipe(
      takeUntilDestroyed(this.destroyRef),
      finalize(() => this.saving.set(null)),
    ).subscribe({
      next: () => {
        this.passwordForm.reset();
        this.toast.success('Пароль изменён');
      },
      error: error => this.toast.error(this.auth.extractErrorMessage(error, 'Не удалось изменить пароль.')),
    });
  }
}
