/**
 * LunaAlign AI - Validation Layer & Registration Canvas Renderer
 * Implements Alpha Blend, Interactive Slider Swipe curtain, Flicker comparison,
 * and glowing sub-pixel correspondence point markers with tooltips and click-to-diagnose.
 */

import { stateStore } from './state.js';

export class CanvasOverlayRenderer {
  constructor(canvasElement, tooltipElement, dividerHandle) {
    this.canvas = canvasElement;
    this.ctx = canvasElement.getContext('2d');
    this.tooltip = tooltipElement;
    this.dividerHandle = dividerHandle;

    this.sourceImgObj = null;
    this.refImgObj = null;

    this.isDraggingSwipe = false;
    this.flickerTimer = null;
    this.flickerFrame = 0;

    this.hoveredMatch = null;

    this.initEvents();
  }

  initEvents() {
    // Mouse movement on canvas for hover tooltips
    this.canvas.addEventListener('mousemove', (e) => this.handleMouseMove(e));
    this.canvas.addEventListener('mouseleave', () => {
      this.hoveredMatch = null;
      this.hideTooltip();
    });

    // Click on canvas to jump to match diagnostic
    this.canvas.addEventListener('click', (e) => this.handleClick(e));

    // Dragging swipe divider
    const onDrag = (e) => {
      if (!this.isDraggingSwipe) return;
      const rect = this.canvas.getBoundingClientRect();
      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      let pos = (clientX - rect.left) / rect.width;
      pos = Math.max(0.02, Math.min(0.98, pos));
      stateStore.updateOverlay({ swipePosition: pos });
      this.render();
    };

    const stopDrag = () => {
      this.isDraggingSwipe = false;
      document.removeEventListener('mousemove', onDrag);
      document.removeEventListener('mouseup', stopDrag);
      document.removeEventListener('touchmove', onDrag);
      document.removeEventListener('touchend', stopDrag);
    };

    const startDrag = (e) => {
      e.preventDefault();
      this.isDraggingSwipe = true;
      document.addEventListener('mousemove', onDrag);
      document.addEventListener('mouseup', stopDrag);
      document.addEventListener('touchmove', onDrag);
      document.addEventListener('touchend', stopDrag);
    };

    this.dividerHandle.addEventListener('mousedown', startDrag);
    this.dividerHandle.addEventListener('touchstart', startDrag);
  }

  loadImages(sourceUrl, refUrl) {
    return Promise.all([
      new Promise((resolve) => {
        const img = new Image();
        img.onload = () => { this.sourceImgObj = img; resolve(img); };
        img.src = sourceUrl;
      }),
      new Promise((resolve) => {
        const img = new Image();
        img.onload = () => { this.refImgObj = img; resolve(img); };
        img.src = refUrl;
      })
    ]).then(() => {
      this.resizeCanvas();
      this.render();
    });
  }

  resizeCanvas() {
    if (!this.refImgObj) return;
    this.canvas.width = this.refImgObj.width || 600;
    this.canvas.height = this.refImgObj.height || 500;
  }

  startFlickerLoop() {
    this.stopFlickerLoop();
    const state = stateStore.get();
    const intervalMs = Math.max(100, 1000 / (state.overlay.flickerFrequency || 2));
    this.flickerTimer = setInterval(() => {
      this.flickerFrame = (this.flickerFrame + 1) % 2;
      this.render();
    }, intervalMs);
  }

  stopFlickerLoop() {
    if (this.flickerTimer) {
      clearInterval(this.flickerTimer);
      this.flickerTimer = null;
    }
  }

