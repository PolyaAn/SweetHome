import { ChangeDetectionStrategy, Component, OnInit } from '@angular/core';
import { MainManuService } from "../../../../components/main-menu/services/main-manu.service";
import { BaseComponent } from "../../../../components/base/base.component";
import { MatDialogContent, MatDialogRef, MatDialogTitle } from "@angular/material/dialog";
import { AsyncPipe, NgForOf, NgIf } from "@angular/common";
import { MainWidget } from "../../../../components/main-menu/models/main-menu.model";
import { SharedService } from "../../../services/shared.service";
import { MatCheckbox } from "@angular/material/checkbox";
import { MatButton } from "@angular/material/button";
import { CdkTrapFocus } from "@angular/cdk/a11y";

@Component({
  selector: 'app-new-widget-modal',
  standalone: true,
  imports: [
    MatDialogTitle,
    MatDialogContent,
    NgForOf,
    NgIf,
    AsyncPipe,
    MatCheckbox,
    MatButton,
    CdkTrapFocus
  ],
  templateUrl: './new-widget-modal.component.html',
  styleUrl: './new-widget-modal.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NewWidgetModalComponent extends BaseComponent implements OnInit {
  constructor(
    public mms: MainManuService,
    public ss: SharedService,
    public dialogRef: MatDialogRef<NewWidgetModalComponent>
  ) {
    super();
  }

  defaultHiddenWidgets: MainWidget[] = [];
  changedWidgetsHidden: MainWidget[] = [];

  ngOnInit(): void {
    this.defaultHiddenWidgets = this.ss.getValue(this.mms.mainWidgets$.value).filter((widget) => widget.hide);
    this.changedWidgetsHidden = this.ss.getValue(this.mms.mainWidgets$.value);
  }

  //  среди всех виджетов ищем тот, который ранее был скрыт, и меняем его видимость
  setWidgetView(checked: boolean, widget: MainWidget): void {
    const changedWidget: MainWidget | undefined = this.changedWidgetsHidden.find((w: MainWidget) => w.id === widget.id);
    if (changedWidget) {
      changedWidget.hide = !checked;
    }
  }

  saveWidgetsHide(): void {
    this.mms.mainWidgets$.next(this.changedWidgetsHidden);
    this.close();
  }

  close(): void {
    this.dialogRef.close();
  }
}
