
const express = require("express");
const http = require("http");
const path = require("path");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = 3000;

const WORLD_WIDTH = 3000;
const WORLD_HEIGHT = 3000;

const players = {};

const colors = [
    "#ff4d6d",
    "#4d96ff",
    "#ffd166",
    "#06d6a0",
    "#c77dff",
    "#ff9f1c",
    "#00bbf9",
    "#f72585"
];

app.use(express.static(path.join(__dirname, "public")));

function randomPosition() {
    return {
        x: Math.random() * 2400 + 300,
        y: Math.random() * 2400 + 300
    };
}

function createPlayer(socketId) {
    const position = randomPosition();

    return {
        id: socketId,
        name: `Player ${Object.keys(players).length + 1}`,
        x: position.x,
        y: position.y,
        radius: 35,
        score: 0,
        color: colors[Math.floor(Math.random() * colors.length)]
    };
}

function respawnPlayer(player) {
    const position = randomPosition();

    player.x = position.x;
    player.y = position.y;
    player.radius = 35;
    player.score = 0;
}

function sendLeaderboard() {
    const leaderboard = Object.values(players)
        .sort((a, b) => b.score - a.score)
        .slice(0, 10)
        .map((player) => ({
            id: player.id,
            name: player.name,
            score: player.score,
            radius: player.radius,
            color: player.color
        }));

    io.emit("leaderboardUpdate", leaderboard);
}

function checkPlayerCollisions() {
    const playerList = Object.values(players);

    for (let i = 0; i < playerList.length; i++) {
        for (let j = i + 1; j < playerList.length; j++) {
            const playerA = playerList[i];
            const playerB = playerList[j];

            if (!players[playerA.id] || !players[playerB.id]) {
                continue;
            }

            const dx = playerA.x - playerB.x;
            const dy = playerA.y - playerB.y;
            const distance = Math.hypot(dx, dy);

            const touchingDistance =
                playerA.radius + playerB.radius;

            if (distance > touchingDistance * 0.75) {
                continue;
            }

            const sizeDifference =
                Math.abs(playerA.radius - playerB.radius);

            if (sizeDifference < 10) {
                continue;
            }

            let winner;
            let loser;

            if (playerA.radius > playerB.radius) {
                winner = playerA;
                loser = playerB;
            } else {
                winner = playerB;
                loser = playerA;
            }

            const gainedRadius = loser.radius * 0.25;

            winner.radius += gainedRadius;
            winner.score += Math.floor(loser.radius * 2);

            io.to(loser.id).emit("playerEaten", {
                eatenBy: winner.name,
                winnerId: winner.id
            });

            io.to(winner.id).emit("playerAtePlayer", {
                eatenPlayer: loser.name,
                gainedRadius
            });

            respawnPlayer(loser);

            io.emit("playerRespawned", {
                id: loser.id,
                x: loser.x,
                y: loser.y,
                radius: loser.radius,
                score: loser.score
            });

            io.emit("playerMoved", {
                id: winner.id,
                x: winner.x,
                y: winner.y,
                radius: winner.radius,
                score: winner.score
            });
        }
    }

    sendLeaderboard();
}

io.on("connection", (socket) => {
    console.log(`Player connected: ${socket.id}`);

    players[socket.id] = createPlayer(socket.id);

    socket.emit("currentPlayer", players[socket.id]);
    socket.emit("allPlayers", players);

    socket.broadcast.emit("playerJoined", players[socket.id]);

    sendLeaderboard();

    socket.on("playerMovement", (data) => {
        const player = players[socket.id];

        if (!player) {
            return;
        }

        const newX = Number(data.x);
        const newY = Number(data.y);
        const newRadius = Number(data.radius);
        const newScore = Number(data.score);

        if (Number.isFinite(newX)) {
            player.x = Math.max(
                player.radius,
                Math.min(WORLD_WIDTH - player.radius, newX)
            );
        }

        if (Number.isFinite(newY)) {
            player.y = Math.max(
                player.radius,
                Math.min(WORLD_HEIGHT - player.radius, newY)
            );
        }

        if (Number.isFinite(newRadius)) {
            player.radius = Math.max(20, Math.min(500, newRadius));
        }

        if (Number.isFinite(newScore)) {
            player.score = Math.max(0, newScore);
        }

        socket.broadcast.emit("playerMoved", {
            id: socket.id,
            x: player.x,
            y: player.y,
            radius: player.radius,
            score: player.score
        });
    });

    socket.on("playerNameChange", (name) => {
        const player = players[socket.id];

        if (!player) {
            return;
        }

        const cleanName = String(name)
            .trim()
            .slice(0, 16);

        if (cleanName.length > 0) {
            player.name = cleanName;

            io.emit("playerNameChanged", {
                id: socket.id,
                name: cleanName
            });

            sendLeaderboard();
        }
    });

    socket.on("disconnect", () => {
        console.log(`Player disconnected: ${socket.id}`);

        delete players[socket.id];

        io.emit("playerLeft", socket.id);

        sendLeaderboard();
    });
});

setInterval(() => {
    checkPlayerCollisions();
}, 150);

server.listen(PORT, () => {
    console.log(
        `Hole Rush server running at http://localhost:${PORT}`
    );
});