  render() {
    const state = stateStore.get();
    const { mode, opacity, swipePosition, showInliers, showOutliers } = state.overlay;
    const w = this.canvas.width;
    const h = this.canvas.height;

    if (!this.refImgObj || !this.sourceImgObj) {
      this.dividerHandle.classList.remove('active');
      return;
    }

    this.ctx.clearRect(0, 0, w, h);

    // MODE 1: ALPHA BLEND
    if (mode === 'alpha') {
      this.dividerHandle.classList.remove('active');
      this.stopFlickerLoop();

      // Draw base reference
      this.ctx.drawImage(this.refImgObj, 0, 0, w, h);

      // Draw aligned source with alpha
      this.ctx.save();
      this.ctx.globalAlpha = opacity;
      this.ctx.drawImage(this.sourceImgObj, 0, 0, w, h);
      this.ctx.restore();
    }
    // MODE 2: SLIDER SWIPE
    else if (mode === 'swipe') {
      this.stopFlickerLoop();
      this.dividerHandle.classList.add('active');

      const splitX = w * swipePosition;

      // Draw Reference on Right side
      this.ctx.save();
      this.ctx.drawImage(this.refImgObj, 0, 0, w, h);
      this.ctx.restore();

      // Clip and Draw Source on Left side
      this.ctx.save();
      this.ctx.beginPath();
      this.ctx.rect(0, 0, splitX, h);
      this.ctx.clip();
      this.ctx.drawImage(this.sourceImgObj, 0, 0, w, h);
      this.ctx.restore();

      // Position DOM divider handle
      const canvasRect = this.canvas.getBoundingClientRect();
      const containerRect = this.canvas.parentElement.getBoundingClientRect();
      const handleLeft = (canvasRect.left - containerRect.left) + (canvasRect.width * swipePosition);
      this.dividerHandle.style.left = `${handleLeft}px`;
      this.dividerHandle.style.top = `${canvasRect.top - containerRect.top}px`;
      this.dividerHandle.style.height = `${canvasRect.height}px`;
    }
    // MODE 3: FLICKER
    else if (mode === 'flicker') {
      this.dividerHandle.classList.remove('active');
      if (!this.flickerTimer) {
        this.startFlickerLoop();
      }

      if (this.flickerFrame === 0) {
        this.ctx.drawImage(this.sourceImgObj, 0, 0, w, h);
        this.drawCornerBadge('SOURCE (Moving Frame)', '#38bdf8');
      } else {
        this.ctx.drawImage(this.refImgObj, 0, 0, w, h);
        this.drawCornerBadge('REFERENCE (Fixed Target)', '#a855f7');
      }
    }

    // DRAW MATCHING POINTS OVERLAY
    if (state.telemetry.matches && state.telemetry.matches.length > 0) {
      this.renderMatchPoints(state.telemetry.matches, showInliers, showOutliers);
    }
  }

  drawCornerBadge(text, color) {
    this.ctx.save();
    this.ctx.fillStyle = 'rgba(6, 9, 17, 0.85)';
    this.ctx.fillRect(12, 12, 210, 28);
    this.ctx.strokeStyle = color;
    this.ctx.lineWidth = 1;
    this.ctx.strokeRect(12, 12, 210, 28);
    this.ctx.fillStyle = color;
    this.ctx.font = 'bold 11px JetBrains Mono';
    this.ctx.fillText(text, 22, 30);
    this.ctx.restore();
  }

