import { ChangeDetectionStrategy, Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
import { CommonModule } from "@angular/common";

export interface CalendarDay {
  date: Date;
  day: number;
  iso: string;
  inCurrentMonth: boolean;
}

@Component({
  selector: 'app-calendar',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './calendar.component.html',
  styleUrl: './calendar.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CalendarComponent implements OnChanges {
  @Input() selectedDate: string = '';
  @Input() theme: 'dark' | 'light' = 'dark';
  @Input() noFrame: boolean = false;

  @Output() selectedDateChange: EventEmitter<string> = new EventEmitter<string>();

  displayedMonth: Date = new Date();
  calendarDays: CalendarDay[] = [];
  readonly weekDays: string[] = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
  readonly monthNames: string[] = [
    'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
    'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь',
  ];
  readonly monthNamesGenitive: string[] = [
    'января', 'февраля', 'марта', 'апреля', 'мая', 'июня',
    'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря',
  ];

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['selectedDate']) {
      const parsed: Date = this.parseIsoDate(this.selectedDate);
      this.displayedMonth = this.startOfMonth(parsed);
      this.buildCalendar();
    }
  }

  get monthLabel(): string {
    return `${this.monthNames[this.displayedMonth.getMonth()]} ${this.displayedMonth.getFullYear()}`;
  }

  prevMonth(): void {
    this.displayedMonth = new Date(this.displayedMonth.getFullYear(), this.displayedMonth.getMonth() - 1, 1);
    this.buildCalendar();
  }

  nextMonth(): void {
    this.displayedMonth = new Date(this.displayedMonth.getFullYear(), this.displayedMonth.getMonth() + 1, 1);
    this.buildCalendar();
  }

  selectDate(day: CalendarDay): void {
    this.selectedDate = day.iso;
    this.displayedMonth = this.startOfMonth(day.date);
    this.buildCalendar();
    this.selectedDateChange.emit(day.iso);
  }

  trackByCalendarDate(_: number, day: CalendarDay): string {
    return day.iso;
  }

  get isLightTheme(): boolean {
    return this.theme === 'light';
  }

  private buildCalendar(): void {
    const year: number = this.displayedMonth.getFullYear();
    const month: number = this.displayedMonth.getMonth();
    const firstDayOfMonth: Date = new Date(year, month, 1);
    const startOffset: number = (firstDayOfMonth.getDay() + 6) % 7;
    const startDate: Date = new Date(year, month, 1 - startOffset);

    this.calendarDays = Array.from({length: 42}, (_, index: number) => {
      const date: Date = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate() + index);
      return {
        date,
        day: date.getDate(),
        iso: this.toIsoDate(date),
        inCurrentMonth: date.getMonth() === month,
      };
    });
  }

  private toIsoDate(date: Date): string {
    const year: number = date.getFullYear();
    const month: string = String(date.getMonth() + 1).padStart(2, '0');
    const day: string = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  private parseIsoDate(value: string): Date {
    const date: Date = new Date(`${value}T00:00:00`);
    return Number.isNaN(date.getTime()) ? new Date() : date;
  }

  private startOfMonth(date: Date): Date {
    return new Date(date.getFullYear(), date.getMonth(), 1);
  }
}
