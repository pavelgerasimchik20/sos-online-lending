import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { LenderWallet, WalletTransaction } from '../models/models';

@Injectable({ providedIn: 'root' })
export class WalletService {
  private readonly base = environment.apiBaseUrl;

  constructor(private readonly http: HttpClient) {}

  getMine(): Observable<LenderWallet> {
    return this.http.get<LenderWallet>(`${this.base}/wallet/me`);
  }

  topUp(amountByn: number): Observable<LenderWallet> {
    return this.http.post<LenderWallet>(`${this.base}/wallet/topup`, { amountByn });
  }

  history(): Observable<WalletTransaction[]> {
    return this.http.get<WalletTransaction[]>(`${this.base}/wallet/history`);
  }
}