  renderMatchPoints(matches, showInliers, showOutliers) {
    matches.forEach(m => {
      const isInlier = m.status === 'INLIER';
      if (isInlier && !showInliers) return;
      if (!isInlier && !showOutliers) return;

      const isHovered = this.hoveredMatch && this.hoveredMatch.id === m.id;
      const isSelected = stateStore.get().selectedMatchId === m.id;

      const x = m.refX;
      const y = m.refY;

      this.ctx.save();

      if (isInlier) {
        // Glowing cyan/emerald marker
        this.ctx.strokeStyle = isSelected ? '#ffffff' : (isHovered ? '#67e8f9' : '#10b981');
        this.ctx.fillStyle = isSelected ? '#06b6d4' : (isHovered ? '#22d3ee' : 'rgba(16, 185, 129, 0.45)');
        this.ctx.lineWidth = isSelected ? 2.5 : 1.5;

        // Draw circle
        this.ctx.beginPath();
        this.ctx.arc(x, y, isHovered || isSelected ? 8 : 5, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.stroke();

        // Draw crosshair reticle if hovered or selected
        if (isHovered || isSelected) {
          this.ctx.beginPath();
          this.ctx.moveTo(x - 12, y); this.ctx.lineTo(x + 12, y);
          this.ctx.moveTo(x, y - 12); this.ctx.lineTo(x, y + 12);
          this.ctx.strokeStyle = '#38bdf8';
          this.ctx.lineWidth = 1;
          this.ctx.stroke();
        }

        // Correspondence displacement vector to source point
        this.ctx.beginPath();
        this.ctx.moveTo(m.sourceX, m.sourceY);
        this.ctx.lineTo(m.refX, m.refY);
        this.ctx.strokeStyle = 'rgba(56, 189, 248, 0.4)';
        this.ctx.setLineDash([2, 3]);
        this.ctx.stroke();

      } else {
        // Red outlier cross
        this.ctx.strokeStyle = isHovered ? '#fda4af' : '#f43f5e';
        this.ctx.lineWidth = isHovered ? 2 : 1.5;
        const s = isHovered ? 6 : 4;
        this.ctx.beginPath();
        this.ctx.moveTo(x - s, y - s); this.ctx.lineTo(x + s, y + s);
        this.ctx.moveTo(x + s, y - s); this.ctx.lineTo(x - s, y + s);
        this.ctx.stroke();
      }

      this.ctx.restore();
    });
  }

  handleMouseMove(e) {
    const state = stateStore.get();
    if (!state.telemetry.matches || state.telemetry.matches.length === 0) return;

    const rect = this.canvas.getBoundingClientRect();
    const scaleX = this.canvas.width / rect.width;
    const scaleY = this.canvas.height / rect.height;

    const mouseX = (e.clientX - rect.left) * scaleX;
    const mouseY = (e.clientY - rect.top) * scaleY;

    // Find closest match within 12px
    let closest = null;
    let minDist = 14;

    state.telemetry.matches.forEach(m => {
      const d = Math.hypot(m.refX - mouseX, m.refY - mouseY);
      if (d < minDist) {
        minDist = d;
        closest = m;
      }
    });

    if (closest !== this.hoveredMatch) {
      this.hoveredMatch = closest;
      this.render();
    }

    if (this.hoveredMatch) {
      this.showTooltip(this.hoveredMatch, e.clientX, e.clientY);
    } else {
      this.hideTooltip();
    }
  }

  handleClick(e) {
    if (this.hoveredMatch) {
      stateStore.set({ selectedMatchId: this.hoveredMatch.id });
      // Notify user via subtle toast and allow switching to diagnostics
      window.dispatchEvent(new CustomEvent('match-selected', { detail: this.hoveredMatch }));
    }
  }

  showTooltip(match, clientX, clientY) {
    const parentRect = this.canvas.parentElement.getBoundingClientRect();
    const x = clientX - parentRect.left + 14;
    const y = clientY - parentRect.top + 14;

    this.tooltip.style.left = `${x}px`;
    this.tooltip.style.top = `${y}px`;
    this.tooltip.style.display = 'block';

    const isInlier = match.status === 'INLIER';
    this.tooltip.innerHTML = `
      <div style="font-weight:700; color:${isInlier ? '#34d399' : '#f43f5e'}; margin-bottom:4px;">
        Match #${match.id}: ${match.status}
      </div>
      <div>Feature: <span style="color:#e2e8f0;">${match.featureName || 'Lunar Keypoint'}</span></div>
      <div>Source Coords: <span style="color:#38bdf8;">(${match.sourceX}, ${match.sourceY})</span></div>
      <div>Reference Coords: <span style="color:#c084fc;">(${match.refX}, ${match.refY})</span></div>
      <div>Scale Ratio: <span style="color:#fbbf24;">${match.scaleRatio.toFixed(2)}x</span></div>
      <div>Residual Error: <span style="color:#e2e8f0;">${match.residualError.toFixed(2)} px</span></div>
      <div style="font-size:10px; color:#94a3b8; margin-top:4px;">Click to inspect deep diagnostics</div>
    `;
  }

  hideTooltip() {
    this.tooltip.style.display = 'none';
  }
}
