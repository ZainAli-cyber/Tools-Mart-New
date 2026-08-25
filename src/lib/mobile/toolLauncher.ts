import { Capacitor, registerPlugin } from '@capacitor/core';

export type LaunchToolNativeOptions = {
  url: string;
  cookies?: any[];
  referrer?: string;
  title?: string;
};

export interface ToolLauncherPlugin {
  launch(options: LaunchToolNativeOptions): Promise<{ ok: boolean; setCount?: number }>;
  isAvailable(): Promise<{ available: boolean }>;
}

const ToolLauncherNative = registerPlugin<ToolLauncherPlugin>('ToolLauncher');

export function isMobileApp(): boolean {
  return Capacitor.isNativePlatform();
}

export function isAndroidApp(): boolean {
  return Capacitor.getPlatform() === 'android';
}

export async function isNativeToolLauncherAvailable(): Promise<boolean> {
  if (!isMobileApp()) return false;
  try {
    const r = await ToolLauncherNative.isAvailable();
    return Boolean(r?.available);
  } catch {
    return false;
  }
}

/** Open tool in the in-app browser with fresh admin cookies (mobile APK). */
export async function launchToolNative(opts: LaunchToolNativeOptions): Promise<void> {
  if (!isMobileApp()) {
    throw new Error('Native tool launcher is only available in the mobile app.');
  }
  const url = String(opts.url || '').trim();
  if (!url) throw new Error('No destination URL for this tool.');
  const result = await ToolLauncherNative.launch({
    url,
    cookies: Array.isArray(opts.cookies) ? opts.cookies : [],
    referrer: String(opts.referrer || '').trim() || undefined,
    title: String(opts.title || 'Tool').trim() || 'Tool',
  });
  if (!result?.ok) throw new Error('Could not open the tool in the mobile browser.');
}
