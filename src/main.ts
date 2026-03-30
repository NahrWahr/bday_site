import './style.css'
import { prepareWithSegments, layoutNextLine } from '@chenglou/pretext'

const canvas = document.getElementById('bday-canvas') as HTMLCanvasElement;
const ctx = canvas.getContext('2d')!;

const mediaToLoad = [
  './G_cp_bXXQAAbrbE.png',
  './sam_1576511580074226.mp4',
  './ou5.png',
  './oug1.png',
  './out2.png',
  './DailyMantle - does this to you [2015880508203278336].mp4',
  './out4.png',
  './out6.png',
  './sam_1943909497002344.png'
];

interface PlacedMedia {
  elem: HTMLImageElement | HTMLVideoElement;
  x: number;
  y: number;
  width: number;
  height: number;
  type: 'image' | 'video';
}

interface ComputedLine {
  text: string;
  x: number;
  y: number;
}

let loadedMedia: PlacedMedia[] = [];
let computedLines: ComputedLine[] = [];

let layoutWidth = window.innerWidth > 900 ? 900 : window.innerWidth;
let screenWidth = window.innerWidth;
let finalHeight = window.innerHeight;

let mouseX = -100;
let mouseY = -100;

window.addEventListener('mousemove', (e) => {
  mouseX = e.clientX;
  mouseY = e.clientY + window.scrollY; // Correct absolute canvas Y position
});

interface TrailParticle {
  x: number;
  y: number;
  life: number;
  maxLife: number;
  radius: number;
  color: string;
}

const trail: TrailParticle[] = [];

async function loadMedia() {
  let initialY = 200;
  for (const src of mediaToLoad) {
    await new Promise((resolve) => {
      let isVideo = src.endsWith('.mp4');
      
      const onReady = (elem: HTMLImageElement | HTMLVideoElement, originalWidth: number, originalHeight: number) => {
        const maxImgWidth = Math.min(layoutWidth * 0.4, 300);
        const scale = maxImgWidth / originalWidth;
        const width = originalWidth * scale;
        const height = originalHeight * scale;

        const side = Math.random() > 0.5 ? 'left' : 'right';
        const padding = 20;
        
        let x = side === 'left' ? padding : layoutWidth - width - padding;
        const y = initialY + Math.random() * 200;

        loadedMedia.push({
            elem,
            x,
            y,
            width,
            height,
            type: isVideo ? 'video' : 'image'
        });

        initialY += height + 50;
        resolve(null);
      };

      if (isVideo) {
        const vid = document.createElement('video');
        vid.muted = true;
        vid.loop = true;
        vid.playsInline = true;
        vid.autoplay = true;
        
        let handled = false;
        const handleReady = () => {
          if (handled) return;
          if (vid.videoWidth && vid.videoHeight) {
            handled = true;
            onReady(vid, vid.videoWidth, vid.videoHeight);
            vid.play().catch(e => console.error("Auto-play prevented", e));
          }
        };

        vid.onloadeddata = handleReady;
        vid.oncanplay = handleReady;
        vid.onerror = (e) => {
          if (handled) return;
          handled = true;
          console.error("Video failed", src, e);
          resolve(null);
        };
        vid.src = src;
      } else {
        const img = new Image();
        img.onload = () => {
          onReady(img, img.width, img.height);
        };
        img.src = src;
      }
    });
  }
}

const bdayText = `Happy Birthday Parul! 

Wishing you the most magical, warm, and incredible birthday ever. 

May your day be filled with endless purrs, warm candle light, and all the joy that you absolutely deserve!

Here is to more adventures, more happiness, and definitely more adorable manual cat pictures. 

Your presence brings so much warmth and light to those around you, much like a cozy candle in a dark, quiet room. Your smile and spirit are truly one of a kind.

I hope this special day is exactly as wonderful as you are. Take this time to reflect on all the amazing moments, and look forward to the brilliant future ahead.

Keep shining brightly, keep smiling warmly, and never forget how loved you are!

Have a fantastic birthday!

With lots of love,
Your Friends`;

