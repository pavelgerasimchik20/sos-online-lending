import { Component, Input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { KycStatus, MsiStatus, Profile } from '../../core/models/models';

@Component({
  selector: 'soz-verification-banner',
  standalone: true,
  imports: [RouterLink, MatIconModule, MatButtonModule],
  template: `
    @if (!isFullyVerified()) {
      <div class="soz-verify-banner">
        <mat-icon>fingerprint</mat-icon>
        <div class="soz-verify-text">
          <strong>{{ headline() }}</strong>
          <span>{{ subline() }}</span>
        </div>
        <a mat-raised-button color="accent" routerLink="/kyc">Пройти проверку</a>
      </div>
    }
  `,
  styles: [
    `
      .soz-verify-banner {
        display: flex;
        align-items: center;
        gap: 16px;
        padding: 16px 20px;
        border-radius: 16px;
        background: linear-gradient(120deg, rgba(16, 122, 87, 0.12), rgba(217, 164, 6, 0.12));
        border: 1px solid color-mix(in srgb, var(--soz-money-green) 25%, transparent);
        margin-bottom: 20px;
        animation: sozRiseIn 0.4s ease both;
      }
      .soz-verify-banner mat-icon {
        color: var(--soz-money-green);
        font-size: 28px;
        width: 28px;
        height: 28px;
        flex-shrink: 0;
      }
      .soz-verify-text {
        display: flex;
        flex-direction: column;
        flex: 1;
        gap: 2px;
        font-size: 13px;
      }
      .soz-verify-text span {
        color: var(--mat-sys-on-surface-variant);
      }
      @media (max-width: 560px) {
        .soz-verify-banner {
          flex-wrap: wrap;
        }
      }
    `,
  ],
})
export class VerificationBannerComponent {
  @Input() profile: Profile | null = null;

  isFullyVerified(): boolean {
    return this.profile?.kycStatus === KycStatus.VERIFIED && this.profile?.msiStatus === MsiStatus.VERIFIED;
  }

  headline(): string {
    if (!this.profile || this.profile.kycStatus !== KycStatus.VERIFIED) {
      return 'Заполните анкету и подтвердите личность';
    }
    return 'Осталось подтвердить личность через МСИ';
  }

  subline(): string {
    if (!this.profile || this.profile.kycStatus !== KycStatus.VERIFIED) {
      return 'KYC-анкета и идентификация через МСИ требуются перед подачей заявки или инвестированием.';
    }
    return 'Пройдите идентификацию через Межбанковскую систему идентификации — это займёт меньше минуты.';
  }
}
