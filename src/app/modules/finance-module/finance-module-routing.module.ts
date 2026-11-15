import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { FinanceManualReceiptComponent } from './components/manual-receipt/manual-receipt.component';
import { FinanceReceiptDetailComponent } from './components/receipt-detail/receipt-detail.component';
import { FinanceFormDeactivateGuard } from './guards/finance-form-deactivate.guard';
import { FinanceModuleComponent } from './finance-module.component';

const routes: Routes = [
  {
    path: '',
    component: FinanceModuleComponent,
    data: {
      title: 'ФИНАНСЫ',
    },
  },
  {
    path: 'receipts/new',
    component: FinanceManualReceiptComponent,
    canDeactivate: [FinanceFormDeactivateGuard],
    data: {
      title: 'НОВЫЙ РАСХОД',
    },
  },
  {
    path: 'receipts/:receiptId',
    component: FinanceReceiptDetailComponent,
    canDeactivate: [FinanceFormDeactivateGuard],
    data: {
      title: 'ЧЕК',
    },
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class FinanceModuleRoutingModule {
}
