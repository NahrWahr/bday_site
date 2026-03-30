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
  './supermeme_18h47_27.webp'
];

interface PlacedMedia {
  elem: HTMLImageElement;
  x: number;
  y: number;
  width: number;
  height: number;
  type: 'image';
}

interface ComputedLine {
  text: string;
  x: number;
  y: number;
}

let loadedMedia: PlacedMedia[] = [];
let computedLines: ComputedLine[] = [];

let layoutWidth = window.innerWidth;
let screenWidth = window.innerWidth;
let finalHeight = window.innerHeight;

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
  const font = '32px "Josefin Sans", sans-serif';
  const prepared = prepareWithSegments(bdayText, font, { whiteSpace: 'pre-wrap' });
  const lineHeight = 44;
  const colPadding = 40;
  
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
      currentImgY += stepY;
  });

  // 3. Flow layout into two columns
  let currentY = 100;
  let currentColumn = 1;
  let cursor = { segmentIndex: 0, graphemeIndex: 0 };
  computedLines = [];

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
  loadedMedia.forEach((media) => {
    ctx.globalAlpha = 0.9;
    ctx.shadowColor = 'rgba(255, 180, 100, 0.4)';
    ctx.shadowBlur = 30;
    
    ctx.drawImage(media.elem, media.x + marginX, media.y, media.width, media.height);
    
    ctx.shadowBlur = 0;
    ctx.globalAlpha = 1.0;
  });

  // Draw two-column text lines
  ctx.font = '32px "Josefin Sans", sans-serif';
  ctx.fillStyle = '#ffffff';
  ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
  ctx.shadowBlur = 10;
  ctx.textBaseline = 'top';

  console.log("Lines generated:", computedLines.length); computedLines.forEach(line => {
    ctx.fillText(line.text, line.x, line.y);
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
