import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { MovieModuleComponent } from './movie-module.component';
import { MovieAddComponent } from "./components/movie-add/movie-add.component";
import { MovieEditComponent } from "./components/movie-edit/movie-edit.component";

const routes: Routes = [
  {
    path: '',
    component: MovieModuleComponent,
    data: {
      title: 'Кино',
    },
  },
  {
    path: 'add',
    component: MovieAddComponent,
    data: {
      title: 'Добавить фильм',
    },
  },
  {
    path: 'edit/:id',
    component: MovieEditComponent,
    data: {
      title: 'Редактировать фильм',
    },
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class MovieModuleRoutingModule {
}
