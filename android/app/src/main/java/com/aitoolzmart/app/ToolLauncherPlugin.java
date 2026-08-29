package com.aitoolzmart.app;

import android.content.Intent;
import android.util.Log;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "ToolLauncher")
public class ToolLauncherPlugin extends Plugin {

    private static final String TAG = "ToolLauncher";

    @PluginMethod
    public void isAvailable(PluginCall call) {
        JSObject ret = new JSObject();
        ret.put("available", true);
        call.resolve(ret);
    }

    @PluginMethod
    public void launch(PluginCall call) {
        String url = call.getString("url", "").trim();
        if (url.isEmpty()) {
            call.reject("url is required");
            return;
        }

        String referrer = call.getString("referrer", "").trim();
        String title = call.getString("title", "Tool").trim();
        JSArray cookies = call.getArray("cookies", new JSArray());

        try {
            android.app.Activity activity = getActivity();
            if (activity == null) {
                call.reject("App activity not available");
                return;
            }
            Intent intent = new Intent(activity, ToolWebViewActivity.class);
            intent.putExtra(ToolWebViewActivity.EXTRA_URL, url);
            intent.putExtra(ToolWebViewActivity.EXTRA_REFERRER, referrer);
            intent.putExtra(ToolWebViewActivity.EXTRA_TITLE, title);
            intent.putExtra(ToolWebViewActivity.EXTRA_COOKIES, cookies.toString());
            activity.startActivity(intent);

            JSObject ret = new JSObject();
            ret.put("ok", true);
            call.resolve(ret);
        } catch (Exception e) {
            Log.e(TAG, "launch failed", e);
            call.reject("Could not open tool: " + e.getMessage());
        }
    }
}
