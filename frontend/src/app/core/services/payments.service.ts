import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { LenderPayout, Payment } from '../models/models';

@Injectable({ providedIn: 'root' })
export class PaymentsService {
  private readonly base = environment.apiBaseUrl;

  constructor(private readonly http: HttpClient) {}

  initiate(loanId: string, amountByn: number): Observable<Payment> {
    return this.http.post<Payment>(`${this.base}/payments/initiate`, { loanId, amountByn });
  }

  confirm(paymentId: string): Observable<Payment> {
    return this.http.post<Payment>(`${this.base}/payments/${paymentId}/confirm`, {});
  }

  listMine(): Observable<Payment[]> {
    return this.http.get<Payment[]>(`${this.base}/payments/mine`);
  }

  listPayoutsMine(): Observable<LenderPayout[]> {
    return this.http.get<LenderPayout[]>(`${this.base}/payments/payouts/mine`);
  }
}
