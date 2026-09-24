import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  AdminDashboard,
  AdminUser,
  BorrowerStatsRow,
  DefaultCase,
  InvestorStatsRow,
  Profile,
  PublicStats,
  SmsMessage,
  UserRole,
} from '../models/models';

export interface AdminCreateUserPayload {
  login: string;
  password: string;
  roles: UserRole[];
}

@Injectable({ providedIn: 'root' })
export class AdminService {
  private readonly base = environment.apiBaseUrl;

  constructor(private readonly http: HttpClient) {}

  dashboard(): Observable<AdminDashboard> {
    return this.http.get<AdminDashboard>(`${this.base}/admin/dashboard`);
  }

  publicStats(): Observable<PublicStats> {
    return this.http.get<PublicStats>(`${this.base}/public-stats`);
  }

  publicBorrowerStats(): Observable<BorrowerStatsRow[]> {
    return this.http.get<BorrowerStatsRow[]>(`${this.base}/public-stats/borrowers`);
  }

  publicInvestorStats(): Observable<InvestorStatsRow[]> {
    return this.http.get<InvestorStatsRow[]>(`${this.base}/public-stats/investors`);
  }

  smsLog(): Observable<SmsMessage[]> {
    return this.http.get<SmsMessage[]>(`${this.base}/admin/sms-log`);
  }

  legalRules(): Observable<Record<string, unknown>> {
    return this.http.get<Record<string, unknown>>(`${this.base}/admin/legal-rules`);
  }

  kycQueue(): Observable<Profile[]> {
    return this.http.get<Profile[]>(`${this.base}/profiles`);
  }

  reviewKyc(profileId: string, decision: 'approve' | 'reject'): Observable<Profile> {
    return this.http.post<Profile>(`${this.base}/profiles/${profileId}/review/${decision}`, {});
  }

  openCollectionCases(): Observable<DefaultCase[]> {
    return this.http.get<DefaultCase[]>(`${this.base}/collections/cases`);
  }

  // --- Учёт пользователей ---

  listUsers(): Observable<AdminUser[]> {
    return this.http.get<AdminUser[]>(`${this.base}/admin/users`);
  }

  createUser(payload: AdminCreateUserPayload): Observable<AdminUser> {
    return this.http.post<AdminUser>(`${this.base}/admin/users`, payload);
  }

  blockUser(id: string): Observable<AdminUser> {
    return this.http.post<AdminUser>(`${this.base}/admin/users/${id}/block`, {});
  }

  unblockUser(id: string): Observable<AdminUser> {
    return this.http.post<AdminUser>(`${this.base}/admin/users/${id}/unblock`, {});
  }

  updateRoles(id: string, roles: UserRole[]): Observable<AdminUser> {
    return this.http.post<AdminUser>(`${this.base}/admin/users/${id}/roles`, { roles });
  }

  deleteUser(id: string): Observable<{ deleted: boolean }> {
    return this.http.delete<{ deleted: boolean }>(`${this.base}/admin/users/${id}`);
  }
}
