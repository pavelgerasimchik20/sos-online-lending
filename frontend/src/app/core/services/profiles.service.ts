import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Profile } from '../models/models';

export interface SubmitKycPayload {
  lastName: string;
  firstName: string;
  patronymic?: string;
  birthDate: string;
  passportSeries: string;
  passportNumber: string;
  passportIssuedBy: string;
  passportIssuedDate: string;
  inn: string;
  registrationAddress: string;
  actualAddress?: string;
  declaredMonthlyIncomeByn: number;
  employer?: string;
  eripAccountRef?: string;
}

@Injectable({ providedIn: 'root' })
export class ProfilesService {
  private readonly base = environment.apiBaseUrl;

  constructor(private readonly http: HttpClient) {}

  getMine(): Observable<Profile | null> {
    return this.http.get<Profile | null>(`${this.base}/profiles/me`);
  }

  submitMine(payload: SubmitKycPayload): Observable<Profile> {
    return this.http.post<Profile>(`${this.base}/profiles/me`, payload);
  }

  verifyMsi(): Observable<Profile> {
    return this.http.post<Profile>(`${this.base}/profiles/me/msi/verify`, {});
  }
}
