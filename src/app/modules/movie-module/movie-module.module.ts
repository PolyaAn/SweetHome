import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MovieModuleComponent } from './movie-module.component';
import { MovieModuleRoutingModule } from './movie-module-routing.module';
import { MovieModuleService } from './services/movie-module.service';
import { MovieAddComponent } from './components/movie-add/movie-add.component';
import { MovieEditComponent } from './components/movie-edit/movie-edit.component';
import { MovieFormDeactivateGuard } from './guards/movie-form-deactivate.guard';

@NgModule({
  declarations: [MovieModuleComponent, MovieAddComponent, MovieEditComponent],
  imports: [
    CommonModule,
    MovieModuleRoutingModule,
    MatIconModule,
    ReactiveFormsModule,
  ],
  providers: [MovieModuleService, MovieFormDeactivateGuard],
})
export class MovieModuleModule {
}
