import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { MainMenuComponent } from "./components/main-menu/main-menu.component";
import { LoginComponent } from "./modules/auth/login/login.component";
import { RegisterComponent } from "./modules/auth/register/register.component";

const routes: Routes = [
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
    path: '**',
    redirectTo: 'main',
    pathMatch: 'full',
  },
];

@NgModule({
  imports: [RouterModule.forRoot(routes, {scrollPositionRestoration: 'enabled'})],
  exports: [RouterModule],
})
export class AppRoutingModule {
}
