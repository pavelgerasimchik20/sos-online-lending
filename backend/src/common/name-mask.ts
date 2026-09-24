/**
 * Маскирует ФИО для публичного отображения (маркетплейс, статистика):
 * фамилия — первая и последняя буква, середина скрыта точками; имя и
 * отчество — только инициалы. Пример: "Герасимчик Павел Сергеевич" →
 * "Г..........к П.С.".
 */
export function maskFullName(lastName: string, firstName: string, patronymic?: string | null): string {
  const parts = [maskSurname(lastName), initials(firstName, patronymic)];
  return parts.filter(Boolean).join(' ');
}

function maskSurname(surname: string): string {
  const trimmed = surname.trim();
  if (trimmed.length <= 2) {
    return trimmed;
  }
  return `${trimmed[0]}${'.'.repeat(trimmed.length - 2)}${trimmed[trimmed.length - 1]}`;
}

function initials(firstName: string, patronymic?: string | null): string {
  const first = firstName.trim();
  const middle = patronymic?.trim();
  const firstInitial = first ? `${first[0]}.` : '';
  const middleInitial = middle ? `${middle[0]}.` : '';
  return `${firstInitial}${middleInitial}`;
}
