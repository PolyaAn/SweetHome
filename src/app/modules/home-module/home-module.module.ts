import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { HomeModuleRoutingModule } from './home-module-routing.module';
import { HomeModuleComponent } from './home-module.component';
import { HomePageComponent } from './components/home-page/home-page.component';
import { RoomsPageComponent } from './components/rooms-page/rooms-page.component';
import { RoomPageComponent } from './components/room-page/room-page.component';
import { RoomFormPageComponent } from './components/room-form-page/room-form-page.component';
import { RoomDevicesPageComponent } from './components/room-devices-page/room-devices-page.component';
import { CatalogAddPageComponent } from './components/catalog-add-page/catalog-add-page.component';
import { UnsupportedPageComponent } from './components/unsupported-page/unsupported-page.component';
import { AllWidgetsPageComponent } from './components/all-widgets-page/all-widgets-page.component';
import { SmartHomeFeaturePageComponent } from './components/smart-home-feature-page/smart-home-feature-page.component';
import { HomeApiService } from './services/home-api.service';
import { HomeFacadeService } from './services/home-facade.service';
import { HomeRealtimeService } from './services/home-realtime.service';

@NgModule({
  declarations: [
    HomeModuleComponent,
    HomePageComponent,
    RoomsPageComponent,
    RoomPageComponent,
    RoomFormPageComponent,
    RoomDevicesPageComponent,
    CatalogAddPageComponent,
    UnsupportedPageComponent,
    AllWidgetsPageComponent,
    SmartHomeFeaturePageComponent,
  ],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatIconModule,
    HomeModuleRoutingModule,
  ],
  providers: [
    HomeApiService,
    HomeFacadeService,
    HomeRealtimeService,
  ],
})
export class HomeModuleModule {
}
