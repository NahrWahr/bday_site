import './style.css'
import { prepareWithSegments, layoutNextLine } from '@chenglou/pretext'

// --- DOM ---
const canvas = document.getElementById('bday-canvas') as HTMLCanvasElement;
const ctx = canvas.getContext('2d')!;
document.getElementById('bkgnd')!.style.backgroundImage = "url('./bk_gnd.webp')";

// --- Media (mar-apr-bdays intentionally excluded) ---
const mediaToLoad = [
  './cat_sitting.webp',
  './faithful_henchmen.webp',
  './looking_cat.webp',
  './looking_parul.webp',
  './sallu_bhai1.webp',
  './sallu_bhai2.webp'
];

// --- Types ---
interface PlacedMedia {
  elem: HTMLImageElement;
  src: string;
  naturalWidth: number;
  naturalHeight: number;
  x: number;
  y: number;
  width: number;    // layout width (no hover)
  height: number;   // layout height (no hover)
  phase: number;
  hoverScale: number; // animated, starts at 1
}

interface ComputedLine {
  text: string;
  x: number;
  y: number;
  isTitle?: boolean;
  width: number;
}

// --- State ---
let loadedMedia: PlacedMedia[] = [];
let computedLines: ComputedLine[] = [];
let layoutWidth = window.innerWidth;
let screenWidth = window.innerWidth;
let finalHeight = window.innerHeight;
let mousePos = { x: 0, y: 0 };
let mousePhysPos = { x: 0, y: 0 };
let deviceTilt = { x: 0, y: 0 };
const startTime = Date.now();

// Cached fonts for rendering (set during layout)
let cachedTitleFont = 'bold 52px "Satisfy", cursive';
let cachedBodyFont = '24px "Josefin Sans", sans-serif';

// --- Input ---
window.addEventListener('mousemove', (e) => {
  mousePos.x = (e.clientX / window.innerWidth) - 0.5;
  mousePos.y = (e.clientY / window.innerHeight) - 0.5;
  mousePhysPos.x = e.clientX;
  mousePhysPos.y = e.clientY + window.scrollY;
});

window.addEventListener('deviceorientation', (e) => {
  if (e.beta !== null && e.gamma !== null) {
    deviceTilt.x = Math.max(-1, Math.min(1, e.gamma / 45)) * 0.5;
    deviceTilt.y = Math.max(-1, Math.min(1, (e.beta - 45) / 45)) * 0.5;
  }
});

// Touch support: update mousePhysPos on swipe/tap
window.addEventListener('touchmove', (e) => {
  const t = e.touches[0];
  mousePhysPos.x = t.clientX;
  mousePhysPos.y = t.clientY + window.scrollY;
}, { passive: true });
window.addEventListener('touchstart', (e) => {
  const t = e.touches[0];
  mousePhysPos.x = t.clientX;
  mousePhysPos.y = t.clientY + window.scrollY;
}, { passive: true });
window.addEventListener('touchend', () => {
  // gradually return to center (handled in render loop timeout)
}, { passive: true });

// --- Helpers ---
function findMedia(name: string): PlacedMedia | undefined {
  return loadedMedia.find(m => m.src.includes(name));
}

function scaleMediaTo(media: PlacedMedia, maxW: number) {
  const w = Math.min(media.naturalWidth, maxW);
  media.width = w;
  media.height = media.naturalHeight * (w / media.naturalWidth);
}

// --- Parallel media loading ---
async function loadMedia() {
  const results = await Promise.all(
    mediaToLoad.map((src, idx) => new Promise<PlacedMedia | null>((resolve) => {
      const img = new Image();
      img.onload = () => resolve({
        elem: img, src,
        naturalWidth: img.naturalWidth, naturalHeight: img.naturalHeight,
        x: 0, y: 0, width: img.naturalWidth, height: img.naturalHeight,
        phase: idx * 1.3, // deterministic, no Math.random
        hoverScale: 1,
      });
      img.onerror = () => resolve(null);
      img.src = src;
    }))
  );
  loadedMedia = results.filter(Boolean) as PlacedMedia[];
}

// --- Content ---
const titleText = "Happy Birthday Parula!";
const bodyText = `Another year spent circling our sun, it might go out one day, but thank god we have you and your candles. 

I pray you get a lot of beaches and sunsets soon, and I get to accompany you to them, for you have the best life figured out.

I also pray you get a long swimming pool in your backyard, and cheer you on as you return to the amphibious ways of our ancestors. (Many consider it was a bad idea to get out in the first place)

Can't wait to make you a birthday cake, and add a single piece of clove and then deny adding it.

Yours truly,
Rahul Paddad`;

