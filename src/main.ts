import './style.css'
import { prepareWithSegments, layoutNextLine } from '@chenglou/pretext'

const canvas = document.getElementById('bday-canvas') as HTMLCanvasElement;
const ctx = canvas.getContext('2d')!;

const imagesToLoad = [
  './oug1.png',
  './HCzZrNqasAAdq_P.jpg',
  './HEibW_1WQAA2hzF.jpg',
  './out2.png'
];

interface PlacedImage {
  img: HTMLImageElement;
  x: number;
  y: number;
  width: number;
  height: number;
}

let loadedImages: PlacedImage[] = [];
let layoutWidth = window.innerWidth > 900 ? 900 : window.innerWidth;
let screenWidth = window.innerWidth;

async function loadImages() {
  let initialY = 200;
  for (const src of imagesToLoad) {
    await new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        let imgWidth = img.width;
        let imgHeight = img.height;
        const maxImgWidth = Math.min(layoutWidth * 0.4, 300);
        const scale = maxImgWidth / imgWidth;
        imgWidth *= scale;
        imgHeight *= scale;

        const side = Math.random() > 0.5 ? 'left' : 'right';
        const padding = 20;
        
        let x = side === 'left' ? padding : layoutWidth - imgWidth - padding;
        
        // Let's randomize y slightly below the previous to stagger them naturally
        const y = initialY + Math.random() * 200;

        loadedImages.push({
            img,
            x,
            y,
            width: imgWidth,
            height: imgHeight
        });

        // Push down for the next image so they don't completely overlap
        initialY += imgHeight + 50;
        resolve(null);
      };
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

function measureAndRender() {
  const font = '32px "Cormorant Garamond", serif';
  const prepared = prepareWithSegments(bdayText, font, { whiteSpace: 'pre-wrap' });
  const lineHeight = 44;
  const colPadding = 40;

  // First Pass: Measure Total Required Height
  let cursor = { segmentIndex: 0, graphemeIndex: 0 };
  let currentY = 100;

  while (true) {
    let lineX = colPadding;
    let maxAvailableWidth = layoutWidth - colPadding * 2;
    const cyTop = currentY;
    const cyBottom = currentY + lineHeight;

    for (const img of loadedImages) {
        if (cyBottom > img.y && cyTop < img.y + img.height) {
            if (img.x < layoutWidth / 2) {
                // Image is on left
                const pushRight = img.x + img.width + 20;
                if (pushRight > lineX) {
                    const diff = pushRight - lineX;
                    lineX = pushRight;
                    maxAvailableWidth -= diff;
                }
            } else {
                // Image is on right
                const cutoff = img.x - 20;
                if (cutoff < lineX + maxAvailableWidth) {
                    maxAvailableWidth = cutoff - lineX;
                }
            }
        }
    }
    
    if (maxAvailableWidth < 100) maxAvailableWidth = 100;

    const layoutLine = layoutNextLine(prepared, cursor, maxAvailableWidth);
    if (!layoutLine) break;

    cursor = layoutLine.end;
    currentY += lineHeight;
  }

  // Find the bottom most pixel used by images or text
  const lastImageY = loadedImages.length > 0 
    ? Math.max(...loadedImages.map(img => img.y + img.height)) 
    : 0;
  
  const finalHeight = Math.max(currentY + 200, lastImageY + 100, window.innerHeight);

  // Resize canvas for sharp rendering
  const marginX = Math.max(0, (screenWidth - layoutWidth) / 2);
  
  canvas.width = screenWidth * window.devicePixelRatio;
  canvas.height = finalHeight * window.devicePixelRatio;
  ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
  
  canvas.style.width = screenWidth + 'px';
  canvas.style.height = finalHeight + 'px';

  // Second Pass: Actually render
  ctx.clearRect(0, 0, screenWidth, finalHeight);

  // Draw images
  loadedImages.forEach((imgObj) => {
    ctx.globalAlpha = 0.9;
    ctx.shadowColor = 'rgba(255, 180, 100, 0.4)';
    ctx.shadowBlur = 30;
    // Add marginX offset since images were measured relative to layoutWidth
    ctx.drawImage(imgObj.img, imgObj.x + marginX, imgObj.y, imgObj.width, imgObj.height);
    ctx.shadowBlur = 0;
    ctx.globalAlpha = 1.0;
  });

  // Draw Text
  ctx.font = font;
  ctx.fillStyle = '#ffdfa0';
  ctx.shadowColor = 'rgba(255, 200, 100, 0.6)';
  ctx.shadowBlur = 10;
  ctx.textBaseline = 'top';

  cursor = { segmentIndex: 0, graphemeIndex: 0 };
  currentY = 100;

  while (true) {
    let lineX = colPadding;
    let maxAvailableWidth = layoutWidth - colPadding * 2;
    const cyTop = currentY;
    const cyBottom = currentY + lineHeight;

    for (const img of loadedImages) {
        if (cyBottom > img.y && cyTop < img.y + img.height) {
            if (img.x < layoutWidth / 2) {
                const pushRight = img.x + img.width + 20;
                if (pushRight > lineX) {
                    const diff = pushRight - lineX;
                    lineX = pushRight;
                    maxAvailableWidth -= diff;
                }
            } else {
                const cutoff = img.x - 20;
                if (cutoff < lineX + maxAvailableWidth) {
                    maxAvailableWidth = cutoff - lineX;
                }
            }
        }
    }
    
    if (maxAvailableWidth < 100) maxAvailableWidth = 100;

    const layoutLine = layoutNextLine(prepared, cursor, maxAvailableWidth);
    if (!layoutLine) break;

    ctx.fillText(layoutLine.text, lineX + marginX, currentY);

    cursor = layoutLine.end;
    currentY += lineHeight;
  }
}

// Ensure fonts are loaded before layout
document.fonts.ready.then(async () => {
  await loadImages();
  measureAndRender();
});

let resizeTimer: any;
window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
        screenWidth = window.innerWidth;
        layoutWidth = screenWidth > 900 ? 900 : screenWidth;
        measureAndRender();
    }, 100);
});
