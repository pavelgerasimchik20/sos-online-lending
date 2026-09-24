import { Component, computed, effect, signal } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { AuthService } from './core/services/auth.service';
import { ProfilesService } from './core/services/profiles.service';
import { Profile, UserRole } from './core/models/models';

const ROLE_LABELS: Record<UserRole, string> = {
  [UserRole.BORROWER]: 'Заёмщик',
  [UserRole.LENDER]: 'Инвестор',
  [UserRole.ADMIN]: 'Администратор',
};

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    MatToolbarModule,
    MatButtonModule,
    MatIconModule,
    MatMenuModule,
  ],
  styleUrl: './app.scss',
  templateUrl: './app.html',
})
export class App {
  readonly UserRole = UserRole;
  readonly profile = signal<Profile | null>(null);

  readonly displayFullName = computed(() => {
    const p = this.profile();
    if (p) {
      return [p.lastName, p.firstName, p.patronymic].filter(Boolean).join(' ');
    }
    return this.auth.displayName();
  });

  readonly displayRoles = computed(() => this.auth.roles().map((r) => ROLE_LABELS[r]).join(', '));
  readonly hasProfileName = computed(() => !!this.profile());

  constructor(
    public readonly auth: AuthService,
    private readonly profilesService: ProfilesService,
  ) {
    effect(() => {
      const user = this.auth.user();
      if (!user) {
        this.profile.set(null);
        return;
      }
      this.profilesService.getMine().subscribe({
        next: (p) => this.profile.set(p),
        error: () => this.profile.set(null),
      });
    });
  }

  logout(): void {
    this.auth.logout();
    window.location.href = '/login';
  }
}
