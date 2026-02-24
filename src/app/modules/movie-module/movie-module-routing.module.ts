import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { MovieModuleComponent } from './movie-module.component';

const routes: Routes = [
  {
    path: '',
    component: MovieModuleComponent,
    data: {
      title: 'Кино',
    },
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class MovieModuleRoutingModule {
}
