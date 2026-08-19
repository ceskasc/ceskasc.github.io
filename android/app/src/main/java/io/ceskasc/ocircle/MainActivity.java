package io.ceskasc.ocircle;

import android.annotation.SuppressLint;
import android.app.Activity;
import android.content.Context;
import android.content.Intent;
import android.graphics.Color;
import android.net.Uri;
import android.os.Bundle;
import android.os.VibrationEffect;
import android.os.Vibrator;
import android.webkit.JavascriptInterface;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;

import org.json.JSONArray;

public class MainActivity extends Activity {
    private WebView webView;
    private static final String HOME = "https://ceskasc.github.io/o/?native=android";

    @SuppressLint({"SetJavaScriptEnabled", "AddJavascriptInterface"})
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        getWindow().setStatusBarColor(Color.rgb(8, 8, 7));
        getWindow().setNavigationBarColor(Color.rgb(8, 8, 7));

        webView = new WebView(this);
        webView.setBackgroundColor(Color.rgb(12, 12, 11));
        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setDatabaseEnabled(true);
        settings.setSupportZoom(false);
        settings.setBuiltInZoomControls(false);
        settings.setDisplayZoomControls(false);
        settings.setMediaPlaybackRequiresUserGesture(true);
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        settings.setUserAgentString(settings.getUserAgentString() + " OAndroid/8.0");

        WebView.setWebContentsDebuggingEnabled(false);
        webView.addJavascriptInterface(new NativeBridge(this), "OAndroid");
        webView.setWebChromeClient(new WebChromeClient());
        webView.setWebViewClient(new WebViewClient() {
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                Uri uri = request.getUrl();
                String host = uri.getHost() == null ? "" : uri.getHost();
                if ("ceskasc.github.io".equals(host)) return false;
                try {
                    startActivity(new Intent(Intent.ACTION_VIEW, uri));
                } catch (Exception ignored) {}
                return true;
            }

            @Override
            public void onPageFinished(WebView view, String url) {
                super.onPageFinished(view, url);
                injectNativePolyfills();
            }
        });

        setContentView(webView);
        if (savedInstanceState == null) webView.loadUrl(HOME);
        else webView.restoreState(savedInstanceState);
    }

    private void injectNativePolyfills() {
        String js = "(function(){" +
            "try{" +
            "if(!navigator.share){navigator.share=function(d){OAndroid.share(String(d&&d.title||''),String(d&&d.text||''),String(d&&d.url||''));return Promise.resolve();};}" +
            "if(!navigator.vibrate){navigator.vibrate=function(p){OAndroid.vibrate(JSON.stringify(p));return true;};}" +
            "window.__O_NATIVE__={platform:'android',version:'8.0'};" +
            "}catch(e){}" +
            "})();";
        webView.evaluateJavascript(js, null);
    }

    @Override
    protected void onSaveInstanceState(Bundle outState) {
        webView.saveState(outState);
        super.onSaveInstanceState(outState);
    }

    @Override
    public void onBackPressed() {
        if (webView != null && webView.canGoBack()) webView.goBack();
        else super.onBackPressed();
    }

    public static class NativeBridge {
        private final Context context;
        NativeBridge(Context context) { this.context = context; }

        @JavascriptInterface
        public void share(String title, String text, String url) {
            Intent send = new Intent(Intent.ACTION_SEND);
            send.setType("text/plain");
            String body = text == null ? "" : text;
            if (url != null && !url.isEmpty()) body = body.isEmpty() ? url : body + "\n" + url;
            send.putExtra(Intent.EXTRA_SUBJECT, title == null ? "O." : title);
            send.putExtra(Intent.EXTRA_TEXT, body);
            Intent chooser = Intent.createChooser(send, "Share O.");
            chooser.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            context.startActivity(chooser);
        }

        @JavascriptInterface
        public void vibrate(String json) {
            try {
                Vibrator vibrator = (Vibrator) context.getSystemService(Context.VIBRATOR_SERVICE);
                if (vibrator == null || !vibrator.hasVibrator()) return;
                if (json != null && json.trim().startsWith("[")) {
                    JSONArray arr = new JSONArray(json);
                    long[] pattern = new long[arr.length() + 1];
                    pattern[0] = 0;
                    for (int i = 0; i < arr.length(); i++) pattern[i + 1] = Math.max(0, arr.optLong(i, 0));
                    vibrator.vibrate(VibrationEffect.createWaveform(pattern, -1));
                } else {
                    long ms = 12;
                    try { ms = Math.max(1, Long.parseLong(String.valueOf(json).replace("\"", ""))); } catch (Exception ignored) {}
                    vibrator.vibrate(VibrationEffect.createOneShot(ms, VibrationEffect.DEFAULT_AMPLITUDE));
                }
            } catch (Exception ignored) {}
        }
    }
}
