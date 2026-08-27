package com.aitoolzmart.app;

import android.annotation.SuppressLint;
import android.graphics.Color;
import android.graphics.Typeface;
import android.os.Build;
import android.os.Bundle;
import android.text.TextUtils;
import android.util.TypedValue;
import android.view.Gravity;
import android.view.View;
import android.webkit.CookieManager;
import android.webkit.ServiceWorkerClient;
import android.webkit.ServiceWorkerController;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
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
 * In-app tool browser.
 * <ul>
 *   <li>Always uses desktop Chrome UA so panel + ChatGPT cookies stick.</li>
 *   <li>Panel tools default to scaled desktop layout.</li>
 *   <li>ChatGPT / OpenAI: desktop layout and NO viewport MutationObserver
 *       (mobile viewport + meta lock breaks streaming replies in WebView).</li>
 *   <li>Top-bar Desktop / Mobile toggles for panels / other tools.</li>
 * </ul>
 */
public class ToolWebViewActivity extends AppCompatActivity {

    static final String EXTRA_URL = "tool_url";
    static final String EXTRA_REFERRER = "tool_referrer";
    static final String EXTRA_TITLE = "tool_title";
    static final String EXTRA_COOKIES = "tool_cookies";

    private static final String UA_DESKTOP =
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

    private enum ViewMode { DESKTOP, MOBILE }

    private WebView webView;
    private String destinationUrl = "";
    private String referrerUrl = "";
    private ViewMode viewMode = ViewMode.DESKTOP;
    private TextView btnDesktop;
    private TextView btnMobile;
    private int screenPx;
    private float density;
    private int phoneCssPx;
    private boolean pageReady;
    /** Only inject panel viewport once per main document — never on iframe finishes. */
    private boolean viewportApplied;
    private String lastMainUrl = "";
    private boolean chatGptMode;

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

        density = Math.max(0.01f, getResources().getDisplayMetrics().density);
        screenPx = getResources().getDisplayMetrics().widthPixels;
        phoneCssPx = Math.max(320, Math.round(screenPx / density));

        // ChatGPT must use desktop layout without meta-viewport locking (streaming UI breaks otherwise).
        // Panel tools use scaled desktop. Other direct sites can use mobile.
        chatGptMode = isChatGptHost(hostFromUrl(destinationUrl));
        if (chatGptMode || prefersPanelDesktop()) {
            viewMode = ViewMode.DESKTOP;
        } else {
            viewMode = ViewMode.MOBILE;
        }

        LinearLayout root = new LinearLayout(this);
        root.setOrientation(LinearLayout.VERTICAL);
        root.setBackgroundColor(Color.parseColor("#0d0908"));

        LinearLayout bar = buildTopBar(title);
        root.addView(bar);

