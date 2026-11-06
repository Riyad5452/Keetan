/**
 * Time calculation and duration utilities for delivery milestones
 */

export function parseTimeToMinutes(timeStr: string): number {
  if (!timeStr) return 0;
  const parts = timeStr.trim().split(':');
  if (parts.length < 2) return 0;
  const hours = parseInt(parts[0], 10) || 0;
  const minutes = parseInt(parts[1], 10) || 0;
  return hours * 60 + minutes;
}

/**
 * Calculates duration in minutes from startTime to endTime.
 * If endTime is numerically less than startTime (e.g. 23:45 to 00:15), assumes next-day delivery.
 */
export function calcDurationMinutes(startTime: string, endTime: string): number {
  if (!startTime || !endTime) return 0;
  const start = parseTimeToMinutes(startTime);
  let end = parseTimeToMinutes(endTime);
  if (end < start) {
    end += 24 * 60; // Next day midnight rollover
  }
  return end - start;
}

/**
 * Calculates the difference between actual arrival at customer and expected delivery time.
 * Returns negative if arrived early, 0 if on time, positive if late.
 * Example:
 *   arrived: 11:42, expected: 11:51 -> diff = -9 (9 min early!)
 *   arrived: 11:55, expected: 11:51 -> diff = +4 (4 min late)
 */
export function calcDeliveryVsExpectedMinutes(arrivedTime: string, expectedTime: string): number {
  if (!arrivedTime || !expectedTime) return 0;
  const arrived = parseTimeToMinutes(arrivedTime);
  const expected = parseTimeToMinutes(expectedTime);
  
  let diff = arrived - expected;
  // Handle crossing midnight cases within plausible shift window (+/- 12 hours)
  if (diff > 12 * 60) {
    diff -= 24 * 60;
  } else if (diff < -12 * 60) {
    diff += 24 * 60;
  }
  return diff;
}

/**
 * Extract strictly the last 4 digits from any order number string
 * Example: "5736823099441079" -> { last4: "1079", full: "5736823099441079" }
 */
export function extractOrderDigits(raw: string): { last4: string; full: string } {
  if (!raw) return { last4: '', full: '' };
  const cleaned = raw.trim();
  const digits = cleaned.replace(/\D/g, '');
  const last4 = digits.length >= 4 ? digits.slice(-4) : digits;
  return { last4, full: cleaned };
}

/**
 * Format minutes into a nice display like "15 min" or "1h 12m"
 */
export function formatMinutes(minutes: number | null | undefined): string {
  if (minutes === null || minutes === undefined || isNaN(minutes)) return '—';
  const val = Math.round(minutes * 10) / 10;
  const hours = Math.floor(val / 60);
  const mins = Math.round(val % 60);
  if (hours > 0) {
    return `${hours}h ${mins}m`;
  }
  return `${mins} min`;
}

/**
 * Format early/late variance vs expected time
 */
export function formatVsExpectedBadge(diffMinutes: number): {
  text: string;
  badgeClass: string;
  isEarly: boolean;
  isLate: boolean;
  isOnTime: boolean;
} {
  if (isNaN(diffMinutes)) {
    return { text: '—', badgeClass: 'bg-gray-100 text-gray-700', isEarly: false, isLate: false, isOnTime: true };
  }
  if (diffMinutes < 0) {
    const early = Math.abs(diffMinutes);
    return {
      text: `${early}m early`,
      badgeClass: 'bg-emerald-100 text-emerald-800 border border-emerald-300 font-semibold',
      isEarly: true,
      isLate: false,
      isOnTime: false,
    };
  } else if (diffMinutes > 0) {
    return {
      text: `+${diffMinutes}m late`,
      badgeClass: 'bg-red-100 text-red-800 border border-red-300 font-semibold',
      isEarly: false,
      isLate: true,
      isOnTime: false,
    };
  }
  return {
    text: 'On time',
    badgeClass: 'bg-blue-100 text-blue-800 border border-blue-300 font-semibold',
    isEarly: false,
    isLate: false,
    isOnTime: true,
  };
}

/**
 * Format 24h "HH:mm" time to localized 12h "hh:mm A"
 */
export function formatTime12h(timeStr: string): string {
  if (!timeStr) return '—';
  const parts = timeStr.split(':');
  if (parts.length < 2) return timeStr;
  let h = parseInt(parts[0], 10);
  const m = parts[1].padStart(2, '0');
  const ampm = h >= 12 ? 'PM' : 'AM';
  h = h % 12;
  h = h ? h : 12;
  return `${String(h).padStart(2, '0')}:${m} ${ampm}`;
}

export function getCurrentDate(): string {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getCurrentTime(): string {
  const d = new Date();
  const h = String(d.getHours()).padStart(2, '0');
  const m = String(d.getMinutes()).padStart(2, '0');
  return `${h}:${m}`;
}
