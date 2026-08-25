import { Router } from 'express';

const router = Router();

/** Public mobile app metadata — APK download link for dashboard. */
router.get('/info', (_req, res) => {
  const apkUrl = String(process.env.MOBILE_APK_URL || '/downloads/aitoolzmart.apk').trim();
  const version = String(process.env.MOBILE_APK_VERSION || '1.0.0').trim();
  res.json({
    ok: true,
    platform: 'android',
    apkUrl,
    version,
    minAndroid: 24,
    appName: 'AI Toolz Mart',
    note: 'Install once. Tools and cookies update automatically when you open them — no reinstall needed.',
  });
});

export default router;
