/**
 * QuietCampus Mobile App - Decibel Meter & Phone Experience
 * Bennett University TREP End Semester Project
 * High-Precision DSP Engine, Real-time Visualizer & Cyber-Acoustic Workstation
 */

import { TREP_PROJECT } from './data.js';
import { AcousticEngine } from './audio-engine.js';

class QuietCampusMobileApp {
  constructor() {
    this.engine = new AcousticEngine();
    this.currentView = 'view-meter';
    this.selectedZone = 'paid_mess';
    this.history = JSON.parse(localStorage.getItem('qc_session_history') || '[]');
    this.deferredInstallPrompt = null;
    this.lastEndedSession = null;
    this.animFrameId = null;

    this.init();
  }

  init() {
    this.bindBottomNav();
    this.bindAudioControls();
    this.bindPwaInstall();
    this.renderCampusZones();
    this.renderHistoryList();
    this.setupVisualizerCanvas();
    this.bindSecurityModal();

    // Zone selector
    const zoneSelect = document.getElementById('sessionZoneSelect');
    if (zoneSelect) {
      zoneSelect.addEventListener('change', (e) => {
        this.selectedZone = e.target.value;
        this.engine.setSimulatedZone(this.selectedZone);
      });
    }

    // Calibration
    const calRange = document.getElementById('calOffsetRange');
    const calVal = document.getElementById('calOffsetVal');
    if (calRange && calVal) {
      calRange.addEventListener('input', (e) => {
        const val = e.target.value;
        calVal.textContent = (val >= 0 ? `+${val}` : val) + ' dB';
        this.engine.setCalibrationOffset(val);
      });
    }

    // Continuous idle canvas rendering
    this.startCanvasRenderLoop();
  }

  // Bottom Navigation
  bindBottomNav() {
    const navItems = document.querySelectorAll('.mobile-bottom-nav .nav-item');
    navItems.forEach(item => {
      item.addEventListener('click', () => {
        const targetView = item.getAttribute('data-view');
        this.switchView(targetView);
      });
    });
  }

  switchView(viewId) {
    this.currentView = viewId;
    document.querySelectorAll('.mobile-bottom-nav .nav-item').forEach(item => {
      item.classList.toggle('active', item.getAttribute('data-view') === viewId);
    });
    document.querySelectorAll('.mobile-tab-view').forEach(view => {
      view.classList.toggle('active', view.id === viewId);
    });

    if (viewId === 'view-history') {
      this.renderHistoryList();
    } else if (viewId === 'view-zones') {
      this.renderCampusZones();
    }
  }

  // Audio Security Modal Binding
  bindSecurityModal() {
    const modal = document.getElementById('mobileSecurityModal');
    const btnShield = document.getElementById('btnAppSecurityShield');
    const btnCardAudit = document.getElementById('btnOpenSecurityModal');

    const openModal = () => {
      if (modal) modal.classList.add('active');
    };

    if (btnShield) btnShield.addEventListener('click', openModal);
    if (btnCardAudit) btnCardAudit.addEventListener('click', openModal);
  }

  // Audio Controls
  bindAudioControls() {
    const btnStart = document.getElementById('btnStartMeter');
    const btnPause = document.getElementById('btnPauseMeter');
    const btnStop = document.getElementById('btnStopMeter');

    this.engine.onTick = (snapshot) => this.renderLiveSnapshot(snapshot);
    this.engine.onStateChange = (state) => this.updateUiState(state);
    this.engine.onError = () => {
      alert("Microphone permission unavailable. Running in Demo Simulation Mode.");
      this.engine.startSimulatedSession(this.selectedZone);
    };

    if (btnStart) {
      btnStart.addEventListener('click', async () => {
        if (this.engine.isPaused) {
          this.engine.resumeSession();
        } else {
          const simCheckbox = document.getElementById('modeSimCheckbox');
          if (simCheckbox && simCheckbox.checked) {
            this.engine.startSimulatedSession(this.selectedZone);
          } else {
            const success = await this.engine.startLiveSession();
            if (!success) {
              this.engine.startSimulatedSession(this.selectedZone);
            }
          }
        }
      });
    }

    if (btnPause) {
      btnPause.addEventListener('click', () => {
        if (this.engine.isPaused) {
          this.engine.resumeSession();
          btnPause.innerHTML = `<span>⏸</span> PAUSE`;
        } else {
          this.engine.pauseSession();
          btnPause.innerHTML = `<span>▶</span> RESUME`;
        }
      });
    }

    if (btnStop) {
      btnStop.addEventListener('click', () => {
        const summary = this.engine.stopSession();
        this.lastEndedSession = {
          ...summary,
          id: 'SESSION-' + Date.now().toString(36).toUpperCase(),
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          date: new Date().toLocaleDateString(),
          zoneId: this.selectedZone,
          zoneName: this.getZoneName(this.selectedZone)
        };
        this.showSessionResultModal(this.lastEndedSession);
      });
    }
  }