// --- Layout ---
function calculateLayout() {
  const mobile = layoutWidth < 700;
  const scale = Math.min(layoutWidth / 1400, 1);

  // Responsive font sizes
  const titleFontSize = mobile
    ? Math.max(26, Math.round(layoutWidth * 0.07))
    : Math.max(36, Math.round(52 * scale));
  const bodyFontSize = mobile
    ? Math.max(15, Math.round(layoutWidth * 0.045))
    : Math.max(18, Math.round(24 * scale));
  const lineHeight = Math.round(bodyFontSize * 1.42);
  const colPadding = mobile ? 15 : 40;
  const imgGap = 15;
  const topMargin = mobile ? 25 : 60;

  cachedTitleFont = `bold ${titleFontSize}px "Satisfy", cursive`;
  cachedBodyFont = `${bodyFontSize}px "Josefin Sans", sans-serif`;

  // --- 1. Scale images ---
  const enlargedW = mobile ? Math.min(layoutWidth * 0.42, 280) : Math.min(layoutWidth * 0.32, 450);
  const regularW = mobile ? Math.min(layoutWidth * 0.38, 200) : Math.min(layoutWidth * 0.22, 280);
  const catW = mobile ? Math.min(layoutWidth * 0.28, 140) : Math.min(layoutWidth * 0.18, 240);

  const catSitting = findMedia('cat_sitting');
  const faithful = findMedia('faithful');
  const lookCat = findMedia('looking_cat');
  const lookParul = findMedia('looking_parul');
  const sallu1 = findMedia('sallu_bhai1');
  const sallu2 = findMedia('sallu_bhai2');

  if (catSitting) scaleMediaTo(catSitting, catW);
  if (faithful) scaleMediaTo(faithful, enlargedW);
  if (lookCat) scaleMediaTo(lookCat, regularW);
  if (lookParul) scaleMediaTo(lookParul, regularW);
  if (sallu1) scaleMediaTo(sallu1, enlargedW);
  if (sallu2) scaleMediaTo(sallu2, enlargedW);

  // --- 2. Masthead: title left, cat_sitting right ---
  ctx.font = cachedTitleFont;
  const titleWidth = ctx.measureText(titleText).width;
  const mastheadY = topMargin;

  if (catSitting) {
    // Place cat immediately to the right of the title text
    catSitting.x = colPadding + titleWidth + 20;
    catSitting.y = mastheadY;
  }

  const mastheadH = catSitting
    ? Math.max(titleFontSize * 1.4, catSitting.height)
    : titleFontSize * 1.5;
  const textStartY = mastheadY + mastheadH + 25;

  // --- 3. Place images deterministically ---
  if (mobile) {
    // Single y-tracker prevents overlap; alternate sides for visual variety
    let imgY = textStartY + lineHeight * 2;
    const seq: { m: PlacedMedia | undefined; side: 'left' | 'right' }[] = [
      { m: lookCat, side: 'left' },
      { m: faithful, side: 'right' },
      { m: lookParul, side: 'left' },
      { m: sallu1, side: 'right' },
      { m: sallu2, side: 'left' },
    ];
    for (const { m, side } of seq) {
      if (!m) continue;
      m.x = side === 'left' ? colPadding : layoutWidth - m.width - colPadding;
      m.y = imgY;
      imgY += m.height + lineHeight * 3;
    }
  } else {
    // Desktop: separate left/right y-trackers
    let leftY = textStartY + lineHeight * 3;
    let rightY = textStartY;

    // Right column: faithful, sallu1, sallu2
    for (const m of [faithful, sallu1, sallu2]) {
      if (!m) continue;
      m.x = layoutWidth - m.width - colPadding;
      m.y = rightY;
      rightY += m.height + 40;
    }

    // Left column: looking_cat + looking_parul stacked vertically (next to each other)
    for (const m of [lookCat, lookParul]) {
      if (!m) continue;
      m.x = colPadding;
      m.y = leftY;
      leftY += m.height + 20;
    }
  }

  // --- 4. Text flow with robust collision detection ---
  const prepared = prepareWithSegments(bodyText, cachedBodyFont, { whiteSpace: 'pre-wrap' });

  // Simulate for column height estimation
  let simCursor = { segmentIndex: 0, graphemeIndex: 0 };
  let simLines = 0;
  const simW = (mobile ? layoutWidth : layoutWidth / 2) - colPadding * 2;
  while (true) {
    const l = layoutNextLine(prepared, simCursor, simW);
    if (!l) break;
    simCursor = l.end;
    simLines++;
  }

  const estTextH = simLines * lineHeight;
  const columnHeight = mobile
    ? estTextH + 2000
    : Math.max((estTextH / 2) * 1.8, window.innerHeight - textStartY);

  computedLines = [];
  const marginX = Math.max(0, (screenWidth - layoutWidth) / 2);

  // Title line
  computedLines.push({
    text: titleText,
    x: colPadding + marginX,
    y: mastheadY,
    isTitle: true,
    width: titleWidth,
  });

  let currentY = textStartY;
  let currentCol = 1;
  let cursor = { segmentIndex: 0, graphemeIndex: 0 };
  let iterations = 0;

  while (iterations++ < 2000) {
    // Column switch (desktop only)
    if (!mobile && currentY > textStartY + columnHeight && currentCol === 1) {
      currentCol = 2;
      currentY = textStartY;
    }
    if (!mobile && currentCol > 2) break;

    let lineX = mobile ? colPadding : (currentCol === 1 ? colPadding : (layoutWidth / 2) + colPadding);
    const baseWidth = (mobile ? layoutWidth : layoutWidth / 2) - colPadding * 2;

    // Robust collision: narrow text span from both sides
    let leftBound = lineX;
    let rightBound = lineX + baseWidth;
    const cyTop = currentY;
    const cyBottom = currentY + lineHeight;

    for (const media of loadedMedia) {
      if (cyBottom <= media.y || cyTop >= media.y + media.height) continue;
      const mL = media.x, mR = media.x + media.width;
      if (mR <= leftBound || mL >= rightBound) continue;

      if (mL <= leftBound && mR >= rightBound) {
        leftBound = rightBound; // fully blocked
      } else if (mL <= leftBound) {
        leftBound = Math.max(leftBound, mR + imgGap);
      } else if (mR >= rightBound) {
        rightBound = Math.min(rightBound, mL - imgGap);
      } else {
        // Image in middle: use wider side
        if ((mL - leftBound) >= (rightBound - mR)) {
          rightBound = mL - imgGap;
        } else {
          leftBound = mR + imgGap;
        }
      }
    }

    lineX = leftBound;
    const availW = rightBound - leftBound;

    if (availW < 80) {
      currentY += lineHeight;
      continue;
    }

    const layoutLine = layoutNextLine(prepared, cursor, availW);
    if (!layoutLine) break;

    ctx.font = cachedBodyFont;
    const tw = ctx.measureText(layoutLine.text).width;

    computedLines.push({
      text: layoutLine.text,
      x: lineX + marginX,
      y: currentY,
      width: tw,
    });

    cursor = layoutLine.end;
    currentY += lineHeight;
  }

  // --- 5. Canvas sizing ---
  const lastMediaY = loadedMedia.length > 0
    ? Math.max(...loadedMedia.map(m => m.y + m.height))
    : 0;
  const lastTextY = computedLines.length > 0
    ? Math.max(...computedLines.map(l => l.y + lineHeight))
    : 0;

  finalHeight = Math.max(lastTextY + 100, lastMediaY + 100, window.innerHeight);

  canvas.width = screenWidth * window.devicePixelRatio;
  canvas.height = finalHeight * window.devicePixelRatio;
  ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
  canvas.style.width = screenWidth + 'px';
  canvas.style.height = finalHeight + 'px';
}

