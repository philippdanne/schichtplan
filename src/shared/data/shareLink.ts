import { Platform } from 'react-native';

const EVENT_PARAM = 'event';

/**
 * Web-only: the Helfer view is already login-free and read-only (see
 * AGENTS.md), so "sharing" an event just means deep-linking straight into
 * it — append the event id as a query param on the current URL (works
 * unmodified under any base path, e.g. GitHub Pages' /schichtplan/) and
 * force Helfer mode + that event on load (see App.tsx/HelferScreen.tsx).
 */
export function buildShareLink(eventId: string): string {
  const url = new URL(window.location.href);
  url.search = '';
  url.hash = '';
  url.searchParams.set(EVENT_PARAM, eventId);
  return url.toString();
}

export function getSharedEventId(): string | null {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return null;
  return new URLSearchParams(window.location.search).get(EVENT_PARAM);
}
