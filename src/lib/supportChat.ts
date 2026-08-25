/** Open the support chat panel from anywhere (mobile bottom nav, support page). */
export const SUPPORT_CHAT_EVENT = 'atm-open-support-chat';

export function openSupportChat(): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(SUPPORT_CHAT_EVENT));
}
