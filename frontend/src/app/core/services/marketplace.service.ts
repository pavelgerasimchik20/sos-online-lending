import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ContractData, LenderCommitment, LoanApplication, MarketplaceListing } from '../models/models';

@Injectable({ providedIn: 'root' })
export class MarketplaceService {
  private readonly base = environment.apiBaseUrl;

  constructor(private readonly http: HttpClient) {}

  listListings(): Observable<MarketplaceListing[]> {
    return this.http.get<MarketplaceListing[]>(`${this.base}/marketplace/listings`);
  }

  /** Инвестор предлагает профинансировать заявку целиком — деньги резервируются, ждём подтверждения заёмщика. */
  propose(applicationId: string, amountByn: number): Observable<LenderCommitment> {
    return this.http.post<LenderCommitment>(`${this.base}/marketplace/commitments`, { applicationId, amountByn });
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

  /** Заёмщик подтверждает предложение — заём выдаётся. */
  confirmFunding(applicationId: string): Observable<LoanApplication> {
    return this.http.post<LoanApplication>(`${this.base}/marketplace/applications/${applicationId}/confirm-funding`, {});
  }

  /** Заёмщик отклоняет предложение — средства возвращаются инвестору. */
  declineFunding(applicationId: string): Observable<LoanApplication> {
    return this.http.post<LoanApplication>(`${this.base}/marketplace/applications/${applicationId}/decline-funding`, {});
  }

  getContract(commitmentId: string): Observable<ContractData> {
    return this.http.get<ContractData>(`${this.base}/marketplace/commitments/${commitmentId}/contract`);
  }
}
