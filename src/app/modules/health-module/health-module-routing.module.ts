import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { HealthModuleComponent } from './health-module.component';

const routes: Routes = [
  {
    path: '',
    component: HealthModuleComponent,
    data: {
      title: 'Здоровье',
    },
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class HealthModuleRoutingModule {
}
