import './style.css'
import { prepareWithSegments, layoutNextLine } from '@chenglou/pretext'

const canvas = document.getElementById('bday-canvas') as HTMLCanvasElement;
const ctx = canvas.getContext('2d')!;
document.getElementById('bkgnd')!.style.backgroundImage = "url('./bk_gnd.webp')";

const mediaToLoad = [
  './11d1e9dc-3305-49bb-90ba-5b6877c00e1e_removalai_preview.webp',
  './G-YH3_zaYAAt5eC.webp',
  './G0qzlfeWwAAvOKi.webp',
  './G8ul1Y4bQAA77Vw.webp',
  './HEibW_1WQAA2hzF.webp',
  './IMG_20250131_123257_DRO.webp',
  './PXL_20240109_115959709-EDIT.webp',
  './PXL_20241031_130435595.PORTRAIT.webp',
  './amitabh_confused.webp',
  './ebbe6014-da48-4518-b9d5-3357c578aa02_removalai_preview.webp',
  './image.webp',
  './ou5.webp',
  './oug1.webp',
  './out2.webp',
  './out4.webp',
  './out6.webp',
  './out7.webp',
  './sallubhai.webp',
  './sallubhai2.webp',
  './supermeme_18h46_12.webp',
  './supermeme_18h47_27.webp',
  './henchmen_edit.webp'
];

interface PlacedMedia {
  elem: HTMLImageElement;
  x: number;
  y: number;
  width: number;
  height: number;
  phase: number; // For independent float animation
  type: 'image';
}

interface ComputedLine {
  text: string;
  x: number;
  y: number;
  isTitle?: boolean;
}

let loadedMedia: PlacedMedia[] = [];
let computedLines: ComputedLine[] = [];

let layoutWidth = window.innerWidth;
let screenWidth = window.innerWidth;
let finalHeight = window.innerHeight;

let mousePos = { x: 0, y: 0 };
let deviceTilt = { x: 0, y: 0 };
const startTime = Date.now();

window.addEventListener('mousemove', (e) => {
    mousePos.x = (e.clientX / window.innerWidth) - 0.5;
    mousePos.y = (e.clientY / window.innerHeight) - 0.5;
});

window.addEventListener('deviceorientation', (e) => {
    if (e.beta !== null && e.gamma !== null) {
        // Simple mapping of tilt to a -0.5 to 0.5 range
        deviceTilt.x = Math.max(-1, Math.min(1, e.gamma / 45)) * 0.5;
        deviceTilt.y = Math.max(-1, Math.min(1, (e.beta - 45) / 45)) * 0.5;
    }
});

async function loadMedia() {
  for (const src of mediaToLoad) {
    await new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const maxImgWidth = Math.min(layoutWidth * 0.4, 350);
        const scale = maxImgWidth / img.width;
        const width = img.width * scale;
        const height = img.height * scale;

        loadedMedia.push({
            elem: img,
            x: 0, // Calculated later
            y: 0, // Calculated later
            width,
            height,
            phase: Math.random() * Math.PI * 2,
            type: 'image'
        });
        resolve(null);
      };
      
      img.onerror = () => {
        resolve(null); // gracefully skip broken images
      }
      img.src = src;
    });
  }
}

const titleText = "Happy Birthday Parul!";
const bodyText = `Wishing you the most magical, warm, and incredible birthday ever. 

May your day be filled with endless purrs, warm candle light, and all the joy that you absolutely deserve!

Here is to more adventures, more happiness, and definitely more adorable manual cat pictures. 

Your presence brings so much warmth and light to those around you, much like a cozy candle in a dark, quiet room. Your smile and spirit are truly one of a kind.

I hope this special day is exactly as wonderful as you are. Take this time to reflect on all the amazing moments, and look forward to the brilliant future ahead.

Keep shining brightly, keep smiling warmly, and never forget how loved you are!

Have a fantastic birthday!

With lots of love,
Your Friends`;

