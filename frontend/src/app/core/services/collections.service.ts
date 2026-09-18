import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { DefaultCase } from '../models/models';

@Injectable({ providedIn: 'root' })
export class CollectionsService {
  private readonly base = environment.apiBaseUrl;

  constructor(private readonly http: HttpClient) {}

  forLoan(loanId: string): Observable<DefaultCase | null> {
    return this.http.get<DefaultCase | null>(`${this.base}/collections/loans/${loanId}/case`);
  }
}
