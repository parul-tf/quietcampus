import os
import subprocess
import shutil

BUILD_TOOLS = r"C:\Users\thaku\AppData\Local\Android\Sdk\build-tools\35.0.0"
PLATFORM_JAR = r"C:\Users\thaku\AppData\Local\Android\Sdk\platforms\android-36\android.jar"
JDK_BIN = r"C:\Program Files\Java\jdk-18.0.2.1\bin"
SOURCE_DIR = r"C:\Users\thaku\.gemini\antigravity\scratch\quietcampus-sdg-app"
BUILD_DIR = os.path.join(SOURCE_DIR, "android_build")
RES_SOURCE = os.path.join(SOURCE_DIR, "android_res")

AAPT = os.path.join(BUILD_TOOLS, "aapt.exe")
D8 = os.path.join(BUILD_TOOLS, "d8.bat")
ZIPALIGN = os.path.join(BUILD_TOOLS, "zipalign.exe")
APKSIGNER = os.path.join(BUILD_TOOLS, "apksigner.bat")
JAVAC = os.path.join(JDK_BIN, "javac.exe")
KEYTOOL = os.path.join(JDK_BIN, "keytool.exe")

def run(cmd, cwd=None):
    print("Running:", " ".join(cmd) if isinstance(cmd, list) else cmd)
    res = subprocess.run(cmd, cwd=cwd, shell=True, capture_output=True, text=True)
    if res.returncode != 0:
        print("STDOUT:", res.stdout)
        print("STDERR:", res.stderr)
        raise RuntimeError(f"Command failed with code {res.returncode}")
    return res.stdout

