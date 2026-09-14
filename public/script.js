
const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const scoreText = document.getElementById("score");
const sizeText = document.getElementById("size");
const timerText = document.getElementById("timer");
const powerText = document.getElementById("power");
const coinsText = document.getElementById("coins");

const startScreen = document.getElementById("startScreen");
const gameUI = document.getElementById("gameUI");
const normalModeBtn = document.getElementById("normalModeBtn");
const multiplayerBtn = document.getElementById("multiplayerBtn");
const restartBtn = document.getElementById("restartBtn");
const pauseBtn = document.getElementById("pauseBtn");
const modeLabel = document.getElementById("modeLabel");

const world = {
    width: 3000,
    height: 3000
};

const MAX_HOLE_RADIUS = 180;
const MOBILE_MAX_HOLE_RADIUS = 125;
const STARTING_HOLE_RADIUS = 28;

let canvasWidth = window.innerWidth;
let canvasHeight = window.innerHeight;

let score = 0;
let timeLeft = 120;
let gameRunning = false;
let gamePaused = false;
let gameOver = false;
let gameMode = "normal";

let coins = Number(localStorage.getItem("holeRushCoins")) || 10;
let selectedSkin = localStorage.getItem("holeRushSelectedSkin") || "india";

let unlockedSkins = JSON.parse(
    localStorage.getItem("holeRushUnlockedSkins") ||
    '["india"]'
);

let activePower = "";
let speedBoostTimer = 0;
let shieldTimer = 0;

let timerAccumulator = 0;
let lastTime = 0;

let objects = [];
let enemies = [];
let powerUps = [];
let particles = [];
let scorePopups = [];

let keys = {};
let mouse = {
    x: canvasWidth / 2,
    y: canvasHeight / 2,
    active: false
};

let touch = {
    active: false,
    x: canvasWidth / 2,
    y: canvasHeight / 2
};

const hole = {
    x: world.width / 2,
    y: world.height / 2,
    radius: STARTING_HOLE_RADIUS,
    speed: 5
};

const skins = {
    india: {
        name: "India",
        flag: "🇮🇳",
        color: "#ff9933",
        secondary: "#138808",
        price: 0
    },
    usa: {
        name: "USA",
        flag: "🇺🇸",
        color: "#3c3b6e",
        secondary: "#b22234",
        price: 25
    },
    japan: {
        name: "Japan",
        flag: "🇯🇵",
        color: "#ffffff",
        secondary: "#bc002d",
        price: 40
    },
    uk: {
        name: "United Kingdom",
        flag: "🇬🇧",
        color: "#012169",
        secondary: "#c8102e",
        price: 60
    },
    brazil: {
        name: "Brazil",
        flag: "🇧🇷",
        color: "#009c3b",
        secondary: "#ffdf00",
        price: 80
    },
    golden: {
        name: "Golden King",
        flag: "👑",
        color: "#ffd700",
        secondary: "#fff2a8",
        price: 150
    },
    galaxy: {
        name: "Galaxy",
        flag: "🌌",
        color: "#6a0dad",
        secondary: "#00d4ff",
        price: 250
    }
};

function resizeCanvas() {
    canvasWidth = window.innerWidth;
    canvasHeight = window.innerHeight;

    canvas.width = canvasWidth;
    canvas.height = canvasHeight;

    mouse.x = canvasWidth / 2;
    mouse.y = canvasHeight / 2;

    touch.x = canvasWidth / 2;
    touch.y = canvasHeight / 2;
}

window.addEventListener("resize", resizeCanvas);
resizeCanvas();

function saveData() {
    localStorage.setItem("holeRushCoins", String(coins));
    localStorage.setItem(
        "holeRushSelectedSkin",
        selectedSkin
    );
    localStorage.setItem(
        "holeRushUnlockedSkins",
        JSON.stringify(unlockedSkins)
    );
}

function updateCoinsUI() {
    if (coinsText) {
        coinsText.textContent = coins;
    }
}

function drawUI() {
    if (scoreText) {
        scoreText.textContent = score;
    }

    if (sizeText) {
        sizeText.textContent = Math.floor(hole.radius);
    }

    if (timerText) {
        timerText.textContent = Math.max(0, Math.ceil(timeLeft));
    }

    if (powerText) {
        if (speedBoostTimer > 0) {
            powerText.textContent = "⚡ Speed";
        } else if (shieldTimer > 0) {
            powerText.textContent = "🛡 Shield";
        } else {
            powerText.textContent = "None";
        }
    }

    updateCoinsUI();
}

