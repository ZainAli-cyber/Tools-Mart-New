package com.aitoolzmart.app;

import android.annotation.SuppressLint;
import android.graphics.Color;
import android.os.Bundle;
import android.text.TextUtils;
import android.webkit.CookieManager;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.ImageButton;
import android.widget.LinearLayout;
import android.widget.TextView;

import androidx.appcompat.app.AppCompatActivity;

import org.json.JSONArray;
import org.json.JSONObject;

import java.net.URL;
import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.HashMap;
import java.util.HashSet;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.TimeZone;

/**
 * Full-screen in-app browser. Applies admin cookies from the launch API, then
 * loads the real tool URL (ChatGPT, Canva, panels, etc.).
 */
public class ToolWebViewActivity extends AppCompatActivity {

    static final String EXTRA_URL = "tool_url";
    static final String EXTRA_REFERRER = "tool_referrer";
    static final String EXTRA_TITLE = "tool_title";
    static final String EXTRA_COOKIES = "tool_cookies";

    private WebView webView;
    private String destinationUrl = "";
    private String referrerUrl = "";

    @SuppressLint("SetJavaScriptEnabled")
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        destinationUrl = getIntent().getStringExtra(EXTRA_URL);
        referrerUrl = getIntent().getStringExtra(EXTRA_REFERRER);
        String title = getIntent().getStringExtra(EXTRA_TITLE);
        String cookiesJson = getIntent().getStringExtra(EXTRA_COOKIES);

        if (destinationUrl == null || destinationUrl.trim().isEmpty()) {
            finish();
            return;
        }
        destinationUrl = destinationUrl.trim();
        if (referrerUrl == null) referrerUrl = "";
        referrerUrl = referrerUrl.trim();

        LinearLayout root = new LinearLayout(this);
        root.setOrientation(LinearLayout.VERTICAL);
        root.setBackgroundColor(Color.parseColor("#0d0908"));

        LinearLayout bar = new LinearLayout(this);
        bar.setOrientation(LinearLayout.HORIZONTAL);
        bar.setBackgroundColor(Color.parseColor("#130d0d"));
        int padH = (int) (12 * getResources().getDisplayMetrics().density);
        int padV = (int) (8 * getResources().getDisplayMetrics().density);
        bar.setPadding(padH, padV, padH, padV);
        bar.setElevation(4f);
        LinearLayout.LayoutParams barLp = new LinearLayout.LayoutParams(
            LinearLayout.LayoutParams.MATCH_PARENT,
            (int) (48 * getResources().getDisplayMetrics().density)
        );
        bar.setLayoutParams(barLp);
        bar.setGravity(android.view.Gravity.CENTER_VERTICAL);

        ImageButton back = new ImageButton(this);
        back.setImageResource(android.R.drawable.ic_menu_close_clear_cancel);
        back.setBackgroundColor(Color.TRANSPARENT);
        back.setColorFilter(Color.parseColor("#fecaca"));
        int btn = (int) (36 * getResources().getDisplayMetrics().density);
        LinearLayout.LayoutParams backLp = new LinearLayout.LayoutParams(btn, btn);
        back.setLayoutParams(backLp);
        back.setScaleType(android.widget.ImageView.ScaleType.CENTER_INSIDE);
        back.setPadding(padV, padV, padV, padV);
        back.setOnClickListener(v -> finish());

        TextView label = new TextView(this);
        label.setText(title != null && !title.isEmpty() ? title : "Tool");
        label.setTextColor(Color.parseColor("#ffffff"));
        label.setTextSize(14f);
        label.setSingleLine(true);
        label.setEllipsize(TextUtils.TruncateAt.END);
        label.setPadding(padH, 0, 0, 0);

        bar.addView(back);
        bar.addView(label, new LinearLayout.LayoutParams(
            0,
            LinearLayout.LayoutParams.WRAP_CONTENT,
            1f
        ));

