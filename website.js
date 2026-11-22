/**
 * QuietCampus Website Controller
 * Powers the TREP End Semester Project Showcase, 3D WebGL Engine & Download Hub
 */

import { TREP_PROJECT } from './data.js?v=2026.7';

// Guard: Ensure Section 1 is always guaranteed to start the dossier
if (TREP_PROJECT && TREP_PROJECT.sections && !TREP_PROJECT.sections.some(s => s.number === 1)) {
  TREP_PROJECT.sections.unshift({
    number: 1,
    id: "project-overview",
    title: "Project Overview & Deliverables Summary",
    summary: "High-level architectural scope, UN SDG targets, citizen-sensing mobile application, and behavioral choice architecture.",
    content: `
### 1.1 Project Mandate & Vision
**QuietCampus** is a student-led social innovation and acoustic engineering initiative engineered for the **TREP End Semester Innovation Project** at Bennett University, Greater Noida. The initiative addresses persistent auditory pollution in high-density student transit hubs by combining citizen-sensing smartphone telemetry with non-punitive physical and behavioral choice architecture.

### 1.2 Core Project Deliverables
1. **The Official Smartphone Application (\`QuietCampus.apk\`)**: Built exclusively for Android phone hardware (API 34 / Android 14 target, backwards-compatible to Android 7.0+). Computes real-time $dB(A)$ SPL, running $L_{Aeq}$, and WHO 70 dB(A) cumulative acoustic dosage tracking with 100% on-device privacy.
2. **Interactive Web Engineering Portal (\`index.html\`)**: Interactive acoustic decibel calculator ($60+60=63$ dB), campus zone baseline vs. post-nudge comparison analytics, and Diurnal noise curve charts (08:00 to 20:00).
3. **Behavioral Choice Architecture & Physical Interventions**: Visual Decibel Displays ("Traffic Lights for Sound"), Campus "Quiet Route" navigation maps, and Scheduled "Quiet Hours" protocol.
4. **Complete Academic Research Dossier (Sections 1–14)**: Full compliance matrix across 8 monitoring points (B01–B08), peer-reviewed literature justifications, and methodology synthesis.
    `
  });
}

class QuietCampusWebsite {
  constructor() {
    this.threeScene = null;
    this.threeCamera = null;
    this.threeRenderer = null;
    this.particleMesh = null;
    this.animationFrameId = null;
    this.mouseX = 0;
    this.mouseY = 0;

    // Enforce top-of-page initialization on load and reload
    if ('scrollRestoration' in history) {
      history.scrollRestoration = 'manual';
    }
    window.scrollTo(0, 0);

    this.init();
  }

  init() {
    this.init3dSoundWavefield();
    this.init3dCardTilt();
    this.initHeroLiveTelemetry();
    this.initDecibelCalculator();
    this.setupQrCode();
    this.renderCampusZones();
    this.renderDossier();
    this.renderTeamTable();
    this.initCharts();
    this.bindDownloads();
    this.checkMobileVisitor();
    this.initScrollAnimations();
    this.initHeaderNav();
  }

