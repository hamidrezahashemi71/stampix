import { toJalaali } from 'jalaali-js';
import type { CalendarKind } from './types';

const p2 = (n: number) => String(n).padStart(2, '0');

/** 08:13:22 (device local time) */
export function clock(t: number): string {
  const d = new Date(t);
  return `${p2(d.getHours())}:${p2(d.getMinutes())}:${p2(d.getSeconds())}`;
}

/** 08:13 */
export function hm(t: number): string {
  const d = new Date(t);
  return `${p2(d.getHours())}:${p2(d.getMinutes())}`;
}

/** 07:45 or 1:02:09 */
export function dur(ms: number): string {
  const neg = ms < 0;
  const s = Math.floor(Math.abs(ms) / 1000);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const out = h ? `${h}:${p2(m)}:${p2(sec)}` : `${p2(m)}:${p2(sec)}`;
  return neg ? `-${out}` : out;
}

/** 52m or 1h05m */
export function durShort(ms: number): string {
  const m = Math.round(ms / 60000);
  if (m < 60) return `${m}m`;
  return `${Math.floor(m / 60)}h${p2(m % 60)}m`;
}

const WEEKDAYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];

export function weekday(t: number): string {
  return WEEKDAYS[new Date(t).getDay()];
}

/** 2026-10-20 or 1405/07/28 */
export function dateStr(t: number, cal: CalendarKind): string {
  const d = new Date(t);
  if (cal === 'jalali') {
    const j = toJalaali(d.getFullYear(), d.getMonth() + 1, d.getDate());
    return `${j.jy}/${p2(j.jm)}/${p2(j.jd)}`;
  }
  return `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())}`;
}

/** Local-day bucket key, calendar-independent. */
export function dayKey(t: number): string {
  const d = new Date(t);
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

export function median(xs: number[]): number | null {
  if (!xs.length) return null;
  const s = [...xs].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

export function mean(xs: number[]): number | null {
  if (!xs.length) return null;
  return xs.reduce((a, b) => a + b, 0) / xs.length;
}
