import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { BaseComponent } from "../../components/base/base.component";
import { Health, HealthDictionary, HealthSection } from "./models/health.model";
import { DefaultHealth, HealthSectionsMock } from "./mocks/health.mock";
import { HealthModuleService } from "./services/health-module.service";
import { takeUntil } from "rxjs";
import { SharedService } from "../../shared/services/shared.service";

@Component({
  selector: 'app-health-module',
  templateUrl: './health-module.component.html',
  styleUrl: './health-module.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HealthModuleComponent extends BaseComponent implements OnInit {
  constructor(
    private hs: HealthModuleService,
    private cdr: ChangeDetectorRef,
    private ss: SharedService,
  ) {
    super();
  }

  readonly sections: HealthSection[] = HealthSectionsMock
    .filter((section: HealthSection) => !section.hide)
    .sort((a: HealthSection, b: HealthSection) => a.order - b.order);
  draftHealth: Health | null = null;
  editingSectionId: string | null = null;
  selectedDate: string = this.toIsoDate(new Date());
  isPhone: boolean = this.ss.isPhone;

  ngOnInit(): void {
    this.loadHealthInfo(this.selectedDate);
  }

  get formattedSelectedDate(): string {
    const date: Date = new Date(`${this.selectedDate}T00:00:00`);
    if (Number.isNaN(date.getTime())) {
      return this.selectedDate;
    }
    const monthName: string = date.toLocaleString('ru-RU', {month: 'long'});
    return `${date.getDate()} ${monthName} ${date.getFullYear()}`;
  }

  onDateSelect(date: string): void {
    this.selectedDate = date;
    this.loadHealthInfo(this.selectedDate);
  }

  private loadHealthInfo(date: string): void {
    this.hs.getHealthInfo(date)
      .pipe(takeUntil(this.unsubscribe$))
      .subscribe({
        next: (health: Health) => {
          this.draftHealth = this.cloneHealth(health);
          this.cdr.markForCheck();
        },
      });
  }

  getSectionDictionary(sectionId: string): HealthDictionary[] {
    if (!this.draftHealth) {
      return [];
    }

    return this.draftHealth.healthDictionary.filter((item: HealthDictionary) => item.healthSection === sectionId);
  }

  getSectionValue(sectionId: string): string | null {
    if (!this.draftHealth) {
      return null;
    }

    if (sectionId === 'weight') {
      return this.draftHealth.weight || null;
    }
    if (sectionId === 'blood-pressure') {
      return this.draftHealth.bloodPressure || null;
    }
    if (sectionId === 'blood-sugar') {
      return this.draftHealth.bloodSugar || null;
    }
    if (sectionId === 'water') {
      return this.draftHealth.water || null;
    }
    if (sectionId === 'temperature') {
      return this.draftHealth.temperature || null;
    }
    if (sectionId === 'monthlies') {
      return this.draftHealth.monthlies ? 'Да' : 'Нет';
    }

    return null;
  }

  startEdit(sectionId: string): void {
    this.editingSectionId = sectionId;
  }

  isEditing(sectionId: string): boolean {
    return this.editingSectionId === sectionId;
  }

  toggleDictionaryValue(itemId: string): void {
    if (!this.draftHealth) {
      return;
    }

    this.draftHealth = {
      ...this.draftHealth,
      healthDictionary: this.draftHealth.healthDictionary.map((item: HealthDictionary) => {
        if (item.id === itemId) {
          return {
            ...item,
            value: !item.value,
          };
        }
        return item;
      }),
    };
  }

  setFieldValue(sectionId: string, value: string): void {
    if (!this.draftHealth) {
      return;
    }

    const trimmedValue: string = value.trim();
    if (sectionId === 'weight') {
      this.draftHealth = {...this.draftHealth, weight: trimmedValue};
    }
    if (sectionId === 'blood-pressure') {
      this.draftHealth = {...this.draftHealth, bloodPressure: trimmedValue};
    }
    if (sectionId === 'blood-sugar') {
      this.draftHealth = {...this.draftHealth, bloodSugar: trimmedValue};
    }
    if (sectionId === 'water') {
      this.draftHealth = {...this.draftHealth, water: trimmedValue};
    }
    if (sectionId === 'temperature') {
      this.draftHealth = {...this.draftHealth, temperature: trimmedValue};
    }
  }

  setMonthlies(value: boolean): void {
    if (!this.draftHealth) {
      return;
    }
    this.draftHealth = {
      ...this.draftHealth,
      monthlies: value,
    };
  }

  save(): void {
    if (!this.draftHealth) {
      return;
    }

    this.hs.setHealthInfo(this.draftHealth)
      .pipe(takeUntil(this.unsubscribe$))
      .subscribe({
        next: (health: Health) => {
          this.draftHealth = this.cloneHealth(health);
          this.editingSectionId = null;
          this.cdr.markForCheck();
        },
      });
  }

  cancel(): void {
    this.draftHealth = this.cloneHealth(this.hs.healthInfo$.value);
    this.editingSectionId = null;
  }

  clear(): void {
    this.draftHealth = this.cloneHealth(DefaultHealth);
    this.editingSectionId = null;
  }

  trackBySectionId(_: number, section: HealthSection): string {
    return section.id;
  }

  trackByDictionaryId(_: number, item: HealthDictionary): string {
    return item.id;
  }

  private cloneHealth(health: Health): Health {
    return JSON.parse(JSON.stringify(health));
  }

  private toIsoDate(date: Date): string {
    const year: number = date.getFullYear();
    const month: string = String(date.getMonth() + 1).padStart(2, '0');
    const day: string = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
}
