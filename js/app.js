/**
 * LunaAlign AI - Main Application Orchestrator
 * Integrates state management, API services, canvas rendering,
 * diagnostics, and mission control UX interactions.
 */

import { stateStore } from './state.js';
import { ApiService } from './api.js';
import { LunarSamples } from '../assets/lunar-samples.js';
import { CanvasOverlayRenderer } from './canvas-overlay.js';
import { DiagnosticsManager } from './diagnostics.js';

class LunaAlignApp {
  constructor() {
    this.overlayRenderer = null;
    this.diagnosticsManager = null;
  }

  async init() {
    this.initDOMReferences();
    this.initNavigation();
    this.initImageryUploads();
    this.initMetadataControls();
    this.initPipelineTriggers();
    this.initOverlayControls();
    this.initExportReport();

    // Initialize Diagnostics Module
    this.diagnosticsManager = new DiagnosticsManager();
    this.diagnosticsManager.init();

    // Initialize Overlay Canvas Renderer
    const canvas = document.getElementById('overlayCanvas');
    const tooltip = document.getElementById('canvasTooltip');
    const divider = document.getElementById('swipeDividerHandle');
    if (canvas && tooltip && divider) {
      this.overlayRenderer = new CanvasOverlayRenderer(canvas, tooltip, divider);
    }

    // Subscribe to state changes for UI reactivity
    stateStore.subscribe((state) => this.render(state));

    // Handle jump-to-diagnostics on canvas match point click
    window.addEventListener('match-selected', (e) => {
      this.switchTab('diagnostics');
      this.showToast(`Inspecting Inlier #${e.detail.id}`, 'info');
    });

    // Check live backend status
    this.checkBackendHealth();

    // Pre-load default Chandrayaan-2 dataset so application is ready on first glance
    this.loadSampleDataset();
  }

  initDOMReferences() {
    this.navItems = document.querySelectorAll('.nav-item');
    this.viewPanels = document.querySelectorAll('.view-panel');
    this.pageTitle = document.getElementById('topPageTitle');
    this.pageSubtitle = document.getElementById('topPageSubtitle');

    // Header gauges
    this.rmseEl = document.getElementById('headerRmseVal');
    this.inliersEl = document.getElementById('headerInliersVal');
    this.modelEl = document.getElementById('headerModelVal');
    this.backendStatusPill = document.getElementById('backendStatusPill');

    // Sidebar timeline elements
    this.timelineSteps = document.querySelectorAll('.timeline-step');
    this.sidebarRunBtn = document.getElementById('btnSidebarRunPipeline');
    this.rawRunBtn = document.getElementById('btnRawRunPipeline');
  }

  initNavigation() {
    this.navItems.forEach(btn => {
      btn.addEventListener('click', (e) => {
        const targetTab = e.currentTarget.dataset.tab;
        this.switchTab(targetTab);
      });
    });
  }

  switchTab(tabId) {
    stateStore.set({ activeTab: tabId });

    this.navItems.forEach(btn => {
      btn.classList.toggle('active', btn.dataset.tab === tabId);
    });

    this.viewPanels.forEach(panel => {
      panel.classList.toggle('active', panel.id === `view-${tabId}`);
    });

    // Update Header
    if (tabId === 'raw-imagery') {
      this.pageTitle.textContent = 'Source & Reference Input';
      this.pageSubtitle.textContent = 'Upload lunar imagery for correspondence and registration';
    } else if (tabId === 'diagnostics') {
      this.pageTitle.textContent = 'Match Diagnostics & Explanations';
      this.pageSubtitle.textContent = 'Scale, sun illumination, and feature correspondence analysis';
    } else if (tabId === 'registration-overlay') {
      this.pageTitle.textContent = 'Registration Validation Layer';
      this.pageSubtitle.textContent = 'Alpha blend, interactive swipe curtain, and flicker verification';
      // Trigger canvas re-render when switching to overlay tab
      if (this.overlayRenderer) {
        setTimeout(() => this.overlayRenderer.render(), 50);
      }
    }
  }

