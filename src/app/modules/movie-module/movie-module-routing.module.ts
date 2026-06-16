import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { FriendMoviesComponent } from './components/friend-movies/friend-movies.component';
import { MovieAddComponent } from './components/movie-add/movie-add.component';
import { MovieEditComponent } from './components/movie-edit/movie-edit.component';
import { MovieFriendsComponent } from './components/movie-friends/movie-friends.component';
import { MovieFormDeactivateGuard } from './guards/movie-form-deactivate.guard';
import { MovieModuleComponent } from './movie-module.component';

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
    path: 'friends',
    component: MovieFriendsComponent,
    data: {
      title: 'ДРУЗЬЯ',
    },
  },
  {
    path: 'friends/:friendUserId',
    component: FriendMoviesComponent,
    data: {
      title: 'ФИЛЬМЫ ДРУГА',
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
