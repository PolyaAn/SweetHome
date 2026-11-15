import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { FinanceManualReceiptComponent } from './components/manual-receipt/manual-receipt.component';
import { FinanceReceiptDetailComponent } from './components/receipt-detail/receipt-detail.component';
import { FinanceFormDeactivateGuard } from './guards/finance-form-deactivate.guard';
import { FinanceModuleRoutingModule } from './finance-module-routing.module';
import { FinanceModuleComponent } from './finance-module.component';
import { FinanceApiService } from './services/finance-api.service';

@NgModule({
  declarations: [
    FinanceModuleComponent,
    FinanceReceiptDetailComponent,
    FinanceManualReceiptComponent,
  ],
  imports: [
    CommonModule,
    FormsModule,
    MatIconModule,
    FinanceModuleRoutingModule,
  ],
  providers: [FinanceApiService, FinanceFormDeactivateGuard],
})
export class FinanceModuleModule {
}
