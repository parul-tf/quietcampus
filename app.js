/**
 * QuietCampus - Application Logic & User Journey Controller
 * Bennett University | TREP End Semester Project
 */

import { TREP_PROJECT } from './data.js';
import { AcousticEngine } from './audio-engine.js';

class QuietCampusApp {
  constructor() {
    this.engine = new AcousticEngine();
    this.currentTab = 'meter-tab';
    this.selectedZone = 'paid_mess';
    this.history = JSON.parse(localStorage.getItem('qc_session_history') || '[]');
    this.deferredInstallPrompt = null;
    this.lastEndedSession = null;
    this.liveChart = null;
    this.comparisonChart = null;

    this.init();
  }

  init() {
    this.bindNavigation();
    this.bindAudioControls();
    this.bindPwaInstall();
    this.bindDownloadCenter();
    this.renderCampusZones();
    this.renderDossierReport();
    this.renderHistoryList();
    this.bindAdminControls();
    this.setupVisualizerCanvas();
    this.initCharts();

    // Check if user has seen welcome dialog
    if (!localStorage.getItem('qc_welcomed')) {
      this.openModal('welcome-modal');
    }

    // Handle initial location pick from dropdown
    const zoneSelect = document.getElementById('sessionZoneSelect');
    if (zoneSelect) {
      zoneSelect.addEventListener('change', (e) => {
        this.selectedZone = e.target.value;
        this.engine.setSimulatedZone(this.selectedZone);
      });
    }

    // Calibration slider in settings
    const calRange = document.getElementById('calOffsetRange');
    const calVal = document.getElementById('calOffsetVal');
    if (calRange && calVal) {
      calRange.addEventListener('input', (e) => {
        const val = e.target.value;
        calVal.textContent = (val >= 0 ? `+${val}` : val) + ' dB';
        this.engine.setCalibrationOffset(val);
      });
    }
  }

