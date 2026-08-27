import type { CapacitorConfig } from '@capacitor/cli';

const portalUrl = (
  process.env.CAPACITOR_SERVER_URL ||
  process.env.VITE_PORTAL_URL ||
  'https://zynextools.com'
).replace(/\/$/, '');

/** Remote portal = dashboard updates without rebuilding APK. Set CAPACITOR_USE_BUNDLED=1 to ship dist only. */
const useRemote = process.env.CAPACITOR_USE_BUNDLED !== '1';

const config: CapacitorConfig = {
  appId: 'com.aitoolzmart.app',
  appName: 'ZynexTools',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
    ...(useRemote
      ? {
          url: `${portalUrl}/reseller`,
          cleartext: false,
        }
      : {}),
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 1800,
      backgroundColor: '#090303',
      showSpinner: false,
    },
  },
};

export default config;
