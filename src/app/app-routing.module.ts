import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { MainMenuComponent } from "./components/main-menu/main-menu.component";

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
    path: 'movie',
    redirectTo: 'main',
    pathMatch: 'full',
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
