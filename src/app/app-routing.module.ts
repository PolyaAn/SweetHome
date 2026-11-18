import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { MainMenuComponent } from "./components/main-menu/main-menu.component";
import { LoginComponent } from "./modules/auth/login/login.component";
import { RegisterComponent } from "./modules/auth/register/register.component";
import type { BooksComponent } from './modules/books-module/books.component';

const routes: Routes = [
  {
    path: 'books',
    loadComponent: () => import('./modules/books-module/books.component').then(m => m.BooksComponent),
    data: { title: 'Книги' },
    canDeactivate: [(component: BooksComponent) => component.canDeactivate()],
  },
  {
    path: 'main',
    component: MainMenuComponent,
    // canActivate: [AuthGuard],
    // children: [
    //   {
    //     path: SalaryContractTabEnum.PAYOUTS,
    //     component: PayoutsListComponent,
    //     canActivate: [AuthGuard],
    //   },
    // ],
  },
  {
    path: 'login',
    component: LoginComponent,
    data: {
      title: 'Авторизация',
    },
  },
  {
    path: 'register',
    component: RegisterComponent,
    data: {
      title: 'Регистрация',
    },
  },
  {
    path: 'profile',
    loadComponent: () => import('./modules/auth/profile/profile.component').then(m => m.ProfileComponent),
    data: { title: 'Профиль' },
  },
  {
    path: 'movie',
    redirectTo: 'movies',
    pathMatch: 'full',
  },
  {
    path: 'movie/add',
    redirectTo: 'movies/create',
    pathMatch: 'full',
  },
  {
    path: 'movie/edit/:id',
    redirectTo: 'movies/:id/edit',
    pathMatch: 'full',
  },
  {
    path: 'movies',
    loadChildren: () =>
      import('./modules/movie-module/movie-module.module').then((m) => m.MovieModuleModule),
  },
  {
    path: 'health-module',
    loadChildren: () =>
      import('./modules/health-module/health-module.module').then((m) => m.HealthModuleModule),
  },
  {
    path: 'home',
    loadChildren: () =>
      import('./modules/home-module/home-module.module').then((m) => m.HomeModuleModule),
  },
  {
    path: 'wardrobe',
    loadChildren: () =>
      import('./modules/wardrobe-module/wardrobe-module.module').then((m) => m.WardrobeModuleModule),
  },
  {
    path: 'finance',
    loadChildren: () =>
      import('./modules/finance-module/finance-module.module').then((m) => m.FinanceModuleModule),
  },
  {
    path: '**',
    redirectTo: 'main',
    pathMatch: 'full',
  },
];

@NgModule({
  imports: [RouterModule.forRoot(routes, {
    scrollPositionRestoration: 'enabled',
    // Отменённая навигация (например, «Выйти без сохранения?» → Отмена) восстанавливает историю браузера,
    // а не затирает предыдущую запись — иначе следующий «Назад» уводит из приложения.
    canceledNavigationResolution: 'computed',
  })],
  exports: [RouterModule],
})
export class AppRoutingModule {
}
