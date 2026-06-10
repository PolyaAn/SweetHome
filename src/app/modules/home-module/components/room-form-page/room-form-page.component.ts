import { ChangeDetectionStrategy, Component, OnInit } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { combineLatest, map, Observable, take, tap } from 'rxjs';
import { RoomVm, SmartHomeRoom } from '../../models/home.model';
import { HomeFacadeService } from '../../services/home-facade.service';

type RoomForm = FormGroup<{
  name: FormControl<string>;
  icon: FormControl<string>;
  order: FormControl<number>;
  hide: FormControl<boolean>;
}>;

@Component({
  selector: 'app-room-form-page',
  templateUrl: './room-form-page.component.html',
  styleUrl: './room-form-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RoomFormPageComponent implements OnInit {
  readonly icons = ['meeting_room', 'kitchen', 'chair', 'bed', 'bathtub', 'desktop_windows', 'child_care', 'checkroom'];
  readonly form: RoomForm = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.maxLength(50)]],
    icon: ['meeting_room', Validators.required],
    order: [1, [Validators.required, Validators.min(0)]],
    hide: [false],
  });

  mode: 'create' | 'edit' = 'create';
  roomId: string | null = null;
  private formPatched = false;
  readonly room$: Observable<RoomVm | null> = combineLatest([
    this.route.paramMap,
    this.facade.dashboard$,
  ]).pipe(
    map(([params, dashboard]) => {
      const roomId = params.get('roomId');
      return dashboard.rooms.find((room) => room.id === roomId) ?? null;
    }),
    tap((room) => {
      if (this.mode === 'edit' && room && !this.formPatched) {
        this.form.setValue({
          name: room.name,
          icon: room.icon,
          order: room.order,
          hide: room.hide,
        });
        this.formPatched = true;
      }
    }),
  );

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private facade: HomeFacadeService,
  ) {
  }

  ngOnInit(): void {
    this.mode = this.route.snapshot.data['mode'] === 'edit' ? 'edit' : 'create';
    this.roomId = this.route.snapshot.paramMap.get('roomId');

    this.room$.pipe(take(1)).subscribe();
  }

  save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const value = this.form.getRawValue();
    const request = this.mode === 'edit' && this.roomId
      ? this.facade.updateRoom({
        id: this.roomId,
        name: value.name,
        icon: value.icon,
        order: value.order,
        hide: value.hide,
      })
      : this.facade.createRoom(value.name, value.icon);

    request.pipe(take(1)).subscribe(() => {
      this.router.navigate(['/home/rooms']);
    });
  }

  deleteRoom(): void {
    if (!this.roomId) {
      return;
    }

    this.facade.deleteRoom(this.roomId)
      .pipe(take(1))
      .subscribe(() => {
        this.router.navigate(['/home/rooms']);
      });
  }

  asRoom(): SmartHomeRoom | null {
    if (!this.roomId) {
      return null;
    }

    const value = this.form.getRawValue();
    return {
      id: this.roomId,
      name: value.name,
      icon: value.icon,
      order: value.order,
      hide: value.hide,
    };
  }
}
