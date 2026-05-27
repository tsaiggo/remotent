export const pad = (n: number): string => String(n).padStart(2, '0');

export function nowClock(): string {
  const d = new Date();
  return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}
