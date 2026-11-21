import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize, timer } from 'rxjs';
import { environment } from '../../../../../environments/environment';

interface MonitoringOverview {
  day: string;
  updatedAt: string;
  dau: number;
  mau: number;
  sections: { section: string; users: number; visits: number }[];
  activeToday: { id: string; name: string | null; lastSeenAt: string }[];
  errors: {
    id: number;
    occurredAt: string;
    statusCode: number;
    method: string;
    route: string;
    exceptionType: string | null;
    traceId: string;
  }[];
}

@Component({
  selector: 'app-admin-monitoring',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './admin-monitoring.component.html',
  styleUrl: './admin-monitoring.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminMonitoringComponent implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly destroyRef = inject(DestroyRef);

  readonly overview = signal<MonitoringOverview | null>(null);
  readonly loading = signal(false);
  readonly loadError = signal(false);
  readonly moscowTime = '+0300';
  readonly sectionNames: Record<string, string> = {
    main: 'Главная',
    home: 'Умный дом',
    health: 'Здоровье',
    movies: 'Кино',
    wardrobe: 'Гардероб',
    finance: 'Финансы',
    books: 'Книги',
    profile: 'Профиль',
  };

  ngOnInit(): void {
    timer(0, 30_000).pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => this.refresh());
  }

  refresh(): void {
    if (this.loading()) {
      return;
    }

    this.loading.set(true);
    this.http.get<MonitoringOverview>(`${environment.apiHost}/api/Admin/Monitoring`).pipe(
      takeUntilDestroyed(this.destroyRef),
      finalize(() => this.loading.set(false)),
    ).subscribe({
      next: overview => {
        this.overview.set(overview);
        this.loadError.set(false);
      },
      error: () => this.loadError.set(true),
    });
  }
}
