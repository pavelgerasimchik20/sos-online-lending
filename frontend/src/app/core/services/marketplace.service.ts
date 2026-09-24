import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ActiveDeal, ContractData, LenderCommitment, LoanApplication, MarketplaceListing } from '../models/models';

export interface OtpResponse {
  devCode?: string;
  expiresInSeconds: number;
}

@Injectable({ providedIn: 'root' })
export class MarketplaceService {
  private readonly base = environment.apiBaseUrl;

  constructor(private readonly http: HttpClient) {}

  listListings(): Observable<MarketplaceListing[]> {
    return this.http.get<MarketplaceListing[]>(`${this.base}/marketplace/listings`);
  }

  listActiveDeals(): Observable<ActiveDeal[]> {
    return this.http.get<ActiveDeal[]>(`${this.base}/marketplace/active-deals`);
  }

  /** Запрашивает мок-код на свой номер для подписи договора (и инвестор, и заёмщик используют один и тот же эндпоинт). */
  requestSignOtp(): Observable<OtpResponse> {
    return this.http.post<OtpResponse>(`${this.base}/auth/otp/request-signing`, {});
  }

  /** Инвестор предлагает профинансировать заявку целиком и подписывает предложение ОТП-кодом — деньги на этом шаге не списываются. */
  propose(applicationId: string, amountByn: number, otpCode: string): Observable<LenderCommitment> {
    return this.http.post<LenderCommitment>(`${this.base}/marketplace/commitments`, { applicationId, amountByn, otpCode });
  }

  listMyCommitments(): Observable<LenderCommitment[]> {
    return this.http.get<LenderCommitment[]>(`${this.base}/marketplace/commitments/mine`);
  }

  /** Инвестор отзывает своё предложение, пока заёмщик не ответил. */
  cancelCommitment(id: string): Observable<LenderCommitment> {
    return this.http.post<LenderCommitment>(`${this.base}/marketplace/commitments/${id}/cancel`, {});
  }

  /** Заёмщик получает id своего текущего предложения по заявке (чтобы открыть договор). */
  getCommitmentForApplication(applicationId: string): Observable<LenderCommitment> {
    return this.http.get<LenderCommitment>(`${this.base}/marketplace/applications/${applicationId}/commitment`);
  }

  /** Заёмщик подтверждает получение денег и подписывает договор ОТП-кодом — заём выдаётся. */
  confirmFunding(applicationId: string, otpCode: string): Observable<LoanApplication> {
    return this.http.post<LoanApplication>(`${this.base}/marketplace/applications/${applicationId}/confirm-funding`, { otpCode });
  }

  /** Заёмщик отклоняет предложение — средства не резервировались, деньги никуда не возвращаются. */
  declineFunding(applicationId: string): Observable<LoanApplication> {
    return this.http.post<LoanApplication>(`${this.base}/marketplace/applications/${applicationId}/decline-funding`, {});
  }

  getContract(commitmentId: string): Observable<ContractData> {
    return this.http.get<ContractData>(`${this.base}/marketplace/commitments/${commitmentId}/contract`);
  }
}
