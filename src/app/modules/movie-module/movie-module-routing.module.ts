import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { MovieModuleComponent } from './movie-module.component';
import { MovieAddComponent } from './components/movie-add/movie-add.component';
import { MovieEditComponent } from './components/movie-edit/movie-edit.component';
import { MovieFormDeactivateGuard } from './guards/movie-form-deactivate.guard';

const routes: Routes = [
  {
    path: '',
    component: MovieModuleComponent,
    data: {
      title: 'КИНО',
    },
  },
  {
    path: 'create',
    component: MovieAddComponent,
    canDeactivate: [MovieFormDeactivateGuard],
    data: {
      title: 'ДОБАВИТЬ ФИЛЬМ',
    },
  },
  {
    path: ':movieId/edit',
    component: MovieEditComponent,
    canDeactivate: [MovieFormDeactivateGuard],
    data: {
      title: 'РЕДАКТИРОВАТЬ ФИЛЬМ',
    },
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class MovieModuleRoutingModule {
}