  initImageryUploads() {
    // Source Drag & Drop
    this.setupDropzone('sourceDropzone', 'sourceFileInput', 'source', (imgData) => {
      stateStore.set({ sourceImage: imgData });
      this.updateImagePreview('source', imgData);
      this.syncImagesToRenderer();
      this.showToast('Source moving image loaded successfully', 'success');
    });

    // Reference Drag & Drop
    this.setupDropzone('refDropzone', 'refFileInput', 'reference', (imgData) => {
      stateStore.set({ referenceImage: imgData });
      this.updateImagePreview('reference', imgData);
      this.syncImagesToRenderer();
      this.showToast('Reference fixed target loaded successfully', 'success');
    });

    // Remove buttons
    document.getElementById('btnRemoveSource')?.addEventListener('click', () => {
      stateStore.set({ sourceImage: null });
      this.resetImagePreview('source');
    });

    document.getElementById('btnRemoveRef')?.addEventListener('click', () => {
      stateStore.set({ referenceImage: null });
      this.resetImagePreview('reference');
    });

    // Quick sample load triggers
    document.getElementById('btnLoadSampleDataset')?.addEventListener('click', () => {
      this.loadSampleDataset();
      this.showToast('Chandrayaan-2 sample dataset loaded', 'success');
    });

    document.getElementById('btnQuickSampleSource')?.addEventListener('click', (e) => {
      e.stopPropagation();
      const sample = LunarSamples.generateLunarSurface('ohrc');
      stateStore.set({ sourceImage: { name: 'Chandrayaan2_OHRC_Moving.png', size: '2.4 MB', ...sample } });
      this.updateImagePreview('source', stateStore.get().sourceImage);
      this.syncImagesToRenderer();
    });

    document.getElementById('btnQuickSampleRef')?.addEventListener('click', (e) => {
      e.stopPropagation();
      const sample = LunarSamples.generateLunarSurface('tmc');
      stateStore.set({ referenceImage: { name: 'Chandrayaan2_TMC_Reference.png', size: '1.8 MB', ...sample } });
      this.updateImagePreview('reference', stateStore.get().referenceImage);
      this.syncImagesToRenderer();
    });
  }

  setupDropzone(dropzoneId, inputId, type, onLoaded) {
    const dropzone = document.getElementById(dropzoneId);
    const fileInput = document.getElementById(inputId);
    if (!dropzone || !fileInput) return;

    ['dragenter', 'dragover'].forEach(eventName => {
      dropzone.addEventListener(eventName, (e) => {
        e.preventDefault();
        dropzone.classList.add('dragover');
      });
    });

    ['dragleave', 'drop'].forEach(eventName => {
      dropzone.addEventListener(eventName, (e) => {
        e.preventDefault();
        dropzone.classList.remove('dragover');
      });
    });

    dropzone.addEventListener('drop', (e) => {
      const files = e.dataTransfer.files;
      if (files && files[0]) {
        this.handleFileUpload(files[0], type, onLoaded);
      }
    });

    fileInput.addEventListener('change', (e) => {
      const files = e.target.files;
      if (files && files[0]) {
        this.handleFileUpload(files[0], type, onLoaded);
      }
    });
  }

  handleFileUpload(file, type, onLoaded) {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0);

