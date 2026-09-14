
const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const socket = io();

const startScreen = document.getElementById("startScreen");
const gameUI = document.getElementById("gameUI");
const gameOverScreen = document.getElementById("gameOverScreen");
const pauseScreen = document.getElementById("pauseScreen");

const normalModeBtn = document.getElementById("normalModeBtn");
const multiplayerBtn = document.getElementById("multiplayerBtn");
const restartBtn = document.getElementById("restartBtn");
const pauseBtn = document.getElementById("pauseBtn");
const resumeBtn = document.getElementById("resumeBtn");
const playAgainBtn = document.getElementById("playAgainBtn");

const playerNameInput = document.getElementById("playerNameInput");

const scoreText = document.getElementById("score");
const sizeText = document.getElementById("size");
const timerText = document.getElementById("timer");
const powerText = document.getElementById("power");
const playerCountText = document.getElementById("playerCount");
const modeLabel = document.getElementById("modeLabel");
const finalScoreText = document.getElementById("finalScore");

let canvasWidth = window.innerWidth;
let canvasHeight = window.innerHeight;

const world = {
    width: 3000,
    height: 3000
};

let gameStarted = false;
let gamePaused = false;
let gameOver = false;
let gameMode = "normal";

let score = 0;
let timeLeft = 120;
let timerAccumulator = 0;

let mouseX = canvasWidth / 2;
let mouseY = canvasHeight / 2;

const keys = {};

let currentPlayer = null;
const otherPlayers = {};

const objects = [];
const particles = [];
const scorePopups = [];
const powerUps = [];

const leaderboard = [];

const hole = {
    x: 1500,
    y: 1500,
    radius: 35,
    speed: 5,
    color: "#101018",
    boostTimer: 0,
    shieldTimer: 0
};

function resizeCanvas() {
    canvasWidth = window.innerWidth;
    canvasHeight = window.innerHeight;

    canvas.width = canvasWidth;
    canvas.height = canvasHeight;
}

window.addEventListener("resize", resizeCanvas);
resizeCanvas();

function random(min, max) {
    return Math.random() * (max - min) + min;
}

function randomInt(min, max) {
    return Math.floor(random(min, max + 1));
}

function distance(a, b) {
    return Math.hypot(a.x - b.x, a.y - b.y);
}

function createObjects() {
    objects.length = 0;

    for (let i = 0; i < 220; i++) {
        const roll = Math.random();

        let type = "box";
        let size = randomInt(12, 28);
        let color = "#4d96ff";

        if (roll < 0.25) {
            type = "tree";
            size = randomInt(18, 30);
            color = "#38b000";
        } else if (roll < 0.5) {
            type = "car";
            size = randomInt(15, 26);
            color = "#ff4d6d";
        } else if (roll < 0.7) {
            type = "rock";
            size = randomInt(12, 24);
            color = "#aab4c8";
        } else if (roll < 0.85) {
            type = "coin";
            size = randomInt(8, 14);
            color = "#ffd166";
        }

        objects.push({
            x: random(80, world.width - 80),
            y: random(80, world.height - 80),
            size,
            type,
            color,
            rotation: random(0, Math.PI * 2)
        });
    }
}

function createPowerUps() {
    powerUps.length = 0;

    for (let i = 0; i < 8; i++) {
        powerUps.push({
            x: random(100, world.width - 100),
            y: random(100, world.height - 100),
            type: Math.random() > 0.5 ? "boost" : "shield",
            size: 18
        });
    }
}

function createParticles(x, y, color) {
    for (let i = 0; i < 8; i++) {
        particles.push({
            x,
            y,
            vx: random(-2, 2),
            vy: random(-2, 2),
            life: 1,
            color
        });
    }
}

function createScorePopup(x, y, amount) {
    scorePopups.push({
        x,
        y,
        amount,
        life: 1
    });
}

