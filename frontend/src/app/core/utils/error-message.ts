/** Достаёт читаемое сообщение об ошибке из ответа HttpClient, независимо от того, строка это или массив (class-validator). */
export function extractErrorMessage(err: unknown, fallback: string): string {
  const message = (err as { error?: { message?: unknown } })?.error?.message;
  if (Array.isArray(message)) {
    return message.join('; ');
  }
  if (typeof message === 'string' && message.trim()) {
    return message;
  }
  return fallback;
}