def main():
    if os.path.exists(BUILD_DIR):
        shutil.rmtree(BUILD_DIR)

    os.makedirs(os.path.join(BUILD_DIR, "src", "edu", "bennett", "quietcampus"), exist_ok=True)
    os.makedirs(os.path.join(BUILD_DIR, "gen"), exist_ok=True)
    os.makedirs(os.path.join(BUILD_DIR, "obj"), exist_ok=True)
    os.makedirs(os.path.join(BUILD_DIR, "dex"), exist_ok=True)
    os.makedirs(os.path.join(BUILD_DIR, "res", "values"), exist_ok=True)
    os.makedirs(os.path.join(BUILD_DIR, "assets"), exist_ok=True)

    # 1. Copy mipmap icons
    if os.path.exists(RES_SOURCE):
        for item in os.listdir(RES_SOURCE):
            src_sub = os.path.join(RES_SOURCE, item)
            dst_sub = os.path.join(BUILD_DIR, "res", item)
            if os.path.isdir(src_sub):
                shutil.copytree(src_sub, dst_sub, dirs_exist_ok=True)
                print(f"Copied icon directory: {item}")

    # 2. Write strings.xml
    with open(os.path.join(BUILD_DIR, "res", "values", "strings.xml"), "w", encoding="utf-8") as f:
        f.write('''<?xml version="1.0" encoding="utf-8"?>
<resources>
    <string name="app_name">QuietCampus</string>
</resources>''')

    # 3. Write AndroidManifest.xml with targetSdkVersion=34, minSdk=24, screen density support
    manifest_path = os.path.join(BUILD_DIR, "AndroidManifest.xml")
    with open(manifest_path, "w", encoding="utf-8") as f:
        f.write('''<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android"
    package="edu.bennett.quietcampus"
    android:versionCode="2"
    android:versionName="1.1.0">

    <uses-sdk
        android:minSdkVersion="24"
        android:targetSdkVersion="34" />

    <supports-screens
        android:smallScreens="true"
        android:normalScreens="true"
        android:largeScreens="true"
        android:xlargeScreens="true"
        android:anyDensity="true" />

    <uses-permission android:name="android.permission.RECORD_AUDIO" />
    <uses-permission android:name="android.permission.MODIFY_AUDIO_SETTINGS" />
    <uses-permission android:name="android.permission.INTERNET" />

    <uses-feature
        android:name="android.hardware.microphone"
        android:required="false" />

    <application
        android:label="@string/app_name"
        android:icon="@mipmap/ic_launcher"
        android:roundIcon="@mipmap/ic_launcher_round"
        android:theme="@android:style/Theme.NoTitleBar"
        android:hardwareAccelerated="true"
        android:usesCleartextTraffic="true"
        android:allowBackup="true"
        android:supportsRtl="true"
        android:extractNativeLibs="true">
        <activity
            android:name=".MainActivity"
            android:exported="true"
            android:screenOrientation="portrait"
            android:configChanges="orientation|keyboardHidden|screenSize">
            <intent-filter>
                <action android:name="android.intent.action.MAIN" />
                <category android:name="android.intent.category.LAUNCHER" />
            </intent-filter>
        </activity>
    </application>
</manifest>''')

    # 4. Write MainActivity.java
    java_file = os.path.join(BUILD_DIR, "src", "edu", "bennett", "quietcampus", "MainActivity.java")
    with open(java_file, "w", encoding="utf-8") as f:
        f.write('''package edu.bennett.quietcampus;

import android.app.Activity;
import android.os.Bundle;
import android.webkit.WebView;
import android.webkit.WebSettings;
import android.webkit.WebViewClient;
import android.webkit.WebChromeClient;
import android.webkit.PermissionRequest;
import android.content.pm.PackageManager;
import android.Manifest;

public class MainActivity extends Activity {
    private static final int PERMISSION_REQ = 101;
    private WebView webView;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        webView = new WebView(this);
        setContentView(webView);

        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setMediaPlaybackRequiresUserGesture(false);
        settings.setAllowFileAccess(true);
        settings.setAllowContentAccess(true);
        settings.setAllowFileAccessFromFileURLs(true);
        settings.setAllowUniversalAccessFromFileURLs(true);
        settings.setDatabaseEnabled(true);

        webView.setWebViewClient(new WebViewClient());
        webView.setWebChromeClient(new WebChromeClient() {
            @Override
            public void onPermissionRequest(final PermissionRequest request) {
                runOnUiThread(new Runnable() {
                    @Override
                    public void run() {
                        request.grant(request.getResources());
                    }
                });
            }
        });

        if (checkSelfPermission(Manifest.permission.RECORD_AUDIO) != PackageManager.PERMISSION_GRANTED) {
            requestPermissions(new String[]{Manifest.permission.RECORD_AUDIO}, PERMISSION_REQ);
        }

        webView.loadUrl("file:///android_asset/app.html");
    }

    @Override
    public void onBackPressed() {
        if (webView != null && webView.canGoBack()) {
            webView.goBack();
        } else {
            super.onBackPressed();
        }
    }
}
''')

    # 5. Copy Web Assets into assets/
    asset_files = [
        "app.html",
        "mobile-app.js",
        "mobile-app.css",
        "audio-engine.js",
        "data.js",
        "styles.css",
        "three.min.js",
        "manifest.json",
        "app-logo.png",
        "favicon.png"
    ]
    for af in asset_files:
        src = os.path.join(SOURCE_DIR, af)
        if os.path.exists(src):
            shutil.copy2(src, os.path.join(BUILD_DIR, "assets", af))

    # 6. Generate R.java and initial package with aapt
    res_dir = os.path.join(BUILD_DIR, "res")
    gen_dir = os.path.join(BUILD_DIR, "gen")
    assets_dir = os.path.join(BUILD_DIR, "assets")
    unsigned_apk = os.path.join(BUILD_DIR, "unsigned.apk")

    cmd_aapt = [
        f'"{AAPT}"',
        'package',
        '-f',
        '-m',
        '--min-sdk-version', '24',
        '--target-sdk-version', '34',
        '-J', f'"{gen_dir}"',
        '-M', f'"{manifest_path}"',
        '-S', f'"{res_dir}"',
        '-I', f'"{PLATFORM_JAR}"',
        '-A', f'"{assets_dir}"',
        '-F', f'"{unsigned_apk}"'
    ]
    run(" ".join(cmd_aapt))
    print("AAPT package successful!")

    # 7. Compile Java with javac
    obj_dir = os.path.join(BUILD_DIR, "obj")
    r_java = os.path.join(gen_dir, "edu", "bennett", "quietcampus", "R.java")
    cmd_javac = [
        f'"{JAVAC}"',
        '-cp', f'"{PLATFORM_JAR}"',
        '-d', f'"{obj_dir}"',
        f'"{r_java}"',
        f'"{java_file}"'
    ]
    run(" ".join(cmd_javac))
    print("JAVAC compilation successful!")

    # 8. Convert class files to classes.dex with d8
    dex_dir = os.path.join(BUILD_DIR, "dex")
    class_files = []
    classes_path = os.path.join(obj_dir, "edu", "bennett", "quietcampus")
    for f in os.listdir(classes_path):
        if f.endswith(".class"):
            class_files.append(f'"{os.path.join(classes_path, f)}"')

    cmd_d8 = [
        f'"{D8}"',
        '--min-api', '24',
        '--lib', f'"{PLATFORM_JAR}"',
        '--output', f'"{dex_dir}"',
        " ".join(class_files)
    ]
    run(" ".join(cmd_d8))
    print("D8 dexing successful!")

    # 9. Add classes.dex to unsigned.apk
    dex_file = os.path.join(dex_dir, "classes.dex")
    run(f'"{AAPT}" add "{unsigned_apk}" classes.dex', cwd=dex_dir)
    print("DEX added to APK!")

    # 10. Zipalign APK
    aligned_apk = os.path.join(BUILD_DIR, "aligned.apk")
    cmd_align = [
        f'"{ZIPALIGN}"',
        '-p',
        '-f',
        '4',
        f'"{unsigned_apk}"',
        f'"{aligned_apk}"'
    ]
    run(" ".join(cmd_align))
    print("Zipalign successful!")

    # 11. Generate keystore if not exists and sign with apksigner
    keystore = os.path.join(BUILD_DIR, "debug.keystore")
    if not os.path.exists(keystore):
        cmd_key = [
            f'"{KEYTOOL}"',
            '-genkeypair',
            '-validity', '10000',
            '-dname', '"CN=QuietCampus, O=Bennett University, C=IN"',
            '-keystore', f'"{keystore}"',
            '-storepass', 'android',
            '-keypass', 'android',
            '-alias', 'quietcampus',
            '-keyalg', 'RSA',
            '-keysize', '2048'
        ]
        run(" ".join(cmd_key))
        print("Keystore generated!")

    final_apk = os.path.join(SOURCE_DIR, "QuietCampus.apk")
    final_apk_bennett = os.path.join(SOURCE_DIR, "QuietCampus-BennettUniversity.apk")

    cmd_sign = [
        f'"{APKSIGNER}"',
        'sign',
        '--min-sdk-version', '24',
        '--v1-signing-enabled', 'true',
        '--v2-signing-enabled', 'true',
        '--v3-signing-enabled', 'true',
        '--ks', f'"{keystore}"',
        '--ks-pass', 'pass:android',
        '--key-pass', 'pass:android',
        '--ks-key-alias', 'quietcampus',
        '--out', f'"{final_apk}"',
        f'"{aligned_apk}"'
    ]
    run(" ".join(cmd_sign))
    shutil.copy2(final_apk, final_apk_bennett)
    print(f"APK successfully generated and signed at:\n{final_apk}\n{final_apk_bennett}")

if __name__ == "__main__":
    main()
