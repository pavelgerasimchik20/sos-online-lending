import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Profile } from './profile.entity';
import { SubmitKycDto } from './dto/submit-kyc.dto';
import { KycStatus, MsiStatus } from '../../common/enums';
import { PassportVerificationService } from './passport-verification.service';
import { MSI_PORT, MsiPort } from '../../integrations/interfaces/msi.port';

@Injectable()
export class ProfilesService {
  constructor(
    @InjectRepository(Profile)
    private readonly profilesRepo: Repository<Profile>,
    private readonly passportVerification: PassportVerificationService,
    @Inject(MSI_PORT) private readonly msiPort: MsiPort,
  ) {}

  findByUserId(userId: string): Promise<Profile | null> {
    return this.profilesRepo.findOne({ where: { userId } });
  }

  async findByUserIdOrThrow(userId: string): Promise<Profile> {
    const profile = await this.findByUserId(userId);
    if (!profile) {
      throw new NotFoundException('Анкета не заполнена');
    }
    return profile;
  }

  /** Требует пройденного KYC (для промежуточных шагов, например перед запуском МСИ). */
  async requireVerified(userId: string): Promise<Profile> {
    const profile = await this.findByUserIdOrThrow(userId);
    if (profile.kycStatus !== KycStatus.VERIFIED) {
      throw new BadRequestException('Личность не подтверждена (KYC). Заполните и дождитесь проверки анкеты.');
    }
    return profile;
  }

  /** Полная проверка: KYC + идентификация через МСИ — требуется для подачи заявки/инвестирования. */
  async requireFullyVerified(userId: string): Promise<Profile> {
    const profile = await this.requireVerified(userId);
    if (profile.msiStatus !== MsiStatus.VERIFIED) {
      throw new BadRequestException(
        'Требуется идентификация через МСИ (Межбанковскую систему идентификации). Пройдите её в личном кабинете.',
      );
    }
    return profile;
  }

  async submit(userId: string, dto: SubmitKycDto): Promise<Profile> {
    let profile = await this.findByUserId(userId);
    if (!profile) {
      profile = this.profilesRepo.create({ userId });
    }
    Object.assign(profile, dto);
    profile.kycStatus = KycStatus.PENDING;
    profile.kycRejectionReason = null;
    // Изменение анкетных данных аннулирует ранее пройденную идентификацию МСИ.
    profile.msiStatus = MsiStatus.NOT_STARTED;
    profile.msiReference = null;
    profile.msiFailReason = null;
    profile.msiVerifiedAt = null;
    profile = await this.profilesRepo.save(profile);

    const check = this.passportVerification.verify({
      passportSeries: profile.passportSeries,
      passportNumber: profile.passportNumber,
      inn: profile.inn,
      birthDate: profile.birthDate,
      passportIssuedDate: profile.passportIssuedDate,
    });

    profile.kycStatus = check.approved ? KycStatus.VERIFIED : KycStatus.REJECTED;
    profile.kycRejectionReason = check.reason ?? null;
    profile.kycCheckedAt = new Date();
    return this.profilesRepo.save(profile);
  }

  /** Запускает мок-идентификацию через МСИ (доступно только после подтверждённого KYC). */
  async verifyMsi(userId: string): Promise<Profile> {
    const profile = await this.requireVerified(userId);
    const fullName = `${profile.lastName} ${profile.firstName} ${profile.patronymic ?? ''}`.trim();

    const result = await this.msiPort.verifyIdentity({
      inn: profile.inn,
      passportSeries: profile.passportSeries,
      passportNumber: profile.passportNumber,
      fullName,
    });

    profile.msiStatus = result.verified ? MsiStatus.VERIFIED : MsiStatus.FAILED;
    profile.msiReference = result.reference;
    profile.msiFailReason = result.reason ?? null;
    profile.msiVerifiedAt = result.verified ? new Date() : null;
    return this.profilesRepo.save(profile);
  }

  list(): Promise<Profile[]> {
    return this.profilesRepo.find({ order: { createdAt: 'DESC' } });
  }

  async findByIdOrThrow(id: string): Promise<Profile> {
    const profile = await this.profilesRepo.findOne({ where: { id } });
    if (!profile) {
      throw new NotFoundException('Анкета не найдена');
    }
    return profile;
  }

  async manualReview(id: string, approve: boolean, reason?: string): Promise<Profile> {
    const profile = await this.findByIdOrThrow(id);
    profile.kycStatus = approve ? KycStatus.VERIFIED : KycStatus.REJECTED;
    profile.kycRejectionReason = approve ? null : (reason ?? null);
    profile.kycCheckedAt = new Date();
    return this.profilesRepo.save(profile);
  }
}