  updateUiState(state) {
    const pill = document.getElementById('micStatusPill');
    const pillText = document.getElementById('micStatusText');
    const btnStart = document.getElementById('btnStartMeter');
    const btnPause = document.getElementById('btnPauseMeter');
    const btnStop = document.getElementById('btnStopMeter');
    const liveIndicator = document.getElementById('meterLiveStatusText');

    if (state.status === 'active') {
      if (pill) {
        pill.className = `mic-status-pill active ${state.mode === 'simulation' ? 'simulated' : ''}`;
      }
      if (pillText) {
        pillText.textContent = state.mode === 'simulation' ? 'DEMO SIMULATION' : 'MEASURING SPL';
      }
      if (liveIndicator) {
        liveIndicator.textContent = state.mode === 'simulation' ? 'SIMULATING' : 'MEASURING SPL';
      }
      if (btnStart) btnStart.style.display = 'none';
      if (btnPause) {
        btnPause.style.display = 'inline-flex';
        btnPause.innerHTML = `<span>⏸</span> PAUSE`;
      }
      if (btnStop) btnStop.style.display = 'inline-flex';
    } else if (state.status === 'paused') {
      if (pill) pill.className = 'mic-status-pill paused';
      if (pillText) pillText.textContent = 'PAUSED';
      if (liveIndicator) liveIndicator.textContent = 'SESSION PAUSED';
      if (btnPause) btnPause.innerHTML = `<span>▶</span> RESUME`;
    } else {
      if (pill) pill.className = 'mic-status-pill';
      if (pillText) pillText.textContent = 'STANDBY';
      if (liveIndicator) liveIndicator.textContent = 'READY TO MEASURE';
      if (btnStart) btnStart.style.display = 'inline-flex';
      if (btnPause) btnPause.style.display = 'none';
      if (btnStop) btnStop.style.display = 'none';
    }
  }

  renderLiveSnapshot(snapshot) {
    const dbReading = document.getElementById('currentDbReading');
    const categoryBadge = document.getElementById('meterCategoryBadge');
    const timerText = document.getElementById('sessionTimer');
    const runningLaeq = document.getElementById('runningLaeq');
    const peakDb = document.getElementById('peakDb');
    const minDb = document.getElementById('minDb');

    if (dbReading) dbReading.textContent = snapshot.currentDb.toFixed(1);
    if (timerText) timerText.textContent = snapshot.formattedTime;
    if (runningLaeq) runningLaeq.textContent = snapshot.runningLAeq.toFixed(1);
    if (peakDb) peakDb.textContent = snapshot.peakDb.toFixed(1);
    if (minDb) minDb.textContent = snapshot.minDb.toFixed(1);

    // Dynamic Color Shift Engine
    let colorTheme = '#05ffa1';
    let glowShadow = 'rgba(5, 255, 161, 0.4)';
    let statusText = 'QUIET • EXCELLENT STUDY ZONE';

    if (snapshot.currentDb < 55) {
      colorTheme = '#05ffa1';
      glowShadow = 'rgba(5, 255, 161, 0.45)';
      statusText = 'QUIET • STUDY READY (<55 dB)';
    } else if (snapshot.currentDb < 68) {
      colorTheme = '#00f2fe';
      glowShadow = 'rgba(0, 242, 254, 0.45)';
      statusText = 'MODERATE • NORMAL CHATTER';
    } else if (snapshot.currentDb < 80) {
      colorTheme = '#fbbf24';
      glowShadow = 'rgba(251, 191, 36, 0.45)';
      statusText = 'ELEVATED • CPCB THRESHOLD (65 dB)';
    } else {
      colorTheme = '#ff0055';
      glowShadow = 'rgba(255, 0, 85, 0.55)';
      statusText = 'HIGH NOISE • AUDITORY FATIGUE RISK';
    }

    if (dbReading) {
      dbReading.style.color = colorTheme;
      dbReading.style.textShadow = `0 0 28px ${glowShadow}`;
    }

    // Circular dial progress
    const circle = document.getElementById('meterRingProgress');
    if (circle) {
      const minLevel = 30;
      const maxLevel = 110;
      const percent = Math.min(1, Math.max(0, (snapshot.currentDb - minLevel) / (maxLevel - minLevel)));
      const offset = 565 - (percent * 565);
      circle.style.strokeDashoffset = offset;
      circle.style.stroke = colorTheme;
      circle.style.filter = `drop-shadow(0 0 8px ${colorTheme})`;
    }

    if (categoryBadge) {
      categoryBadge.textContent = snapshot.dose ? snapshot.dose.statusCategory : statusText;
      categoryBadge.style.color = colorTheme;
      categoryBadge.style.borderColor = colorTheme;
      categoryBadge.style.boxShadow = `0 0 14px ${glowShadow}`;
    }

    // Exposure dose progress
    const doseFill = document.getElementById('doseProgressFill');
    const doseText = document.getElementById('dosePercentageText');
    const guidanceBox = document.getElementById('guidanceBoxText');

    if (snapshot.dose) {
      const whoPct = snapshot.dose.whoDosePercent;
      if (doseFill) {
        doseFill.style.width = Math.min(100, whoPct) + '%';
        if (whoPct > 80) doseFill.style.background = 'linear-gradient(90deg, #fbbf24, #ff0055)';
        else if (whoPct > 40) doseFill.style.background = 'linear-gradient(90deg, #00f2fe, #fbbf24)';
        else doseFill.style.background = 'linear-gradient(90deg, #05ffa1, #00f2fe)';
      }
      if (doseText) doseText.textContent = `${whoPct.toFixed(1)}% Ref Dose`;
      if (guidanceBox) guidanceBox.textContent = snapshot.dose.guidanceText;
    }
  }

