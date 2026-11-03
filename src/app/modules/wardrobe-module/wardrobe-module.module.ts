import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { WardrobeItemFormComponent } from './components/item-form/item-form.component';
import { WardrobeItemPhotoComponent } from './components/item-photo/item-photo.component';
import { WardrobeOutfitCardComponent } from './components/outfit-card/outfit-card.component';
import { WardrobeOutfitPickerComponent } from './components/outfit-picker/outfit-picker.component';
import { WardrobeFormDeactivateGuard } from './guards/wardrobe-form-deactivate.guard';
import { WardrobeApiService } from './services/wardrobe-api.service';
import { WardrobeImageService } from './services/wardrobe-image.service';
import { WardrobeStateService } from './services/wardrobe-state.service';
import { WardrobeModuleRoutingModule } from './wardrobe-module-routing.module';
import { WardrobeModuleComponent } from './wardrobe-module.component';

@NgModule({
  declarations: [
    WardrobeModuleComponent,
    WardrobeItemFormComponent,
    WardrobeItemPhotoComponent,
    WardrobeOutfitCardComponent,
    WardrobeOutfitPickerComponent,
  ],
  imports: [
    CommonModule,
    FormsModule,
    MatIconModule,
    WardrobeModuleRoutingModule,
  ],
  providers: [WardrobeApiService, WardrobeImageService, WardrobeStateService, WardrobeFormDeactivateGuard],
})
export class WardrobeModuleModule {
}
