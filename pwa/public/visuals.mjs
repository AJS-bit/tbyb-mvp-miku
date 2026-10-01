// Approved platform identity: two equal, open frames and the user's center point.
export const brand = () => `<a class="brand" href="/" aria-label="TBYB 홈"><span class="brand-mark" aria-hidden="true"><img class="brand-light" src="/brand/mark.svg" width="100" height="80" alt=""><img class="brand-dark" src="/brand/mark-dark.svg" width="100" height="80" alt=""></span><span class="brand-word">tbyb</span></a>`;

let drawingId = 0;

// The lid, deck and front edge share one camera. Project complete shapes, not
// just their centers: holes, legends and rounded corners must follow the plane.
// Physical coordinates are illustrative; see DESIGN_V6.md for the audit.
const deckWidth = 312, deckDepth = 210;
const pitchSin = 82 * (312 / 350) / deckDepth;
const pitchCos = Math.sqrt(1 - pitchSin ** 2);
const cameraDistance = pitchCos * deckDepth / (1 - 312 / 350);
const lidLean = 10 * Math.PI / 180;
const number = value => value.toFixed(3);
function project(x, depth, height = 0) {
  const scale = cameraDistance / (cameraDistance - pitchCos * depth - pitchSin * height);
  return [180 + (x - deckWidth / 2) * scale, 192 + (pitchSin * depth - pitchCos * height) * scale];
}
const deck = (x, y) => project(x, y);
const point = (plane, x, y) => plane(x, y).map(number).join(' ');

function surfacePath(plane, commands) {
  return commands.map(([command, ...coordinates]) => {
    const points = [];
    for (let i = 0; i < coordinates.length; i += 2) points.push(point(plane, coordinates[i], coordinates[i + 1]));
    return command + points.join(' ');
  }).join('');
}

function surfaceRect(plane, x, y, width, height, radius = 2) {
  const r = Math.min(radius, width / 2, height / 2), p = (x, y) => point(plane, x, y);
  return `M${p(x+r,y)}L${p(x+width-r,y)}Q${p(x+width,y)} ${p(x+width,y+r)}L${p(x+width,y+height-r)}Q${p(x+width,y+height)} ${p(x+width-r,y+height)}L${p(x+r,y+height)}Q${p(x,y+height)} ${p(x,y+height-r)}L${p(x,y+r)}Q${p(x,y)} ${p(x+r,y)}Z`;
}
const deckRect = (...args) => surfaceRect(deck, ...args);

function surfaceCircle(plane, x, y, radius) {
  const r = radius, c = r * .55228475;
  return surfacePath(plane, [
    ['M', x+r, y], ['C', x+r, y+c, x+c, y+r, x, y+r],
    ['C', x-c, y+r, x-r, y+c, x-r, y], ['C', x-r, y-c, x-c, y-r, x, y-r],
    ['C', x+c, y-r, x+r, y-c, x+r, y], ['Z']
  ]);
}

// A local tangent also foreshortens and shears each legend with its keycap.
function surfaceText(plane, x, y, text, className = '') {
  const [px, py] = plane(x, y), h = .01;
  const a = plane(x+h, y), b = plane(x-h, y), c = plane(x, y+h), d = plane(x, y-h);
  const matrix = [(a[0]-b[0])/(2*h), (a[1]-b[1])/(2*h), (c[0]-d[0])/(2*h), (c[1]-d[1])/(2*h), px, py];
  return `<text${className ? ` class="${className}"` : ''} transform="matrix(${matrix.map(number).join(' ')})">${text}</text>`;
}

