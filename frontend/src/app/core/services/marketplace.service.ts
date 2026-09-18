import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { LenderCommitment, MarketplaceListing } from '../models/models';

@Injectable({ providedIn: 'root' })
export class MarketplaceService {
  private readonly base = environment.apiBaseUrl;

  constructor(private readonly http: HttpClient) {}

  listListings(): Observable<MarketplaceListing[]> {
    return this.http.get<MarketplaceListing[]>(`${this.base}/marketplace/listings`);
  }

  commit(applicationId: string, amountByn: number): Observable<LenderCommitment> {
    return this.http.post<LenderCommitment>(`${this.base}/marketplace/commitments`, { applicationId, amountByn });
  }

  listMyCommitments(): Observable<LenderCommitment[]> {
    return this.http.get<LenderCommitment[]>(`${this.base}/marketplace/commitments/mine`);
  }

  cancelCommitment(id: string): Observable<LenderCommitment> {
    return this.http.post<LenderCommitment>(`${this.base}/marketplace/commitments/${id}/cancel`, {});
  }
}
