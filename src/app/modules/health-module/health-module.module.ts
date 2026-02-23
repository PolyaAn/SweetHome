import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HealthModuleComponent } from './health-module.component';
import { HealthModuleRoutingModule } from './health-module-routing.module';

@NgModule({
  declarations: [HealthModuleComponent],
  imports: [
    CommonModule,
    HealthModuleRoutingModule,
  ],
})
export class HealthModuleModule {
}