function random(min, max) {
    return Math.random() * (max - min) + min;
}

function randomInt(min, max) {
    return Math.floor(random(min, max + 1));
}

function distance(a, b) {
    return Math.hypot(a.x - b.x, a.y - b.y);
}

function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
}

function isMobile() {
    return window.innerWidth <= 768;
}

function getMaximumHoleRadius() {
    if (isMobile()) {
        return MOBILE_MAX_HOLE_RADIUS;
    }

    return MAX_HOLE_RADIUS;
}

function createObjects() {
    objects = [];

    for (let i = 0; i < 260; i++) {
        const typeChance = Math.random();

        let type = "object";
        let size = random(8, 25);
        let color = "#4ade80";

        if (typeChance < 0.15) {
            type = "coin";
            size = random(7, 12);
            color = "#ffd700";
        } else if (typeChance < 0.35) {
            type = "box";
            size = random(15, 28);
            color = "#f97316";
        } else if (typeChance < 0.55) {
            type = "car";
            size = random(18, 35);
            color = "#38bdf8";
        } else if (typeChance < 0.7) {
            type = "tree";
            size = random(16, 30);
            color = "#22c55e";
        } else {
            type = "object";
            size = random(8, 20);
            color = "#a78bfa";
        }

        objects.push({
            x: random(100, world.width - 100),
            y: random(100, world.height - 100),
            size,
            type,
            color,
            rotation: random(0, Math.PI * 2)
        });
    }
}

function createEnemies() {
    enemies = [];

    for (let i = 0; i < 4; i++) {
        enemies.push({
            x: random(200, world.width - 200),
            y: random(200, world.height - 200),
            radius: random(35, 65),
            speed: random(1.2, 2.2),
            color: ["#ef4444", "#ec4899", "#f97316", "#8b5cf6"][i],
            direction: random(0, Math.PI * 2)
        });
    }
}

function createPowerUps() {
    powerUps = [];

    for (let i = 0; i < 8; i++) {
        powerUps.push({
            x: random(150, world.width - 150),
            y: random(150, world.height - 150),
            type: Math.random() > 0.5 ? "speed" : "shield",
            size: 18,
            rotation: 0
        });
    }
}

function createParticles(x, y, color) {
    for (let i = 0; i < 12; i++) {
        particles.push({
            x,
            y,
            vx: random(-3, 3),
            vy: random(-3, 3),
            size: random(2, 6),
            life: 1,
            color
        });
    }
}

function createScorePopup(x, y, value) {
    scorePopups.push({
        x,
        y,
        value: String(value),
        life: 1
    });
}

function drawCity() {
    ctx.fillStyle = "#202735";
    ctx.fillRect(0, 0, world.width, world.height);

    const blockSize = 220;

    for (let x = 0; x < world.width; x += blockSize) {
        for (let y = 0; y < world.height; y += blockSize) {
            ctx.fillStyle = "#293241";
            ctx.fillRect(
                x + 12,
                y + 12,
                blockSize - 24,
                blockSize - 24
            );

            ctx.fillStyle = "#323d4f";
            ctx.fillRect(
                x + 25,
                y + 25,
                blockSize - 50,
                blockSize - 50
            );

            ctx.fillStyle = "#202735";
            ctx.fillRect(
                x + blockSize / 2 - 7,
                y + 15,
                14,
                blockSize - 30
            );

            ctx.fillRect(
                x + 15,
                y + blockSize / 2 - 7,
                blockSize - 30,
                14
            );
        }
    }

    ctx.strokeStyle = "#455166";
    ctx.lineWidth = 3;

    for (let x = 0; x <= world.width; x += 220) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, world.height);
        ctx.stroke();
    }

    for (let y = 0; y <= world.height; y += 220) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(world.width, y);
        ctx.stroke();
    }
}