function calculateLayout() {
  const bodyFont = '24px "Josefin Sans", sans-serif';
  
  const prepared = prepareWithSegments(bodyText, bodyFont, { whiteSpace: 'pre-wrap' });
  const lineHeight = 34;
  const colPadding = 40;
  const titleHeight = 80;
  
  // 1. Simulate finding the raw text height
  let simCursor = { segmentIndex: 0, graphemeIndex: 0 };
  let simLines = 0;
  let singleColWidth = (layoutWidth / 2) - colPadding - 20; 
  while (true) {
     const line = layoutNextLine(prepared, simCursor, singleColWidth);
     if (!line) break;
     simCursor = line.end;
     simLines++;
  }
  
  // Target column height balances the text evenly between two columns, 
  // plus extra buffer for image dodging.
  const estimatedTextHeight = simLines * lineHeight;
  const columnHeight = Math.max((estimatedTextHeight / 2) * 1.6, window.innerHeight - 100);

  // 2. Position the loaded images freely down the page
  let currentImgY = 100;
  let stepY = 220; // Fixed spacing so they tile beautifully downwards
  
  loadedMedia.forEach(media => {
      const padding = 20;
      const posChoice = Math.random();
      let x;
      // Distribute to Left Edge, Right Edge, or Center Gap
      if (posChoice < 0.33) {
         x = padding; // Left
      } else if (posChoice < 0.66) {
         x = layoutWidth - media.width - padding; // Right
      } else {
         x = (layoutWidth / 2) - (media.width / 2); // Center
      }
      
      media.x = x;
      media.y = currentImgY + (Math.random() * 80 - 40); // add slight jitter
      // Avoid covering the title area if in column 1
      if (media.x < layoutWidth / 2 && media.y < 180) {
          media.y += 150;
      }
      currentImgY += stepY;
  });

  // 3. Flow layout into two columns
  let currentY = 100;
  let currentColumn = 1;
  let cursor = { segmentIndex: 0, graphemeIndex: 0 };
  computedLines = [];

  // Manual placement of the title
  const marginX0 = Math.max(0, (screenWidth - layoutWidth) / 2);
  computedLines.push({
      text: titleText,
      x: colPadding + marginX0,
      y: currentY,
      isTitle: true
  });
  currentY += titleHeight;

  while (true) {
    if (currentY > columnHeight && currentColumn === 1) {
       currentColumn = 2; // Flow shifts to column 2
       currentY = 100; // Reset to top
    }

    let lineX = currentColumn === 1 ? colPadding : (layoutWidth / 2) + colPadding;
    let maxAvailableWidth = (layoutWidth / 2) - colPadding * 2;

    const cyTop = currentY;
    const cyBottom = currentY + lineHeight;

    // Check collisions
    for (const media of loadedMedia) {
        if (cyBottom > media.y && cyTop < media.y + media.height) {
            const mediaLeft = media.x;
            const mediaRight = media.x + media.width;
            const colLeft = lineX;
            const colRight = lineX + maxAvailableWidth;

            // AABB horizontal collision detecting
            if (mediaRight > colLeft && mediaLeft < colRight) {
                if (mediaLeft <= colLeft && mediaRight >= colRight) {
                    // Image completely overwrites this column width
                    maxAvailableWidth = 0;
                } else if (mediaLeft > colLeft + (maxAvailableWidth / 2)) {
                    // Image is on the right side of this specific column
                    const dist = mediaLeft - colLeft;
                    if (dist < maxAvailableWidth) maxAvailableWidth = dist - 15;
                } else {
                    // Image is on the left side of this column
                    const pushRight = mediaRight + 15;
                    const diff = pushRight - lineX;
                    lineX = pushRight;
                    maxAvailableWidth -= diff;
                }
            }
        }
    }
    
    // Skip tightly obstructed rows entirely so words don't squash into 1 letter slices
    if (maxAvailableWidth < 60) {
        currentY += lineHeight;
        continue;
    }

    const layoutLine = layoutNextLine(prepared, cursor, maxAvailableWidth);
    if (!layoutLine) break; // Finished parsing text!

    const marginX = Math.max(0, (screenWidth - layoutWidth) / 2);

    computedLines.push({
      text: layoutLine.text,
      x: lineX + marginX,
      y: currentY
    });

    cursor = layoutLine.end;
    currentY += lineHeight;
  }

  // Adjust canvas size to fit the tallest column (likely column 2, plus overflowing images)
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

  // Draw media in Full Color
  const time = (Date.now() - startTime) / 1000;
  
  // Combine mouse and tilt positions (barely noticeable parallax)
  const tiltX = (mousePos.x + deviceTilt.x) * 15;
  const tiltY = (mousePos.y + deviceTilt.y) * 15;

  loadedMedia.forEach((media) => {
    ctx.globalAlpha = 0.9;
    ctx.shadowColor = 'rgba(255, 180, 100, 0.4)';
    ctx.shadowBlur = 30;
    
    // Independent floating motion
    const floatY = Math.sin(time + media.phase) * 8;
    const floatX = Math.cos(time * 0.7 + media.phase) * 4;
    
    ctx.drawImage(
        media.elem, 
        media.x + marginX + tiltX + floatX, 
        media.y + tiltY + floatY, 
        media.width, 
        media.height
    );
    
    ctx.shadowBlur = 0;
    ctx.globalAlpha = 1.0;
  });

  // Draw two-column text lines
  ctx.textBaseline = 'top';
  computedLines.forEach(line => {
    // Parallax for text is even more subtle
    const textTiltX = tiltX * 0.3;
    const textTiltY = tiltY * 0.3;

    if (line.isTitle) {
      ctx.font = 'bold 52px "Satisfy", cursive';
      ctx.fillStyle = '#FFD700'; // Gold Color
      ctx.shadowBlur = 20;
      ctx.shadowColor = 'rgba(255, 215, 0, 0.5)';
    } else {
      ctx.font = '24px "Josefin Sans", sans-serif';
      ctx.fillStyle = '#fdfbf0'; // Off-White/Cream
      ctx.shadowBlur = 10;
      ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
    }
    ctx.fillText(line.text, line.x + textTiltX, line.y + textTiltY);
  });

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
        layoutWidth = screenWidth;
        // Only layout shifts are expensive, not rendering.
        calculateLayout();
    }, 100);
});
