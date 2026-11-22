import zipfile
import os

base_dir = os.path.dirname(os.path.abspath(__file__))

files_to_zip = [
    "index.html",
    "app.html",
    "website.js",
    "website.css",
    "mobile-app.js",
    "mobile-app.css",
    "audio-engine.js",
    "data.js",
    "styles.css",
    "manifest.json",
    "sw.js",
    "vercel.json",
    "three.min.js",
    "QuietCampus.apk",
    "QuietCampus-v2.apk",
    "app-logo.png",
    "favicon.png",
    "README.md"
]

zip_filename = os.path.join(base_dir, "QuietCampus-BennettUniversity-App.zip")

with zipfile.ZipFile(zip_filename, 'w', zipfile.ZIP_DEFLATED) as zipf:
    for file in files_to_zip:
        file_path = os.path.join(base_dir, file)
        if os.path.exists(file_path):
            zipf.write(file_path, arcname=file)
            print(f"Added {file} to {zip_filename}")
        else:
            print(f"Warning: {file} not found at {file_path}!")

print(f"Successfully created {zip_filename}")