        const imgData = {
          name: file.name,
          size: `${(file.size / (1024 * 1024)).toFixed(2)} MB`,
          dataUrl: e.target.result,
          canvas: canvas,
          width: img.width,
          height: img.height,
          resolution: type === 'source' ? '0.25 m/pixel (Auto)' : '5.0 m/pixel (Auto)',
          sensor: type === 'source' ? 'OHRC (Auto)' : 'TMC (Auto)'
        };
        onLoaded(imgData);
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  }

  updateImagePreview(type, imgData) {
    const dropzone = document.getElementById(`${type === 'source' ? 'source' : 'ref'}Dropzone`);
    const preview = document.getElementById(`${type === 'source' ? 'source' : 'ref'}Preview`);
    const img = document.getElementById(`${type === 'source' ? 'source' : 'ref'}PreviewImg`);
    const name = document.getElementById(`${type === 'source' ? 'source' : 'ref'}Filename`);
    const meta = document.getElementById(`${type === 'source' ? 'source' : 'ref'}SpecsMeta`);

    if (!dropzone || !preview || !img || !name) return;

    img.src = imgData.dataUrl;
    name.textContent = imgData.name;
    if (meta) meta.textContent = `${imgData.width}x${imgData.height} • ${imgData.size}`;

    dropzone.style.display = 'none';
    preview.classList.add('active');
  }

  resetImagePreview(type) {
    const dropzone = document.getElementById(`${type === 'source' ? 'source' : 'ref'}Dropzone`);
    const preview = document.getElementById(`${type === 'source' ? 'source' : 'ref'}Preview`);
    if (dropzone && preview) {
      dropzone.style.display = 'flex';
      preview.classList.remove('active');
    }
  }

  loadSampleDataset() {
    const ohrc = LunarSamples.generateLunarSurface('ohrc', 600, 500);
    const tmc = LunarSamples.generateLunarSurface('tmc', 600, 500);

    const sourceData = {
      name: 'Chandrayaan2_OHRC_Moving_01.png',
      size: '2.84 MB',
      ...ohrc
    };

    const refData = {
      name: 'Chandrayaan2_TMC_Reference_01.png',
      size: '1.92 MB',
      ...tmc
    };

    stateStore.set({
      sourceImage: sourceData,
      referenceImage: refData
    });

    this.updateImagePreview('source', sourceData);
    this.updateImagePreview('reference', refData);
    this.syncImagesToRenderer();
  }

  syncImagesToRenderer() {
    const state = stateStore.get();
    if (state.sourceImage && state.referenceImage && this.overlayRenderer) {
      this.overlayRenderer.loadImages(state.sourceImage.dataUrl, state.referenceImage.dataUrl);
      const emptyState = document.getElementById('overlayEmptyState');
      if (emptyState) emptyState.style.display = 'none';
    }
  }

  initMetadataControls() {
    const mapping = [
      { id: 'metaSensor', key: 'sensor' },
      { id: 'metaImageType', key: 'imageType' },
      { id: 'metaMission', key: 'mission' },
      { id: 'metaSunAngle', key: 'sunAngle' },
      { id: 'metaScale', key: 'scale' },
      { id: 'metaCoordinateSystem', key: 'coordinateSystem' }
    ];

    mapping.forEach(({ id, key }) => {
      const el = document.getElementById(id);
      if (el) {
        el.addEventListener('change', (e) => {
          stateStore.updateMetadata(key, e.target.value);
        });
      }
    });
  }

  initPipelineTriggers() {
    const runHandler = () => this.executePipeline();

    this.sidebarRunBtn?.addEventListener('click', runHandler);
    this.rawRunBtn?.addEventListener('click', runHandler);
  }

  async executePipeline() {
    const state = stateStore.get();
    if (state.pipeline.isRunning) return;

    if (!state.sourceImage || !state.referenceImage) {
      this.showToast('Please provide both Source and Reference images before running pipeline', 'warning');
      return;
    }

    stateStore.updatePipeline({ isRunning: true, currentStep: 0, logs: [] });
    this.sidebarRunBtn?.classList.add('running');
    if (this.sidebarRunBtn) this.sidebarRunBtn.innerHTML = `
      <svg class="spin" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="12" cy="12" r="10" stroke-opacity="0.25"></circle>
        <path d="M12 2a10 10 0 0 1 10 10" stroke-linecap="round"></path>
      </svg>
      Processing...
    `;

    this.logTelemetry('Initializing ISRO lunar correspondence pipeline...');

    try {
      const telemetryResult = await ApiService.runPipeline(
        state.sourceImage,
        state.referenceImage,
        state.metadata,
        (stepIndex, message) => {
          stateStore.updatePipeline({ currentStep: stepIndex });
          this.logTelemetry(message);
        }
      );

      stateStore.updateTelemetry(telemetryResult);
      stateStore.updatePipeline({ isRunning: false, currentStep: 5, hasExecuted: true });

      this.showToast(`Registration Completed: RMSE ${telemetryResult.rmse} px | ${telemetryResult.inliers} Inliers`, 'success');
      
      // Refresh overlay
      if (this.overlayRenderer) {
        this.overlayRenderer.render();
      }

    } catch (err) {
      stateStore.updatePipeline({ isRunning: false });
      this.showToast(`Pipeline Execution Error: ${err.message}`, 'error');
    } finally {
      this.sidebarRunBtn?.classList.remove('running');
      if (this.sidebarRunBtn) this.sidebarRunBtn.innerHTML = `
        <svg viewBox="0 0 24 24"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
        Run Registration Pipeline
      `;
    }
  }

  logTelemetry(message) {
    const time = new Date().toLocaleTimeString();
    const logBox = document.getElementById('terminalLogBox');
    if (logBox) {
      const entry = document.createElement('div');
      entry.className = 'log-entry';
      entry.innerHTML = `<span class="log-time">[${time}]</span> <span class="log-text">${message}</span>`;
      logBox.appendChild(entry);
      logBox.scrollTop = logBox.scrollHeight;
    }
  }

  initOverlayControls() {
    // Mode switcher buttons
    const modeTabs = document.querySelectorAll('.btn-mode-tab');
    modeTabs.forEach(tab => {
      tab.addEventListener('click', (e) => {
        const mode = e.currentTarget.dataset.mode;
        modeTabs.forEach(t => t.classList.remove('active'));
        e.currentTarget.classList.add('active');

        stateStore.updateOverlay({ mode });
        if (this.overlayRenderer) this.overlayRenderer.render();

        // Show/hide opacity slider based on mode
        const opacityWrap = document.getElementById('opacitySliderWrap');
        if (opacityWrap) {
          opacityWrap.style.display = mode === 'alpha' ? 'flex' : 'none';
        }
      });
    });

    // Opacity Slider
    const opacitySlider = document.getElementById('overlayOpacitySlider');
    const opacityVal = document.getElementById('overlayOpacityVal');
    if (opacitySlider && opacityVal) {
      opacitySlider.addEventListener('input', (e) => {
        const val = parseFloat(e.target.value);
        opacityVal.textContent = `${Math.round(val * 100)}%`;
        stateStore.updateOverlay({ opacity: val });
        if (this.overlayRenderer) this.overlayRenderer.render();
      });
    }

    // Toggle Inliers and Outliers
    const toggleInliers = document.getElementById('toggleInliersBtn');
    const toggleOutliers = document.getElementById('toggleOutliersBtn');

    toggleInliers?.addEventListener('click', () => {
      const cur = stateStore.get().overlay.showInliers;
      stateStore.updateOverlay({ showInliers: !cur });
      toggleInliers.classList.toggle('active', !cur);
      if (this.overlayRenderer) this.overlayRenderer.render();
    });

    toggleOutliers?.addEventListener('click', () => {
      const cur = stateStore.get().overlay.showOutliers;
      stateStore.updateOverlay({ showOutliers: !cur });
      toggleOutliers.classList.toggle('active', !cur);
      if (this.overlayRenderer) this.overlayRenderer.render();
    });
  }

  initExportReport() {
    const exportBtn = document.getElementById('btnExportReport');
    exportBtn?.addEventListener('click', () => {
      const state = stateStore.get();
      if (!state.pipeline.hasExecuted) {
        this.showToast('Please execute the pipeline before exporting report', 'warning');
        return;
      }
      ApiService.exportReport(state.telemetry, state.metadata, state.sourceImage, state.referenceImage);
      this.showToast('Telemetry report exported successfully', 'success');
    });
  }

  async checkBackendHealth() {
    const res = await ApiService.checkHealth();
    const indicator = document.getElementById('sidebarBackendIndicator');
    const statusText = document.getElementById('sidebarBackendText');
    const pill = document.getElementById('backendStatusPill');

    if (res.isConnected) {
      indicator?.classList.add('live');
      if (statusText) statusText.textContent = 'Backend: Connected (8000)';
      if (pill) {
        pill.innerHTML = '<span class="pulse-ring"></span> ISRO PIPELINE READY';
        pill.style.borderColor = 'rgba(16, 185, 129, 0.4)';
        pill.style.color = '#34d399';
      }
    } else {
      indicator?.classList.remove('live');
      if (statusText) statusText.textContent = 'Backend: Standby Mode';
      if (pill) {
        pill.innerHTML = '<span class="pulse-ring"></span> STANDBY READY';
      }
    }
  }

  render(state) {
    // Update Header Telemetry
    if (state.telemetry.rmse !== null) {
      this.rmseEl.textContent = `${state.telemetry.rmse.toFixed(2)} px`;
      this.inliersEl.textContent = `${state.telemetry.inliers} / ${state.telemetry.totalCandidates}`;
      this.modelEl.textContent = 'RANSAC Homography';
    } else {
      this.rmseEl.textContent = '-- px';
      this.inliersEl.textContent = '--';
      this.modelEl.textContent = '--';
    }

    // Update Timeline Steps
    const current = state.pipeline.currentStep;
    this.timelineSteps.forEach((stepEl, idx) => {
      stepEl.classList.remove('active', 'completed');
      if (current >= 0) {
        if (idx < current) {
          stepEl.classList.add('completed');
        } else if (idx === current) {
          stepEl.classList.add('active');
        }
      }
    });

    // Update timeline title status
    const timelineTitle = document.querySelector('.timeline-title');
    if (timelineTitle) {
      timelineTitle.classList.toggle('active', state.pipeline.isRunning);
    }
  }

  showToast(message, type = 'info') {
    const container = document.getElementById('toastContainer');
    if (!container) return;

    const toast = document.createElement('div');
    toast.style.cssText = `
      background: rgba(14, 20, 36, 0.95);
      backdrop-filter: blur(16px);
      border: 1px solid ${type === 'success' ? '#10b981' : (type === 'error' ? '#f43f5e' : (type === 'warning' ? '#f59e0b' : '#06b6d4'))};
      color: #f8fafc;
      padding: 10px 18px;
      border-radius: 8px;
      font-size: 13px;
      box-shadow: 0 10px 30px rgba(0,0,0,0.7);
      margin-bottom: 10px;
      display: flex;
      align-items: center;
      gap: 10px;
      animation: fadeIn 0.3s ease;
      max-width: 420px;
      pointer-events: auto;
    `;

    toast.innerHTML = `
      <span style="font-weight:700; color:${type === 'success' ? '#10b981' : (type === 'error' ? '#f43f5e' : (type === 'warning' ? '#f59e0b' : '#06b6d4'))};">
        ${type === 'success' ? '✓' : (type === 'error' ? '✕' : (type === 'warning' ? '⚠' : 'ℹ'))}
      </span>
      <span>${message}</span>
    `;

    container.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transition = 'opacity 0.4s ease';
      setTimeout(() => toast.remove(), 400);
    }, 3800);
  }
}

// Spin animation for button
const spinStyle = document.createElement('style');
spinStyle.textContent = `
  @keyframes spin { 100% { transform: rotate(360deg); } }
  .spin { animation: spin 1s linear infinite; }
`;
document.head.appendChild(spinStyle);

// Initialize on DOM ready
document.addEventListener('DOMContentLoaded', () => {
  const app = new LunaAlignApp();
  app.init();
});