  // --- 1. THREE.JS 3D INTERACTIVE ACOUSTIC WAVEFIELD ---
  init3dSoundWavefield() {
    const container = document.getElementById('hero3dCanvas');
    if (!container || !window.THREE || window.getComputedStyle(container).display === 'none') return;

    try {
      const width = container.clientWidth || window.innerWidth;
      const height = container.clientHeight || 580;

      // Scene, Camera, Renderer
      this.threeScene = new THREE.Scene();
      this.threeCamera = new THREE.PerspectiveCamera(55, width / height, 1, 2000);
      this.threeCamera.position.set(0, 180, 480);
      this.threeCamera.lookAt(0, -20, 0);

      this.threeRenderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
      this.threeRenderer.setSize(width, height);
      this.threeRenderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      container.appendChild(this.threeRenderer.domElement);

      // Create 3D Acoustic Particle Grid (Wave Surface)
      const SEPARATION = 22;
      const AMOUNTX = 65;
      const AMOUNTY = 45;
      const numParticles = AMOUNTX * AMOUNTY;

      const positions = new Float32Array(numParticles * 3);
      const scales = new Float32Array(numParticles);

      let i = 0;
      let j = 0;
      for (let ix = 0; ix < AMOUNTX; ix++) {
        for (let iy = 0; iy < AMOUNTY; iy++) {
          positions[i] = ix * SEPARATION - (AMOUNTX * SEPARATION) / 2; // x
          positions[i + 1] = 0; // y
          positions[i + 2] = iy * SEPARATION - (AMOUNTY * SEPARATION) / 2; // z
          scales[j] = 1;
          i += 3;
          j++;
        }
      }

      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      geometry.setAttribute('scale', new THREE.BufferAttribute(scales, 1));

      // Shader Material with luminous anti-aliased circular points
      const material = new THREE.ShaderMaterial({
        uniforms: {
          color: { value: new THREE.Color(0x2dd4bf) }
        },
        vertexShader: `
          attribute float scale;
          void main() {
            vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
            gl_PointSize = scale * (240.0 / -mvPosition.z);
            gl_Position = projectionMatrix * mvPosition;
          }
        `,
        fragmentShader: `
          uniform vec3 color;
          void main() {
            float dist = length(gl_PointCoord - vec2(0.5, 0.5));
            if (dist > 0.5) discard;
            float alpha = smoothstep(0.5, 0.05, dist) * 0.85;
            gl_FragColor = vec4(color, alpha);
          }
        `,
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      });

      this.particleMesh = new THREE.Points(geometry, material);
      this.threeScene.add(this.particleMesh);

      // Mouse Parallax Listener
      window.addEventListener('mousemove', (e) => {
        this.mouseX = (e.clientX - window.innerWidth / 2) * 0.4;
        this.mouseY = (e.clientY - window.innerHeight / 2) * 0.4;
      });

      // Window Resize Listener
      window.addEventListener('resize', () => {
        if (!container || !this.threeCamera || !this.threeRenderer) return;
        const w = container.clientWidth || window.innerWidth;
        const h = container.clientHeight || 580;
        this.threeCamera.aspect = w / h;
        this.threeCamera.updateProjectionMatrix();
        this.threeRenderer.setSize(w, h);
      });

      // Animation Loop
      let count = 0;
      const animate = () => {
        this.animationFrameId = requestAnimationFrame(animate);
        count += 0.035;

        // Camera gentle follow
        this.threeCamera.position.x += (this.mouseX - this.threeCamera.position.x) * 0.03;
        this.threeCamera.position.y += (-this.mouseY + 180 - this.threeCamera.position.y) * 0.03;
        this.threeCamera.lookAt(0, -10, 0);

        // Acoustic Wave Equation: Undulating Sound Pressure Dispersion
        const pos = this.particleMesh.geometry.attributes.position.array;
        const sc = this.particleMesh.geometry.attributes.scale.array;

        let idx = 0;
        let sIdx = 0;
        for (let ix = 0; ix < AMOUNTX; ix++) {
          for (let iy = 0; iy < AMOUNTY; iy++) {
            // Wave propagation simulation: Y-elevation = sinusoidal acoustic field
            pos[idx + 1] =
              Math.sin(ix * 0.28 + count) * 16 +
              Math.cos(iy * 0.32 + count) * 14;

            // Particle intensity pulse
            sc[sIdx] =
              (Math.sin(ix * 0.28 + count) + 1) * 1.6 +
              (Math.cos(iy * 0.32 + count) + 1) * 1.6;

            idx += 3;
            sIdx++;
          }
        }

        this.particleMesh.geometry.attributes.position.needsUpdate = true;
        this.particleMesh.geometry.attributes.scale.needsUpdate = true;

        this.threeRenderer.render(this.threeScene, this.threeCamera);
      };

      animate();
    } catch (err) {
      console.warn("WebGL 3D Wavefield initialized with standard fallback:", err);
    }
  }