        webView = new WebView(this);
        webView.setLayerType(View.LAYER_TYPE_HARDWARE, null);
        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setDatabaseEnabled(true);
        settings.setMediaPlaybackRequiresUserGesture(false);
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_ALWAYS_ALLOW);
        settings.setJavaScriptCanOpenWindowsAutomatically(true);
        settings.setSupportMultipleWindows(false);
        // Never switch to mobile UA — panel + ChatGPT sessions drop with mobile UA.
        settings.setUserAgentString(UA_DESKTOP);
        settings.setUseWideViewPort(true);
        settings.setLoadWithOverviewMode(true);
        settings.setSupportZoom(true);
        settings.setBuiltInZoomControls(true);
        settings.setDisplayZoomControls(false);
        settings.setLayoutAlgorithm(WebSettings.LayoutAlgorithm.NORMAL);
        settings.setCacheMode(WebSettings.LOAD_DEFAULT);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            settings.setSafeBrowsingEnabled(true);
        }

        // Let ChatGPT service workers see the same cookies (needed for stream/session).
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
            try {
                ServiceWorkerController sw = ServiceWorkerController.getInstance();
                sw.getServiceWorkerWebSettings().setAllowContentAccess(true);
                sw.getServiceWorkerWebSettings().setCacheMode(WebSettings.LOAD_DEFAULT);
                sw.setServiceWorkerClient(new ServiceWorkerClient() {
                    @Override
                    public WebResourceResponse shouldInterceptRequest(WebResourceRequest request) {
                        // Do not intercept — returning a response here can break SSE/WebSocket streaming.
                        return null;
                    }
                });
            } catch (Exception ignored) {
                /* older WebView */
            }
        }

        CookieManager cm = CookieManager.getInstance();
        cm.setAcceptCookie(true);
        cm.setAcceptThirdPartyCookies(webView, true);
        applyCookies(cm, cookiesJson, destinationUrl);

        applyNativeScale();

        webView.setWebChromeClient(new WebChromeClient());
        webView.setWebViewClient(new WebViewClient() {
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                if (request == null || request.getUrl() == null) return false;
                // Only handle main-frame navigations for panel Referer; never touch XHR/fetch.
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N && !request.isForMainFrame()) {
                    return false;
                }
                String next = request.getUrl().toString();
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
            public void onPageStarted(WebView view, String url, android.graphics.Bitmap favicon) {
                String u = url != null ? url : "";
                if (!u.equals(lastMainUrl)) {
                    lastMainUrl = u;
                    viewportApplied = false;
                }
            }

            @Override
            public void onPageFinished(WebView view, String url) {
                pageReady = true;
                // ChatGPT: never mutate viewport / install MutationObserver — that kills stream UI.
                if (chatGptMode) {
                    injectChatGptStreamAssist();
                    return;
                }
                if (!viewportApplied) {
                    viewportApplied = true;
                    injectLockedViewport();
                }
            }
        });

        root.addView(webView, new LinearLayout.LayoutParams(
            LinearLayout.LayoutParams.MATCH_PARENT,
            0,
            1f
        ));
        setContentView(root);
        refreshToggleStyles();

        // ChatGPT: load without custom headers so fetch/WebSocket auth is clean.
        if (chatGptMode || referrerUrl.isEmpty()) {
            webView.loadUrl(destinationUrl);
        } else {
            webView.loadUrl(destinationUrl, unlockHeaders());
        }
    }

    private LinearLayout buildTopBar(String title) {
        LinearLayout bar = new LinearLayout(this);
        bar.setOrientation(LinearLayout.HORIZONTAL);
        bar.setBackgroundColor(Color.parseColor("#130d0d"));
        int padH = dp(12);
        int padV = dp(8);
        bar.setPadding(padH, padV, padH, padV);
        bar.setElevation(4f);
        bar.setLayoutParams(new LinearLayout.LayoutParams(
            LinearLayout.LayoutParams.MATCH_PARENT,
            dp(52)
        ));
        bar.setGravity(Gravity.CENTER_VERTICAL);

        ImageButton back = new ImageButton(this);
        back.setImageResource(android.R.drawable.ic_menu_close_clear_cancel);
        back.setBackgroundColor(Color.TRANSPARENT);
        back.setColorFilter(Color.parseColor("#fecaca"));
        back.setLayoutParams(new LinearLayout.LayoutParams(dp(36), dp(36)));
        back.setScaleType(android.widget.ImageView.ScaleType.CENTER_INSIDE);
        back.setPadding(padV, padV, padV, padV);
        back.setOnClickListener(v -> finish());
        bar.addView(back);

        TextView label = new TextView(this);
        label.setText(title != null && !title.isEmpty() ? title : "Tool");
        label.setTextColor(Color.parseColor("#ffffff"));
        label.setTextSize(TypedValue.COMPLEX_UNIT_SP, 14f);
        label.setSingleLine(true);
        label.setEllipsize(TextUtils.TruncateAt.END);
        label.setPadding(padH, 0, dp(6), 0);
        bar.addView(label, new LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT, 1f));

        btnDesktop = makeViewToggle("Desktop", ViewMode.DESKTOP);
        btnMobile = makeViewToggle("Mobile", ViewMode.MOBILE);
        bar.addView(btnDesktop);
        bar.addView(btnMobile);
        return bar;
    }

    private TextView makeViewToggle(String text, ViewMode mode) {
        TextView btn = new TextView(this);
        btn.setText(text);
        btn.setTextSize(TypedValue.COMPLEX_UNIT_SP, 11f);
        btn.setTypeface(Typeface.DEFAULT_BOLD);
        btn.setGravity(Gravity.CENTER);
        btn.setPadding(dp(10), dp(6), dp(10), dp(6));
        LinearLayout.LayoutParams lp = new LinearLayout.LayoutParams(
            LinearLayout.LayoutParams.WRAP_CONTENT,
            LinearLayout.LayoutParams.WRAP_CONTENT
        );
        lp.setMargins(dp(4), 0, 0, 0);
        btn.setLayoutParams(lp);
        btn.setOnClickListener(v -> setViewMode(mode));
        return btn;
    }

    private void setViewMode(ViewMode mode) {
        if (viewMode == mode) {
            if (pageReady && !chatGptMode) injectLockedViewport();
            return;
        }
        viewMode = mode;
        refreshToggleStyles();
        applyNativeScale();
        viewportApplied = false;
        if (pageReady) {
            if (chatGptMode) {
                // Soft reload keeps cookies; clears a stuck ChatGPT stream renderer.
                webView.reload();
            } else {
                injectLockedViewport();
                viewportApplied = true;
            }
        }
    }

    private void refreshToggleStyles() {
        styleToggle(btnDesktop, viewMode == ViewMode.DESKTOP);
        styleToggle(btnMobile, viewMode == ViewMode.MOBILE);
    }

    private void styleToggle(TextView btn, boolean active) {
        if (btn == null) return;
        if (active) {
            btn.setTextColor(Color.parseColor("#120405"));
            btn.setBackgroundColor(Color.parseColor("#F6D890"));
        } else {
            btn.setTextColor(Color.parseColor("#D6CDD0"));
            btn.setBackgroundColor(Color.parseColor("#351012"));
        }
    }

    private void applyNativeScale() {
        if (webView == null) return;
        if (viewMode == ViewMode.DESKTOP) {
            int desktopLayoutPx = chatGptMode ? 1100 : 1280;
            int initialScalePct = Math.max(30, Math.min(100, (screenPx * 100) / desktopLayoutPx));
            webView.setInitialScale(initialScalePct);
        } else {
            webView.setInitialScale(100);
        }
    }

    /**
     * Fixed viewport for panel / non-ChatGPT tools.
     * Never derives width from scrollWidth (typing shift).
     * No MutationObserver loop — that can thrash React apps mid-render.
     */
    private void injectLockedViewport() {
        if (webView == null || chatGptMode) return;
        final String content;
        if (viewMode == ViewMode.DESKTOP) {
            double scale = Math.min(1.0, (double) phoneCssPx / 1280.0);
            if (scale < 0.15) scale = 0.15;
            content = "width=1280, initial-scale=" + String.format(Locale.US, "%.4f", scale)
                + ", minimum-scale=0.15, maximum-scale=5, user-scalable=yes";
        } else {
            content = "width=device-width, initial-scale=1, minimum-scale=0.5, maximum-scale=5, user-scalable=yes";
        }

        String js = "(function(){"
            + "try{"
            + "var CONTENT=" + jsonString(content) + ";"
            + "var m=document.querySelector('meta[name=\"viewport\"]');"
            + "if(!m){m=document.createElement('meta');m.setAttribute('name','viewport');"
            + "(document.head||document.documentElement).appendChild(m);}"
            + "m.setAttribute('content',CONTENT);"
            + "}catch(e){}"
            + "})();";
        webView.evaluateJavascript(js, null);
    }

    /**
     * Light assist for ChatGPT in WebView: keep conversation scrolled into view when
     * the DOM grows (stream tokens). Does not touch viewport or network.
     */
    private void injectChatGptStreamAssist() {
        if (webView == null) return;
        String js = "(function(){"
            + "try{"
            + "if(window.__zynexGptAssist)return;"
            + "window.__zynexGptAssist=true;"
            + "function scrollChat(){"
            + "  try{"
            + "    var nodes=document.querySelectorAll('[data-message-author-role], main [class*=\"markdown\"], main');"
            + "    var el=nodes&&nodes.length?nodes[nodes.length-1]:null;"
            + "    if(el&&el.scrollIntoView)el.scrollIntoView({block:'end',behavior:'smooth'});"
            + "  }catch(e){}"
            + "}"
            + "var t=null;"
            + "var obs=new MutationObserver(function(){"
            + "  if(t)clearTimeout(t);"
            + "  t=setTimeout(scrollChat,120);"
            + "});"
            + "var root=document.body||document.documentElement;"
            + "obs.observe(root,{childList:true,subtree:true});"
            + "setTimeout(scrollChat,800);"
            + "}catch(e){}"
            + "})();";
        webView.evaluateJavascript(js, null);
    }

    private static String jsonString(String s) {
        if (s == null) return "\"\"";
        return "\"" + s.replace("\\", "\\\\").replace("\"", "\\\"") + "\"";
    }

    private int dp(int v) {
        return Math.round(v * density);
    }

    /** Panel hosts or unlock-referrer tools need the scaled desktop layout by default. */
    private boolean prefersPanelDesktop() {
        String destHost = hostFromUrl(destinationUrl);
        if (isPanelHost(destHost)) return true;
        if (!referrerUrl.isEmpty() && !isDirectLegalHost(destHost)) return true;
        return false;
    }

    private boolean isChatGptHost(String host) {
        if (host == null) return false;
        String h = host.toLowerCase(Locale.US);
        return h.equals("chatgpt.com")
            || h.endsWith(".chatgpt.com")
            || h.equals("chat.openai.com")
            || h.endsWith(".openai.com");
    }

    private boolean isDirectLegalHost(String host) {
        if (host == null) return false;
        String h = host.toLowerCase(Locale.US);
        return isChatGptHost(h)
            || h.equals("canva.com")
            || h.endsWith(".canva.com")
            || h.equals("www.canva.com")
            || h.contains("grammarly.com")
            || h.contains("notion.so")
            || h.contains("midjourney.com");
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

                boolean omitDomain = hostOnly || name.startsWith("__Host-");
                boolean urlHttps = destHttps || secure;
                String cookieUrl = urlForDomain(domain, path, urlHttps);
                if (cookieUrl == null) continue;

                String clearKey = cookieUrl + "|" + name;
                if (clearedUrls.add(clearKey)) {
                    cm.setCookie(cookieUrl, name + "=; Max-Age=0; path=" + path);
                    if (!omitDomain) {
                        cm.setCookie(cookieUrl, name + "=; Max-Age=0; path=" + path + "; domain=." + domain);
                    }
                }

                writeCookie(cm, cookieUrl, name, value, path, omitDomain ? null : domain, secure, sameSite, c);

                if (destHost != null && !destHost.equalsIgnoreCase(domain)) {
                    String destCookieUrl = urlForDomain(destHost, path, urlHttps);
                    if (destCookieUrl != null) {
                        writeCookie(cm, destCookieUrl, name, value, path, null, secure, sameSite.isEmpty() ? "Lax" : sameSite, c);
                    }
                }

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
            /* best effort */
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
        if (exp > 1_000_000_000_000L) exp = exp / 1000L;
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
