import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { HomeModuleComponent } from './home-module.component';
import { HomePageComponent } from './components/home-page/home-page.component';
import { RoomsPageComponent } from './components/rooms-page/rooms-page.component';
import { RoomPageComponent } from './components/room-page/room-page.component';
import { RoomFormPageComponent } from './components/room-form-page/room-form-page.component';
import { RoomDevicesPageComponent } from './components/room-devices-page/room-devices-page.component';
import { CatalogAddPageComponent } from './components/catalog-add-page/catalog-add-page.component';
import { AllWidgetsPageComponent } from './components/all-widgets-page/all-widgets-page.component';
import { SmartHomeFeaturePageComponent } from './components/smart-home-feature-page/smart-home-feature-page.component';

const routes: Routes = [
  {
    path: '',
    component: HomeModuleComponent,
    children: [
      {
        path: '',
        component: HomePageComponent,
        data: {title: 'Дом'},
      },
      {
        path: 'rooms',
        component: RoomsPageComponent,
        data: {title: 'Комнаты'},
      },
      {
        path: 'devices',
        component: AllWidgetsPageComponent,
        data: {title: 'Устройства', kind: 'device'},
      },
      {
        path: 'devices/add',
        component: CatalogAddPageComponent,
        data: {title: 'Добавить устройство', kind: 'device'},
      },
      {
        path: 'sensors',
        component: AllWidgetsPageComponent,
        data: {title: 'Датчики', kind: 'sensor'},
      },
      {
        path: 'sensors/add',
        component: CatalogAddPageComponent,
        data: {title: 'Добавить датчик', kind: 'sensor'},
      },
      {
        path: 'rooms/create',
        component: RoomFormPageComponent,
        data: {title: 'Создание комнаты', mode: 'create'},
      },
      {
        path: 'rooms/:roomId',
        component: RoomPageComponent,
        data: {title: 'Комната'},
      },
      {
        path: 'rooms/:roomId/settings',
        component: RoomFormPageComponent,
        data: {title: 'Настройки комнаты', mode: 'edit'},
      },
      {
        path: 'rooms/:roomId/devices',
        component: RoomDevicesPageComponent,
        data: {title: 'Устройства и датчики'},
      },
      {
        path: 'rooms/:roomId/devices/add',
        component: CatalogAddPageComponent,
        data: {title: 'Добавить устройство', kind: 'device'},
      },
      {
        path: 'rooms/:roomId/sensors/add',
        component: CatalogAddPageComponent,
        data: {title: 'Добавить датчик', kind: 'sensor'},
      },
      {
        path: 'rooms/:roomId/devices/:deviceId/setup',
        component: CatalogAddPageComponent,
        data: {title: 'Настройка устройства', kind: 'device', setup: true},
      },
      {
        path: 'rooms/:roomId/sensors/:sensorId/setup',
        component: CatalogAddPageComponent,
        data: {title: 'Настройка датчика', kind: 'sensor', setup: true},
      },
      {
        path: 'scenarios',
        component: SmartHomeFeaturePageComponent,
        data: {title: 'Сценарии', feature: 'scenarios'},
      },
      {
        path: 'scenarios/create',
        component: SmartHomeFeaturePageComponent,
        data: {title: 'Создание сценария', feature: 'scenarioCreate'},
      },
      {
        path: 'automations',
        component: SmartHomeFeaturePageComponent,
        data: {title: 'Автоматизации', feature: 'automations'},
      },
      {
        path: 'events',
        component: SmartHomeFeaturePageComponent,
        data: {title: 'Журнал событий', feature: 'events'},
      },
    ],
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class HomeModuleRoutingModule {
}