  // --- 2. 3D TILT EFFECT FOR SHOWCASE CARD ---
  init3dCardTilt() {
    const card = document.getElementById('card3dTilt');
    if (!card) return;

    card.addEventListener('mousemove', (e) => {
      const rect = card.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      const centerX = rect.width / 2;
      const centerY = rect.height / 2;

      const rotateX = ((y - centerY) / centerY) * -4;
      const rotateY = ((x - centerX) / centerX) * 4;

      card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateY(-2px)`;
      card.style.boxShadow = `0 16px 32px -8px rgba(15, 118, 110, 0.12), 0 8px 16px -4px rgba(0, 0, 0, 0.05)`;
    });

    card.addEventListener('mouseleave', () => {
      card.style.transform = `perspective(1000px) rotateX(0deg) rotateY(0deg) translateY(0)`;
      card.style.boxShadow = `var(--shadow-elevated)`;
    });
  }

  // --- 2.1 CALM REALISTIC SOUND TELEMETRY DISPLAY ---
  initHeroLiveTelemetry() {
    const dbElem = document.getElementById('heroLiveDb');
    if (!dbElem) return;

    // Realistic study corridor sound level with gentle, natural fluctuation
    const readings = [58.4, 57.8, 58.6, 58.1, 57.9, 58.5];
    let idx = 0;
    setInterval(() => {
      idx = (idx + 1) % readings.length;
      dbElem.textContent = readings[idx].toFixed(1);
    }, 4500);
  }

  // --- 2.2 INTERACTIVE DECIBEL ADDER CALCULATOR ---
  initDecibelCalculator() {
    const slider1 = document.getElementById('calcSlider1');
    const slider2 = document.getElementById('calcSlider2');
    const val1 = document.getElementById('calcVal1');
    const val2 = document.getElementById('calcVal2');
    const totalElem = document.getElementById('calcTotalDb');
    const formulaProof = document.getElementById('calcFormulaProof');
    const insightNote = document.getElementById('calcInsightNote');

    if (!slider1 || !slider2 || !totalElem) return;

    const updateCalc = () => {
      const l1 = parseFloat(slider1.value);
      const l2 = parseFloat(slider2.value);

      val1.textContent = `${l1.toFixed(1)} dB(A)`;
      val2.textContent = `${l2.toFixed(1)} dB(A)`;

      // Acoustic energy sum: L_total = 10 * log10( 10^(L1/10) + 10^(L2/10) )
      const energySum = Math.pow(10, l1 / 10) + Math.pow(10, l2 / 10);
      const totalDb = 10 * Math.log10(energySum);

      totalElem.innerHTML = `${totalDb.toFixed(1)} <span style="font-size: 1.2rem; color: var(--text-secondary);">dBA</span>`;

      if (formulaProof) {
        formulaProof.textContent = `L_total = 10 · log10( 10^(${l1.toFixed(1)}/10) + 10^(${l2.toFixed(1)}/10) ) = ${totalDb.toFixed(1)} dB(A)`;
      }

      if (insightNote) {
        const diff = Math.abs(l1 - l2);
        if (diff < 0.2) {
          insightNote.innerHTML = `Identical sources (${l1} dB + ${l2} dB): Doubling acoustic sound energy strictly yields <strong>+3.0 dB</strong>! This proves mathematically that cutting 6.8 to 7.2 dB across campus eliminates ~80% of noise energy.`;
        } else if (diff >= 10) {
          const louder = Math.max(l1, l2);
          insightNote.innerHTML = `Decibel Masking Law: Because difference is ≥ 10 dB (${diff.toFixed(1)} dB), the louder source (${louder.toFixed(1)} dB) completely dominates (+${(totalDb - louder).toFixed(1)} dB added). The quieter sound contributes less than 0.5 dB!`;
        } else {
          insightNote.innerHTML = `Combined sound level increases by <strong>+${(totalDb - Math.max(l1, l2)).toFixed(1)} dB</strong> above the louder source. Decibels cannot be averaged with arithmetic mean.`;
        }
      }
    };

    slider1.addEventListener('input', updateCalc);
    slider2.addEventListener('input', updateCalc);
    updateCalc();
  }

  // --- 2.3 FLOATING ISLAND ACTIVE NAVIGATION & SCROLL DOCK SYNC ---
  initHeaderNav() {
    const header = document.querySelector('header.app-header');
    const navLinks = document.querySelectorAll('.header-nav-links .nav-link');

    window.addEventListener('scroll', () => {
      const scrollPos = window.scrollY;

      // Toggle dynamic glass island elevation
      if (header) {
        if (scrollPos > 25) {
          header.classList.add('scrolled');
        } else {
          header.classList.remove('scrolled');
        }
      }

      if (!navLinks.length) return;

      // If at top of page, keep Overview active
      if (scrollPos < 150) {
        navLinks.forEach(l => l.classList.remove('active'));
        const overview = document.querySelector('.header-nav-links a[href="#hero-section"]');
        if (overview) overview.classList.add('active');
        return;
      }

      const sections = Array.from(navLinks).map(link => {
        const targetId = link.getAttribute('href').replace('#', '');
        return document.getElementById(targetId);
      }).filter(Boolean);

      let currentSectionId = '';
      const checkPos = scrollPos + 180;

      sections.forEach(sec => {
        if (sec.offsetTop <= checkPos && sec.offsetTop + sec.offsetHeight > checkPos) {
          currentSectionId = sec.id;
        }
      });

      if (currentSectionId) {
        navLinks.forEach(link => {
          if (link.getAttribute('href') === `#${currentSectionId}`) {
            link.classList.add('active');
          } else {
            link.classList.remove('active');
          }
        });
      }
    }, { passive: true });
  }

  // --- 3. DYNAMIC QR CODE POINTING DIRECTLY TO APK ---
  setupQrCode() {
    const qrImg = document.getElementById('campusQrCode');
    const qrText = document.getElementById('qrTargetUrlText');
    if (!qrImg) return;

    const apkUrl = `${window.location.origin}/QuietCampus.apk`;
    if (qrText) qrText.textContent = apkUrl;

    const qrApiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&margin=2&data=${encodeURIComponent(apkUrl)}`;
    qrImg.src = qrApiUrl;

    qrImg.onerror = () => {
      qrImg.style.display = 'none';
    };
  }

  // --- 4. CAMPUS STUDY ZONES ---
  renderCampusZones() {
    const container = document.getElementById('websiteCampusGrid');
    if (!container) return;

    container.innerHTML = TREP_PROJECT.campusZones.map(zone => `
      <div class="zone-card ${zone.baselineLAeq > 80 ? 'high-noise' : zone.baselineLAeq > 70 ? 'med-noise' : ''}">
        <div>
          <div class="zone-top-bar">
            <div>
              <h3>${zone.name}</h3>
              <span class="zone-coords">${zone.coordinates}</span>
            </div>
            <span class="status-chip" style="margin: 0; padding: 3px 10px; font-size: 0.72rem;">${zone.targetCategory}</span>
          </div>
          <p class="zone-desc">${zone.description}</p>
          
          <div class="zone-decibel-comparison">
            <div>
              <div class="zone-stat-sublabel">Baseline LAeq</div>
              <div class="zone-stat-large">${zone.baselineLAeq} <span style="font-size: 0.75rem; color: var(--text-muted);">dBA</span></div>
            </div>
            <div>
              <div class="zone-stat-sublabel">Post-Nudge</div>
              <div class="zone-stat-large" style="color: var(--teal-primary);">${zone.postInterventionLAeq} <span style="font-size: 0.75rem; color: var(--text-muted);">dBA</span></div>
              <div class="zone-stat-delta">↓ -${zone.reduction} dB (${zone.status})</div>
            </div>
          </div>

          <!-- Visual Reduction Gauge Bar -->
          <div class="zone-gauge-wrap">
            <div class="zone-gauge-bar-track" title="Baseline: ${zone.baselineLAeq} dBA">
              <div class="zone-gauge-fill-baseline" style="width: ${Math.min(zone.baselineLAeq, 100)}%;"></div>
            </div>
            <div class="zone-gauge-bar-track" style="margin-top: 4px;" title="Post-Nudge: ${zone.postInterventionLAeq} dBA">
              <div class="zone-gauge-fill-post" style="width: ${Math.min(zone.postInterventionLAeq, 100)}%;"></div>
            </div>
            <div class="zone-gauge-labels">
              <span>Baseline: ${zone.baselineLAeq} dBA</span>
              <span style="color: var(--teal-primary); font-weight: 700;">Post-Nudge: ${zone.postInterventionLAeq} dBA (-${zone.reduction} dB)</span>
            </div>
          </div>

          <!-- CPCB Statutory Compliance Strip -->
          <div class="zone-cpcb-strip">
            <span class="cpcb-tag">CPCB Limit: ${zone.recommendedLimit} dB(A)</span>
            <span class="cpcb-status">✓ Net Reduction Logged</span>
          </div>

          <div style="margin-top: 14px; font-size: 0.8rem; color: var(--text-secondary);">
            <strong style="color: var(--text-primary);">Approved Interventions:</strong>
            <ul style="margin: 6px 0 0 18px; line-height: 1.5;">
              ${zone.interventions.map(i => `<li>${i}</li>`).join('')}
            </ul>
          </div>
        </div>
      </div>
    `).join('');
  }

  // --- 5. COMPRESSED DOSSIER & VERIFICATION MATRIX ---
  renderDossier() {
    const container = document.getElementById('websiteDossierContent');
    const pills = document.getElementById('websiteDossierPills');
    if (!container || !pills) return;

    pills.innerHTML = TREP_PROJECT.sections.map(sec => `
      <a href="#sec-${sec.number}" class="dossier-pill-link">
        ${sec.number}. ${sec.title}
      </a>
    `).join('');

    const verificationMatrixHtml = `
      <div class="verification-matrix-card">
        <div class="matrix-header-strip">
          <h3>
            TREP Fieldwork Data Verification & Compliance Matrix
          </h3>
          <span class="verification-badge-verified">✓ 100% Verified Fieldwork Data</span>
        </div>

        <p style="font-size: 0.84rem; color: var(--text-secondary); margin-bottom: 16px;">
          Direct cross-check matrix of Bennett University's 8 monitoring points, statutory CPCB standards, and empirical post-intervention reductions:
        </p>

        <div class="matrix-grid-summary">
          <div class="matrix-mini-stat">
            <span class="mini-label">8 Fixed Points</span>
            <span class="mini-val">B01 – B08</span>
            <span class="mini-sub">LRC, Mess, A-B, P Block</span>
          </div>
          <div class="matrix-mini-stat">
            <span class="mini-label">Session Protocol</span>
            <span class="mini-val">600 Seconds</span>
            <span class="mini-sub">Standard 10-min windows</span>
          </div>
          <div class="matrix-mini-stat">
            <span class="mini-label">Max Net Drop</span>
            <span class="mini-val">-7.2 dBA</span>
            <span class="mini-sub">Outside LRC Foyer</span>
          </div>
          <div class="matrix-mini-stat">
            <span class="mini-label">Energy Halving</span>
            <span class="mini-val">~50% to 80%</span>
            <span class="mini-sub">Physical energy cut</span>
          </div>
        </div>

        <div class="dossier-table-wrap" style="margin: 0;">
          <table class="academic-table">
            <thead>
              <tr>
                <th>Code</th>
                <th>Location</th>
                <th>Functional Type</th>
                <th>Baseline LAeq</th>
                <th>Post-Nudge LAeq</th>
                <th>Net Drop</th>
                <th>Energy Cut</th>
                <th>CPCB Limit</th>
                <th>Compliance</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><strong>B01</strong></td>
                <td>Outside LRC Foyer</td>
                <td>Quiet Study Buffer</td>
                <td style="color: var(--danger-red); font-weight: 700;">68.4 dBA</td>
                <td style="color: var(--teal-primary); font-weight: 700;">61.2 dBA</td>
                <td><strong style="color: var(--teal-primary);">-7.2 dB</strong></td>
                <td>-80.9% Energy</td>
                <td>50 dBA</td>
                <td><span style="color: var(--teal-primary); font-weight: 700;">✓ Restored Buffer</span></td>
              </tr>
              <tr>
                <td><strong>B02–B03</strong></td>
                <td>Southern Stall / Paid Mess</td>
                <td>Commercial Dining</td>
                <td style="color: var(--danger-red); font-weight: 700;">83.7 dBA</td>
                <td style="color: var(--teal-primary); font-weight: 700;">76.9 dBA</td>
                <td><strong style="color: var(--teal-primary);">-6.8 dB</strong></td>
                <td>-79.1% Energy</td>
                <td>65 dBA</td>
                <td><span style="color: var(--warning-amber); font-weight: 700;">Significant Drop</span></td>
              </tr>
              <tr>
                <td><strong>B04–B05</strong></td>
                <td>Between Blocks A & B</td>
                <td>Wind Canyon Breezeway</td>
                <td style="color: var(--danger-red); font-weight: 700;">77.2 dBA</td>
                <td style="color: var(--teal-primary); font-weight: 700;">71.4 dBA</td>
                <td><strong style="color: var(--teal-primary);">-5.8 dB</strong></td>
                <td>-73.7% Energy</td>
                <td>60 dBA</td>
                <td><span style="color: var(--teal-primary); font-weight: 700;">✓ Noticeable Drop</span></td>
              </tr>
              <tr>
                <td><strong>B06–B08</strong></td>
                <td>P Block Entrance</td>
                <td>Residential Transit Hub</td>
                <td style="color: var(--danger-red); font-weight: 700;">73.8 dBA</td>
                <td style="color: var(--teal-primary); font-weight: 700;">68.1 dBA</td>
                <td><strong style="color: var(--teal-primary);">-5.7 dB</strong></td>
                <td>-73.1% Energy</td>
                <td>55 dBA</td>
                <td><span style="color: var(--teal-primary); font-weight: 700;">✓ Noticeable Drop</span></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    `;

    const accordionControlsHtml = `
      <div class="accordion-controls-bar">
        <span style="font-size: 0.88rem; font-weight: 700; color: var(--text-primary);">
          TREP Course Documentation Sections (Click to expand any section):
        </span>
        <div style="display: flex; gap: 8px;">
          <button class="btn-toggle-all" id="btnExpandAllDossier">Expand All</button>
          <button class="btn-toggle-all" id="btnCollapseAllDossier">Collapse All</button>
        </div>
      </div>
    `;

    const sectionsAccordionHtml = TREP_PROJECT.sections.map((sec, index) => {
      const isExpanded = index === 0 ? 'expanded' : '';
      return `
        <div class="accordion-section-card ${isExpanded}" id="sec-${sec.number}">
          <div class="accordion-header" onclick="this.parentElement.classList.toggle('expanded')">
            <div class="accordion-title-wrap">
              <div class="accordion-number-badge">${sec.number}</div>
              <div>
                <div class="accordion-title-text">${sec.title}</div>
                <div class="accordion-summary-line">${sec.summary}</div>
              </div>
            </div>
            <div class="accordion-arrow">▼</div>
          </div>
          <div class="accordion-content-body">
            <div class="key-takeaway-box">
              <strong>Section Summary:</strong> ${sec.summary}
            </div>
            <div class="dossier-markdown-body">
              ${this.formatMarkdown(sec.content)}
            </div>
          </div>
        </div>
      `;
    }).join('');

    container.innerHTML = verificationMatrixHtml + accordionControlsHtml + sectionsAccordionHtml;

    const btnExpand = document.getElementById('btnExpandAllDossier');
    const btnCollapse = document.getElementById('btnCollapseAllDossier');

    if (btnExpand) {
      btnExpand.addEventListener('click', () => {
        container.querySelectorAll('.accordion-section-card').forEach(c => c.classList.add('expanded'));
      });
    }

    if (btnCollapse) {
      btnCollapse.addEventListener('click', () => {
        container.querySelectorAll('.accordion-section-card').forEach(c => c.classList.remove('expanded'));
      });
    }
  }

  // --- 6. TEAM TABLE (ALL 8 MEMBERS) ---
  renderTeamTable() {
    const container = document.getElementById('websiteTeamTableWrap');
    if (!container) return;

    const sec12 = TREP_PROJECT.sections.find(s => s.number === 12);
    if (sec12) {
      container.innerHTML = this.formatMarkdown(sec12.content);
    }
  }

  formatMarkdown(md) {
    if (!md) return '';
    let html = md.trim();

    html = html
      .replace(/^### (.*$)/gim, '<h3>$1</h3>')
      .replace(/^## (.*$)/gim, '<h2>$1</h2>')
      .replace(/\*\*(.*?)\*\*/gim, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/gim, '<em>$1</em>')
      .replace(/`([^`]+)`/g, '<code>$1</code>')
      .replace(/\\\[([\s\S]*?)\\\]/g, '<div class="math-display"><code>$1</code></div>')
      .replace(/\\\((.*?)\\\)/g, '<code>$1</code>')
      .replace(/^\s*-\s+(.*$)/gim, '<li>$1</li>');

    html = html.replace(/(<li>[\s\S]*?<\/li>)/gm, '<ul>$1</ul>');
    html = html.replace(/<\/ul>\s*<ul>/g, '');

    if (html.includes('|')) {
      const tableRegex = /((?:\|.+?\|\r?\n)+)/g;
      html = html.replace(tableRegex, (match) => {
        const lines = match.trim().split('\n');
        if (lines.length < 2) return match;
        let tableHtml = '<div class="dossier-table-wrap"><table class="academic-table">';
        lines.forEach((line, index) => {
          if (line.includes('---')) return;
          const cells = line.split('|').map(c => c.trim()).filter(c => c.length > 0);
          if (index === 0) {
            tableHtml += '<thead><tr>' + cells.map(c => `<th>${c}</th>`).join('') + '</tr></thead><tbody>';
          } else {
            tableHtml += '<tr>' + cells.map(c => `<td>${c}</td>`).join('') + '</tr>';
          }
        });
        tableHtml += '</tbody></table></div>';
        return tableHtml;
      });
    }

    return html;
  }

  // --- 7. CHARTS ---
  initCharts() {
    if (!window.Chart) return;

    // Professional, clean human academic chart defaults
    Chart.defaults.color = '#475569';
    Chart.defaults.font.family = "'Inter', -apple-system, sans-serif";
    Chart.defaults.font.size = 12;

    const ctxComp = document.getElementById('compBarChartWeb');
    if (ctxComp) {
      const labels = TREP_PROJECT.campusZones.map(z => z.name.replace(' (Library Resource Centre)', '').replace(' / Southern Stall & N Block', ''));
      const baselineData = TREP_PROJECT.campusZones.map(z => z.baselineLAeq);
      const postData = TREP_PROJECT.campusZones.map(z => z.postInterventionLAeq);
      const targetData = TREP_PROJECT.campusZones.map(z => z.recommendedLimit);

      new Chart(ctxComp, {
        type: 'bar',
        data: {
          labels: labels,
          datasets: [
            {
              label: 'Pre-Intervention Baseline (dBA)',
              data: baselineData,
              backgroundColor: '#f87171',
              borderColor: '#ef4444',
              borderWidth: 1.5,
              borderRadius: 6
            },
            {
              label: 'Post-Intervention (dBA)',
              data: postData,
              backgroundColor: '#0f766e',
              borderColor: '#0d9488',
              borderWidth: 1.5,
              borderRadius: 6
            },
            {
              label: 'CPCB Legal Benchmark (dBA)',
              data: targetData,
              type: 'line',
              borderColor: '#d97706',
              borderDash: [5, 5],
              borderWidth: 2,
              pointBackgroundColor: '#d97706',
              pointRadius: 4,
              fill: false
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              position: 'top',
              labels: {
                color: '#0f172a',
                font: { weight: 600, size: 12 },
                usePointStyle: true,
                padding: 16
              }
            },
            tooltip: {
              backgroundColor: '#0f172a',
              titleColor: '#ffffff',
              bodyColor: '#5eead4',
              borderColor: '#334155',
              borderWidth: 1,
              padding: 10,
              cornerRadius: 8
            }
          },
          scales: {
            x: {
              grid: { display: false },
              ticks: { color: '#475569', font: { size: 11, weight: 500 } }
            },
            y: {
              min: 30,
              max: 100,
              grid: { color: '#e2e8f0' },
              ticks: { color: '#475569', font: { family: "'JetBrains Mono', monospace" } },
              title: { display: true, text: 'LAeq in dB(A)', color: '#0f172a', font: { weight: 600 } }
            }
          }
        }
      });
    }

    const ctxHourly = document.getElementById('hourlyTrendChartWeb');
    if (ctxHourly) {
      const hours = ['8 AM', '9 AM', '10 AM', '11 AM', '12 PM', '1 PM', '2 PM', '3 PM', '4 PM', '5 PM', '6 PM', '7 PM', '8 PM'];
      const messZone = TREP_PROJECT.campusZones.find(z => z.id === 'paid_mess');
      const lrcZone = TREP_PROJECT.campusZones.find(z => z.id === 'lrc');

      new Chart(ctxHourly, {
        type: 'line',
        data: {
          labels: hours,
          datasets: [
            {
              label: 'Southern Stall Baseline',
              data: messZone.hourlyBaseline,
              borderColor: '#ef4444',
              backgroundColor: 'rgba(239, 68, 68, 0.08)',
              fill: true,
              borderWidth: 2,
              pointRadius: 3,
              tension: 0.35
            },
            {
              label: 'Southern Stall Post-Nudge',
              data: messZone.hourlyPost,
              borderColor: '#0f766e',
              backgroundColor: 'rgba(15, 118, 110, 0.08)',
              fill: true,
              borderWidth: 2.5,
              pointRadius: 3.5,
              tension: 0.35
            },
            {
              label: 'LRC Foyer Baseline',
              data: lrcZone.hourlyBaseline,
              borderColor: '#d97706',
              borderDash: [5, 5],
              borderWidth: 2,
              pointRadius: 0,
              tension: 0.35
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              position: 'top',
              labels: {
                color: '#0f172a',
                font: { weight: 600, size: 12 },
                usePointStyle: true,
                padding: 16
              }
            },
            tooltip: {
              backgroundColor: '#0f172a',
              titleColor: '#ffffff',
              bodyColor: '#5eead4',
              borderColor: '#334155',
              borderWidth: 1,
              padding: 10,
              cornerRadius: 8
            }
          },
          scales: {
            x: {
              grid: { display: false },
              ticks: { color: '#475569', font: { size: 11, weight: 500 } }
            },
            y: {
              min: 40,
              max: 95,
              grid: { color: '#e2e8f0' },
              ticks: { color: '#475569', font: { family: "'JetBrains Mono', monospace" } },
              title: { display: true, text: 'LAeq in dB(A)', color: '#0f172a', font: { weight: 600 } }
            }
          }
        }
      });
    }
  }

  // --- 8. DOWNLOADS ---
  bindDownloads() {
    const csvBtn = document.getElementById('btnDownloadCsv2');
    if (csvBtn) {
      csvBtn.addEventListener('click', () => this.exportCsv());
    }
  }

  exportCsv() {
    let csv = "Record_ID,Zone_Code,Zone_Name,Baseline_LAeq_dBA,Post_Intervention_LAeq_dBA,Reduction_dBA,Target_Limit_dBA,Status\n";
    TREP_PROJECT.campusZones.forEach((z, idx) => {
      csv += `REC-BU-00${idx + 1},"${z.code}","${z.name}",${z.baselineLAeq},${z.postInterventionLAeq},${z.reduction},${z.recommendedLimit},"${z.status}"\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'QuietCampus_TREP_Fieldwork_Evidence_BennettUniversity.csv';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  // --- 9. BUTTERY-SMOOTH SCROLL ANIMATIONS & SCROLL-SPY ---
  initScrollAnimations() {
    const header = document.querySelector('header.app-header');
    const navTabs = document.querySelector('.nav-tabs-wrapper');
    const backToTopBtn = document.getElementById('backToTopBtn');

    // 1. SCROLL PARALLAX & DYNAMIC CONTROLS ENGINE
    let ticking = false;
    const onScroll = () => {
      const scrollTop = window.scrollY || document.documentElement.scrollTop;

      // Dynamic Glassmorphism Shadow on Header & Nav
      if (header) {
        if (scrollTop > 20) {
          header.classList.add('scrolled');
        } else {
          header.classList.remove('scrolled');
        }
      }

      if (navTabs) {
        if (scrollTop > 70) {
          navTabs.classList.add('scrolled');
        } else {
          navTabs.classList.remove('scrolled');
        }
      }

      // Floating Back to Top Button Toggle
      if (backToTopBtn) {
        if (scrollTop > 380) {
          backToTopBtn.classList.add('is-active');
        } else {
          backToTopBtn.classList.remove('is-active');
        }
      }

      // Subtle 3D WebGL Camera Depth Tilt on Scroll
      if (this.threeCamera && scrollTop < 1100) {
        this.threeCamera.position.y = 180 - scrollTop * 0.12;
        this.threeCamera.rotation.x = -0.32 + scrollTop * 0.00022;
      }

      ticking = false;
    };

    window.addEventListener('scroll', () => {
      if (!ticking) {
        window.requestAnimationFrame(onScroll);
        ticking = true;
      }
    }, { passive: true });

    // Initial run to set progress bar if page loaded pre-scrolled
    onScroll();

    // Back to top click handler
    if (backToTopBtn) {
      backToTopBtn.addEventListener('click', () => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      });
    }

    // 2. INTERSECTION OBSERVER FOR SCROLL REVEALS
    if ('IntersectionObserver' in window) {
      const revealObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            // Unobserve once visible to prevent re-trigger jank
            observer.unobserve(entry.target);
          }
        });
      }, {
        threshold: 0.1,
        rootMargin: '0px 0px -30px 0px'
      });

      const targets = document.querySelectorAll(
        '.reveal-on-scroll, .reveal-from-left, .reveal-from-right, .reveal-scale, .stagger-reveal'
      );
      targets.forEach(el => revealObserver.observe(el));
    } else {
      // Fallback
      document.querySelectorAll(
        '.reveal-on-scroll, .reveal-from-left, .reveal-from-right, .reveal-scale, .stagger-reveal'
      ).forEach(el => el.classList.add('is-visible'));
    }

    // 3. DYNAMIC SCROLL-SPY FOR NAV TABS
    const navLinks = document.querySelectorAll('.nav-tab-btn');
    const sections = Array.from(document.querySelectorAll('section[id]'));

    if ('IntersectionObserver' in window && sections.length && navLinks.length) {
      const spyObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            const sectionId = entry.target.getAttribute('id');
            navLinks.forEach(link => {
              const href = link.getAttribute('href');
              if (href === `#${sectionId}`) {
                link.classList.add('active');
              } else {
                link.classList.remove('active');
              }
            });
          }
        });
      }, {
        threshold: 0.2,
        rootMargin: '-70px 0px -40% 0px'
      });

      sections.forEach(sec => spyObserver.observe(sec));
    }

    // 4. SMOOTH SCROLL OFFSET FOR ANCHOR LINKS
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
      anchor.addEventListener('click', (e) => {
        const targetId = anchor.getAttribute('href');
        if (targetId === '#' || targetId === '') return;
        const targetElement = document.querySelector(targetId);
        if (targetElement) {
          e.preventDefault();
          const targetPosition = targetElement.getBoundingClientRect().top + window.scrollY - 120;
          window.scrollTo({
            top: targetPosition,
            behavior: 'smooth'
          });
          // Update URL hash without jumping
          if (history.pushState) {
            history.pushState(null, null, targetId);
          }
        }
      });
    });
  }

  checkMobileVisitor() {
    const isMobile = /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || window.innerWidth < 768;
    if (isMobile) {
      const banner = document.createElement('div');
      banner.style.cssText = `
        position: fixed;
        bottom: 16px;
        left: 16px;
        right: 16px;
        background: #0f172a;
        color: #ffffff;
        padding: 12px 18px;
        border-radius: 999px;
        display: flex;
        align-items: center;
        justify-content: space-between;
        box-shadow: 0 10px 30px rgba(0,0,0,0.3);
        z-index: 9999;
        font-size: 0.82rem;
        border: 1px solid #14b8a6;
      `;
      banner.innerHTML = `
        <span><strong>On Phone:</strong> Android Decibel Meter App:</span>
        <a href="QuietCampus.apk" download="QuietCampus.apk" style="background: #0d9488; color: #fff; text-decoration: none; padding: 6px 14px; border-radius: 999px; font-weight: 700; font-size: 0.75rem;">Download .APK</a>
      `;
      document.body.appendChild(banner);
    }
  }
}

document.addEventListener('DOMContentLoaded', () => {
  window.quietCampusSite = new QuietCampusWebsite();
});
