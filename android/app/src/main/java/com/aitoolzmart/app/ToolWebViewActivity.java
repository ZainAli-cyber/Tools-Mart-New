package com.aitoolzmart.app;

import android.annotation.SuppressLint;
import android.graphics.Color;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.view.View;
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
import java.util.HashMap;
import java.util.HashSet;
import java.util.Locale;
import java.util.Map;
import java.util.Set;

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
        label.setEllipsize(android.text.TextUtils.TruncateAt.END);
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
        settings.setUserAgentString(
            "Mozilla/5.0 (Linux; Android 13; Mobile) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36 AI-Toolz-Mart/1.0"
        );

        CookieManager cm = CookieManager.getInstance();
        cm.setAcceptCookie(true);
        cm.setAcceptThirdPartyCookies(webView, true);

        applyCookies(cm, cookiesJson, destinationUrl);

        webView.setWebChromeClient(new WebChromeClient());
        webView.setWebViewClient(new WebViewClient() {
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                return false;
            }
        });

        root.addView(bar);
        root.addView(webView, new LinearLayout.LayoutParams(
            LinearLayout.LayoutParams.MATCH_PARENT,
            LinearLayout.LayoutParams.MATCH_PARENT
        ));
        setContentView(root);

        Map<String, String> headers = new HashMap<>();
        if (!referrerUrl.isEmpty()) {
            headers.put("Referer", referrerUrl);
            try {
                headers.put("Origin", new URL(referrerUrl).getProtocol() + "://" + new URL(referrerUrl).getHost());
            } catch (Exception ignored) {
                /* ignore */
            }
        }
        webView.loadUrl(destinationUrl, headers);
    }

    private void applyCookies(CookieManager cm, String cookiesJson, String destUrl) {
        if (cookiesJson == null || cookiesJson.trim().isEmpty()) return;
        try {
            JSONArray list = new JSONArray(cookiesJson);
            String destHost = hostFromUrl(destUrl);
            boolean destHttps = destUrl.toLowerCase(Locale.US).startsWith("https://");
            Set<String> cleared = new HashSet<>();

            for (int i = 0; i < list.length(); i++) {
                JSONObject c = list.optJSONObject(i);
                if (c == null) continue;
                String name = c.optString("name", "").trim();
                if (name.isEmpty()) continue;
                String value = c.optString("value", "");
                String path = c.optString("path", "/");
                if (path.isEmpty()) path = "/";
                String domain = c.optString("domain", "").trim();
                boolean secure = c.optBoolean("secure", destHttps);

                if (domain.isEmpty() && destHost != null) domain = destHost;
                domain = domain.replaceAll("^\\.", "");

                String cookieUrl = urlForDomain(domain, path, secure);
                if (cookieUrl != null && cleared.add(cookieUrl + "|" + domain)) {
                    cm.setCookie(cookieUrl, name + "=; Max-Age=0; path=" + path);
                }

                StringBuilder sb = new StringBuilder();
                sb.append(name).append("=").append(value);
                sb.append("; path=").append(path);
                if (!name.startsWith("__Host-") && !domain.isEmpty()) {
                    sb.append("; domain=").append(domain.startsWith(".") ? domain : "." + domain);
                }
                if (secure) sb.append("; Secure");
                if (cookieUrl != null) cm.setCookie(cookieUrl, sb.toString());
            }
            cm.flush();
        } catch (Exception ignored) {
            /* best effort */
        }
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
