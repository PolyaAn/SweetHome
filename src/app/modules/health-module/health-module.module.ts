import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HealthModuleComponent } from './health-module.component';
import { HealthModuleRoutingModule } from './health-module-routing.module';
import { HealthModuleService } from './services/health-module.service';
import { CalendarComponent } from "../../shared/components/calendar/calendar.component";

@NgModule({
  declarations: [HealthModuleComponent],
  imports: [
    CommonModule,
    HealthModuleRoutingModule,
    CalendarComponent,
  ],
  providers: [HealthModuleService],
})
export class HealthModuleModule {
}
