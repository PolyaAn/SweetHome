import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { MainMenuComponent } from "./components/main-menu/main-menu.component";
import { LoginComponent } from "./modules/auth/login.component";

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
    path: 'movie',
    loadChildren: () =>
      import('./modules/movie-module/movie-module.module').then((m) => m.MovieModuleModule),
  },
  {
    path: 'health-module',
    loadChildren: () =>
      import('./modules/health-module/health-module.module').then((m) => m.HealthModuleModule),
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
