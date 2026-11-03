import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { WardrobeItemFormComponent } from './components/item-form/item-form.component';
import { WardrobeOutfitBuilderComponent } from './components/outfit-builder/outfit-builder.component';
import { WardrobeOutfitPickerComponent } from './components/outfit-picker/outfit-picker.component';
import { WardrobeFormDeactivateGuard } from './guards/wardrobe-form-deactivate.guard';
import { WardrobeModuleComponent } from './wardrobe-module.component';

const routes: Routes = [
  {
    path: '',
    component: WardrobeModuleComponent,
    data: {
      title: 'ГАРДЕРОБ',
    },
  },
  {
    path: 'items/create',
    component: WardrobeItemFormComponent,
    canDeactivate: [WardrobeFormDeactivateGuard],
    data: {
      title: 'НОВАЯ ВЕЩЬ',
    },
  },
  {
    path: 'items/:itemId/edit',
    component: WardrobeItemFormComponent,
    canDeactivate: [WardrobeFormDeactivateGuard],
    data: {
      title: 'ВЕЩЬ',
    },
  },
  {
    path: 'outfits/create',
    component: WardrobeOutfitBuilderComponent,
    canDeactivate: [WardrobeFormDeactivateGuard],
    data: {
      title: 'НОВЫЙ ОБРАЗ',
    },
  },
  {
    path: 'outfits/:outfitId/edit',
    component: WardrobeOutfitBuilderComponent,
    canDeactivate: [WardrobeFormDeactivateGuard],
    data: {
      title: 'ОБРАЗ',
    },
  },
  {
    path: 'outfits/suggest',
    component: WardrobeOutfitPickerComponent,
    data: {
      title: 'ПОДБОР ОБРАЗА',
    },
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class WardrobeModuleRoutingModule {
}
