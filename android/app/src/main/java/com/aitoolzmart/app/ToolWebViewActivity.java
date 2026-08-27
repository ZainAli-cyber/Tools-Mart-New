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
 *   <li>Panel tools: desktop Chrome UA + scaled desktop layout (cookies).</li>
 *   <li>ChatGPT: real WebView/Chrome UA (no fake Windows UA / no scale shrink) so
 *       conversation streams work; fetch SSE is re-piped via XHR ReadableStream.</li>
 *   <li>Top-bar Desktop / Mobile / Refresh controls.</li>
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
    /** Stock WebView UA (Chrome/Android) — required for ChatGPT live streams. */
    private String uaWebViewDefault = "";

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

        // ChatGPT: mobile WebView UA + no desktop scale (streaming breaks with Windows UA).
        // Panels: desktop UA + scaled layout for cookies / full UI.
        chatGptMode = isChatGptHost(hostFromUrl(destinationUrl));
        if (chatGptMode) {
            viewMode = ViewMode.MOBILE;
        } else if (prefersPanelDesktop()) {
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
        uaWebViewDefault = String.valueOf(settings.getUserAgentString());
        applyUserAgent(settings);
        settings.setUseWideViewPort(true);
        settings.setLoadWithOverviewMode(!chatGptMode);
        settings.setSupportZoom(true);
        settings.setBuiltInZoomControls(true);
        settings.setDisplayZoomControls(false);
        settings.setLayoutAlgorithm(WebSettings.LayoutAlgorithm.NORMAL);
        settings.setCacheMode(WebSettings.LOAD_DEFAULT);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            settings.setSafeBrowsingEnabled(true);
        }

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
            try {
                ServiceWorkerController sw = ServiceWorkerController.getInstance();
                sw.getServiceWorkerWebSettings().setAllowContentAccess(true);
                sw.getServiceWorkerWebSettings().setCacheMode(WebSettings.LOAD_DEFAULT);
                sw.setServiceWorkerClient(new ServiceWorkerClient() {
                    @Override
                    public WebResourceResponse shouldInterceptRequest(WebResourceRequest request) {
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
        cm.flush();

        applyNativeScale();

        webView.setWebChromeClient(new WebChromeClient());
        webView.setWebViewClient(new WebViewClient() {
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                if (request == null || request.getUrl() == null) return false;
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
                // Patch fetch ASAP — ChatGPT boots conversation APIs during load.
                if (chatGptMode) injectChatGptStreamFix();
            }

            @Override
            public void onPageFinished(WebView view, String url) {
                pageReady = true;
                if (chatGptMode) {
                    injectChatGptStreamFix();
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

        if (chatGptMode || referrerUrl.isEmpty()) {
            webView.loadUrl(destinationUrl);
        } else {
            webView.loadUrl(destinationUrl, unlockHeaders());
        }
    }

    private void applyUserAgent(WebSettings settings) {
        if (settings == null) return;
        if (chatGptMode) {
            // Real WebView Chrome UA — fake Windows UA breaks ChatGPT live streams.
            if (viewMode == ViewMode.DESKTOP) {
                settings.setUserAgentString(UA_DESKTOP);
            } else if (uaWebViewDefault != null && !uaWebViewDefault.isEmpty()) {
                settings.setUserAgentString(uaWebViewDefault);
            }
        } else {
            settings.setUserAgentString(UA_DESKTOP);
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

        TextView btnRefresh = new TextView(this);
        btnRefresh.setText("↻");
        btnRefresh.setTextSize(TypedValue.COMPLEX_UNIT_SP, 16f);
        btnRefresh.setTypeface(Typeface.DEFAULT_BOLD);
        btnRefresh.setGravity(Gravity.CENTER);
        btnRefresh.setTextColor(Color.parseColor("#F6D890"));
        btnRefresh.setPadding(dp(10), dp(6), dp(10), dp(6));
        LinearLayout.LayoutParams rlp = new LinearLayout.LayoutParams(
            LinearLayout.LayoutParams.WRAP_CONTENT,
            LinearLayout.LayoutParams.WRAP_CONTENT
        );
        rlp.setMargins(dp(4), 0, 0, 0);
        btnRefresh.setLayoutParams(rlp);
        btnRefresh.setOnClickListener(v -> {
            if (webView != null) webView.reload();
        });
        bar.addView(btnRefresh);
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
        if (webView != null) applyUserAgent(webView.getSettings());
        applyNativeScale();
        viewportApplied = false;
        if (pageReady) {
            if (chatGptMode) {
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
        // ChatGPT: never shrink — scale hacks break the live reply renderer.
        if (chatGptMode) {
            webView.setInitialScale(100);
            return;
        }
        if (viewMode == ViewMode.DESKTOP) {
            int desktopLayoutPx = 1280;
            int initialScalePct = Math.max(30, Math.min(100, (screenPx * 100) / desktopLayoutPx));
            webView.setInitialScale(initialScalePct);
        } else {
            webView.setInitialScale(100);
        }
    }

    /**
     * Fixed viewport for panel / non-ChatGPT tools.
     * Never derives width from scrollWidth (typing shift).
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
     * ChatGPT on Android WebView often fails fetch ReadableStream / SSE, so replies
     * complete on the server but never paint. Re-pipe conversation streams through
     * XHR (incremental responseText) into a real ReadableStream the SPA can read.
     */
    private void injectChatGptStreamFix() {
        if (webView == null) return;
        String js = "(function(){"
            + "try{"
            + "if(window.__zynexGptSse)return;"
            + "window.__zynexGptSse=true;"
            + "var nativeFetch=window.fetch.bind(window);"
            + "function hdrGet(h,n){"
            + "  if(!h)return '';"
            + "  n=String(n).toLowerCase();"
            + "  if(typeof h.get==='function'){try{return h.get(n)||h.get(String(n))||'';}catch(e){}}"
            + "  if(Array.isArray(h)){"
            + "    for(var i=0;i<h.length;i++){if(String(h[i][0]).toLowerCase()===n)return h[i][1];}"
            + "    return '';"
            + "  }"
            + "  for(var k in h){if(Object.prototype.hasOwnProperty.call(h,k)&&String(k).toLowerCase()===n)return h[k];}"
            + "  return '';"
            + "}"
            + "function shouldPipe(url,init){"
            + "  var u=String(url||'');"
            + "  if(/text\\/event-stream/i.test(hdrGet(init&&init.headers,'Accept')))return true;"
            + "  if(/text\\/event-stream/i.test(hdrGet(init&&init.headers,'accept')))return true;"
            + "  return /\\/backend-api\\/(conversation|f\\/conversation)/i.test(u);"
            + "}"
            + "function applyHeaders(xhr,headers){"
            + "  if(!headers)return;"
            + "  if(typeof headers.forEach==='function'){"
            + "    headers.forEach(function(v,k){try{xhr.setRequestHeader(k,v);}catch(e){}});"
            + "    return;"
            + "  }"
            + "  if(Array.isArray(headers)){"
            + "    for(var i=0;i<headers.length;i++){"
            + "      try{xhr.setRequestHeader(headers[i][0],headers[i][1]);}catch(e){}"
            + "    }"
            + "    return;"
            + "  }"
            + "  Object.keys(headers).forEach(function(k){"
            + "    try{xhr.setRequestHeader(k,headers[k]);}catch(e){}"
            + "  });"
            + "}"
            + "function xhrStream(input,init){"
            + "  init=init||{};"
            + "  return new Promise(function(resolve,reject){"
            + "    var url=typeof input==='string'?input:(input&&input.url)||'';"
            + "    var method=(init.method||'GET').toUpperCase();"
            + "    var xhr=new XMLHttpRequest();"
            + "    xhr.open(method,url,true);"
            + "    xhr.withCredentials=true;"
            + "    xhr.responseType='text';"
            + "    applyHeaders(xhr,init.headers);"
            + "    try{xhr.setRequestHeader('Accept','text/event-stream');}catch(e){}"
            + "    var encoder=new TextEncoder();"
            + "    var controller=null;"
            + "    var emitted=0;"
            + "    var settled=false;"
            + "    var stream=new ReadableStream({"
            + "      start:function(c){controller=c;}"
            + "    });"
            + "    function pump(){"
            + "      if(!controller)return;"
            + "      var text=xhr.responseText||'';"
            + "      if(text.length>emitted){"
            + "        var chunk=text.slice(emitted);"
            + "        emitted=text.length;"
            + "        try{controller.enqueue(encoder.encode(chunk));}catch(e){}"
            + "      }"
            + "    }"
            + "    xhr.onprogress=pump;"
            + "    xhr.onreadystatechange=function(){"
            + "      if(xhr.readyState>=2&&!settled){"
            + "        settled=true;"
            + "        var rh={'content-type':xhr.getResponseHeader('content-type')||'text/event-stream'};"
            + "        resolve(new Response(stream,{status:xhr.status||200,statusText:xhr.statusText||'',headers:rh}));"
            + "      }"
            + "    };"
            + "    xhr.onload=function(){"
            + "      pump();"
            + "      try{if(controller)controller.close();}catch(e){}"
            + "      try{"
            + "        setTimeout(function(){"
            + "          var nodes=document.querySelectorAll('[data-message-author-role=\"assistant\"]');"
            + "          var el=nodes&&nodes.length?nodes[nodes.length-1]:null;"
            + "          if(el&&el.scrollIntoView)el.scrollIntoView({block:'end'});"
            + "        },200);"
            + "      }catch(e){}"
            + "    };"
            + "    xhr.onerror=function(){"
            + "      try{if(controller)controller.error(new Error('stream failed'));}catch(e){}"
            + "      if(!settled)reject(new TypeError('Failed to fetch'));"
            + "    };"
            + "    xhr.send(init.body!=null?init.body:null);"
            + "  });"
            + "}"
            + "window.fetch=function(input,init){"
            + "  try{"
            + "    var url=typeof input==='string'?input:(input&&input.url)||'';"
            + "    if(shouldPipe(url,init||{}))return xhrStream(input,init||{});"
            + "  }catch(e){}"
            + "  return nativeFetch(input,init);"
            + "};"
            + "function scrollChat(){"
            + "  try{"
            + "    var nodes=document.querySelectorAll('[data-message-author-role], main');"
            + "    var el=nodes&&nodes.length?nodes[nodes.length-1]:null;"
            + "    if(el&&el.scrollIntoView)el.scrollIntoView({block:'end',behavior:'smooth'});"
            + "  }catch(e){}"
            + "}"
            + "var t=null;"
            + "try{"
            + "  new MutationObserver(function(){"
            + "    if(t)clearTimeout(t);"
            + "    t=setTimeout(scrollChat,150);"
            + "  }).observe(document.documentElement,{childList:true,subtree:true});"
            + "}catch(e){}"
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
