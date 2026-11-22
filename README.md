# QuietCampus: Bennett University TREP End Semester Project

**QuietCampus** is an environmental engineering and technology entrepreneurship platform developed for the **TREP End Semester Project** at **Bennett University, Greater Noida**, aligned with **UN SDG 3 (Good Health and Well-Being, Target 3.9)**, **SDG 4 (Quality Education)**, and **SDG 11 (Sustainable Cities & Communities)**.

---

## 🏛️ Architecture: Showcase Website + Mobile Decibel App

1. **The Project Showcase Website (`index.html`)**:
   - The official TREP project showcase for faculty evaluation.
   - Interactive **3D WebGL Acoustic Wavefield** powered by Three.js.
   - Contains all **13 Course Project Sections (Sections 2 to 14)** in full academic detail.
   - Interactive data visualizations (diurnal noise curves, pre-vs-post decibel drop charts).
   - **Distribution Portal & Dynamic QR Code**: Evaluators and students on laptops can scan the on-screen QR code with their phone camera to instantly launch the decibel meter directly on their smartphone.
   - Interactive 3D parallax tilt showcase card.

2. **The Smartphone Decibel App (`app.html`)**:
   - The dedicated **dBm / Decibel Calculator** engineered exclusively for mobile phones.
   - Web Audio API pipeline with IEC 61672 **A-weighting frequency curve** approximation filter ($dB_{FS} \rightarrow dB(A)$ SPL).
   - Running **$L_{Aeq}$** continuous equivalent energy average.
   - Observed peak ($L_{max}$), minimum background ($L_{min}$), and dynamic variation.
   - **WHO 70 dB(A) / NIOSH Reference Exposure Dose** progress bar with non-negotiable scientific framing.
   - Real-time animated audio oscilloscope canvas.
   - Campus study zone selection: Outside LRC (B01), Southern Stall / Paid Mess (B02-B03), Between Blocks A & B (B04-B05), P Block Entrance (B06-B08).
   - Local storage session history.
   - One-tap **"Add to Home Screen / Install"** PWA support.
   - **100% Privacy**: Raw audio is processed in volatile browser memory and immediately discarded. No voice recordings or cloud audio transmissions.

---

## 🚀 How to Deploy on Vercel

QuietCampus is pre-configured for **instant 1-click Vercel deployment** with `vercel.json`:

### Option A: Using Vercel CLI
```bash
cd quietcampus-sdg-app
vercel
```

### Option B: Using GitHub & Vercel Dashboard
1. Push this folder to a GitHub repository.
2. Go to [vercel.com](https://vercel.com) and click **"Add New Project"**.
3. Select your GitHub repository.
4. Leave all build settings default (Framework Preset: **Other**, Build Command: empty, Output Directory: `./`).
5. Click **Deploy**.

Once deployed (e.g. `https://quietcampus.vercel.app`), anyone visiting on a phone will get the mobile decibel meter, and visitors on a computer will see the TREP project showcase with a live QR code linking directly to the phone app!

---

## 📦 What's Inside the Download Bundle

The app includes `QuietCampus-BennettUniversity-App.zip` containing:
- `index.html` (TREP Showcase Website with 3D WebGL engine)
- `app.html` (Dedicated Mobile Decibel Calculator)
- `website.js` & `website.css` (3D engine, showcase controller, responsive styles)
- `mobile-app.js` & `mobile-app.css` (Web Audio API meter & mobile phone frame)
- `audio-engine.js` (IEC 61672 acoustic engine, A-weighting, $L_{Aeq}$, WHO dose)
- `data.js` (Complete Sections 2 through 14, 4 campus zone baselines, 8-member team roster)
- `manifest.json` & `sw.js` (PWA mobile install configuration)
- `vercel.json` (Vercel deployment configuration)
- `three.min.js` (Local offline Three.js 3D library)
- `README.md` (Documentation)
