import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Loan, LoanLenderShare, PaymentScheduleItem } from '../models/models';

@Injectable({ providedIn: 'root' })
export class LoansService {
  private readonly base = environment.apiBaseUrl;

  constructor(private readonly http: HttpClient) {}

  listMine(): Observable<Loan[]> {
    return this.http.get<Loan[]>(`${this.base}/loans/mine`);
  }

  myPortfolio(): Observable<LoanLenderShare[]> {
    return this.http.get<LoanLenderShare[]>(`${this.base}/loans/my-portfolio`);
  }

  getOne(id: string): Observable<Loan> {
    return this.http.get<Loan>(`${this.base}/loans/${id}`);
  }

  getSchedule(id: string): Observable<PaymentScheduleItem[]> {
    return this.http.get<PaymentScheduleItem[]>(`${this.base}/loans/${id}/schedule`);
  }

  getShares(id: string): Observable<LoanLenderShare[]> {
    return this.http.get<LoanLenderShare[]>(`${this.base}/loans/${id}/shares`);
  }

  listAll(): Observable<Loan[]> {
    return this.http.get<Loan[]>(`${this.base}/loans`);
  }
}