function calculateLayout() {
  const font = '32px "Cormorant Garamond", serif';
  const prepared = prepareWithSegments(bdayText, font, { whiteSpace: 'pre-wrap' });
  const lineHeight = 44;
  const colPadding = 40;

  let cursor = { segmentIndex: 0, graphemeIndex: 0 };
  let currentY = 100;

  computedLines = [];

  while (true) {
    let lineX = colPadding;
    let maxAvailableWidth = layoutWidth - colPadding * 2;
    const cyTop = currentY;
    const cyBottom = currentY + lineHeight;

    for (const media of loadedMedia) {
        if (cyBottom > media.y && cyTop < media.y + media.height) {
            if (media.x < layoutWidth / 2) {
                // Image is on left
                const pushRight = media.x + media.width + 20;
                if (pushRight > lineX) {
                    const diff = pushRight - lineX;
                    lineX = pushRight;
                    maxAvailableWidth -= diff;
                }
            } else {
                // Image is on right
                const cutoff = media.x - 20;
                if (cutoff < lineX + maxAvailableWidth) {
                    maxAvailableWidth = cutoff - lineX;
                }
            }
        }
    }
    
    if (maxAvailableWidth < 100) maxAvailableWidth = 100;

    const layoutLine = layoutNextLine(prepared, cursor, maxAvailableWidth);
    if (!layoutLine) break;

    const marginX = Math.max(0, (screenWidth - layoutWidth) / 2);

    computedLines.push({
      text: layoutLine.text,
      x: lineX + marginX,
      y: currentY
    });

    cursor = layoutLine.end;
    currentY += lineHeight;
  }

  const lastMediaY = loadedMedia.length > 0 
    ? Math.max(...loadedMedia.map(m => m.y + m.height)) 
    : 0;
  
  finalHeight = Math.max(currentY + 200, lastMediaY + 100, window.innerHeight);

  canvas.width = screenWidth * window.devicePixelRatio;
  canvas.height = finalHeight * window.devicePixelRatio;
  ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
  
  canvas.style.width = screenWidth + 'px';
  canvas.style.height = finalHeight + 'px';
}

function renderFrame() {
  // Clear the canvas on each tick for redraw
  ctx.clearRect(0, 0, screenWidth, finalHeight);

  const marginX = Math.max(0, (screenWidth - layoutWidth) / 2);

  // Draw media
  loadedMedia.forEach((media) => {
    ctx.globalAlpha = 0.9;
    ctx.shadowColor = 'rgba(255, 180, 100, 0.4)';
    ctx.shadowBlur = 30;
    
    // ctx.drawImage implicitly supports HTMLVideoElements, drawing the current frame!
    ctx.drawImage(media.elem, media.x + marginX, media.y, media.width, media.height);
    
    ctx.shadowBlur = 0;
    ctx.globalAlpha = 1.0;
  });

  // Draw pre-computed text lines independently
  ctx.font = '32px "Cormorant Garamond", serif';
  ctx.fillStyle = '#ffdfa0';
  ctx.shadowColor = 'rgba(255, 200, 100, 0.6)';
  ctx.shadowBlur = 10;
  ctx.textBaseline = 'top';

  computedLines.forEach(line => {
    ctx.fillText(line.text, line.x, line.y);
  });

  // Draw Caustics / Cursor Refraction Trail
  ctx.save();
  ctx.globalCompositeOperation = 'screen';
  
  // Add new particle randomly following the cursor
  if (mouseX > 0 && mouseY > 0) {
    // Colors of refraction (magentas, cyans, light yellows)
    const r = Math.floor(Math.random() * 55) + 200;
    const g = Math.floor(Math.random() * 55) + 200;
    const b = Math.floor(Math.random() * 100) + 155;
    
    trail.push({
      x: mouseX,
      y: mouseY,
      life: 1.0,
      maxLife: 1.0,
      radius: Math.random() * 30 + 40,
      color: `${r}, ${g}, ${b}`
    });
  }

  // Draw particles and decay them
  for (let i = trail.length - 1; i >= 0; i--) {
    let p = trail[i];
    p.life -= 0.02; // fade out speed

    if (p.life <= 0) {
      trail.splice(i, 1);
      continue;
    }

    const gradient = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.radius);
    const alpha = p.life * 0.15; // very subtle max opacity
    gradient.addColorStop(0, `rgba(${p.color}, ${alpha})`);
    gradient.addColorStop(1, `rgba(${p.color}, 0)`);

    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
    ctx.fill();
    
    // Drift like floating light
    p.y -= 0.5;
    p.x += (Math.random() - 0.5) * 1.5;
  }
  
  ctx.restore();

  // Loop
  requestAnimationFrame(renderFrame);
}

// Ensure fonts are loaded before calculating text widths
document.fonts.ready.then(async () => {
  await loadMedia();
  calculateLayout();
  // Start the 60fps loop
  requestAnimationFrame(renderFrame);
});

let resizeTimer: any;
window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
        screenWidth = window.innerWidth;
        layoutWidth = screenWidth > 900 ? 900 : screenWidth;
        // Only layout shifts are expensive, not rendering.
        calculateLayout();
    }, 100);
});
