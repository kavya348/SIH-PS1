/**
 * LunaAlign AI - Match Diagnostics & Feature Explanations Module
 * Renders local feature neighborhood crops, scale ratio calculations,
 * and Gaussian uncertainty response indicators.
 */

import { stateStore } from './state.js';

export class DiagnosticsManager {
  constructor() {
    this.sourceCanvas = document.getElementById('sourceNeighborhoodCanvas');
    this.refCanvas = document.getElementById('refNeighborhoodCanvas');
    this.sourceCtx = this.sourceCanvas ? this.sourceCanvas.getContext('2d') : null;
    this.refCtx = this.refCanvas ? this.refCanvas.getContext('2d') : null;
  }

  init() {
    stateStore.subscribe((state) => {
      this.update(state);
    });
  }

  update(state) {
    const matches = state.telemetry.matches || [];
    const selectedId = state.selectedMatchId || 1;
    const selected = matches.find(m => m.id === selectedId) || matches[0];

    this.renderSelectorChips(matches, selectedId);

    if (!selected || !state.pipeline.hasExecuted) {
      this.renderEmptyState();
      return;
    }

    this.renderMatchDetails(selected);
    this.renderNeighborhoodCrops(selected, state.sourceImage, state.referenceImage);
    this.renderUncertaintyCards(selected);
  }

