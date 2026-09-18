import { Injectable, computed, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthTokens, AuthUser, UserRole } from '../models/models';

const STORAGE_KEY = 'soz.auth';

interface StoredAuth {
  accessToken: string;
  refreshToken: string;
  user: AuthUser;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly base = environment.apiBaseUrl;
  private readonly state = signal<StoredAuth | null>(this.readStorage());

  readonly user = computed(() => this.state()?.user ?? null);
  readonly isLoggedIn = computed(() => !!this.state());
  readonly roles = computed(() => this.state()?.user.roles ?? []);
  readonly displayName = computed(() => {
    const u = this.state()?.user;
    return u?.phone ?? u?.username ?? '';
  });

  constructor(private readonly http: HttpClient) {}

  private readStorage(): StoredAuth | null {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? (JSON.parse(raw) as StoredAuth) : null;
    } catch {
      return null;
    }
  }

  private persist(auth: StoredAuth | null): void {
    this.state.set(auth);
    if (auth) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(auth));
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  }

  get accessToken(): string | null {
    return this.state()?.accessToken ?? null;
  }

  get refreshTokenValue(): string | null {
    return this.state()?.refreshToken ?? null;
  }

  requestOtp(phone: string, purpose: 'REGISTRATION' | 'LOGIN'): Observable<{ devCode?: string; expiresInSeconds: number }> {
    return this.http.post<{ devCode?: string; expiresInSeconds: number }>(`${this.base}/auth/otp/request`, {
      phone,
      purpose,
    });
  }

  register(phone: string, code: string, password: string): Observable<AuthTokens> {
    return this.http
      .post<AuthTokens>(`${this.base}/auth/register/confirm`, { phone, code, password })
      .pipe(tap((auth) => this.persist(auth)));
  }

  login(login: string, password: string): Observable<AuthTokens> {
    return this.http
      .post<AuthTokens>(`${this.base}/auth/login`, { login, password })
      .pipe(tap((auth) => this.persist(auth)));
  }

  addRole(role: UserRole.BORROWER | UserRole.LENDER): Observable<AuthTokens> {
    return this.http
      .post<AuthTokens>(`${this.base}/auth/roles/${role}`, {})
      .pipe(tap((auth) => this.persist(auth)));
  }

  updateTokens(accessToken: string, refreshToken: string): void {
    const current = this.state();
    if (current) {
      this.persist({ ...current, accessToken, refreshToken });
    }
  }

  logout(): void {
    this.persist(null);
  }

  hasRole(role: UserRole): boolean {
    return this.roles().includes(role);
  }
}