function drawObjects() {
    for (const object of objects) {
        ctx.save();
        ctx.translate(object.x, object.y);
        ctx.rotate(object.rotation);

        ctx.shadowColor = object.color;
        ctx.shadowBlur = 8;

        if (object.type === "coin") {
            ctx.fillStyle = "#ffd700";
            ctx.beginPath();
            ctx.arc(0, 0, object.size, 0, Math.PI * 2);
            ctx.fill();

            ctx.fillStyle = "#fff4a3";
            ctx.beginPath();
            ctx.arc(0, 0, object.size * 0.65, 0, Math.PI * 2);
            ctx.fill();

            ctx.fillStyle = "#a16207";
            ctx.font = `${object.size}px Arial`;
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.fillText("$", 0, 1);
        } else if (object.type === "car") {
            ctx.fillStyle = object.color;
            ctx.fillRect(
                -object.size,
                -object.size * 0.55,
                object.size * 2,
                object.size * 1.1
            );

            ctx.fillStyle = "#dbeafe";
            ctx.fillRect(
                -object.size * 0.55,
                -object.size * 0.35,
                object.size * 1.1,
                object.size * 0.45
            );

            ctx.fillStyle = "#111827";
            ctx.beginPath();
            ctx.arc(
                -object.size * 0.55,
                object.size * 0.55,
                object.size * 0.3,
                0,
                Math.PI * 2
            );
            ctx.arc(
                object.size * 0.55,
                object.size * 0.55,
                object.size * 0.3,
                0,
                Math.PI * 2
            );
            ctx.fill();
        } else if (object.type === "tree") {
            ctx.fillStyle = "#92400e";
            ctx.fillRect(
                -object.size * 0.2,
                0,
                object.size * 0.4,
                object.size
            );

            ctx.fillStyle = object.color;
            ctx.beginPath();
            ctx.arc(
                0,
                -object.size * 0.3,
                object.size * 0.85,
                0,
                Math.PI * 2
            );
            ctx.fill();
        } else {
            ctx.fillStyle = object.color;
            ctx.fillRect(
                -object.size / 2,
                -object.size / 2,
                object.size,
                object.size
            );
        }

        ctx.restore();
    }
}

