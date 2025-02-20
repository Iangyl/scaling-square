const canvas = document.createElement('canvas');
canvas.width = 500;
canvas.height = 500;
const mainSquare = document.getElementById('main-square');
if (mainSquare) {
  mainSquare.appendChild(canvas);
}
const ctx = canvas.getContext('2d');

interface Point {
  x: number;
  y: number;
}

interface MovingPolygon {
  polygon: Polygon;
  startPolygon: Polygon; // Початкові координати
  velocityX: number;
  velocityY: number;
}

type Polygon = Point[];
let recursionDepth = 0;

const MIN_SIDE_LENGTH = 50;
const MAX_DEPTH = 5;
const ANIMATION_SPEED = 1;
const RETURN_SPEED = 0.02;
const MAX_DISTANCE = 50;
const ANIMATION_DURATION = 5;

// Функція для знаходження центру полігона
function getPolygonCenter(polygon: Polygon): Point {
  const x = polygon.reduce((sum, p) => sum + p.x, 0) / polygon.length;
  const y = polygon.reduce((sum, p) => sum + p.y, 0) / polygon.length;
  return { x, y };
}

// Знаходження найдовшої сторони багатокутника
function maxSideLength(polygon: Polygon): number {
  return Math.max(
    ...polygon.map((p, i) => {
      const next = polygon[(i + 1) % polygon.length];
      return Math.hypot(next.x - p.x, next.y - p.y);
    })
  );
}

// Перший поділ — створення 2-25 полігонів
function firstSplit(polygon: Polygon): Polygon[] {
  const numSplits = Math.floor(Math.random() * (25 - 2 + 1)) + 2;
  let fragments: Polygon[] = [polygon];

  for (let i = 0; i < numSplits - 1; i++) {
    const newFragments: Polygon[] = [];
    fragments.forEach((poly) => {
      if (poly.length >= 3 && maxSideLength(poly) > MIN_SIDE_LENGTH) {
        const [poly1, poly2] = dividePolygon(poly);
        if (poly2.length > 0) {
          newFragments.push(poly1, poly2);
        } else {
          newFragments.push(poly);
        }
      } else {
        newFragments.push(poly);
      }
    });
    fragments = newFragments;
  }
  return fragments;
}

// Рекурсивний поділ
function splitPolygon(polygons: Polygon[]): Polygon[] {
  if (recursionDepth >= MAX_DEPTH) return polygons;

  recursionDepth++;
  let newPolygons: Polygon[] = [];

  polygons.forEach((polygon) => {
    if (polygon.length >= 3) {
      const [poly1, poly2] = dividePolygon(polygon);
      if (poly2.length > 0) {
        newPolygons.push(poly1, poly2);
      } else {
        newPolygons.push(polygon);
      }
    } else {
      newPolygons.push(polygon);
    }
  });

  return splitPolygon(newPolygons);
}

// Поділ полігона випадковою лінією
function dividePolygon(polygon: Polygon): [Polygon, Polygon] {
  if (polygon.length < 4) return [polygon, []];

  const angle = Math.random() * Math.PI;
  const centerX = polygon.reduce((sum, p) => sum + p.x, 0) / polygon.length;
  const centerY = polygon.reduce((sum, p) => sum + p.y, 0) / polygon.length;

  const dx = Math.cos(angle);
  const dy = Math.sin(angle);

  const poly1: Polygon = [];
  const poly2: Polygon = [];

  for (let i = 0; i < polygon.length; i++) {
    const curr = polygon[i];
    const next = polygon[(i + 1) % polygon.length];

    const side = (curr.x - centerX) * dy - (curr.y - centerY) * dx;

    if (side >= 0) {
      poly1.push(curr);
    } else {
      poly2.push(curr);
    }

    const nextSide = (next.x - centerX) * dy - (next.y - centerY) * dx;

    if (side * nextSide < 0) {
      const ratio = Math.abs(side) / (Math.abs(side) + Math.abs(nextSide));
      const newPoint: Point = {
        x: curr.x + (next.x - curr.x) * ratio,
        y: curr.y + (next.y - curr.y) * ratio,
      };
      poly1.push(newPoint);
      poly2.push(newPoint);
    }
  }

  return poly1.length >= 3 && poly2.length >= 3
    ? [poly1, poly2]
    : [polygon, []];
}

// Малювання полігонів
function drawPolygon(polygon: Polygon, color: string) {
  if (!ctx || polygon.length < 3) return;
  ctx.beginPath();
  ctx.moveTo(polygon[0].x, polygon[0].y);
  polygon.forEach((p) => ctx.lineTo(p.x, p.y));
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
  ctx.strokeStyle = 'black';
  ctx.lineWidth = 2;
  ctx.stroke();
}

// Початковий квадрат
const square: Polygon = [
  { x: 0, y: 0 },
  { x: 500, y: 0 },
  { x: 500, y: 500 },
  { x: 0, y: 500 },
];

// Перший поділ
const initialPolygons = firstSplit(square);

// Подальший рекурсивний поділ
const finalPolygons = splitPolygon(initialPolygons);

// Генерація кольорів
const colors = finalPolygons.map(() => `hsl(${Math.random() * 360}, 70%, 70%)`);

// Масив рухомих полігонів
const movingPolygons: MovingPolygon[] = finalPolygons.map((polygon) => {
  const center = getPolygonCenter(polygon);
  const angle = Math.random() * Math.PI * 2;
  return {
    polygon: polygon.map((p) => ({ ...p })),
    startPolygon: polygon.map((p) => ({ ...p })), // Початкові координати
    velocityX: Math.cos(angle) * ANIMATION_SPEED,
    velocityY: Math.sin(angle) * ANIMATION_SPEED,
  };
});

let progress = 0;
let expanding = true;

// Анімація полігонів
function animate() {
  ctx?.clearRect(0, 0, canvas.width, canvas.height);
  let allReturned = true;

  movingPolygons.forEach((obj, index) => {
    obj.polygon.forEach((p, i) => {
      const startP = obj.startPolygon[i];

      if (expanding) {
        p.x += obj.velocityX;
        p.y += obj.velocityY;
      } else {
        // Обчислюємо напрямок руху
        const dx = startP.x - p.x;
        const dy = startP.y - p.y;
        const dist = Math.hypot(dx, dy);

        if (dist > RETURN_SPEED) {
          p.x += (dx / dist) * RETURN_SPEED;
          p.y += (dy / dist) * RETURN_SPEED;
          allReturned = false;
        } else {
          p.x = startP.x;
          p.y = startP.y;
        }
      }
    });

    drawPolygon(obj.polygon, colors[index]);
  });

  if (expanding) {
    progress += 1;
    if (progress >= ANIMATION_DURATION) expanding = false;
  } else {
    if (allReturned) {
      progress = 0;
      expanding = true;
    }
  }

  requestAnimationFrame(animate);
}

animate();
