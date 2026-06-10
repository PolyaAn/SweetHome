import { Component, OnInit } from '@angular/core';
import { take } from 'rxjs';
import { HomeFacadeService } from './services/home-facade.service';

@Component({
  selector: 'app-home-module',
  templateUrl: './home-module.component.html',
  styleUrl: './home-module.component.scss',
})
export class HomeModuleComponent implements OnInit {
  constructor(private facade: HomeFacadeService) {
  }

  ngOnInit(): void {
    this.facade.load()
      .pipe(take(1))
      .subscribe();
  }
}