function drawEnemies() {
    for (const enemy of enemies) {
        ctx.save();
        ctx.translate(enemy.x, enemy.y);

        ctx.shadowColor = enemy.color;
        ctx.shadowBlur = 20;

        ctx.fillStyle = enemy.color;
        ctx.beginPath();
        ctx.arc(0, 0, enemy.radius, 0, Math.PI * 2);
        ctx.fill();

        ctx.shadowBlur = 0;
        ctx.fillStyle = "#050505";
        ctx.beginPath();
        ctx.arc(0, 0, enemy.radius * 0.72, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
    }
}

function drawPowerUps() {
    for (const powerUp of powerUps) {
        ctx.save();
        ctx.translate(powerUp.x, powerUp.y);
        ctx.rotate(powerUp.rotation);

        ctx.shadowColor =
            powerUp.type === "speed" ? "#facc15" : "#38bdf8";

        ctx.shadowBlur = 15;

        ctx.fillStyle =
            powerUp.type === "speed" ? "#facc15" : "#38bdf8";

        ctx.beginPath();
        ctx.arc(0, 0, powerUp.size, 0, Math.PI * 2);
        ctx.fill();

        ctx.shadowBlur = 0;
        ctx.fillStyle = "#111827";
        ctx.font = "bold 20px Arial";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";

        ctx.fillText(
            powerUp.type === "speed" ? "⚡" : "🛡",
            0,
            1
        );

        ctx.restore();

        powerUp.rotation += 0.02;
    }
}

function drawHole() {
    const maximumRadius = getMaximumHoleRadius();

    const visibleRadius = Math.min(
        hole.radius,
        maximumRadius
    );

    ctx.save();
    ctx.translate(hole.x, hole.y);

    ctx.shadowColor = "#000000";
    ctx.shadowBlur = 30;

    const gradient = ctx.createRadialGradient(
        0,
        0,
        visibleRadius * 0.15,
        0,
        0,
        visibleRadius
    );

    gradient.addColorStop(0, "#000000");
    gradient.addColorStop(0.75, "#020617");
    gradient.addColorStop(1, "#111827");

    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(
        0,
        0,
        visibleRadius,
        0,
        Math.PI * 2
    );
    ctx.fill();

    ctx.shadowBlur = 0;

    ctx.strokeStyle = skins[selectedSkin].color;
    ctx.lineWidth = Math.max(3, visibleRadius * 0.035);

    ctx.beginPath();
    ctx.arc(
        0,
        0,
        visibleRadius,
        0,
        Math.PI * 2
    );
    ctx.stroke();

    if (selectedSkin === "india") {
        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = Math.max(1, visibleRadius * 0.015);

        ctx.beginPath();
        ctx.arc(
            0,
            0,
            visibleRadius * 0.65,
            0,
            Math.PI * 2
        );
        ctx.stroke();
    }

    ctx.restore();
}

function drawParticles(deltaTime) {
    for (let i = particles.length - 1; i >= 0; i--) {
        const particle = particles[i];

        particle.x += particle.vx;
        particle.y += particle.vy;
        particle.life -= deltaTime * 2;

        ctx.globalAlpha = Math.max(0, particle.life);
        ctx.fillStyle = particle.color;

        ctx.beginPath();
        ctx.arc(
            particle.x,
            particle.y,
            particle.size,
            0,
            Math.PI * 2
        );
        ctx.fill();

        ctx.globalAlpha = 1;

        if (particle.life <= 0) {
            particles.splice(i, 1);
        }
    }
}

function drawScorePopups(deltaTime) {
    for (let i = scorePopups.length - 1; i >= 0; i--) {
        const popup = scorePopups[i];

        popup.y -= 35 * deltaTime;
        popup.life -= deltaTime;

        ctx.globalAlpha = Math.max(0, popup.life);
        ctx.fillStyle = "#ffffff";
        ctx.font = "bold 18px Arial";
        ctx.textAlign = "center";

        ctx.fillText(
            popup.value,
            popup.x,
            popup.y
        );

        ctx.globalAlpha = 1;

        if (popup.life <= 0) {
            scorePopups.splice(i, 1);
        }
    }
}

function getCameraZoom() {
    if (isMobile()) {
        if (hole.radius >= 110) {
            return 0.72;
        }

        if (hole.radius >= 85) {
            return 0.84;
        }

        return 1;
    }

    if (hole.radius >= 150) {
        return 0.78;
    }

    if (hole.radius >= 110) {
        return 0.88;
    }

    return 1;
}

function moveHole(deltaTime) {
    let directionX = 0;
    let directionY = 0;

    if (keys["ArrowLeft"] || keys["a"] || keys["A"]) {
        directionX -= 1;
    }

    if (keys["ArrowRight"] || keys["d"] || keys["D"]) {
        directionX += 1;
    }

    if (keys["ArrowUp"] || keys["w"] || keys["W"]) {
        directionY -= 1;
    }

    if (keys["ArrowDown"] || keys["s"] || keys["S"]) {
        directionY += 1;
    }

    if (mouse.active) {
        const dx = mouse.x - canvasWidth / 2;
        const dy = mouse.y - canvasHeight / 2;

        if (Math.abs(dx) > 15 || Math.abs(dy) > 15) {
            directionX = dx;
            directionY = dy;
        }
    }

    if (touch.active) {
        const dx = touch.x - canvasWidth / 2;
        const dy = touch.y - canvasHeight / 2;

        if (Math.abs(dx) > 15 || Math.abs(dy) > 15) {
            directionX = dx;
            directionY = dy;
        }
    }

    const magnitude = Math.hypot(directionX, directionY);

    if (magnitude > 0) {
        directionX /= magnitude;
        directionY /= magnitude;
    }

    let currentSpeed = hole.speed;

    if (speedBoostTimer > 0) {
        currentSpeed *= 1.8;
    }

    hole.x += directionX * currentSpeed * deltaTime * 60;
    hole.y += directionY * currentSpeed * deltaTime * 60;

    hole.x = clamp(
        hole.x,
        hole.radius,
        world.width - hole.radius
    );

    hole.y = clamp(
        hole.y,
        hole.radius,
        world.height - hole.radius
    );
}

function eatObjects() {
    for (let i = objects.length - 1; i >= 0; i--) {
        const object = objects[i];

        const canEat =
            distance(hole, object) <
            hole.radius + object.size * 0.6 &&
            hole.radius > object.size * 0.65;

        if (!canEat) {
            continue;
        }

        const gainedScore = Math.max(
            1,
            Math.floor(object.size)
        );

        score += gainedScore;

        /*
         * Slower growth:
         * Previous growth was too aggressive on mobile.
         */
        hole.radius += object.size * 0.012;

        /*
         * Hard maximum size.
         * This prevents the hole from taking over the screen.
         */
        hole.radius = Math.min(
            hole.radius,
            getMaximumHoleRadius()
        );

        if (object.type === "coin") {
            coins += 5;
            createScorePopup(
                object.x,
                object.y,
                "+5 COINS"
            );
        } else {
            createScorePopup(
                object.x,
                object.y,
                `+${gainedScore}`
            );
        }

        createParticles(
            object.x,
            object.y,
            object.color
        );

        objects.splice(i, 1);
    }

    saveData();
}

function updateEnemies(deltaTime) {
    for (const enemy of enemies) {
        const dx = hole.x - enemy.x;
        const dy = hole.y - enemy.y;
        const distanceToHole = Math.hypot(dx, dy);

        if (distanceToHole < 650) {
            enemy.direction = Math.atan2(dy, dx);
        } else {
            enemy.direction += random(-0.03, 0.03);
        }

        enemy.x +=
            Math.cos(enemy.direction) *
            enemy.speed *
            deltaTime *
            60;

        enemy.y +=
            Math.sin(enemy.direction) *
            enemy.speed *
            deltaTime *
            60;

        enemy.x = clamp(
            enemy.x,
            enemy.radius,
            world.width - enemy.radius
        );

        enemy.y = clamp(
            enemy.y,
            enemy.radius,
            world.height - enemy.radius
        );

        if (
            distance(hole, enemy) <
            hole.radius + enemy.radius
        ) {
            if (
                hole.radius > enemy.radius * 1.35
            ) {
                score += Math.floor(enemy.radius);
                hole.radius += enemy.radius * 0.008;

                hole.radius = Math.min(
                    hole.radius,
                    getMaximumHoleRadius()
                );

                createParticles(
                    enemy.x,
                    enemy.y,
                    enemy.color
                );

                createScorePopup(
                    enemy.x,
                    enemy.y,
                    `+${Math.floor(enemy.radius)}`
                );

                enemy.x = random(200, world.width - 200);
                enemy.y = random(200, world.height - 200);
            } else if (shieldTimer <= 0) {
                gameOver = true;
                gameRunning = false;
            }
        }
    }
}

function collectPowerUps() {
    for (let i = powerUps.length - 1; i >= 0; i--) {
        const powerUp = powerUps[i];

        if (
            distance(hole, powerUp) <
            hole.radius + powerUp.size
        ) {
            if (powerUp.type === "speed") {
                speedBoostTimer = 8;
            } else {
                shieldTimer = 8;
            }

            createScorePopup(
                powerUp.x,
                powerUp.y,
                powerUp.type === "speed"
                    ? "SPEED BOOST"
                    : "SHIELD"
            );

            createParticles(
                powerUp.x,
                powerUp.y,
                powerUp.type === "speed"
                    ? "#facc15"
                    : "#38bdf8"
            );

            powerUps.splice(i, 1);
        }
    }
}

function updatePowerUps(deltaTime) {
    if (speedBoostTimer > 0) {
        speedBoostTimer -= deltaTime;
    }

    if (shieldTimer > 0) {
        shieldTimer -= deltaTime;
    }

    if (speedBoostTimer < 0) {
        speedBoostTimer = 0;
    }

    if (shieldTimer < 0) {
        shieldTimer = 0;
    }
}

function updateTimer(deltaTime) {
    timerAccumulator += deltaTime;

    if (timerAccumulator >= 1) {
        timeLeft -= Math.floor(timerAccumulator);
        timerAccumulator = 0;
    }

    if (timeLeft <= 0) {
        timeLeft = 0;
        gameRunning = false;
        gameOver = true;
    }
}

function drawGameOver() {
    ctx.save();

    ctx.setTransform(1, 0, 0, 1, 0, 0);

    ctx.fillStyle = "rgba(0, 0, 0, 0.75)";
    ctx.fillRect(
        0,
        0,
        canvasWidth,
        canvasHeight
    );

    ctx.fillStyle = "#ffffff";
    ctx.textAlign = "center";

    ctx.font = "bold 42px Arial";
    ctx.fillText(
        "GAME OVER",
        canvasWidth / 2,
        canvasHeight / 2 - 50
    );

    ctx.font = "bold 24px Arial";
    ctx.fillText(
        `Score: ${score}`,
        canvasWidth / 2,
        canvasHeight / 2
    );

    ctx.font = "18px Arial";
    ctx.fillText(
        "Press Restart to play again",
        canvasWidth / 2,
        canvasHeight / 2 + 45
    );

    ctx.restore();
}

function drawPaused() {
    ctx.save();

    ctx.setTransform(1, 0, 0, 1, 0, 0);

    ctx.fillStyle = "rgba(0, 0, 0, 0.6)";
    ctx.fillRect(
        0,
        0,
        canvasWidth,
        canvasHeight
    );

    ctx.fillStyle = "#ffffff";
    ctx.textAlign = "center";
    ctx.font = "bold 40px Arial";

    ctx.fillText(
        "PAUSED",
        canvasWidth / 2,
        canvasHeight / 2
    );

    ctx.restore();
}

function render(deltaTime) {
    ctx.clearRect(
        0,
        0,
        canvasWidth,
        canvasHeight
    );

    const zoom = getCameraZoom();

    ctx.save();

    ctx.translate(
        canvasWidth / 2,
        canvasHeight / 2
    );

    ctx.scale(zoom, zoom);

    ctx.translate(
        -hole.x,
        -hole.y
    );

    drawCity();
    drawObjects();
    drawPowerUps();
    drawEnemies();
    drawHole();
    drawParticles(deltaTime);
    drawScorePopups(deltaTime);

    ctx.restore();

    if (gamePaused && gameRunning) {
        drawPaused();
    }

    if (gameOver) {
        drawGameOver();
    }
}

function update(deltaTime) {
    if (!gameRunning || gamePaused || gameOver) {
        return;
    }

    moveHole(deltaTime);
    eatObjects();
    updateEnemies(deltaTime);
    collectPowerUps();
    updatePowerUps(deltaTime);
    updateTimer(deltaTime);
    drawUI();
}

function gameLoop(timestamp) {
    const deltaTime = Math.min(
        (timestamp - lastTime) / 1000,
        0.05
    );

    lastTime = timestamp;

    update(deltaTime);
    render(deltaTime);

    requestAnimationFrame(gameLoop);
}

function resetGame() {
    score = 0;
    timeLeft = 80;
    timerAccumulator = 0;

    gamePaused = false;
    gameOver = false;
    gameRunning = true;

    activePower = "";
    speedBoostTimer = 0;
    shieldTimer = 0;

    hole.x = world.width / 2;
    hole.y = world.height / 2;
    hole.radius = STARTING_HOLE_RADIUS;

    particles = [];
    scorePopups = [];

    createObjects();
    createEnemies();
    createPowerUps();

    if (startScreen) {
        startScreen.style.display = "none";
    }

    if (gameUI) {
        gameUI.style.display = "flex";
    }

    if (pauseBtn) {
        pauseBtn.textContent = "Pause";
    }

    drawUI();
}

function startGame(mode) {
    gameMode = mode || "normal";

    if (modeLabel) {
        modeLabel.textContent =
            gameMode === "multiplayer"
                ? "Multiplayer"
                : "Normal Mode";
    }

    resetGame();
}

function togglePause() {
    if (!gameRunning || gameOver) {
        return;
    }

    gamePaused = !gamePaused;

    if (pauseBtn) {
        pauseBtn.textContent =
            gamePaused ? "Resume" : "Pause";
    }
}

function restartGame() {
    resetGame();
}

if (normalModeBtn) {
    normalModeBtn.addEventListener("click", () => {
        startGame("normal");
    });
}

if (multiplayerBtn) {
    multiplayerBtn.addEventListener("click", () => {
        startGame("multiplayer");
    });
}

if (restartBtn) {
    restartBtn.addEventListener("click", restartGame);
}

if (pauseBtn) {
    pauseBtn.addEventListener("click", togglePause);
}

window.addEventListener("keydown", event => {
    keys[event.key] = true;

    if (event.key === "Escape") {
        togglePause();
    }
});

window.addEventListener("keyup", event => {
    keys[event.key] = false;
});

canvas.addEventListener("mousemove", event => {
    mouse.x = event.clientX;
    mouse.y = event.clientY;
    mouse.active = true;
});

canvas.addEventListener("mouseleave", () => {
    mouse.active = false;
});

canvas.addEventListener("touchstart", event => {
    event.preventDefault();

    const firstTouch = event.touches[0];

    if (!firstTouch) {
        return;
    }

    touch.x = firstTouch.clientX;
    touch.y = firstTouch.clientY;
    touch.active = true;
}, {
    passive: false
});

canvas.addEventListener("touchmove", event => {
    event.preventDefault();

    const firstTouch = event.touches[0];

    if (!firstTouch) {
        return;
    }

    touch.x = firstTouch.clientX;
    touch.y = firstTouch.clientY;
    touch.active = true;
}, {
    passive: false
});

canvas.addEventListener("touchend", event => {
    event.preventDefault();
    touch.active = false;
}, {
    passive: false
});

canvas.addEventListener("touchcancel", event => {
    event.preventDefault();
    touch.active = false;
}, {
    passive: false
});

window.addEventListener("blur", () => {
    if (gameRunning && !gameOver) {
        gamePaused = true;

        if (pauseBtn) {
            pauseBtn.textContent = "Resume";
        }
    }
});

updateCoinsUI();
drawUI();

requestAnimationFrame(gameLoop);