  // --- NAVIGATION CONTROLLER ---
  bindNavigation() {
    const tabBtns = document.querySelectorAll('.nav-tab-btn');
    tabBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const targetTab = btn.getAttribute('data-tab');
        this.switchTab(targetTab);
      });
    });

    // Brand click returns to meter
    const brand = document.getElementById('brandLogo');
    if (brand) {
      brand.addEventListener('click', () => this.switchTab('meter-tab'));
    }
  }

  switchTab(tabId) {
    this.currentTab = tabId;
    document.querySelectorAll('.nav-tab-btn').forEach(btn => {
      btn.classList.toggle('active', btn.getAttribute('data-tab') === tabId);
    });

    document.querySelectorAll('.tab-pane').forEach(pane => {
      pane.classList.toggle('active', pane.id === tabId);
    });

    window.scrollTo({ top: 0, behavior: 'smooth' });

    // Refresh charts if entering campus or analysis tab
    if (tabId === 'campus-tab' || tabId === 'analysis-tab') {
      setTimeout(() => this.updateComparisonCharts(), 100);
    }
  }

  // --- AUDIO & DECIBEL ENGINE CONTROLLER ---
  bindAudioControls() {
    const btnStart = document.getElementById('btnStartMeter');
    const btnPause = document.getElementById('btnPauseMeter');
    const btnStop = document.getElementById('btnStopMeter');
    const btnSimToggle = document.getElementById('btnSimToggle');

    // Engine callbacks
    this.engine.onTick = (snapshot) => this.renderLiveSnapshot(snapshot);
    this.engine.onStateChange = (state) => this.updateMeterUiState(state);
    this.engine.onError = (err) => {
      this.showToast('Microphone access unavailable. Switched to Simulation Mode.', 'warning');
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
          btnPause.innerHTML = `<span>⏸</span> Pause`;
        } else {
          this.engine.pauseSession();
          btnPause.innerHTML = `<span>▶</span> Resume`;
        }
      });
    }

    if (btnStop) {
      btnStop.addEventListener('click', () => {
        const summary = this.engine.stopSession();
        this.lastEndedSession = {
          ...summary,
          id: 'SESSION-' + Date.now().toString(36).toUpperCase(),
          timestamp: new Date().toLocaleString(),
          zoneId: this.selectedZone,
          zoneName: this.getZoneName(this.selectedZone)
        };
        this.showSessionResultModal(this.lastEndedSession);
      });
    }
  }

  updateMeterUiState(state) {
    const pill = document.getElementById('micStatusPill');
    const pillText = document.getElementById('micStatusText');
    const btnStart = document.getElementById('btnStartMeter');
    const btnPause = document.getElementById('btnPauseMeter');
    const btnStop = document.getElementById('btnStopMeter');

    if (state.status === 'active') {
      pill.className = `mic-status-pill active ${state.mode === 'simulation' ? 'simulated' : ''}`;
      pillText.textContent = state.mode === 'simulation' ? 'Demo Mode Active' : 'Mic Active (Live)';
      btnStart.style.display = 'none';
      btnPause.style.display = 'inline-flex';
      btnStop.style.display = 'inline-flex';
    } else if (state.status === 'paused') {
      pill.className = 'mic-status-pill';
      pillText.textContent = 'Session Paused';
      btnPause.innerHTML = `<span>▶</span> Resume`;
    } else {
      // Stopped
      pill.className = 'mic-status-pill';
      pillText.textContent = 'Mic Inactive';
      btnStart.style.display = 'inline-flex';
      btnPause.style.display = 'none';
      btnStop.style.display = 'none';
    }
  }

  renderLiveSnapshot(snapshot) {
    // Current Level Display
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

    // Update Circular Ring Gauge (Circumference = 2 * PI * 90 ≈ 565.48)
    const circle = document.getElementById('meterRingProgress');
    if (circle) {
      const minLevel = 30;
      const maxLevel = 110;
      const percent = Math.min(1, Math.max(0, (snapshot.currentDb - minLevel) / (maxLevel - minLevel)));
      const offset = 565 - (percent * 565);
      circle.style.strokeDashoffset = offset;

      // Color transition according to acoustic levels
      if (snapshot.currentDb < 55) {
        circle.style.stroke = 'var(--teal-primary)';
      } else if (snapshot.currentDb < 70) {
        circle.style.stroke = '#3b82f6';
      } else if (snapshot.currentDb < 85) {
        circle.style.stroke = 'var(--warning-amber)';
      } else {
        circle.style.stroke = 'var(--danger-coral)';
      }
    }

    // Category badge & feedback
    if (categoryBadge && snapshot.dose) {
      categoryBadge.textContent = snapshot.dose.statusCategory;
      const col = snapshot.dose.statusColor;
      categoryBadge.style.color = col === 'red' ? '#f87171' : col === 'amber' ? '#fbbf24' : '#2dd4bf';
    }

    // Exposure Dose Progress Bar
    const doseFill = document.getElementById('doseProgressFill');
    const doseText = document.getElementById('dosePercentageText');
    const guidanceBox = document.getElementById('guidanceBoxText');

    if (snapshot.dose) {
      const whoPct = snapshot.dose.whoDosePercent;
      if (doseFill) {
        doseFill.style.width = Math.min(100, whoPct) + '%';
        if (whoPct > 80) doseFill.style.background = 'var(--danger-coral)';
        else if (whoPct > 40) doseFill.style.background = 'var(--warning-amber)';
        else doseFill.style.background = 'var(--teal-primary)';
      }
      if (doseText) {
        doseText.textContent = `${whoPct.toFixed(1)}% WHO Ref Dose`;
      }
      if (guidanceBox) {
        guidanceBox.textContent = snapshot.dose.guidanceText;
      }
    }

    // Render Canvas Oscilloscope
    this.drawVisualizer();
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
    this.canvas.width = this.canvas.parentElement.clientWidth || 300;
    this.canvas.height = 70;
  }

  drawVisualizer() {
    if (!this.canvas || !this.canvasCtx) return;
    const ctx = this.canvasCtx;
    const width = this.canvas.width;
    const height = this.canvas.height;

    ctx.clearRect(0, 0, width, height);

    const timeData = this.engine.getTimeDomainData();
    if (timeData && !this.engine.isSimulated) {
      // Live microphone waveform
      ctx.lineWidth = 2;
      ctx.strokeStyle = '#2dd4bf';
      ctx.beginPath();

      const sliceWidth = width / timeData.length;
      let x = 0;

      for (let i = 0; i < timeData.length; i++) {
        const v = timeData[i];
        const y = (v + 1) * (height / 2);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
        x += sliceWidth;
      }
      ctx.lineTo(width, height / 2);
      ctx.stroke();
    } else {
      // Simulation or fallback animated waveform
      const trend = this.engine.trendHistory;
      if (trend.length < 2) return;

      ctx.lineWidth = 2.5;
      ctx.strokeStyle = '#2dd4bf';
      ctx.beginPath();

      const step = width / (this.engine.maxHistoryLength - 1);
      const minDb = 35;
      const maxDb = 100;

      for (let i = 0; i < trend.length; i++) {
        const x = i * step;
        const normalized = (trend[i].level - minDb) / (maxDb - minDb);
        const y = height - (Math.max(0, Math.min(1, normalized)) * (height - 8)) - 4;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
  }

  // --- SESSION RESULT MODAL ---
  showSessionResultModal(session) {
    const modal = document.getElementById('result-modal');
    if (!modal) return;

    document.getElementById('resDuration').textContent = session.formattedTime;
    document.getElementById('resLaeq').textContent = `${session.runningLAeq.toFixed(1)} dB(A)`;
    document.getElementById('resPeak').textContent = `${session.peakDb.toFixed(1)} dB(A)`;
    document.getElementById('resVariation').textContent = `${session.variation.toFixed(1)} dB`;
    document.getElementById('resDose').textContent = `${session.dose.whoDosePercent.toFixed(1)}% of reference`;
    document.getElementById('resLocation').textContent = session.zoneName;

    this.openModal('result-modal');

    // Button actions
    const btnSave = document.getElementById('btnSaveResult');
    const btnDiscard = document.getElementById('btnDiscardResult');
    const btnShare = document.getElementById('btnShareResult');

    btnSave.onclick = () => {
      this.history.unshift(session);
      localStorage.setItem('qc_session_history', JSON.stringify(this.history));
      this.renderHistoryList();
      this.closeModal('result-modal');
      this.showToast('Session saved to history successfully!', 'success');
    };

    btnDiscard.onclick = () => {
      this.closeModal('result-modal');
      this.showToast('Session discarded.', 'info');
    };

    btnShare.onclick = () => {
      const text = `QuietCampus Acoustic Report\nLocation: ${session.zoneName}\nLAeq: ${session.runningLAeq.toFixed(1)} dB(A)\nPeak: ${session.peakDb.toFixed(1)} dB(A)\nDuration: ${session.formattedTime}\nEstimated WHO Reference Dose: ${session.dose.whoDosePercent.toFixed(1)}%\nBennett University SDG Action Lab`;
      if (navigator.share) {
        navigator.share({ title: 'QuietCampus Acoustic Session', text: text }).catch(() => {});
      } else {
        navigator.clipboard.writeText(text);
        this.showToast('Session summary copied to clipboard!', 'success');
      }
    };
  }

  // --- CAMPUS ZONES VIEW ---
  renderCampusZones() {
    const container = document.getElementById('campusZonesContainer');
    if (!container) return;

    container.innerHTML = TREP_PROJECT.campusZones.map(zone => `
      <div class="zone-card ${zone.baselineLAeq > 80 ? 'high-noise' : zone.baselineLAeq > 70 ? 'med-noise' : ''}">
        <div class="zone-top-bar">
          <div>
            <h3>${zone.name}</h3>
            <span class="zone-coords">${zone.coordinates}</span>
          </div>
          <span class="brand-badge">${zone.targetCategory}</span>
        </div>
        <p class="zone-desc">${zone.description}</p>
        
        <div class="zone-decibel-comparison">
          <div>
            <div class="zone-stat-sublabel">Baseline LAeq</div>
            <div class="zone-stat-large">${zone.baselineLAeq} <span style="font-size: 0.8rem">dB(A)</span></div>
          </div>
          <div>
            <div class="zone-stat-sublabel">Post-Nudge</div>
            <div class="zone-stat-large" style="color: var(--teal-primary)">${zone.postInterventionLAeq} <span style="font-size: 0.8rem">dB(A)</span></div>
            <div class="zone-stat-delta">↓ -${zone.reduction} dB (${zone.status})</div>
          </div>
        </div>

        <div style="margin-bottom: 14px; font-size: 0.8rem; color: #475569;">
          <strong>Approved Interventions:</strong>
          <ul style="margin: 4px 0 0 16px;">
            ${zone.interventions.map(i => `<li>${i}</li>`).join('')}
          </ul>
        </div>

        <button class="btn-measure-here" data-zone="${zone.id}">
          <span>🎙</span> Measure at this Location
        </button>
      </div>
    `).join('');

    // Bind Measure Here buttons
    container.querySelectorAll('.btn-measure-here').forEach(btn => {
      btn.addEventListener('click', () => {
        const zoneId = btn.getAttribute('data-zone');
        this.selectedZone = zoneId;
        const select = document.getElementById('sessionZoneSelect');
        if (select) select.value = zoneId;
        this.engine.setSimulatedZone(zoneId);
        this.switchTab('meter-tab');
        this.showToast(`Selected: ${this.getZoneName(zoneId)}. Press Start to measure.`, 'info');
      });
    });
  }

  // --- TREP PROJECT REPORT (SECTIONS 2 TO 14) ---
  renderDossierReport() {
    const container = document.getElementById('dossierContentArea');
    const quicklinks = document.getElementById('dossierQuicklinks');
    if (!container || !quicklinks) return;

    // Quick navigation pills
    quicklinks.innerHTML = TREP_PROJECT.sections.map(sec => `
      <a href="#sec-${sec.number}" class="dossier-pill-link">
        ${sec.number}. ${sec.title}
      </a>
    `).join('');

    // Dossier Section Cards
    container.innerHTML = TREP_PROJECT.sections.map(sec => `
      <section class="dossier-section" id="sec-${sec.number}">
        <h2 class="section-heading">
          <span class="section-num">Section ${sec.number}</span>
          ${sec.title}
        </h2>
        <div style="font-size: 0.88rem; color: var(--teal-primary); font-weight: 600; margin-bottom: 12px;">
          ${sec.summary}
        </div>
        <div class="dossier-markdown-body">
          ${this.formatMarkdown(sec.content)}
        </div>
      </section>
    `).join('');
  }

  formatMarkdown(md) {
    if (!md) return '';
    let html = md.trim();

    // Tables
    html = html.replace(/\|(.+)\|/g, (match) => {
      const rows = match.split('\n');
      return match;
    });

    // Basic markdown conversions
    html = html
      .replace(/^### (.*$)/gim, '<h3>$1</h3>')
      .replace(/^## (.*$)/gim, '<h2>$1</h2>')
      .replace(/\*\*(.*?)\*\*/gim, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/gim, '<em>$1</em>')
      .replace(/`([^`]+)`/g, '<code>$1</code>')
      .replace(/\\\[([\s\S]*?)\\\]/g, '<div class="math-display"><code>$1</code></div>')
      .replace(/\\\((.*?)\\\)/g, '<code>$1</code>')
      .replace(/^\s*-\s+(.*$)/gim, '<li>$1</li>');

    // Wrap list items
    html = html.replace(/(<li>[\s\S]*?<\/li>)/gm, '<ul>$1</ul>');
    html = html.replace(/<\/ul>\s*<ul>/g, '');

    // Convert markdown table syntax to clean HTML tables
    if (html.includes('|')) {
      const tableRegex = /((?:\|.+?\|\r?\n)+)/g;
      html = html.replace(tableRegex, (match) => {
        const lines = match.trim().split('\n');
        if (lines.length < 2) return match;
        let tableHtml = '<div class="dossier-table-wrap"><table class="academic-table">';
        lines.forEach((line, index) => {
          if (line.includes('---')) return; // skip markdown divider
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

  // --- HISTORY LIST & LOCALSTORAGE ---
  renderHistoryList() {
    const listWrap = document.getElementById('historyListWrapper');
    if (!listWrap) return;

    if (this.history.length === 0) {
      listWrap.innerHTML = `
        <div style="text-align: center; padding: 40px; color: var(--text-muted); background: #ffffff; border-radius: var(--radius-lg); border: 1px dashed #cbd5e1;">
          <p style="font-size: 1.1rem; font-weight: 600; color: #475569;">No Saved Sessions Yet</p>
          <p style="font-size: 0.85rem; margin-top: 6px;">Start measuring sound in the Live Meter tab to log observations locally.</p>
        </div>
      `;
      return;
    }

    listWrap.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px;">
        <span style="font-size: 0.85rem; color: #64748b; font-weight: 600;">${this.history.length} Saved Sessions (Local Storage)</span>
        <button id="btnClearHistory" style="background: none; border: none; color: var(--danger-coral); font-size: 0.8rem; font-weight: 600; cursor: pointer;">
          Clear History
        </button>
      </div>
      ${this.history.map(item => `
        <div class="history-item-card">
          <div>
            <div style="font-size: 0.95rem; font-weight: 700; color: var(--primary-navy)">${item.zoneName || 'General Campus'}</div>
            <div style="font-size: 0.75rem; color: #64748b; margin-top: 2px;">
              ${item.timestamp} • Duration: ${item.formattedTime}
            </div>
          </div>
          <div style="text-align: right">
            <div style="font-size: 1.25rem; font-weight: 800; color: var(--teal-primary)">
              ${item.runningLAeq.toFixed(1)} <span style="font-size: 0.75rem">dB(A)</span>
            </div>
            <div style="font-size: 0.72rem; color: #64748b">
              Peak: ${item.peakDb.toFixed(1)} dB • ${item.dose ? item.dose.whoDosePercent.toFixed(1) : '0'}% Ref Dose
            </div>
          </div>
        </div>
      `).join('')}
    `;

    const btnClear = document.getElementById('btnClearHistory');
    if (btnClear) {
      btnClear.onclick = () => {
        if (confirm('Are you sure you want to delete all saved session logs?')) {
          this.history = [];
          localStorage.removeItem('qc_session_history');
          this.renderHistoryList();
          this.showToast('Session history cleared.', 'info');
        }
      };
    }
  }

  // --- DOWNLOAD CENTER & PWA INSTALL ---
  bindPwaInstall() {
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      this.deferredInstallPrompt = e;
      const btnHeaderInstall = document.getElementById('btnHeaderInstall');
      if (btnHeaderInstall) {
        btnHeaderInstall.style.display = 'inline-flex';
      }
    });

    const installBtns = [
      document.getElementById('btnHeaderInstall'),
      document.getElementById('btnModalPwaInstall')
    ];

    installBtns.forEach(btn => {
      if (!btn) return;
      btn.addEventListener('click', async () => {
        if (this.deferredInstallPrompt) {
          this.deferredInstallPrompt.prompt();
          const { outcome } = await this.deferredInstallPrompt.userChoice;
          if (outcome === 'accepted') {
            this.showToast('QuietCampus installed to your device!', 'success');
          }
          this.deferredInstallPrompt = null;
        } else {
          // Provide clear instructions for manual browser installation
          alert("To install QuietCampus:\n• On Chrome/Edge: Click the install icon in the URL bar, or 3-dots > 'Install QuietCampus'\n• On iPhone/iPad (Safari): Tap the Share button > 'Add to Home Screen'\n• On Android: Tap 3 dots > 'Install app' or 'Add to Home screen'");
        }
      });
    });
  }

  bindDownloadCenter() {
    const btnOpenDownloads = document.getElementById('btnOpenDownloadModal');
    if (btnOpenDownloads) {
      btnOpenDownloads.addEventListener('click', () => this.openModal('download-modal'));
    }

    // 1. Download Offline App Package (.zip)
    const btnDownloadZip = document.getElementById('btnDownloadZip');
    if (btnDownloadZip) {
      btnDownloadZip.addEventListener('click', () => this.generateAndDownloadZip());
    }

    // 2. Download Raw Fieldwork Data (CSV)
    const btnDownloadCsv = document.getElementById('btnDownloadCsv');
    if (btnDownloadCsv) {
      btnDownloadCsv.addEventListener('click', () => this.exportFieldworkCsv());
    }

    // 3. Print / Save Report as PDF
    const btnPrintPdf = document.getElementById('btnPrintReportPdf');
    if (btnPrintPdf) {
      btnPrintPdf.addEventListener('click', () => {
        this.switchTab('report-tab');
        setTimeout(() => window.print(), 300);
      });
    }
  }

  // Generate and download a standalone zip archive of the app using JSZip
  async generateAndDownloadZip() {
    try {
      this.showToast('Preparing standalone QuietCampus offline bundle...', 'info');

      if (window.JSZip) {
        const zip = new window.JSZip();

        // Fetch current files
        const filesToPack = ['index.html', 'styles.css', 'data.js', 'audio-engine.js', 'app.js', 'manifest.json', 'sw.js', 'README.md'];
        for (const file of filesToPack) {
          try {
            const res = await fetch(file);
            if (res.ok) {
              const text = await res.text();
              zip.file(file, text);
            }
          } catch (e) {
            console.warn(`Could not fetch ${file} for zip:`, e);
          }
        }

        const blob = await zip.generateAsync({ type: 'blob' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'QuietCampus-BennettUniversity-App.zip';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        this.showToast('QuietCampus app ZIP package downloaded!', 'success');
      } else {
        // Fallback: direct download link to pre-built zip
        window.location.href = 'QuietCampus-BennettUniversity-App.zip';
      }
    } catch (err) {
      console.error('Zip generation failed:', err);
      this.showToast('Download started via direct download.', 'info');
      window.location.href = 'QuietCampus-BennettUniversity-App.zip';
    }
  }

  exportFieldworkCsv() {
    let csv = "Record_ID,Zone_ID,Zone_Name,Baseline_LAeq_dB,Post_Intervention_LAeq_dB,Reduction_dB,Target_Limit_dB,Status\n";
    TREP_PROJECT.campusZones.forEach((z, idx) => {
      csv += `REC-BU-00${idx + 1},"${z.id}","${z.name}",${z.baselineLAeq},${z.postInterventionLAeq},${z.reduction},${z.recommendedLimit},"${z.status}"\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'QuietCampus_Fieldwork_Evidence_BennettUniversity.csv';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    this.showToast('Fieldwork CSV exported successfully!', 'success');
  }

  // --- CHARTS & DATA ANALYSIS ---
  initCharts() {
    if (!window.Chart) return;

    // Comparison Bar Chart (Baseline vs Post Intervention)
    const ctxComp = document.getElementById('comparisonBarChart');
    if (ctxComp) {
      const labels = TREP_PROJECT.campusZones.map(z => z.name.replace(' (Library Resource Centre)', '').replace(' / N Block Entrance', ''));
      const baselineData = TREP_PROJECT.campusZones.map(z => z.baselineLAeq);
      const postData = TREP_PROJECT.campusZones.map(z => z.postInterventionLAeq);
      const targetData = TREP_PROJECT.campusZones.map(z => z.recommendedLimit);

      this.comparisonChart = new Chart(ctxComp, {
        type: 'bar',
        data: {
          labels: labels,
          datasets: [
            {
              label: 'Pre-Intervention Baseline LAeq (dB)',
              data: baselineData,
              backgroundColor: '#ef4444',
              borderRadius: 6
            },
            {
              label: 'Post-Intervention LAeq (dB)',
              data: postData,
              backgroundColor: '#0d9488',
              borderRadius: 6
            },
            {
              label: 'Target Limit (dB)',
              data: targetData,
              type: 'line',
              borderColor: '#f59e0b',
              borderDash: [5, 5],
              fill: false,
              tension: 0.1
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { position: 'top' },
            tooltip: {
              callbacks: {
                label: (ctx) => `${ctx.dataset.label}: ${ctx.raw} dB(A)`
              }
            }
          },
          scales: {
            y: {
              beginAtZero: false,
              min: 30,
              max: 100,
              title: { display: true, text: 'Sound Level in dB(A)' }
            }
          }
        }
      });
    }

    // Hourly Diurnal Noise Curve
    const ctxHourly = document.getElementById('hourlyTrendChart');
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
              label: 'Paid Mess Baseline (dB)',
              data: messZone.hourlyBaseline,
              borderColor: '#ef4444',
              backgroundColor: 'rgba(239, 68, 68, 0.1)',
              tension: 0.3,
              fill: true
            },
            {
              label: 'Paid Mess Post-Nudge (dB)',
              data: messZone.hourlyPost,
              borderColor: '#14b8a6',
              tension: 0.3
            },
            {
              label: 'LRC Baseline (dB)',
              data: lrcZone.hourlyBaseline,
              borderColor: '#f59e0b',
              borderDash: [4, 4],
              tension: 0.3
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { position: 'top' }
          },
          scales: {
            y: {
              min: 40,
              max: 95,
              title: { display: true, text: 'LAeq in dB(A)' }
            }
          }
        }
      });
    }
  }

  updateComparisonCharts() {
    if (this.comparisonChart) {
      this.comparisonChart.update();
    }
  }

  // --- ADMIN LAB CONTROLS ---
  bindAdminControls() {
    const adminToggle = document.getElementById('adminToggleBtn');
    const adminPanel = document.getElementById('adminPanelWrap');
    if (adminToggle && adminPanel) {
      adminToggle.addEventListener('click', () => {
        const pass = prompt('Enter Admin Lab Passcode (Default: admin123):');
        if (pass === 'admin123' || pass === 'admin') {
          adminPanel.style.display = 'block';
          this.showToast('Admin Lab Access Granted.', 'success');
        } else if (pass !== null) {
          this.showToast('Incorrect passcode.', 'error');
        }
      });
    }

    const btnAddRecord = document.getElementById('btnAddFieldRecord');
    if (btnAddRecord) {
      btnAddRecord.addEventListener('click', () => {
        const loc = document.getElementById('adminNewLocation').value;
        const laeq = parseFloat(document.getElementById('adminNewLaeq').value);
        if (loc && !isNaN(laeq)) {
          this.showToast(`New fieldwork survey point recorded: ${loc} @ ${laeq} dB(A)`, 'success');
          document.getElementById('adminNewLaeq').value = '';
        } else {
          alert('Please enter a valid decibel value.');
        }
      });
    }
  }

  // --- MODAL UTILITIES ---
  openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) modal.classList.add('active');
  }

  closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) modal.classList.remove('active');
  }

  showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast-pill toast-${type}`;
    toast.textContent = message;
    toast.style.cssText = `
      position: fixed;
      bottom: 24px;
      right: 24px;
      background: ${type === 'success' ? '#0d9488' : type === 'warning' ? '#f59e0b' : type === 'error' ? '#ef4444' : '#0f172a'};
      color: #fff;
      padding: 12px 20px;
      border-radius: 999px;
      font-size: 0.85rem;
      font-weight: 600;
      box-shadow: 0 10px 25px rgba(0,0,0,0.2);
      z-index: 9999;
      animation: fadeIn 0.2s ease-in-out;
    `;
    document.body.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(10px)';
      toast.style.transition = 'all 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, 3200);
  }

  getZoneName(zoneId) {
    const found = TREP_PROJECT.campusZones.find(z => z.id === zoneId);
    return found ? found.name : 'Bennett University Campus';
  }
}

// Global Modal Closer Helper
window.closeActiveModal = function(id) {
  const modal = document.getElementById(id);
  if (modal) modal.classList.remove('active');
};

// Bootstrap application on DOM ready
document.addEventListener('DOMContentLoaded', () => {
  window.quietCampus = new QuietCampusApp();
});
