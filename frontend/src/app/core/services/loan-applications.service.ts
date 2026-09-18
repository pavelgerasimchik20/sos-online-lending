import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { CalculatePreviewResult, LoanApplication } from '../models/models';

@Injectable({ providedIn: 'root' })
export class LoanApplicationsService {
  private readonly base = environment.apiBaseUrl;

  constructor(private readonly http: HttpClient) {}

  calculate(amountByn: number, termMonths: number): Observable<CalculatePreviewResult> {
    return this.http.post<CalculatePreviewResult>(`${this.base}/loan-applications/calculate`, {
      amountByn,
      termMonths,
    });
  }

  create(requestedAmountByn: number, requestedTermMonths: number, purpose: string): Observable<LoanApplication> {
    return this.http.post<LoanApplication>(`${this.base}/loan-applications`, {
      requestedAmountByn,
      requestedTermMonths,
      purpose,
    });
  }

  listMine(): Observable<LoanApplication[]> {
    return this.http.get<LoanApplication[]>(`${this.base}/loan-applications/mine`);
  }

  getMine(id: string): Observable<LoanApplication> {
    return this.http.get<LoanApplication>(`${this.base}/loan-applications/${id}`);
  }

  cancel(id: string): Observable<LoanApplication> {
    return this.http.post<LoanApplication>(`${this.base}/loan-applications/${id}/cancel`, {});
  }

  listAll(): Observable<LoanApplication[]> {
    return this.http.get<LoanApplication[]>(`${this.base}/loan-applications`);
  }
}