// --- Rendering ---
function renderFrame() {
  ctx.clearRect(0, 0, screenWidth, finalHeight);

  const marginX = Math.max(0, (screenWidth - layoutWidth) / 2);
  const time = (Date.now() - startTime) / 1000;
  const tiltX = (mousePos.x + deviceTilt.x) * 15;
  const tiltY = (mousePos.y + deviceTilt.y) * 15;

  // Images with rounded corners, hover scale, and caustics
  const cornerRadius = 14;
  const TARGET_HOVER_SCALE = 1.35;
  const LERP_SPEED = 0.12;

  loadedMedia.forEach((media) => {
    const baseFloatX = Math.cos(time * 0.7 + media.phase) * 3;
    const baseFloatY = Math.sin(time + media.phase) * 6;
    const cx = media.x + marginX + tiltX + baseFloatX + media.width / 2;
    const cy = media.y + tiltY + baseFloatY + media.height / 2;

    // Hover detection based on physical mouse/touch position
    const mdx = mousePhysPos.x - cx;
    const mdy = mousePhysPos.y - cy;
    const isHovered = Math.abs(mdx) < media.width * 0.6 && Math.abs(mdy) < media.height * 0.6;

    // Lerp hoverScale toward target
    const targetScale = isHovered ? TARGET_HOVER_SCALE : 1.0;
    media.hoverScale += (targetScale - media.hoverScale) * LERP_SPEED;

    const s = media.hoverScale;
    const w = media.width * s;
    const h = media.height * s;
    // Draw from center so it expands outward
    const dx = cx - w / 2;
    const dy = cy - h / 2;
    const r = Math.min(cornerRadius * s, w / 2, h / 2);

    // Pass 1: shadow glow (brighter on hover)
    ctx.save();
    ctx.globalAlpha = isHovered ? 0.95 : 0.92;
    ctx.shadowColor = isHovered ? 'rgba(150, 220, 255, 0.7)' : 'rgba(255, 180, 100, 0.5)';
    ctx.shadowBlur = isHovered ? 40 : 28;
    ctx.fillStyle = 'transparent';
    ctx.beginPath();
    ctx.roundRect(dx, dy, w, h, r);
    ctx.fill();
    ctx.restore();

    // Pass 2: clip and draw image
    ctx.save();
    ctx.globalAlpha = 0.97;
    ctx.beginPath();
    ctx.roundRect(dx, dy, w, h, r);
    ctx.clip();
    ctx.drawImage(media.elem, dx, dy, w, h);

    // Pass 3: rainbow glow border on hover
    if (media.hoverScale > 1.01) {
      const glowIntensity = (media.hoverScale - 1.0) / (TARGET_HOVER_SCALE - 1.0);
      const hue = (time * 80) % 360; // slowly cycle through hues
      const glowWidth = 6 * glowIntensity;

      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = glowIntensity * 0.9;
      ctx.shadowColor = `hsl(${hue}, 100%, 65%)`;
      ctx.shadowBlur = 22 * glowIntensity;
      ctx.strokeStyle = `hsl(${hue}, 100%, 70%)`;
      ctx.lineWidth = glowWidth;
      ctx.beginPath();
      ctx.roundRect(dx + glowWidth / 2, dy + glowWidth / 2, w - glowWidth, h - glowWidth, r);
      ctx.stroke();
      ctx.shadowBlur = 0;
    }

    ctx.restore();
  });

  // Text with honey glow
  ctx.textBaseline = 'top';
  computedLines.forEach(line => {
    const textTiltX = tiltX * 0.3;
    const textTiltY = tiltY * 0.3;

    const cx = line.x + textTiltX + (line.width / 2);
    const cy = line.y + textTiltY + (line.isTitle ? 20 : 10);
    const dx = mousePhysPos.x - cx;
    const dy = mousePhysPos.y - cy;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const proximity = Math.max(0, 1 - (dist / 250));

    if (line.isTitle) {
      ctx.font = cachedTitleFont;
      ctx.fillStyle = '#FFD700';
      ctx.shadowBlur = 20 + (proximity * 40);
      ctx.shadowColor = `rgba(212, 175, 55, ${0.5 + proximity * 0.5})`;
    } else {
      ctx.font = cachedBodyFont;
      const r = Math.round(253 + (212 - 253) * proximity);
      const g = Math.round(251 + (175 - 251) * proximity);
      const b = Math.round(240 + (55 - 240) * proximity);
      ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
      ctx.shadowBlur = 5 + (proximity * 25);
      ctx.shadowColor = `rgba(212, 175, 55, ${proximity * 0.8})`;
    }
    ctx.fillText(line.text, line.x + textTiltX, line.y + textTiltY);
  });

  requestAnimationFrame(renderFrame);
}

// --- Init ---
document.fonts.ready.then(async () => {
  await loadMedia();
  calculateLayout();
  requestAnimationFrame(renderFrame);
});

let resizeTimer: ReturnType<typeof setTimeout>;
window.addEventListener('resize', () => {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(() => {
    screenWidth = window.innerWidth;
    layoutWidth = screenWidth;
    calculateLayout();
  }, 100);
});
