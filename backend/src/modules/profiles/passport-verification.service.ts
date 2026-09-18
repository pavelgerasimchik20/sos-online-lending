import { Injectable } from '@nestjs/common';

export interface PassportCheckResult {
  approved: boolean;
  reason?: string;
}

/**
 * Мок проверки паспортных данных (в реальной системе — сверка с
 * государственным реестром населения / АИС "Паспорт"). Здесь выполняется
 * только формальная валидация согласованности данных, без внешних вызовов.
 */
@Injectable()
export class PassportVerificationService {
  verify(input: {
    passportSeries: string;
    passportNumber: string;
    inn: string;
    birthDate: string;
    passportIssuedDate: string;
  }): PassportCheckResult {
    const birth = new Date(input.birthDate);
    const issued = new Date(input.passportIssuedDate);
    const age = (issued.getTime() - birth.getTime()) / (1000 * 60 * 60 * 24 * 365.25);

    if (Number.isNaN(birth.getTime()) || Number.isNaN(issued.getTime())) {
      return { approved: false, reason: 'Некорректные даты рождения/выдачи паспорта' };
    }
    if (age < 14) {
      return {
        approved: false,
        reason: 'Паспорт не мог быть выдан ранее 14-летнего возраста заявителя',
      };
    }
    const now = new Date();
    const ageNow = (now.getTime() - birth.getTime()) / (1000 * 60 * 60 * 24 * 365.25);
    if (ageNow < 18) {
      return { approved: false, reason: 'Заём доступен только совершеннолетним гражданам' };
    }
    if (ageNow > 100) {
      return { approved: false, reason: 'Проверьте корректность даты рождения' };
    }
    return { approved: true };
  }
}
