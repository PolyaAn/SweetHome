import { ChangeDetectionStrategy, ChangeDetectorRef, Component, HostListener, OnInit } from '@angular/core';
import { MainManuService } from "./services/main-manu.service";
import { MainWidget, MoveEnum } from "./models/main-menu.model";
import { BaseComponent } from "../base/base.component";
import { takeUntil } from "rxjs";
import { AsyncPipe, JsonPipe, NgClass, NgForOf, NgIf } from "@angular/common";
import { MatIcon } from "@angular/material/icon";
import { SharedService } from "../../shared/services/shared.service";
import { NewWidgetModalComponent } from "../../shared/components/modals/new-widget-modal/new-widget-modal.component";
import { MainInfoComponent } from "./components/main-info/main-info.component";
import { Router } from "@angular/router";

@Component({
  selector: 'app-main-menu',
  standalone: true,
  imports: [
    NgIf,
    NgForOf,
    NgClass,
    MatIcon,
    AsyncPipe,
    JsonPipe,
    MainInfoComponent
  ],
  templateUrl: './main-menu.component.html',
  styleUrl: './main-menu.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MainMenuComponent extends BaseComponent implements OnInit {
  constructor(
    public mms: MainManuService,
    private cdr: ChangeDetectorRef,
    private ss: SharedService,
    private router: Router,
  ) {
    super();
  }

  editMode: boolean = false;
  hiddenWidgets: boolean = false;
  isPhoneView: boolean = false;
  mobileTab: 'menu' | 'info' = 'menu';
  readonly MoveEnum = MoveEnum;

  ngOnInit(): void {
    this.updateViewportMode();
    this.getWidgets();
    this.editWatcher();
    this.mainWidgetsWatcher();
  }

  @HostListener('window:resize')
  onResize(): void {
    this.updateViewportMode();
  }

  private updateViewportMode(): void {
    const isPhone: boolean = window.innerWidth < 768;
    if (this.isPhoneView !== isPhone) {
      this.isPhoneView = isPhone;
      if (!isPhone) {
        this.mobileTab = 'menu';
      }
      this.cdr.detectChanges();
    }
  }

  private getWidgets(): void {
    this.mms.getWidgets()
      .pipe(takeUntil(this.unsubscribe$))
      .subscribe({
        next: () => {
        },
        error: () => {
        },
      });
  }

  private mainWidgetsWatcher(): void {
    this.mms.mainWidgets$
      .pipe(takeUntil(this.unsubscribe$))
      .subscribe({
        next: (widgets: MainWidget[]) => {
          this.hiddenWidgets = !!widgets.filter((w: MainWidget) => w.hide).length;
          this.cdr.detectChanges();
        },
        error: () => {
        },
      });
  }

  private editWatcher(): void {
    this.mms.editMainPage$
      .pipe(takeUntil(this.unsubscribe$))
      .subscribe({
        next: (edit) => {
          this.editMode = edit;
          this.cdr.detectChanges();
        },
        error: () => {
        },
      });
  }

  move(position: MoveEnum, widget: MainWidget): void {
    const mainWidgets: MainWidget[] = this.ss.getValue(
      this.mms.mainWidgets$.value
        .filter((w: MainWidget) => !w.hide)
        .sort((a: MainWidget, b: MainWidget) => a.order - b.order)
    );
    const widgetIndex: number = mainWidgets.findIndex((w) => w.id === widget.id);
    const swapIndex: number = position === MoveEnum.LEFT ? widgetIndex - 1 : widgetIndex + 1;
    mainWidgets[widgetIndex].order = mainWidgets[swapIndex].order;
    mainWidgets[swapIndex].order = widget.order;
    console.log(mainWidgets);
    this.mms.mainWidgets$.next(mainWidgets);
  }

  hide(widget: MainWidget): void {
    const mainWidgets: MainWidget[] = this.ss.getValue(this.mms.mainWidgets$.value)
      .map((w: MainWidget) => {
        if (w.id === widget.id) {
          w.hide = !w.hide;
        }
        return w;
      });

    this.mms.mainWidgets$.next(mainWidgets);
  }

  changeSize(widget: MainWidget): void {
    const widgets: MainWidget[] = this.mms.mainWidgets$.value;
    widgets.map((w: MainWidget) => {
      if (w.id === widget.id) {
        w.size = w.size === 3 ? 1 : w.size + 1;
      }
      return w;
    });
    this.mms.mainWidgets$.next(widgets);
  }

  openAddWidgetModal(): void {
    this.ss.openDialog<NewWidgetModalComponent, {}>(NewWidgetModalComponent, {});
  }

  saveChanges(): void {
    this.mms.setWidgets()
      .pipe(takeUntil(this.unsubscribe$))
      .subscribe({
        next: () => {
          this.mms.editMainPage$.next(false);
        },
        error: () => {
          this.mms.editMainPage$.next(false);
        },
      });
  }

  setMobileTab(tab: 'menu' | 'info'): void {
    this.mobileTab = tab;
  }

  openWidget(widget: MainWidget): void {
    if (this.editMode) {
      return;
    }

    if (widget.id === 'health') {
      this.router.navigate(['/health-module']);
    }
  }
}