  setupVisualizerCanvas() {
    this.canvas = document.getElementById('visualizerCanvas');
    if (!this.canvas) return;
    this.canvasCtx = this.canvas.getContext('2d');
    this.resizeCanvas();
    window.addEventListener('resize', () => this.resizeCanvas());
  }

  resizeCanvas() {
    if (!this.canvas) return;
    const dpr = window.devicePixelRatio || 1;
    const rect = this.canvas.parentElement.getBoundingClientRect();
    const w = rect.width || 320;
    const h = 58;
    this.canvas.width = w * dpr;
    this.canvas.height = h * dpr;
    this.canvas.style.width = `${w}px`;
    this.canvas.style.height = `${h}px`;
    if (this.canvasCtx) {
      this.canvasCtx.scale(dpr, dpr);
    }
  }

  startCanvasRenderLoop() {
    const render = () => {
      this.drawVisualizer();
      this.animFrameId = requestAnimationFrame(render);
    };
    render();
  }

  drawVisualizer() {
    if (!this.canvas || !this.canvasCtx) return;
    const ctx = this.canvasCtx;
    const dpr = window.devicePixelRatio || 1;
    const width = this.canvas.width / dpr;
    const height = this.canvas.height / dpr;

    ctx.clearRect(0, 0, width, height);

    if (this.engine.isRecording && !this.engine.isPaused) {
      const freqData = this.engine.getFrequencyData();
      const timeData = this.engine.getTimeDomainData();

      if (freqData && !this.engine.isSimulated) {
        // 1. Draw 30 Glowing Equalizer Spectrum Bars
        const numBars = 30;
        const barWidth = Math.max(3, (width / numBars) - 2);
        const step = Math.max(1, Math.floor(freqData.length / numBars / 2.2));

        for (let i = 0; i < numBars; i++) {
          const raw = freqData[i * step] || 0;
          const val = raw / 255;
          const barHeight = Math.max(3, val * (height - 8));
          const x = i * (barWidth + 2) + 2;
          const y = height - barHeight;

          const grad = ctx.createLinearGradient(0, height, 0, y);
          grad.addColorStop(0, '#05ffa1');
          grad.addColorStop(0.5, '#00f2fe');
          grad.addColorStop(1, '#ff007f');

          ctx.fillStyle = grad;
          if (ctx.roundRect) {
            ctx.beginPath();
            ctx.roundRect(x, y, barWidth, barHeight, [2, 2, 0, 0]);
            ctx.fill();
          } else {
            ctx.fillRect(x, y, barWidth, barHeight);
          }
        }

        // 2. Overlay Glowing Waveform
        if (timeData) {
          ctx.beginPath();
          ctx.lineWidth = 2;
          ctx.strokeStyle = '#ffffff';
          ctx.shadowColor = '#00f2fe';
          ctx.shadowBlur = 8;
          const sliceWidth = width / (timeData.length / 4);
          let wx = 0;
          for (let i = 0; i < timeData.length; i += 4) {
            const v = timeData[i];
            const wy = (v + 1) * (height / 2);
            if (i === 0) ctx.moveTo(wx, wy);
            else ctx.lineTo(wx, wy);
            wx += sliceWidth;
          }
          ctx.stroke();
          ctx.shadowBlur = 0;
        }
      } else {
        // Simulation or Trend Mode: Dynamic Cyber Sine Ribbon
        const time = Date.now() * 0.006;
        ctx.beginPath();
        ctx.lineWidth = 2.5;
        ctx.strokeStyle = '#05ffa1';
        ctx.shadowColor = '#00f2fe';
        ctx.shadowBlur = 12;

        for (let x = 0; x <= width; x += 4) {
          const norm = x / width;
          const y = (height / 2) +
            Math.sin(norm * 12 + time) * 14 +
            Math.cos(norm * 6 - time * 1.4) * 8;
          if (x === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();
        ctx.shadowBlur = 0;
      }
    } else {
      // Idle Rest State: Subtle Ambient Pulse
      const t = Date.now() * 0.002;
      ctx.beginPath();
      ctx.lineWidth = 1.5;
      ctx.strokeStyle = 'rgba(100, 116, 139, 0.35)';
      for (let x = 0; x <= width; x += 6) {
        const y = height / 2 + Math.sin((x / width) * 4 + t) * 3;
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
  }

  // Session Results Modal
  showSessionResultModal(session) {
    const modal = document.getElementById('mobileResultModal');
    if (!modal) return;

    document.getElementById('mResLocation').textContent = session.zoneName;
    document.getElementById('mResLaeq').textContent = `${session.runningLAeq.toFixed(1)} dB(A)`;
    document.getElementById('mResPeak').textContent = `${session.peakDb.toFixed(1)} dB(A)`;
    document.getElementById('mResDuration').textContent = session.formattedTime;
    document.getElementById('mResVariation').textContent = `${session.variation.toFixed(1)} dB`;
    document.getElementById('mResDose').textContent = `${session.dose.whoDosePercent.toFixed(1)}% of WHO Ref`;

    modal.classList.add('active');

    document.getElementById('mBtnSaveResult').onclick = () => {
      this.history.unshift(session);
      localStorage.setItem('qc_session_history', JSON.stringify(this.history));
      modal.classList.remove('active');
      alert("Acoustic session saved to device history!");
    };

    document.getElementById('mBtnDiscardResult').onclick = () => {
      modal.classList.remove('active');
    };

    document.getElementById('mBtnShareResult').onclick = () => {
      const text = `QuietCampus Phone Reading:\n${session.zoneName}\nLAeq: ${session.runningLAeq.toFixed(1)} dB(A)\nPeak: ${session.peakDb.toFixed(1)} dB(A)\nDuration: ${session.formattedTime}\nBennett University TREP Project`;
      if (navigator.share) {
        navigator.share({ title: 'QuietCampus Sound Reading', text }).catch(() => {});
      } else {
        navigator.clipboard.writeText(text);
        alert("Session metrics copied to clipboard!");
      }
    };
  }

  // Campus Study Zones View
  renderCampusZones() {
    const container = document.getElementById('mobileZonesContainer');
    if (!container) return;

    container.innerHTML = TREP_PROJECT.campusZones.map(zone => `
      <div class="zone-mobile-card ${zone.baselineLAeq > 80 ? 'hot-zone' : ''}">
        <div class="zone-card-top">
          <div>
            <div class="zone-card-code">${zone.code}</div>
            <h4 class="zone-card-name">${zone.name}</h4>
            <span class="zone-card-cat">${zone.targetCategory}</span>
          </div>
          <div class="zone-reduction-pill">
            <span class="reduction-val">-${zone.reduction} dB</span>
            <span class="reduction-sub">ENERGY CUT</span>
          </div>
        </div>

        <div class="zone-levels-strip">
          <div class="level-box baseline">
            <span class="lvl-label">Baseline</span>
            <span class="lvl-num">${zone.baselineLAeq} <small>dBA</small></span>
          </div>
          <div class="level-arrow-divider">➔</div>
          <div class="level-box post">
            <span class="lvl-label">Post-Nudge</span>
            <span class="lvl-num">${zone.postInterventionLAeq} <small>dBA</small></span>
          </div>
          <div class="level-box cpcb">
            <span class="lvl-label">CPCB Goal</span>
            <span class="lvl-num">${zone.recommendedLimit} <small>dBA</small></span>
          </div>
        </div>

        <!-- Comparative Progress Bar -->
        <div class="zone-bar-compare-track">
          <div class="zone-bar-compare-fill" style="width: ${Math.min(100, zone.postInterventionLAeq)}%;"></div>
        </div>

        <button class="btn-select-zone-trigger btn-m-select-zone" data-zone="${zone.id}">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><polygon points="6 3 20 12 6 21 6 3"/></svg>
          <span>Monitor This Zone</span>
        </button>
      </div>
    `).join('');

    container.querySelectorAll('.btn-m-select-zone').forEach(btn => {
      btn.addEventListener('click', () => {
        const zid = btn.getAttribute('data-zone');
        this.selectedZone = zid;
        const sel = document.getElementById('sessionZoneSelect');
        if (sel) sel.value = zid;
        this.engine.setSimulatedZone(zid);
        this.switchView('view-meter');
      });
    });
  }

  // History List
  renderHistoryList() {
    const container = document.getElementById('mobileHistoryContainer');
    if (!container) return;

    if (this.history.length === 0) {
      container.innerHTML = `
        <div class="history-empty-state">
          <div class="empty-icon-radar">📡</div>
          <h4>No Acoustic Sessions Logged</h4>
          <p>Tap "Start Measuring" on the dB Meter tab to capture and save real-time sound logs.</p>
        </div>
      `;
      return;
    }

    container.innerHTML = `
      <div class="history-header-actions">
        <span class="history-count-badge">${this.history.length} SESSIONS SAVED</span>
        <div style="display: flex; gap: 8px;">
          <button id="mBtnExportHistory" class="btn-history-action">Export CSV</button>
          <button id="mBtnClearHistory" class="btn-history-action danger">Clear All</button>
        </div>
      </div>
      <div class="history-cards-scroll">
        ${this.history.map(item => `
          <div class="history-session-card">
            <div class="history-card-left">
              <span class="h-zone-tag">${item.zoneName || 'Campus Corridor'}</span>
              <div class="h-meta-row">${item.date || 'Today'} • ${item.timestamp} • ⏱ ${item.formattedTime}</div>
            </div>
            <div class="history-card-right">
              <div class="h-laeq-val">${item.runningLAeq.toFixed(1)} <small>dBA</small></div>
              <div class="h-peak-val">Peak: ${item.peakDb.toFixed(1)} dB</div>
            </div>
          </div>
        `).join('')}
      </div>
    `;

    const btnClear = document.getElementById('mBtnClearHistory');
    if (btnClear) {
      btnClear.onclick = () => {
        if (confirm("Delete all saved sound history from this device?")) {
          this.history = [];
          localStorage.removeItem('qc_session_history');
          this.renderHistoryList();
        }
      };
    }

    const btnExport = document.getElementById('mBtnExportHistory');
    if (btnExport) {
      btnExport.onclick = () => {
        let csv = "ID,Zone,Date,Time,Duration,LAeq_dBA,Peak_Lmax_dBA,Variation_dB\n";
        this.history.forEach(h => {
          csv += `"${h.id}","${h.zoneName}","${h.date}","${h.timestamp}","${h.formattedTime}",${h.runningLAeq},${h.peakDb},${h.variation}\n`;
        });
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'QuietCampus_Mobile_Readings.csv';
        a.click();
        URL.revokeObjectURL(a.href);
      };
    }
  }

  // PWA Install on Phone
  bindPwaInstall() {
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      this.deferredInstallPrompt = e;
      const banner = document.getElementById('mobileInstallBanner');
      if (banner) banner.style.display = 'flex';
    });

    const bannerBtn = document.getElementById('btnBannerInstall');
    if (bannerBtn) {
      bannerBtn.addEventListener('click', async () => {
        if (this.deferredInstallPrompt) {
          this.deferredInstallPrompt.prompt();
          const { outcome } = await this.deferredInstallPrompt.userChoice;
          if (outcome === 'accepted') {
            const banner = document.getElementById('mobileInstallBanner');
            if (banner) banner.style.display = 'none';
          }
          this.deferredInstallPrompt = null;
        } else {
          alert("To install QuietCampus to your home screen:\n• iPhone (Safari): Tap Share > 'Add to Home Screen'\n• Android (Chrome): Tap Menu (3 dots) > 'Install App'");
        }
      });
    }
  }

  getZoneName(zid) {
    const f = TREP_PROJECT.campusZones.find(z => z.id === zid);
    return f ? f.name : 'Bennett University';
  }
}

document.addEventListener('DOMContentLoaded', () => {
  if (window.self !== window.top) {
    document.body.classList.add('is-embedded-iframe');
  }
  window.quietCampusMobile = new QuietCampusMobileApp();
});
