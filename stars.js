// --- Star Logic for Space Background ---

let stars = [];
const numStars = 250;

const starColors = [
    [255, 255, 255], // White
    [255, 255, 224], // Light Yellow
    [204, 229, 255], // Light Blue
    [255, 230, 200], // Pale Orange/Yellow
    [230, 230, 250]  // Lavender White
];

let spaceCanvasForStars;
let ctxStars;

function initStars(canvas, ctx) {
    spaceCanvasForStars = canvas;
    ctxStars = ctx;
    if (!spaceCanvasForStars || !ctxStars) return;

    stars = [];
    for (let i = 0; i < numStars; i++) {
        const colorIndex = Math.floor(Math.random() * starColors.length);
        stars.push({
            x: Math.random() * spaceCanvasForStars.width,
            y: Math.random() * spaceCanvasForStars.height,
            radius: Math.random() * 1.2 + 0.3,
            alpha: Math.random() * 0.5 + 0.3,
            twinkleSpeed: Math.random() * 0.008 + 0.002,
            twinkleDir: Math.random() < 0.5 ? 1 : -1,
            vx: (Math.random() - 0.5) * 0.15,
            vy: (Math.random() - 0.5) * 0.15,
            color: starColors[colorIndex]
        });
    }
}

function drawStars() {
    if (!ctxStars || !spaceCanvasForStars || stars.length === 0) return;

    stars.forEach(star => {
        star.x += star.vx;
        star.y += star.vy;

        if (star.x < -star.radius) star.x = spaceCanvasForStars.width + star.radius;
        if (star.x > spaceCanvasForStars.width + star.radius) star.x = -star.radius;
        if (star.y < -star.radius) star.y = spaceCanvasForStars.height + star.radius;
        if (star.y > spaceCanvasForStars.height + star.radius) star.y = -star.radius;

        star.alpha += star.twinkleSpeed * star.twinkleDir;
        if (star.alpha >= 0.9 || star.alpha <= 0.2) {
            star.twinkleDir *= -1;
            star.alpha = Math.max(0.2, Math.min(0.9, star.alpha));
        }

        ctxStars.beginPath();
        ctxStars.arc(star.x, star.y, star.radius, 0, Math.PI * 2);
        ctxStars.fillStyle = `rgba(${star.color[0]}, ${star.color[1]}, ${star.color[2]}, ${star.alpha})`;
        ctxStars.fill();
    });
}