  renderSelectorChips(matches, selectedId) {
    const container = document.getElementById('matchChipsRow');
    if (!container) return;

    if (!matches || matches.length === 0) {
      container.innerHTML = '<span style="color:#64748b; font-size:12px;">Run registration pipeline to populate match list</span>';
      return;
    }

    container.innerHTML = matches.map(m => {
      const isSelected = m.id === selectedId;
      const isOutlier = m.status !== 'INLIER';
      return `
        <button class="chip-match ${isSelected ? 'active' : ''} ${isOutlier ? 'outlier' : ''}" data-id="${m.id}">
          #${m.id} ${m.status === 'INLIER' ? '✓' : '✗'}
        </button>
      `;
    }).join('');

    container.querySelectorAll('.chip-match').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = parseInt(e.currentTarget.dataset.id);
        stateStore.set({ selectedMatchId: id });
      });
    });
  }

  renderEmptyState() {
    const titleEl = document.getElementById('diagMatchHeading');
    if (titleEl) titleEl.textContent = 'Match Diagnostics: Awaiting Execution';

    const statusEl = document.getElementById('diagMatchStatus');
    if (statusEl) {
      statusEl.className = 'badge-inlier-status';
      statusEl.textContent = 'STANDBY';
    }

    const emptyBox = document.getElementById('diagEmptyStateMessage');
    const contentBox = document.getElementById('diagContentContainer');
    if (emptyBox) emptyBox.style.display = 'flex';
    if (contentBox) contentBox.style.display = 'none';
  }

  renderMatchDetails(match) {
    const emptyBox = document.getElementById('diagEmptyStateMessage');
    const contentBox = document.getElementById('diagContentContainer');
    if (emptyBox) emptyBox.style.display = 'none';
    if (contentBox) contentBox.style.display = 'grid';

    // Update Header
    const headingEl = document.getElementById('diagMatchHeading');
    if (headingEl) {
      headingEl.textContent = `Match Diagnostics: ${match.status === 'INLIER' ? 'Inlier' : 'Outlier'} #${match.id}`;
    }

    const statusBadge = document.getElementById('diagMatchStatus');
    if (statusBadge) {
      statusBadge.className = `badge-inlier-status ${match.status === 'INLIER' ? 'inlier' : 'outlier'}`;
      statusBadge.textContent = match.status;
    }

    const featureNameEl = document.getElementById('diagFeatureName');
    if (featureNameEl) featureNameEl.textContent = match.featureName || 'Lunar Feature';

    // Populate Metrics Table
    this.setVal('diagMatchId', `#${match.id}`);
    this.setVal('diagSourceCoords', `(${match.sourceX}, ${match.sourceY}) px`);
    this.setVal('diagRefCoords', `(${match.refX}, ${match.refY}) px`);
    this.setVal('diagDescriptorDist', match.descriptorDistance.toFixed(4));
    this.setVal('diagSourceScale', `${match.sourceScale.toFixed(2)}x`);
    this.setVal('diagRefScale', `${match.refScale.toFixed(2)}x`);
    this.setVal('diagScaleRatio', `${match.scaleRatio.toFixed(3)}x`);
    this.setVal('diagSourceAngle', `${match.sourceAngle.toFixed(1)}°`);
    this.setVal('diagRefAngle', `${match.refAngle.toFixed(1)}°`);
    this.setVal('diagAngleDiff', `Δ ${match.angleDiff.toFixed(1)}°`);
    this.setVal('diagResidualError', `${match.residualError.toFixed(2)} px`);
  }

  setVal(id, text) {
    const el = document.getElementById(id);
    if (el) el.textContent = text;
  }

  renderNeighborhoodCrops(match, sourceImg, refImg) {
    if (!this.sourceCtx || !this.refCtx || !sourceImg?.canvas || !refImg?.canvas) return;

    const cropRadius = 35; // 70x70 px neighborhood patch

    // Crop Source Patch
    this.sourceCtx.clearRect(0, 0, 140, 140);
    this.sourceCtx.imageSmoothingEnabled = false;
    this.sourceCtx.drawImage(
      sourceImg.canvas,
      match.sourceX - cropRadius,
      match.sourceY - cropRadius,
      cropRadius * 2,
      cropRadius * 2,
      0,
      0,
      140,
      140
    );

    // Crop Reference Patch
    this.refCtx.clearRect(0, 0, 140, 140);
    this.refCtx.imageSmoothingEnabled = false;
    this.refCtx.drawImage(
      refImg.canvas,
      match.refX - cropRadius,
      match.refY - cropRadius,
      cropRadius * 2,
      cropRadius * 2,
      0,
      0,
      140,
      140
    );
  }

  renderUncertaintyCards(match) {
    const conf = match.confidence ?? 0.95;
    const matchConfPercent = Math.round(conf * 100);
    const scaleConfPercent = Math.round((1 - Math.abs(1.30 - match.scaleRatio) * 0.5) * 100);

    const matchConfVal = document.getElementById('diagMatchConfidenceVal');
    const matchConfBar = document.getElementById('diagMatchConfidenceBar');
    if (matchConfVal) matchConfVal.textContent = `${matchConfPercent}%`;
    if (matchConfBar) matchConfBar.style.width = `${matchConfPercent}%`;

    const scaleConfVal = document.getElementById('diagScaleConfidenceVal');
    const scaleConfBar = document.getElementById('diagScaleConfidenceBar');
    if (scaleConfVal) scaleConfVal.textContent = `${scaleConfPercent}%`;
    if (scaleConfBar) scaleConfBar.style.width = `${scaleConfPercent}%`;

    const explainEl = document.getElementById('diagExplanationText');
    if (explainEl) {
      if (match.status === 'INLIER') {
        explainEl.innerHTML = `
          <strong>Geometric Inlier Confirmed:</strong> Feature patch preserves multi-scale descriptor invariance across sensor resolutions (OHRC 0.25m vs TMC 5m). 
          Sun illumination angle variance ($\Delta\theta = ${match.angleDiff.toFixed(1)}^\circ$) is compensated by gradient orientation normalization.
        `;
      } else {
        explainEl.innerHTML = `
          <strong style="color:#f43f5e;">Outlier Filtered by RANSAC:</strong> High descriptor distance (${match.descriptorDistance.toFixed(3)}) caused by extreme cast shadows or crater rim occlusion beyond photometric threshold.
        `;
      }
    }
  }
}
