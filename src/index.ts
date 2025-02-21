const canvas = document.createElement('canvas');
const mainSquare = document.getElementById('main-square');
canvas.width = 1000;
canvas.height = 750;
canvas.style.margin = '0 auto';
canvas.style.position = 'absolute';
canvas.style.top = '50%';
canvas.style.left = '50%';
canvas.style.transform = 'translate(-50%, -50%)';
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
  // Обчислюємо середнє арифметичне координат всіх точок
  const x = polygon.reduce((sum, p) => sum + p.x, 0) / polygon.length;
  const y = polygon.reduce((sum, p) => sum + p.y, 0) / polygon.length;
  return { x, y };
}

// Знаходження найдовшої сторони багатокутника
function maxSideLength(polygon: Polygon): number {
  return Math.max(
    ...polygon.map((p, i) => {
      const next = polygon[(i + 1) % polygon.length];
      // Обчислення відстані між двома точками за допомогою теореми Піфагора
      return Math.hypot(next.x - p.x, next.y - p.y);
    })
  );
}

// Функція першого поділу полігона на випадкову кількість (від 2 до 25) фрагментів
function firstSplit(polygon: Polygon): Polygon[] {
  const numSplits = Math.floor(Math.random() * (25 - 2 + 1)) + 2;
  let fragments: Polygon[] = [polygon];

  // Для кожного поділу обробляємо всі існуючі фрагменти
  for (let i = 0; i < numSplits - 1; i++) {
    const newFragments: Polygon[] = [];
    fragments.forEach((poly) => {
      // Якщо полігон має достатньо точок і його найдовша сторона перевищує мінімальну довжину - ділимо його
      if (poly.length >= 3 && maxSideLength(poly) > MIN_SIDE_LENGTH) {
        const [poly1, poly2] = dividePolygon(poly);
        // Якщо поділ вдало створив два полігони – додаємо їх
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

// Рекурсивний поділ полігонів до досягнення заданої глибини
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
  // Якщо полігон містить менше ніж 4 точки, поділ не проводиться
  if (polygon.length < 4) return [polygon, []];

  // Випадковий кут для визначення напрямку роздільної лінії
  const angle = Math.random() * Math.PI;
  // Обчислення центру полігона (середина масиву точок)
  const centerX = polygon.reduce((sum, p) => sum + p.x, 0) / polygon.length;
  const centerY = polygon.reduce((sum, p) => sum + p.y, 0) / polygon.length;

  // Визначаємо вектор напрямку роздільної лінії
  const dx = Math.cos(angle);
  const dy = Math.sin(angle);

  const poly1: Polygon = [];
  const poly2: Polygon = [];

  // Обробка кожного ребра полігона
  for (let i = 0; i < polygon.length; i++) {
    const curr = polygon[i];
    const next = polygon[(i + 1) % polygon.length];

    // Обчислення положення точки відносно роздільної лінії:
    // Використовуємо векторний добуток (крестове добуток) для визначення "сторони"
    const side = (curr.x - centerX) * dy - (curr.y - centerY) * dx;

    // Розподіляємо точку до одного з полігонів залежно від знаку "side"
    if (side >= 0) {
      poly1.push(curr);
    } else {
      poly2.push(curr);
    }

    // Аналогічно обчислюємо положення наступної точки
    const nextSide = (next.x - centerX) * dy - (next.y - centerY) * dx;

    // Якщо поточна і наступна точки знаходяться по різних сторонах, визначаємо точку перетину
    if (side * nextSide < 0) {
      // Обчислення коефіцієнта інтерполяції для знаходження точки перетину
      const ratio = Math.abs(side) / (Math.abs(side) + Math.abs(nextSide));
      // Розрахунок координат точки перетину за формулою інтерполяції
      const newPoint: Point = {
        x: curr.x + (next.x - curr.x) * ratio,
        y: curr.y + (next.y - curr.y) * ratio,
      };
      // Додаємо точку перетину до обох полігонів для збереження їх замкнутості
      poly1.push(newPoint);
      poly2.push(newPoint);
    }
  }

  // Повертаємо поділені полігони, якщо обидва мають не менше 3 точок, інакше повертаємо оригінальний полігон
  return poly1.length >= 3 && poly2.length >= 3
    ? [poly1, poly2]
    : [polygon, []];
}

// Функція малювання полігона на канвасі
function drawPolygon(polygon: Polygon, color: string) {
  if (!ctx || polygon.length < 3) return;
  ctx.beginPath();
  // Початок шляху від першої точки полігона
  ctx.moveTo(polygon[0].x, polygon[0].y);
  // Проходимо по всіх точках полігона і малюємо лінії між ними
  polygon.forEach((p) => ctx.lineTo(p.x, p.y));
  ctx.closePath();
  // Заповнюємо полігон кольором
  ctx.fillStyle = color;
  ctx.fill();
  // Малюємо обводку полігона
  ctx.strokeStyle = 'black';
  ctx.lineWidth = 2;
  ctx.stroke();
}

// Визначення початкового квадрата з чотирьох точок
const square: Polygon = [
  { x: 250, y: 0 },
  { x: 750, y: 0 },
  { x: 750, y: 500 },
  { x: 250, y: 500 },
];

// Перший поділ
const initialPolygons = firstSplit(square);

// Подальший рекурсивний поділ
const finalPolygons = splitPolygon(initialPolygons);

// Генерація кольорів
const colors = finalPolygons.map(() => `hsl(${Math.random() * 360}, 70%, 70%)`);

// Визначаємо центр основного полігона (великий квадрат)
const mainCenter = getPolygonCenter(square);

// Поріг, на якому сусідній вплив працює (у пікселях)
const neighborThreshold = 1;
// Ваги для обох ефектів (можна підігнати)
const weightMain = 0.01;
const weightNeighbor = 0.01;

const movingPolygons: MovingPolygon[] = finalPolygons.map((polygon, i, arr) => {
  // Центр поточного полігона
  const center = getPolygonCenter(polygon);

  // Вектор від центру основного полігона до поточного центру
  const mainVector = {
    x: center.x - mainCenter.x,
    y: center.y - mainCenter.y,
  };

  // Обчислюємо вплив сусідніх полігонів:
  let neighborVector = { x: 0, y: 0 };
  arr.forEach((otherPolygon, j) => {
    if (i === j) return; // Пропускаємо сам полігон
    const otherCenter = getPolygonCenter(otherPolygon);
    const dx = center.x - otherCenter.x;
    const dy = center.y - otherCenter.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    // Якщо сусід досить близько, додаємо вагове відштовхування
    if (distance > 0 && distance < neighborThreshold) {
      // Чим ближче сусід, тим сильніший вплив
      const weight = (neighborThreshold - distance) / neighborThreshold;
      neighborVector.x += (dx / distance) * weight;
      neighborVector.y += (dy / distance) * weight;
    }
  });

  // Комбінуємо впливи: від центру основного полігона і від сусідів
  const combinedVector = {
    x: weightMain * mainVector.x + weightNeighbor * neighborVector.x,
    y: weightMain * mainVector.y + weightNeighbor * neighborVector.y,
  };

  // Використовуємо комбінований вектор як швидкість без нормалізації,
  // щоб зміщення було пропорційним обчисленим величинам
  return {
    polygon: polygon.map((p) => ({ ...p })),
    startPolygon: polygon.map((p) => ({ ...p })), // Збереження початкових координат
    velocityX: combinedVector.x * ANIMATION_SPEED,
    velocityY: combinedVector.y * ANIMATION_SPEED,
  };
});

let time = 0;

function animate() {
  ctx?.clearRect(0, 0, canvas.width, canvas.height);

  const expansionFactor = Math.sin(time) * 0.5 + 0.5; // Значення від 0 до 1

  movingPolygons.forEach((obj, index) => {
    obj.polygon.forEach((p, i) => {
      const startP = obj.startPolygon[i];

      // Використовуємо плавну зміну, щоб полігони розходилися і сходилися
      p.x = startP.x + obj.velocityX * expansionFactor * MAX_DISTANCE;
      p.y = startP.y + obj.velocityY * expansionFactor * MAX_DISTANCE;
    });

    drawPolygon(obj.polygon, colors[index]);
  });

  time += 0.01; // Чим менше значення, тим повільніша анімація
  requestAnimationFrame(animate);
}

animate();
