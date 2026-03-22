import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MovieModuleComponent } from './movie-module.component';
import { MovieModuleRoutingModule } from './movie-module-routing.module';
import { MovieModuleService } from './services/movie-module.service';
import { MatIconModule } from "@angular/material/icon";
import { MovieAddComponent } from "./components/movie-add/movie-add.component";
import { ReactiveFormsModule } from "@angular/forms";
import { MovieEditComponent } from "./components/movie-edit/movie-edit.component";

@NgModule({
  declarations: [MovieModuleComponent, MovieAddComponent, MovieEditComponent],
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
