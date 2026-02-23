import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { MainManuService } from "../main-menu/services/main-manu.service";
import { BaseComponent } from "../base/base.component";
import { filter, takeUntil } from "rxjs";
import { UserInfo } from "../main-menu/models/main-menu.model";
import { MatIcon } from "@angular/material/icon";
import { NgIf } from "@angular/common";
import { Location } from "@angular/common";
import { NavigationEnd, Router } from "@angular/router";

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [
    MatIcon,
    NgIf
  ],
  templateUrl: './header.component.html',
  styleUrl: './header.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HeaderComponent extends BaseComponent implements OnInit {
  constructor(
    private mms: MainManuService,
    private router: Router,
    private location: Location,
    private cdr: ChangeDetectorRef,
  ) {
    super();
  }

  user: UserInfo | undefined;
  isMainPage: boolean = false;

  ngOnInit(): void {
    this.isMainPage = this.router.url.startsWith('/main');
    this.routeWatcher();
    this.getUserInfo();
  }

  private getUserInfo(): void {
    this.mms.getUserInfo()
      .pipe(takeUntil(this.unsubscribe$))
      .subscribe({
        next: (user: UserInfo) => {
          this.user = user;
          this.cdr.markForCheck();
        },
        error: () => {
        },
      });
  }

  private routeWatcher(): void {
    this.router.events
      .pipe(
        filter((event) => event instanceof NavigationEnd),
        takeUntil(this.unsubscribe$)
      )
      .subscribe({
        next: () => {
          this.isMainPage = this.router.url.startsWith('/main');
          this.cdr.markForCheck();
        },
      });
  }

  editMainPage(): void {
    this.mms.editMainPage(true);
  }

  goBack(): void {
    this.location.back();
  }
}
