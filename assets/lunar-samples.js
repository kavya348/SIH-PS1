/**
 * LunaAlign AI - Lunar Imagery Generator & Pre-configured Chandrayaan-2 Datasets
 * Simulates high-resolution OHRC (0.25m/px) and TMC (5m/px) lunar surface topography,
 * crater distribution, sun angle illumination shadows, and ground truth correspondences.
 */

export const LunarSamples = {
  // Generate realistic lunar crater surface on a canvas
  generateLunarSurface(type = 'ohrc', width = 600, height = 500) {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');

    // Base regolith tone
    const isOHRC = type === 'ohrc';
    const baseColor = isOHRC ? '#1a1e29' : '#141824';
    ctx.fillStyle = baseColor;
    ctx.fillRect(0, 0, width, height);

    // Add regolith noise texture
    const imgData = ctx.getImageData(0, 0, width, height);
    const data = imgData.data;
    const noiseScale = isOHRC ? 35 : 22;
    for (let i = 0; i < data.length; i += 4) {
      const n = (Math.random() - 0.5) * noiseScale;
      data[i] = Math.min(255, Math.max(0, data[i] + n));
      data[i + 1] = Math.min(255, Math.max(0, data[i + 1] + n));
      data[i + 2] = Math.min(255, Math.max(0, data[i + 2] + n + (isOHRC ? 4 : 2)));
    }
    ctx.putImageData(imgData, 0, 0);

    // Craters configuration
    // OHRC: close up, larger craters, fine ejecta rays, sharper shadows (high sun incidence)
    // TMC: wider angle, smaller scale, softer shadows (low sun incidence)
    const sunAngle = isOHRC ? { dx: 0.8, dy: -0.6 } : { dx: 0.4, dy: -0.9 };
    const sunIllumination = isOHRC ? 'High Incidence (58.2°)' : 'Low Incidence (21.4°)';

    const craters = isOHRC ? [
      { x: 180, y: 150, r: 75, depth: 0.85 },
      { x: 380, y: 220, r: 105, depth: 0.95 },
      { x: 140, y: 360, r: 52, depth: 0.7 },
      { x: 480, y: 390, r: 64, depth: 0.8 },
      { x: 280, y: 330, r: 38, depth: 0.6 },
      { x: 320, y: 90,  r: 28, depth: 0.5 },
      { x: 80,  y: 80,  r: 22, depth: 0.45 },
      { x: 520, y: 120, r: 35, depth: 0.6 }
    ] : [
      // Scaled and shifted to simulate wide angle TMC sensor view with rotation
      { x: 220, y: 175, r: 58, depth: 0.75 },
      { x: 375, y: 230, r: 80, depth: 0.85 },
      { x: 190, y: 335, r: 40, depth: 0.6 },
      { x: 450, y: 360, r: 49, depth: 0.7 },
      { x: 300, y: 315, r: 29, depth: 0.5 },
      { x: 330, y: 130, r: 21, depth: 0.4 },
      { x: 140, y: 120, r: 17, depth: 0.38 },
      { x: 480, y: 150, r: 27, depth: 0.5 }
    ];

    // Draw ejecta rays
    ctx.save();
    craters.slice(0, 2).forEach(c => {
      const rayCount = 12;
      for (let r = 0; r < rayCount; r++) {
        const angle = (r / rayCount) * Math.PI * 2 + Math.random() * 0.2;
        const len = c.r * (2.2 + Math.random() * 1.5);
        const grad = ctx.createRadialGradient(c.x, c.y, c.r * 0.8, c.x + Math.cos(angle) * len, c.y + Math.sin(angle) * len, len);
        grad.addColorStop(0, 'rgba(210, 225, 245, 0.12)');
        grad.addColorStop(1, 'rgba(210, 225, 245, 0)');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.moveTo(c.x, c.y);
        ctx.arc(c.x, c.y, len, angle - 0.15, angle + 0.15);
        ctx.fill();
      }
    });
    ctx.restore();

    // Draw each crater with sun-illuminated rim and deep shadow bowl
    craters.forEach(c => {
      // Crater Rim (bright highlight on sunward side)
      const rimGrad = ctx.createLinearGradient(
        c.x + sunAngle.dx * c.r,
        c.y + sunAngle.dy * c.r,
        c.x - sunAngle.dx * c.r,
        c.y - sunAngle.dy * c.r
      );
      rimGrad.addColorStop(0, 'rgba(240, 245, 255, 0.45)');
      rimGrad.addColorStop(0.4, 'rgba(180, 195, 220, 0.2)');
      rimGrad.addColorStop(1, 'rgba(10, 12, 18, 0.6)');

      ctx.beginPath();
      ctx.arc(c.x, c.y, c.r * 1.08, 0, Math.PI * 2);
      ctx.fillStyle = rimGrad;
      ctx.fill();

      // Crater Floor & Internal Shadow
      const bowlGrad = ctx.createRadialGradient(
        c.x - sunAngle.dx * (c.r * 0.35),
        c.y - sunAngle.dy * (c.r * 0.35),
        c.r * 0.1,
        c.x,
        c.y,
        c.r
      );
      bowlGrad.addColorStop(0, '#040609');
      bowlGrad.addColorStop(0.5, '#0b0f17');
      bowlGrad.addColorStop(0.85, '#1e2433');
      bowlGrad.addColorStop(1, '#333b4f');

      ctx.beginPath();
      ctx.arc(c.x, c.y, c.r, 0, Math.PI * 2);
      ctx.fillStyle = bowlGrad;
      ctx.fill();

      // Central peak for large craters
      if (c.r > 60) {
        const peakGrad = ctx.createRadialGradient(
          c.x + sunAngle.dx * 6,
          c.y + sunAngle.dy * 6,
          1,
          c.x,
          c.y,
          c.r * 0.2
        );
        peakGrad.addColorStop(0, 'rgba(220, 235, 255, 0.6)');
        peakGrad.addColorStop(0.5, 'rgba(120, 140, 170, 0.3)');
        peakGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.beginPath();
        ctx.arc(c.x, c.y, c.r * 0.2, 0, Math.PI * 2);
        ctx.fill();
      }
    });

    // Add subtle grid reticle markings and technical coordinates
    ctx.strokeStyle = 'rgba(6, 182, 212, 0.12)';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 8]);
    ctx.beginPath();
    ctx.moveTo(width / 2, 0);
    ctx.lineTo(width / 2, height);
    ctx.moveTo(0, height / 2);
    ctx.lineTo(width, height / 2);
    ctx.stroke();
    ctx.setLineDash([]);

    // Corner optical sensor brackets
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.35)';
    ctx.lineWidth = 1.5;
    const bracketSize = 14;
    // Top-left
    ctx.beginPath();
    ctx.moveTo(10, 10 + bracketSize); ctx.lineTo(10, 10); ctx.lineTo(10 + bracketSize, 10);
    // Top-right
    ctx.moveTo(width - 10 - bracketSize, 10); ctx.lineTo(width - 10, 10); ctx.lineTo(width - 10, 10 + bracketSize);
    // Bottom-left
    ctx.moveTo(10, height - 10 - bracketSize); ctx.lineTo(10, height - 10); ctx.lineTo(10 + bracketSize, height - 10);
    // Bottom-right
    ctx.moveTo(width - 10 - bracketSize, height - 10); ctx.lineTo(width - 10, height - 10); ctx.lineTo(width - 10, height - 10 - bracketSize);
    ctx.stroke();

    return {
      dataUrl: canvas.toDataURL('image/png'),
      canvas: canvas,
      width,
      height,
      sensor: isOHRC ? 'OHRC' : 'TMC',
      sensorFull: isOHRC ? 'OHRC (Optical High Resolution Camera)' : 'TMC-2 (Terrain Mapping Camera-2)',
      sunAngle: sunIllumination,
      resolution: isOHRC ? '0.25 m/pixel' : '5.0 m/pixel',
      wavelength: isOHRC ? '450 - 900 nm (Panchromatic)' : '500 - 850 nm (Stereo Panchromatic)',
      lunarLocation: 'Boguslawsky Crater Vicinity (72.9° S, 43.2° E)',
      mission: 'Chandrayaan-2'
    };
  },

  // Chandrayaan-2 pre-computed ground truth matching correspondences
  getSampleMatches() {
    return [
      {
        id: 1,
        status: 'INLIER',
        sourceX: 182,
        sourceY: 151,
        refX: 221,
        refY: 176,
        descriptorDistance: 0.142,
        sourceScale: 1.00,
        refScale: 0.77,
        scaleRatio: 1.30,
        sourceAngle: 142.4,
        refAngle: 114.1,
        angleDiff: 28.3,
        residualError: 0.42,
        confidence: 0.985,
        featureName: 'Crater A Primary Central Rim'
      },
      {
        id: 2,
        status: 'INLIER',
        sourceX: 381,
        sourceY: 223,
        refX: 374,
        refY: 231,
        descriptorDistance: 0.168,
        sourceScale: 1.00,
        refScale: 0.76,
        scaleRatio: 1.31,
        sourceAngle: 139.8,
        refAngle: 112.5,
        angleDiff: 27.3,
        residualError: 0.38,
        confidence: 0.978,
        featureName: 'Crater B Central Peak Apex'
      },
      {
        id: 3,
        status: 'INLIER',
        sourceX: 142,
        sourceY: 362,
        refX: 191,
        refY: 337,
        descriptorDistance: 0.195,
        sourceScale: 1.00,
        refScale: 0.77,
        scaleRatio: 1.30,
        sourceAngle: 141.2,
        refAngle: 113.8,
        angleDiff: 27.4,
        residualError: 0.51,
        confidence: 0.962,
        featureName: 'Southwestern Regolith Boundary'
      },
      {
        id: 4,
        status: 'INLIER',
        sourceX: 479,
        sourceY: 388,
        refX: 452,
        refY: 359,
        descriptorDistance: 0.211,
        sourceScale: 1.00,
        refScale: 0.76,
        scaleRatio: 1.31,
        sourceAngle: 143.0,
        refAngle: 115.2,
        angleDiff: 27.8,
        residualError: 0.48,
        confidence: 0.954,
        featureName: 'Southeastern Crater Crest'
      },
      {
        id: 5,
        status: 'INLIER',
        sourceX: 282,
        sourceY: 331,
        refX: 301,
        refY: 316,
        descriptorDistance: 0.228,
        sourceScale: 1.00,
        refScale: 0.76,
        scaleRatio: 1.31,
        sourceAngle: 140.5,
        refAngle: 113.0,
        angleDiff: 27.5,
        residualError: 0.56,
        confidence: 0.941,
        featureName: 'Medial Ridge Junction'
      },
      {
        id: 6,
        status: 'INLIER',
        sourceX: 322,
        sourceY: 92,
        refX: 331,
        refY: 131,
        descriptorDistance: 0.245,
        sourceScale: 1.00,
        refScale: 0.75,
        scaleRatio: 1.33,
        sourceAngle: 138.9,
        refAngle: 111.4,
        angleDiff: 27.5,
        residualError: 0.62,
        confidence: 0.933,
        featureName: 'Northern Ray Convergence'
      },
      {
        id: 7,
        status: 'INLIER',
        sourceX: 521,
        sourceY: 122,
        refX: 482,
        refY: 151,
        descriptorDistance: 0.261,
        sourceScale: 1.00,
        refScale: 0.77,
        scaleRatio: 1.30,
        sourceAngle: 144.1,
        refAngle: 116.5,
        angleDiff: 27.6,
        residualError: 0.69,
        confidence: 0.920,
        featureName: 'Northeastern Crater Crest'
      },
      {
        id: 8,
        status: 'OUTLIER',
        sourceX: 84,
        sourceY: 79,
        refX: 138,
        refY: 119,
        descriptorDistance: 0.584,
        sourceScale: 1.00,
        refScale: 0.95,
        scaleRatio: 1.05,
        sourceAngle: 142.1,
        refAngle: 92.4,
        angleDiff: 49.7,
        residualError: 4.88,
        confidence: 0.320,
        featureName: 'Illumination Shadow Edge (Filtered by RANSAC)'
      },
      {
        id: 9,
        status: 'OUTLIER',
        sourceX: 440,
        sourceY: 140,
        refX: 390,
        refY: 180,
        descriptorDistance: 0.612,
        sourceScale: 1.00,
        refScale: 0.62,
        scaleRatio: 1.61,
        sourceAngle: 110.3,
        refAngle: 182.1,
        angleDiff: 71.8,
        residualError: 6.24,
        confidence: 0.245,
        featureName: 'Sensor Boundary Blur (Scale Invariance Failure)'
      }
    ];
  }
};
