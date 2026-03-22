import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { MovieModuleComponent } from './movie-module.component';
import { MovieAddComponent } from "./movie-add.component";

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
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class MovieModuleRoutingModule {
}