function keyboard(air) {
  // ANSI reference: full-height function row, staggered letters, wide modifiers,
  // a space bar and four half-height arrow keys in an inverted T.
  const left = air ? 18 : 22, width = air ? 276 : 268;
  const unit = width / 15, gap = 1.65, rowHeight = 17, step = 19.3;
  const rows = [
    [1.5, ...Array(12).fill(1), 1.5],
    [...Array(13).fill(1), 2],
    [1.5, ...Array(12).fill(1), 1.5],
    [1.75, ...Array(11).fill(1), 2.25],
    [2.25, ...Array(10).fill(1), 2.75],
    [1, 1, 1, 1.25, 5, 1.25, 1.5]
  ];
  const labels = [
    ['esc', ...Array.from({length:12}, (_, i) => `F${i+1}`), ''],
    ['`', '1','2','3','4','5','6','7','8','9','0','−','=','delete'],
    ['tab','Q','W','E','R','T','Y','U','I','O','P','[',']','\\'],
    ['caps','A','S','D','F','G','H','J','K','L',';','’','return'],
    ['shift','Z','X','C','V','B','N','M',',','.','/','shift'],
    ['fn','ctrl','opt','cmd','','cmd','opt']
  ];
  const keys = [], legends = [];
  rows.forEach((row, rowIndex) => {
    let offset = 0;
    const y = 14 + rowIndex * step;
    row.forEach((size, index) => {
      const x = left + offset * unit + gap/2, w = size * unit - gap;
      keys.push(`<path class="keycap" d="${deckRect(x,y,w,rowHeight,2.5)}"/>`);
      if (rowIndex === 0 && index === row.length-1) {
        keys.push(`<path class="touch-id" d="${surfaceCircle(deck,x+w/2,y+8.5,4.8)}"/>`);
      } else if (labels[rowIndex][index]) {
        legends.push(surfaceText(deck,x+w/2,y+11.2,labels[rowIndex][index],labels[rowIndex][index].length>2?'key-modifier':''));
      }
      offset += size;
    });
  });
  const y = 14 + 5 * step, x = left + 12 * unit + gap/2;
  for (const [column,upper,symbol] of [[0,false,'‹'],[1,true,'⌃'],[1,false,'⌄'],[2,false,'›']]) {
    const kx=x+column*unit, ky=y+(upper?0:9.3);
    keys.push(`<path class="keycap arrow-key" d="${deckRect(kx,ky,unit-gap,7.7,1.6)}"/>`);
    legends.push(surfaceText(deck,kx+(unit-gap)/2,ky+6,symbol));
  }
  // The legacy HTML .keyboard has a CSS trapezoid clip. Applying that clip to
  // this already projected group cuts its edges along a second perspective.
  return `<g class="device-keyboard">${air?'':`<path class="keyboard-well" d="${deckRect(left-3,10,width+6,121,5)}"/>`}${keys.join('')}<g class="key-legends">${legends.join('')}</g></g>`;
}

// A grille is a fine, square-pitch perforated area, not five dotted stripes.
// Keep its footprint and every perforation on the keyboard's deck plane. The
// compound paths are shared across instances to avoid thousands of DOM nodes.
const speakerMarkup = (() => {
  const grilles = [];
  for (const side of ['left', 'right']) {
    const holes = [];
    const plane = (x, y) => deck(side === 'left' ? x : deckWidth-x, y);
    for (let row=0;row<132;row++) {
      for (let col=0;col<16;col++) {
        holes.push(surfaceCircle(plane,3.1+col*.86,14.5+row*.86,.24));
      }
    }
    grilles.push(`<g class="speaker-grille ${side}" data-rows="132" data-columns="16"><path class="speaker-field" d="${surfaceRect(plane,2.8,14.2,13.5,113.26,.4)}"/><path class="speaker-perforations" d="${holes.join('')}"/></g>`);
  }
  return `<g class="speaker-grilles">${grilles.join('')}</g>`;
})();

