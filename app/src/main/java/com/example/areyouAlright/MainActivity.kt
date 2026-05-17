package com.example.areyouAlright

import android.annotation.SuppressLint
import android.content.Intent
import android.os.Bundle
import android.util.Log
import android.view.ViewGroup
import android.webkit.WebResourceError
import android.webkit.WebResourceRequest
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import android.widget.Toast
import androidx.activity.OnBackPressedCallback
import androidx.activity.result.contract.ActivityResultContracts
import androidx.appcompat.app.AppCompatActivity
import com.google.android.gms.auth.api.signin.GoogleSignIn
import com.google.android.gms.auth.api.signin.GoogleSignInOptions
import com.google.android.gms.common.api.ApiException
import com.google.firebase.auth.FirebaseAuth
import com.google.firebase.auth.GoogleAuthProvider
import com.google.firebase.messaging.FirebaseMessaging

class MainActivity : AppCompatActivity() {

    private lateinit var webView: WebView
    private lateinit var auth: FirebaseAuth
    private val TAG = "AreYouAlright"

    private val signInLauncher = registerForActivityResult(
        ActivityResultContracts.StartActivityForResult()
    ) { result ->
        try {
            val account = GoogleSignIn
                .getSignedInAccountFromIntent(result.data)
                .getResult(ApiException::class.java)!!
            firebaseAuthWithGoogle(account.idToken!!)
        } catch (e: ApiException) {
            Log.e(TAG, "Google sign-in failed: ${e.statusCode}")
            Toast.makeText(this, "Sign-in failed. Please try again.", Toast.LENGTH_SHORT).show()
        }
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        auth = FirebaseAuth.getInstance()
        if (auth.currentUser != null) setupWebView() else launchGoogleSignIn()
        FirebaseMessaging.getInstance().token.addOnCompleteListener { task ->
            if (task.isSuccessful) Log.d(TAG, "FCM Token: ${task.result?.take(12)}…")
        }
    }

    private fun launchGoogleSignIn() {
        val gso = GoogleSignInOptions.Builder(GoogleSignInOptions.DEFAULT_SIGN_IN)
            .requestIdToken(getString(R.string.default_web_client_id))
            .requestEmail().build()
        signInLauncher.launch(GoogleSignIn.getClient(this, gso).signInIntent)
    }

    private fun firebaseAuthWithGoogle(idToken: String) {
        auth.signInWithCredential(GoogleAuthProvider.getCredential(idToken, null))
            .addOnCompleteListener(this) { task ->
                if (task.isSuccessful) {
                    Log.d(TAG, "Auth OK: ${auth.currentUser?.email}")
                    setupWebView()
                } else {
                    Toast.makeText(this, "Authentication failed.", Toast.LENGTH_SHORT).show()
                }
            }
    }

    @SuppressLint("SetJavaScriptEnabled")
    private fun setupWebView() {
        webView = WebView(this)
        webView.settings.apply {
            javaScriptEnabled = true
            domStorageEnabled = true
            databaseEnabled = true
            useWideViewPort = true
            loadWithOverviewMode = true
            textZoom = 100
            cacheMode = WebSettings.LOAD_DEFAULT
            mixedContentMode = WebSettings.MIXED_CONTENT_NEVER_ALLOW
        }
        webView.webViewClient = AreYouAliveWebViewClient()
        webView.layoutParams = ViewGroup.LayoutParams(
            ViewGroup.LayoutParams.MATCH_PARENT,
            ViewGroup.LayoutParams.MATCH_PARENT
        )
        setContentView(webView)
        title = BuildConfig.APP_NAME
        webView.loadUrl(BuildConfig.API_BASE_URL)

        onBackPressedDispatcher.addCallback(this, object : OnBackPressedCallback(true) {
            override fun handleOnBackPressed() {
                if (webView.canGoBack()) webView.goBack()
                else { isEnabled = false; onBackPressedDispatcher.onBackPressed() }
            }
        })
    }

    private inner class AreYouAliveWebViewClient : WebViewClient() {
        override fun onPageStarted(v: WebView?, url: String?, f: android.graphics.Bitmap?) {
            super.onPageStarted(v, url, f); Log.d(TAG, "Loading: $url")
        }
        override fun onPageFinished(v: WebView?, url: String?) {
            super.onPageFinished(v, url); Log.d(TAG, "Loaded: $url")
        }
        override fun onReceivedError(v: WebView?, req: WebResourceRequest?, err: WebResourceError?) {
            super.onReceivedError(v, req, err)
            if (req?.isForMainFrame == false) return
            v?.loadData(
                "<html><body style='font-family:sans-serif;text-align:center;padding:3rem'>" +
                "<h2 style='color:#d32f2f'>Connection Error</h2>" +
                "<p>Check your internet connection and try again.</p></body></html>",
                "text/html", "utf-8"
            )
        }
        override fun shouldOverrideUrlLoading(v: WebView?, req: WebResourceRequest?) = false
    }
}
