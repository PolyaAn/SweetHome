import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MovieModuleComponent } from './movie-module.component';
import { MovieModuleRoutingModule } from './movie-module-routing.module';
import { MovieModuleService } from './services/movie-module.service';
import { MatIconModule } from "@angular/material/icon";
import { MovieAddComponent } from "./movie-add.component";
import { ReactiveFormsModule } from "@angular/forms";

@NgModule({
  declarations: [MovieModuleComponent, MovieAddComponent],
  imports: [
    CommonModule,
    MovieModuleRoutingModule,
    MatIconModule,
    ReactiveFormsModule,
  ],
  providers: [MovieModuleService],
})
export class MovieModuleModule {
}
