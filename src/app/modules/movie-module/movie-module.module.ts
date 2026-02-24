import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MovieModuleComponent } from './movie-module.component';
import { MovieModuleRoutingModule } from './movie-module-routing.module';
import { MovieModuleService } from './services/movie-module.service';
import { MatIconModule } from "@angular/material/icon";

@NgModule({
  declarations: [MovieModuleComponent],
  imports: [
    CommonModule,
    MovieModuleRoutingModule,
    MatIconModule,
  ],
  providers: [MovieModuleService],
})
export class MovieModuleModule {
}
