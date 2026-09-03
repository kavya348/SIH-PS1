/**
 * LunaAlign AI - Central Reactive State Store
 * Manages imagery, pipeline execution stages, telemetry metrics, and overlay modes.
 */

class StateStore {
  constructor() {
    this.state = {
      activeTab: 'raw-imagery', // 'raw-imagery' | 'diagnostics' | 'registration-overlay'
      
      // Imagery
      sourceImage: null, // { name, size, dataUrl, width, height, sensor, sunAngle, resolution }
      referenceImage: null,
      
      // Metadata Controls
      metadata: {
        sensor: 'OHRC',
        imageType: 'Optical',
        mission: 'Chandrayaan-2',
        sunAngle: 'Auto Detect',
        scale: 'Auto Detect',
        coordinateSystem: 'Lunar Mean Earth (LME/ULCN 2005)'
      },

      // Pipeline execution
      pipeline: {
        isRunning: false,
        currentStep: -1, // -1: idle, 0: Raw Ingestion, 1: Math Extraction, 2: Geo Verification, 3: Transform, 4: Telemetry, 5: Complete
        steps: [
          'Raw Ingestion',
          'Mathematical Extraction',
          'Geometric Verification',
          'Transform Modeling',
          'Telemetry Assembly',
          'Complete'
        ],
        logs: [],
        hasExecuted: false
      },

      // Registration Output Telemetry
      telemetry: {
        rmse: null,
        inliers: null,
        totalCandidates: null,
        model: null,
        scaleRatio: null,
        rotationDeg: null,
        sunAngleDiff: null,
        matches: [],
        transformMatrix: null,
        executionTimeMs: null
      },

      // Diagnostics
      selectedMatchId: 1,

      // Validation Overlay Controls
      overlay: {
        mode: 'alpha', // 'alpha' | 'swipe' | 'flicker'
        opacity: 0.5,
        swipePosition: 0.5,
        flickerFrequency: 2, // Hz
        flickerActiveImage: 'source', // 'source' | 'ref'
        showInliers: true,
        showOutliers: true
      },

      // Backend Service Connection
      backend: {
        status: 'STANDBY', // 'STANDBY' | 'CONNECTED' | 'ERROR'
        apiUrl: 'http://127.0.0.1:8000',
        message: 'Standby / Autonomous Mode'
      }
    };

    this.listeners = new Set();
  }

  get() {
    return this.state;
  }

  set(updates) {
    this.state = { ...this.state, ...updates };
    this.notify();
  }

  updatePipeline(pipelineUpdates) {
    this.state.pipeline = { ...this.state.pipeline, ...pipelineUpdates };
    this.notify();
  }

  updateOverlay(overlayUpdates) {
    this.state.overlay = { ...this.state.overlay, ...overlayUpdates };
    this.notify();
  }

  updateTelemetry(telemetryUpdates) {
    this.state.telemetry = { ...this.state.telemetry, ...telemetryUpdates };
    this.notify();
  }

  updateMetadata(key, value) {
    this.state.metadata[key] = value;
    this.notify();
  }

  subscribe(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  notify() {
    this.listeners.forEach(fn => fn(this.state));
  }
}

export const stateStore = new StateStore();