function drawCity() {
    ctx.fillStyle = "#202735";
    ctx.fillRect(0, 0, world.width, world.height);

    const roadSize = 150;

    ctx.fillStyle = "#343d4d";

    for (let x = 0; x < world.width; x += 500) {
        ctx.fillRect(x, 0, roadSize, world.height);
    }

    for (let y = 0; y < world.height; y += 500) {
        ctx.fillRect(0, y, world.width, roadSize);
    }

    for (let x = 0; x < world.width; x += 500) {
        for (let y = 0; y < world.height; y += 500) {
            ctx.fillStyle = "#18202d";
            ctx.fillRect(x + 180, y + 30, 270, 400);

            ctx.fillStyle = "#293448";
            ctx.fillRect(x + 210, y + 65, 210, 330);

            ctx.fillStyle = "#e6b85c";

            for (let wx = x + 230; wx < x + 400; wx += 45) {
                for (let wy = y + 90; wy < y + 360; wy += 55) {
                    ctx.fillRect(wx, wy, 12, 18);
                }
            }
        }
    }
}

function drawObjects() {
    for (const object of objects) {
        ctx.save();

        ctx.translate(object.x, object.y);
        ctx.rotate(object.rotation);

        ctx.shadowColor = "rgba(0,0,0,0.25)";
        ctx.shadowBlur = 8;
        ctx.shadowOffsetY = 5;

        ctx.fillStyle = object.color;

        if (object.type === "tree") {
            ctx.beginPath();
            ctx.arc(
                0,
                -object.size * 0.3,
                object.size * 0.65,
                0,
                Math.PI * 2
            );
            ctx.fill();

            ctx.fillStyle = "#795548";

            ctx.fillRect(
                -object.size * 0.18,
                object.size * 0.1,
                object.size * 0.36,
                object.size
            );
        } else if (object.type === "car") {
            ctx.fillRect(
                -object.size,
                -object.size * 0.55,
                object.size * 2,
                object.size * 1.1
            );

            ctx.fillStyle = "#dce8ff";

            ctx.fillRect(
                -object.size * 0.55,
                -object.size * 0.35,
                object.size * 0.65,
                object.size * 0.35
            );
        } else if (object.type === "coin") {
            ctx.beginPath();
            ctx.arc(0, 0, object.size, 0, Math.PI * 2);
            ctx.fill();

            ctx.fillStyle = "#fff2a8";

            ctx.beginPath();
            ctx.arc(0, 0, object.size * 0.45, 0, Math.PI * 2);
            ctx.fill();
        } else {
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

function drawPowerUps() {
    for (const powerUp of powerUps) {
        ctx.save();

        ctx.translate(powerUp.x, powerUp.y);

        ctx.beginPath();
        ctx.arc(0, 0, powerUp.size, 0, Math.PI * 2);

        ctx.fillStyle =
            powerUp.type === "boost"
                ? "#ff9f1c"
                : "#06d6a0";

        ctx.shadowColor = ctx.fillStyle;
        ctx.shadowBlur = 20;
        ctx.fill();

        ctx.fillStyle = "#ffffff";
        ctx.font = "bold 16px Arial";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";

        ctx.fillText(
            powerUp.type === "boost" ? "⚡" : "✚",
            0,
            0
        );

        ctx.restore();
    }
}

function drawHole(player, isCurrentPlayer = false) {
    ctx.save();

    ctx.translate(player.x, player.y);

    ctx.beginPath();
    ctx.arc(0, 0, player.radius, 0, Math.PI * 2);

    ctx.fillStyle = isCurrentPlayer
        ? "#080812"
        : player.color || "#111111";

    ctx.shadowColor = isCurrentPlayer
        ? "#000000"
        : player.color || "#ffffff";

    ctx.shadowBlur = isCurrentPlayer ? 25 : 15;
    ctx.fill();

    ctx.beginPath();
    ctx.arc(0, 0, player.radius * 0.72, 0, Math.PI * 2);

    ctx.fillStyle = "#000000";
    ctx.fill();

    if (!isCurrentPlayer) {
        ctx.fillStyle = "#ffffff";
        ctx.font = "bold 14px Arial";
        ctx.textAlign = "center";

        ctx.fillText(
            `${player.name || "Player"} (${Math.floor(player.radius)})`,
            0,
            -player.radius - 12
        );
    }

    if (isCurrentPlayer && hole.shieldTimer > 0) {
        ctx.beginPath();
        ctx.arc(
            0,
            0,
            player.radius + 9,
            0,
            Math.PI * 2
        );

        ctx.strokeStyle = "#06d6a0";
        ctx.lineWidth = 4;
        ctx.stroke();
    }

    ctx.restore();
}

function moveHole() {
    let dx = 0;
    let dy = 0;

    if (keys["ArrowUp"] || keys["w"] || keys["W"]) {
        dy -= 1;
    }

    if (keys["ArrowDown"] || keys["s"] || keys["S"]) {
        dy += 1;
    }

    if (keys["ArrowLeft"] || keys["a"] || keys["A"]) {
        dx -= 1;
    }

    if (keys["ArrowRight"] || keys["d"] || keys["D"]) {
        dx += 1;
    }

    if (dx === 0 && dy === 0) {
        const centerX = canvasWidth / 2;
        const centerY = canvasHeight / 2;

        dx = mouseX - centerX;
        dy = mouseY - centerY;

        const length = Math.hypot(dx, dy);

        if (length > 25) {
            dx /= length;
            dy /= length;
        } else {
            dx = 0;
            dy = 0;
        }
    } else {
        const length = Math.hypot(dx, dy);

        if (length > 0) {
            dx /= length;
            dy /= length;
        }
    }

    const currentSpeed =
        hole.speed + (hole.boostTimer > 0 ? 3 : 0);

    hole.x += dx * currentSpeed;
    hole.y += dy * currentSpeed;

    hole.x = Math.max(
        hole.radius,
        Math.min(world.width - hole.radius, hole.x)
    );

    hole.y = Math.max(
        hole.radius,
        Math.min(world.height - hole.radius, hole.y)
    );
}

function eatObjects() {
    for (let i = objects.length - 1; i >= 0; i--) {
        const object = objects[i];

        if (
            distance(hole, object) <
            hole.radius + object.size * 0.6 &&
            hole.radius > object.size * 0.65
        ) {
            const gainedScore = Math.max(
                1,
                Math.floor(object.size)
            );

            score += gainedScore;
            hole.radius += object.size * 0.045;

            createParticles(
                object.x,
                object.y,
                object.color
            );

            createScorePopup(
                object.x,
                object.y,
                gainedScore
            );

            objects.splice(i, 1);
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
            if (powerUp.type === "boost") {
                hole.boostTimer = 8;
            } else {
                hole.shieldTimer = 8;
            }

            powerUps.splice(i, 1);
        }
    }
}

function updateParticles(deltaTime) {
    for (let i = particles.length - 1; i >= 0; i--) {
        const particle = particles[i];

        particle.x += particle.vx;
        particle.y += particle.vy;
        particle.life -= deltaTime * 2;

        if (particle.life <= 0) {
            particles.splice(i, 1);
        }
    }
}

function drawParticles() {
    for (const particle of particles) {
        ctx.globalAlpha = particle.life;
        ctx.fillStyle = particle.color;

        ctx.beginPath();
        ctx.arc(particle.x, particle.y, 4, 0, Math.PI * 2);
        ctx.fill();
    }

    ctx.globalAlpha = 1;
}

function updateScorePopups(deltaTime) {
    for (let i = scorePopups.length - 1; i >= 0; i--) {
        const popup = scorePopups[i];

        popup.y -= 0.5;
        popup.life -= deltaTime;

        if (popup.life <= 0) {
            scorePopups.splice(i, 1);
        }
    }
}

function drawScorePopups() {
    for (const popup of scorePopups) {
        ctx.globalAlpha = popup.life;
        ctx.fillStyle = "#ffffff";
        ctx.font = "bold 16px Arial";
        ctx.textAlign = "center";

        ctx.fillText(
            `+${popup.amount}`,
            popup.x,
            popup.y
        );
    }

    ctx.globalAlpha = 1;
}

function updatePowerTimers(deltaTime) {
    hole.boostTimer = Math.max(
        0,
        hole.boostTimer - deltaTime
    );

    hole.shieldTimer = Math.max(
        0,
        hole.shieldTimer - deltaTime
    );
}

function updateTimer(deltaTime) {
    timerAccumulator += deltaTime;

    if (timerAccumulator >= 1) {
        timeLeft--;
        timerAccumulator = 0;
    }

    if (timeLeft <= 0) {
        endGame();
    }
}

function updateHUD() {
    scoreText.textContent = score;
    sizeText.textContent = Math.floor(hole.radius);
    timerText.textContent = Math.max(0, timeLeft);

    if (hole.boostTimer > 0) {
        powerText.textContent = "Speed Boost";
    } else if (hole.shieldTimer > 0) {
        powerText.textContent = "Shield";
    } else {
        powerText.textContent = "None";
    }

    playerCountText.textContent =
        Object.keys(otherPlayers).length + 1;
}

function getCamera() {
    return {
        x: hole.x - canvasWidth / 2,
        y: hole.y - canvasHeight / 2
    };
}

function drawLeaderboard() {
    const x = canvasWidth - 220;
    const y = 150;

    ctx.save();

    ctx.fillStyle = "rgba(10, 15, 25, 0.82)";
    ctx.fillRect(x, y, 200, 38 + leaderboard.length * 25);

    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 16px Arial";
    ctx.textAlign = "left";
    ctx.fillText("LEADERBOARD", x + 12, y + 25);

    leaderboard.forEach((player, index) => {
        ctx.fillStyle =
            player.id === socket.id
                ? "#ffd166"
                : "#dce8ff";

        ctx.font = "13px Arial";

        ctx.fillText(
            `${index + 1}. ${player.name}`,
            x + 12,
            y + 52 + index * 25
        );

        ctx.textAlign = "right";

        ctx.fillText(
            player.score,
            x + 185,
            y + 52 + index * 25
        );

        ctx.textAlign = "left";
    });

    ctx.restore();
}

function drawGame() {
    const camera = getCamera();

    ctx.clearRect(
        0,
        0,
        canvasWidth,
        canvasHeight
    );

    ctx.save();
    ctx.translate(-camera.x, -camera.y);

    drawCity();
    drawObjects();
    drawPowerUps();

    for (const player of Object.values(otherPlayers)) {
        drawHole(player, false);
    }

    drawHole(hole, true);

    drawParticles();
    drawScorePopups();

    ctx.restore();

    if (gameMode === "multiplayer") {
        drawLeaderboard();
    }
}

function sendMovement() {
    if (!currentPlayer || !gameStarted) {
        return;
    }

    socket.emit("playerMovement", {
        x: hole.x,
        y: hole.y,
        radius: hole.radius,
        score
    });
}

function startGame(mode) {
    gameMode = mode;
    gameStarted = true;
    gamePaused = false;
    gameOver = false;

    score = 0;
    timeLeft = 120;
    timerAccumulator = 0;

    hole.x = 1500;
    hole.y = 1500;
    hole.radius = 35;
    hole.boostTimer = 0;
    hole.shieldTimer = 0;

    createObjects();
    createPowerUps();

    startScreen.style.display = "none";
    gameOverScreen.style.display = "none";
    pauseScreen.style.display = "none";
    gameUI.style.display = "block";

    modeLabel.textContent =
        mode === "multiplayer"
            ? "Competitive Multiplayer"
            : "Normal Mode";

    const name = playerNameInput.value.trim();

    if (name) {
        socket.emit("playerNameChange", name);
    }

    updateHUD();
}

function endGame() {
    gameOver = true;
    gameStarted = false;

    finalScoreText.textContent = score;
    gameOverScreen.style.display = "flex";
}

function togglePause() {
    if (!gameStarted || gameOver) {
        return;
    }

    gamePaused = !gamePaused;

    pauseScreen.style.display = gamePaused
        ? "flex"
        : "none";

    pauseBtn.textContent = gamePaused
        ? "Resume"
        : "Pause";
}

normalModeBtn.addEventListener("click", () => {
    startGame("normal");
});

multiplayerBtn.addEventListener("click", () => {
    startGame("multiplayer");
});

restartBtn.addEventListener("click", () => {
    startGame(gameMode);
});

playAgainBtn.addEventListener("click", () => {
    startGame(gameMode);
});

pauseBtn.addEventListener("click", togglePause);
resumeBtn.addEventListener("click", togglePause);

window.addEventListener("keydown", (event) => {
    keys[event.key] = true;

    if (event.key === "Escape") {
        togglePause();
    }
});

window.addEventListener("keyup", (event) => {
    keys[event.key] = false;
});

canvas.addEventListener("mousemove", (event) => {
    mouseX = event.clientX;
    mouseY = event.clientY;
});

canvas.addEventListener(
    "touchmove",
    (event) => {
        if (event.touches.length > 0) {
            mouseX = event.touches[0].clientX;
            mouseY = event.touches[0].clientY;
        }
    },
    { passive: true }
);

document.querySelectorAll(".mobile-button").forEach((button) => {
    const key = button.dataset.key;

    button.addEventListener("touchstart", (event) => {
        event.preventDefault();
        keys[key] = true;
    });

    button.addEventListener("touchend", (event) => {
        event.preventDefault();
        keys[key] = false;
    });
});

socket.on("currentPlayer", (player) => {
    currentPlayer = player;

    hole.x = player.x;
    hole.y = player.y;
    hole.radius = player.radius;
});

socket.on("allPlayers", (players) => {
    for (const id in players) {
        if (id !== socket.id) {
            otherPlayers[id] = players[id];
        }
    }

    updateHUD();
});

socket.on("playerJoined", (player) => {
    if (player.id !== socket.id) {
        otherPlayers[player.id] = player;
    }

    updateHUD();
});

socket.on("playerMoved", (player) => {
    if (player.id === socket.id) {
        return;
    }

    if (!otherPlayers[player.id]) {
        otherPlayers[player.id] = {};
    }

    Object.assign(
        otherPlayers[player.id],
        player
    );
});

socket.on("playerRespawned", (player) => {
    if (player.id === socket.id) {
        hole.x = player.x;
        hole.y = player.y;
        hole.radius = player.radius;
        score = player.score;

        createScorePopup(
            hole.x,
            hole.y,
            0
        );
    } else {
        otherPlayers[player.id] = {
            ...otherPlayers[player.id],
            ...player
        };
    }

    updateHUD();
});

socket.on("playerEaten", (data) => {
    alert(
        `You were eaten by ${data.eatenBy}! You respawned.`
    );
});

socket.on("playerAtePlayer", (data) => {
    createScorePopup(
        hole.x,
        hole.y - hole.radius - 20,
        Math.floor(data.gainedRadius)
    );
});

socket.on("playerNameChanged", (data) => {
    if (data.id === socket.id) {
        if (currentPlayer) {
            currentPlayer.name = data.name;
        }
    } else if (otherPlayers[data.id]) {
        otherPlayers[data.id].name = data.name;
    }
});

socket.on("leaderboardUpdate", (data) => {
    leaderboard.length = 0;
    leaderboard.push(...data);
});

socket.on("playerLeft", (id) => {
    delete otherPlayers[id];
    updateHUD();
});

let lastTime = performance.now();

function gameLoop(currentTime) {
    const deltaTime = Math.min(
        (currentTime - lastTime) / 1000,
        0.05
    );

    lastTime = currentTime;

    if (
        gameStarted &&
        !gamePaused &&
        !gameOver
    ) {
        moveHole();
        eatObjects();
        collectPowerUps();
        updatePowerTimers(deltaTime);
        updateTimer(deltaTime);
        updateParticles(deltaTime);
        updateScorePopups(deltaTime);
        updateHUD();
        sendMovement();
    }

    drawGame();

    requestAnimationFrame(gameLoop);
}

gameUI.style.display = "none";

createObjects();
createPowerUps();
updateHUD();

requestAnimationFrame(gameLoop);