        webView = new WebView(this);
        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setDatabaseEnabled(true);
        settings.setMediaPlaybackRequiresUserGesture(false);
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_ALWAYS_ALLOW);
        // Desktop Chrome UA keeps panel cookie sessions (mobile UA drops them).
        settings.setUserAgentString(
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
        );
        settings.setUseWideViewPort(true);
        settings.setLoadWithOverviewMode(true);
        settings.setSupportZoom(true);
        settings.setBuiltInZoomControls(true);
        settings.setDisplayZoomControls(false);
        settings.setLayoutAlgorithm(WebSettings.LayoutAlgorithm.NORMAL);

        // Shrink the fixed desktop layout (~1280px) so the full page fits the phone width.
        int screenPx = getResources().getDisplayMetrics().widthPixels;
        int desktopLayoutPx = 1280;
        int initialScalePct = Math.max(28, Math.min(100, (screenPx * 100) / desktopLayoutPx));
        webView.setInitialScale(initialScalePct);

        CookieManager cm = CookieManager.getInstance();
        cm.setAcceptCookie(true);
        cm.setAcceptThirdPartyCookies(webView, true);

        applyCookies(cm, cookiesJson, destinationUrl);

        final float density = Math.max(0.01f, getResources().getDisplayMetrics().density);
        final int phoneCssPx = Math.max(320, Math.round(screenPx / density));

        webView.setWebChromeClient(new WebChromeClient());
        webView.setWebViewClient(new WebViewClient() {
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                if (request == null || request.getUrl() == null) return false;
                String next = request.getUrl().toString();
                // Re-apply Referer on every main navigation (panel unlock needs it on redirects).
                if (needsUnlockReferrer(next) && !referrerUrl.isEmpty()) {
                    view.loadUrl(next, unlockHeaders());
                    return true;
                }
                return false;
            }

            @Override
            public boolean shouldOverrideUrlLoading(WebView view, String url) {
                if (url == null) return false;
                if (needsUnlockReferrer(url) && !referrerUrl.isEmpty()) {
                    view.loadUrl(url, unlockHeaders());
                    return true;
                }
                return false;
            }

            @Override
            public void onPageFinished(WebView view, String url) {
                // Do NOT switch viewport to phone width — that clips desktop panel UIs.
                // Keep a desktop layout width and scale it down so sidebar + content both show.
                view.evaluateJavascript(
                    "(function(){"
                        + "try{"
                        + "var phone=" + phoneCssPx + ";"
                        + "var desktop=1280;"
                        + "var m=document.querySelector('meta[name=\"viewport\"]');"
                        + "if(!m){m=document.createElement('meta');m.setAttribute('name','viewport');"
                        + "(document.head||document.documentElement).appendChild(m);}"
                        + "function fit(){"
                        + "  var w=Math.max("
                        + "    document.documentElement.scrollWidth||0,"
                        + "    document.body&&document.body.scrollWidth||0,"
                        + "    desktop);"
                        + "  if(w<desktop)w=desktop;"
                        + "  var scale=Math.min(1,phone/w);"
                        + "  m.setAttribute('content','width='+Math.round(w)+', initial-scale='+scale.toFixed(4)"
                        + "    +', minimum-scale=0.15, maximum-scale=5, user-scalable=yes');"
                        + "  document.documentElement.style.width='100%';"
                        + "  document.documentElement.style.minHeight='100%';"
                        + "  if(document.body){"
                        + "    document.body.style.minHeight='100%';"
                        + "    document.body.style.margin='0';"
                        + "  }"
                        + "}"
                        + "fit();"
                        + "setTimeout(fit,300);"
                        + "setTimeout(fit,1000);"
                        + "setTimeout(fit,2000);"
                        + "}catch(e){}"
                        + "})();",
                    null
                );
            }
        });

        root.addView(bar);
        root.addView(webView, new LinearLayout.LayoutParams(
            LinearLayout.LayoutParams.MATCH_PARENT,
            0,
            1f
        ));
        setContentView(root);

        webView.loadUrl(destinationUrl, unlockHeaders());
    }

    private Map<String, String> unlockHeaders() {
        Map<String, String> headers = new HashMap<>();
        if (referrerUrl.isEmpty()) return headers;
        headers.put("Referer", referrerUrl);
        try {
            URL u = new URL(referrerUrl);
            headers.put("Origin", u.getProtocol() + "://" + u.getHost());
        } catch (Exception ignored) {
            /* ignore */
        }
        return headers;
    }

    private boolean needsUnlockReferrer(String url) {
        if (referrerUrl.isEmpty()) return false;
        String host = hostFromUrl(url);
        String destHost = hostFromUrl(destinationUrl);
        if (host == null) return false;
        // Known panels OR any custom panel domain when admin set unlock referrer
        // (e.g. testingg.one Grammarly panels — keep Referer across redirects).
        if (isPanelHost(host) || isPanelHost(destHost)) return true;
        return sameRegistrableDomain(host, destHost);
    }

    private boolean isPanelHost(String host) {
        if (host == null) return false;
        String h = host.toLowerCase(Locale.US);
        return h.equals("toolaccess.click")
            || h.endsWith(".toolaccess.click")
            || h.equals("xemrush.site")
            || h.endsWith(".xemrush.site")
            || h.equals("semrush.site")
            || h.endsWith(".semrush.site")
            || h.endsWith(".groupbuy.tools")
            || h.contains("toolpanel")
            || h.contains("sharedpanel")
            || h.contains("panelhub");
    }

    /** True when admin configured a panel unlock Referer (custom domains like testingg.one). */
    private boolean panelUnlockMode(String destHost) {
        return isPanelHost(destHost) || !referrerUrl.isEmpty();
    }

    private boolean sameRegistrableDomain(String a, String b) {
        if (a == null || b == null) return false;
        if (a.equals(b)) return true;
        if (a.endsWith("." + b) || b.endsWith("." + a)) return true;
        String ra = registrableDomain(a);
        String rb = registrableDomain(b);
        return ra != null && ra.equals(rb);
    }

    private String registrableDomain(String host) {
        if (host == null || host.isEmpty()) return null;
        String[] parts = host.toLowerCase(Locale.US).split("\\.");
        if (parts.length < 2) return host;
        return parts[parts.length - 2] + "." + parts[parts.length - 1];
    }

    private void applyCookies(CookieManager cm, String cookiesJson, String destUrl) {
        if (cookiesJson == null || cookiesJson.trim().isEmpty()) return;
        try {
            JSONArray list = new JSONArray(cookiesJson);
            String destHost = hostFromUrl(destUrl);
            boolean destHttps = destUrl.toLowerCase(Locale.US).startsWith("https://");
            boolean panelDest = panelUnlockMode(destHost);
            Set<String> clearedUrls = new HashSet<>();

            for (int i = 0; i < list.length(); i++) {
                JSONObject c = list.optJSONObject(i);
                if (c == null) continue;
                String name = c.optString("name", "").trim();
                if (name.isEmpty()) continue;
                String value = c.optString("value", "");
                String path = c.optString("path", "/");
                if (path.isEmpty()) path = "/";

                boolean hostOnly = c.optBoolean("hostOnly", false);
                String domain = c.optString("domain", "").trim();
                String cookieUrlField = c.optString("url", "").trim();

                // Prefer explicit cookie.url host when domain is missing (Chrome export often does this).
                if (domain.isEmpty() && !cookieUrlField.isEmpty()) {
                    String fromUrl = hostFromUrl(cookieUrlField);
                    if (fromUrl != null) domain = fromUrl;
                }
                if (domain.isEmpty() && destHost != null) domain = destHost;
                domain = domain.replaceAll("^\\.", "");
                if (domain.isEmpty()) continue;

                boolean secure = c.optBoolean("secure", destHttps);
                if (name.startsWith("__Secure-") || name.startsWith("__Host-")) secure = true;

                String sameSite = normalizeSameSite(c.optString("sameSite", ""));
                if ("None".equals(sameSite)) secure = true;

                // Host-only / __Host- cookies must NOT include Domain=
                boolean omitDomain = hostOnly || name.startsWith("__Host-");

                // CookieManager URL scheme must match the page. Grammarly-style exports often
                // have secure:false — still use https://… when the tool URL is https, or the
                // cookie never reaches the WebView request (desktop Chrome handles this differently).
                boolean urlHttps = destHttps || secure;
                String cookieUrl = urlForDomain(domain, path, urlHttps);
                if (cookieUrl == null) continue;

                // Clear any previous value for this cookie name on this host URL.
                String clearKey = cookieUrl + "|" + name;
                if (clearedUrls.add(clearKey)) {
                    cm.setCookie(cookieUrl, name + "=; Max-Age=0; path=" + path);
                    if (!omitDomain) {
                        cm.setCookie(cookieUrl, name + "=; Max-Age=0; path=" + path + "; domain=." + domain);
                    }
                }

                writeCookie(cm, cookieUrl, name, value, path, omitDomain ? null : domain, secure, sameSite, c);

                // Also host-only on exact destination host (matches extension fallback).
                if (destHost != null && !destHost.equalsIgnoreCase(domain)) {
                    String destCookieUrl = urlForDomain(destHost, path, urlHttps);
                    if (destCookieUrl != null) {
                        writeCookie(cm, destCookieUrl, name, value, path, null, secure, sameSite.isEmpty() ? "Lax" : sameSite, c);
                    }
                }

                // Panel dual-write: parent apex when known (toolaccess / xemrush / …)
                if (panelDest && destHost != null) {
                    String apex = panelApex(destHost);
                    if (apex == null) apex = registrableDomain(destHost);
                    if (apex != null && !apex.equalsIgnoreCase(domain) && !apex.equalsIgnoreCase(destHost)) {
                        String apexUrl = urlForDomain(apex, path, urlHttps);
                        if (apexUrl != null) {
                            writeCookie(
                                cm,
                                apexUrl,
                                name,
                                value,
                                path,
                                apex,
                                secure || destHttps,
                                sameSite.isEmpty() ? "Lax" : sameSite,
                                c
                            );
                        }
                    }
                }
            }
            cm.flush();
        } catch (Exception ignored) {
            /* best effort — still attempt to load */
        }
    }

    private void writeCookie(
        CookieManager cm,
        String cookieUrl,
        String name,
        String value,
        String path,
        String domainOrNull,
        boolean secure,
        String sameSite,
        JSONObject c
    ) {
        StringBuilder sb = new StringBuilder();
        sb.append(name).append("=").append(value);
        sb.append("; path=").append(path);
        if (domainOrNull != null && !domainOrNull.isEmpty() && !name.startsWith("__Host-")) {
            String d = domainOrNull.replaceAll("^\\.", "");
            sb.append("; domain=").append(".").append(d);
        }
        if (secure) sb.append("; Secure");
        if (c.optBoolean("httpOnly", false)) sb.append("; HttpOnly");
        if (!sameSite.isEmpty()) sb.append("; SameSite=").append(sameSite);

        long exp = 0;
        if (c.has("expirationDate")) exp = (long) c.optDouble("expirationDate", 0);
        else if (c.has("expires")) exp = (long) c.optDouble("expires", 0);
        if (exp > 1_000_000_000_000L) exp = exp / 1000L; // ms → s
        if (exp > 1_000_000_000L) {
            try {
                SimpleDateFormat fmt = new SimpleDateFormat("EEE, dd MMM yyyy HH:mm:ss 'GMT'", Locale.US);
                fmt.setTimeZone(TimeZone.getTimeZone("GMT"));
                sb.append("; Expires=").append(fmt.format(new Date(exp * 1000L)));
            } catch (Exception ignored) {
                /* ignore */
            }
        }

        cm.setCookie(cookieUrl, sb.toString());
    }

    private String normalizeSameSite(String raw) {
        String s = String.valueOf(raw == null ? "" : raw).trim().toLowerCase(Locale.US);
        // Match Chrome extension: "unspecified" means omit SameSite (do NOT force None).
        if (s.isEmpty() || s.equals("unspecified")) return "";
        if (s.equals("no_restriction") || s.equals("none")) return "None";
        if (s.equals("lax")) return "Lax";
        if (s.equals("strict")) return "Strict";
        return "";
    }

    private String panelApex(String host) {
        if (host == null) return null;
        String h = host.toLowerCase(Locale.US);
        if (h.equals("toolaccess.click") || h.endsWith(".toolaccess.click")) return "toolaccess.click";
        if (h.equals("xemrush.site") || h.endsWith(".xemrush.site")) return "xemrush.site";
        if (h.equals("semrush.site") || h.endsWith(".semrush.site")) return "semrush.site";
        return null;
    }

    private String hostFromUrl(String url) {
        try {
            return new URL(url).getHost().toLowerCase(Locale.US);
        } catch (Exception e) {
            return null;
        }
    }

    private String urlForDomain(String domain, String path, boolean secure) {
        if (domain == null || domain.isEmpty()) return null;
        String host = domain.replaceAll("^\\.", "");
        String scheme = secure ? "https" : "http";
        return scheme + "://" + host + (path != null && path.startsWith("/") ? path : "/");
    }

    @Override
    public void onBackPressed() {
        if (webView != null && webView.canGoBack()) {
            webView.goBack();
            return;
        }
        super.onBackPressed();
    }

    @Override
    protected void onDestroy() {
        if (webView != null) {
            webView.destroy();
            webView = null;
        }
        super.onDestroy();
    }
}