export function laptop(type, extra = '') {
  const air = type === 'air';
  const id = `device-${type}-${drawingId++}`;
  const lidHeight = air ? 186 : 190, thickness = air ? 2.7 : 5.4;
  const lid = (x, y) => project(x, -(lidHeight-y)*Math.sin(lidLean), (lidHeight-y)*Math.cos(lidLean));
  const screen = (x, y) => lid(6+(x-28)*300/264, 7+(y-16)*(lidHeight-17)/158);
  const front = (x, y) => project(x, deckDepth, -y);
  const shape = (commands, fill) => `<path d="${surfacePath(screen,commands)}" fill="var(${fill})"/>`;
  const scene = air
    ? `${shape([['M',28,132],['C',92,78,158,155,292,75],['L',292,174],['L',28,174],['Z']],'--screen-wave')}${shape([['M',28,149],['C',117,129,190,188,292,116],['L',292,174],['L',28,174],['Z']],'--screen-wave-back')}<path d="${surfaceCircle(screen,245,50,20)}" fill="var(--screen-sun)"/>${surfaceText(screen,51,70,'어디든,','screen-verse')}${surfaceText(screen,51,104,'나의 하루.','screen-verse')}${surfaceText(screen,52,153,'TAKE YOUR DAY WITH YOU','screen-caption')}`
    : `<path d="${surfaceCircle(screen,257,66,59)}" fill="var(--screen-sun)"/>${shape([['M',26,123],['C',103,58,177,159,294,98],['L',294,176],['L',26,176],['Z']],'--screen-wave')}${shape([['M',26,149],['C',112,112,189,168,294,123],['L',294,176],['L',26,176],['Z']],'--screen-wave-back')}${surfaceText(screen,47,64,'좋아하는 일에,','screen-verse')}${surfaceText(screen,47,97,'조금 더 깊이.','screen-verse')}<g class="screen-tracks">${[184,143,161].map((width,i)=>`<path d="${surfaceRect(screen,46,137+i*8,width,4,2)}"/>`).join('')}</g>`;
  return `<div class="laptop ${type} ${extra}" aria-hidden="true"><svg class="device-drawing" viewBox="0 0 360 287" fill="none">
    <defs>
      <linearGradient id="${id}-deck" x1="0" y1="0" x2="0" y2="1" gradientUnits="objectBoundingBox"><stop stop-color="var(--device-deck-top)"/><stop offset="1" stop-color="var(--device-deck)"/></linearGradient>
      <linearGradient id="${id}-rim" x1="0" y1="0" x2="0" y2="1" gradientUnits="objectBoundingBox"><stop stop-color="var(--device-rim)"/><stop offset="1" stop-color="var(--device-edge)"/></linearGradient>
      <clipPath id="${id}-screen"><path d="${surfaceRect(lid,6,7,300,lidHeight-17,4)}"/></clipPath>
    </defs>
    <path class="display-shell" d="${surfaceRect(lid,0,0,deckWidth,lidHeight,9)}" fill="var(--device-shell)" stroke="var(--device-edge)" stroke-width="1.4"/>
    <g clip-path="url(#${id}-screen)"><path d="${surfaceRect(lid,6,7,300,lidHeight-17,4)}" fill="var(--screen-paper)"/>${scene}</g>
    <path class="camera-notch" d="${surfacePath(lid,[['M',137,6],['L',175,6],['L',175,14.5],['Q',175,18,171.5,18],['L',140.5,18],['Q',137,18,137,14.5],['Z']])}" fill="var(--device-shell)"/>
    <path d="${surfaceCircle(lid,156,11.5,1.35)}" fill="#14202c"/><path d="${surfaceCircle(lid,156.4,11.1,.45)}" fill="#54778a"/>
    <path d="${surfacePath(lid,[['M',10,lidHeight-4],['L',302,lidHeight-4]])}" stroke="var(--device-bezel-line)" stroke-width=".7"/>
    <path class="device-rim" d="${surfaceRect((x,y)=>project(x,y,-thickness),0,0,deckWidth,deckDepth,6)}" fill="url(#${id}-rim)"/>
    <path class="device-deck" d="${deckRect(0,0,deckWidth,deckDepth,6)}" fill="url(#${id}-deck)" stroke="var(--device-edge)" stroke-width=".75"/>
    <path class="device-hinge" d="${deckRect(20,0,272,5,2)}" fill="var(--device-hinge)"/>
    ${keyboard(air)}${air?'':speakerMarkup}
    <path class="device-trackpad" d="${deckRect(94,138,124,64,5)}" fill="var(--device-trackpad)" stroke="var(--device-trackpad-edge)" stroke-width=".65"/>
    <path class="opening-recess" d="${surfacePath(front,[['M',134,0],['L',178,0],['Q',177,thickness*.7,173,thickness*.7],['L',139,thickness*.7],['Q',135,thickness*.7,134,0],['Z']])}" fill="var(--device-recess)"/>
    <path d="${surfacePath(front,[['M',140,thickness*.65],['L',172,thickness*.65]])}" stroke="var(--device-deck-top)" stroke-width=".6" stroke-linecap="round"/>
  </svg></div>`;
}
