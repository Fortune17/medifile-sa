import { format, formatDistanceToNow, parseISO } from 'date-fns';

export function formatDate(value?: string | null, pattern = 'dd MMM yyyy') {
  if (!value) return '—';
  try {
    return format(parseISO(value), pattern);
  } catch {
    return value;
  }
}

export function formatWhen(value?: string | null) {
  if (!value) return '';
  try {
    return formatDistanceToNow(parseISO(value), { addSuffix: true });
  } catch {
    return value;
  }
}
