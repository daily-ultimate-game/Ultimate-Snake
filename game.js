const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
let gridSize = 25;
let tileCount = 40; // 1000 / 25

let snake = [{x: 10, y: 10}];
let snakeDir = {x: 1, y: 0};
let snakeLen = 5;
let food = {x: 15, y: 15};
let score = 0;
let speed = 200; // was 100, now doubled for half speed
let doubleActive = false;
let doubleTimeout = null;

let aiSnake = [{x: 30, y: 30}];
let aiDir = {x: 0, y: 1};
let aiLen = 5;
let aiRespawnTimeout = null;
let aiActive = true;

let walls = []; // Store permanent wall positions

function randomFood() {
    let pos;
    do {
        pos = {
            x: Math.floor(Math.random() * tileCount),
            y: Math.floor(Math.random() * tileCount)
        };
    } while (
        snake.some(s => s.x === pos.x && s.y === pos.y) ||
        aiSnake.some(s => s.x === pos.x && s.y === pos.y) ||
        walls.some(w => w.x === pos.x && w.y === pos.y)
    );
    return pos;
}

function drawCell(x, y, color, border = "#222") {
    ctx.fillStyle = color;
    ctx.fillRect(x * gridSize, y * gridSize, gridSize, gridSize);
    ctx.strokeStyle = border;
    ctx.strokeRect(x * gridSize, y * gridSize, gridSize, gridSize);
}

function drawSnake(snakeArr, color) {
    for (let i = 0; i < snakeArr.length; i++) {
        drawCell(snakeArr[i].x, snakeArr[i].y, color, "#fff");
    }
}

function drawWalls() {
    for (let wall of walls) {
        drawCell(wall.x, wall.y, "#444", "#888");
    }
}

function drawFood() {
    drawCell(food.x, food.y, "#ff0", "#f80");
}

function updateSnake(snakeArr, dir, len) {
    const head = {x: snakeArr[0].x + dir.x, y: snakeArr[0].y + dir.y};
    snakeArr.unshift(head);
    while (snakeArr.length > len) snakeArr.pop();
}

function checkCollision(snakeArr) {
    const head = snakeArr[0];
    // Wall
    if (head.x < 0 || head.x >= tileCount || head.y < 0 || head.y >= tileCount) return true;
    // Walls
    for (let wall of walls) {
        if (wall.x === head.x && wall.y === head.y) return true;
    }
    return false;
}

function checkEat(snakeArr) {
    return snakeArr[0].x === food.x && snakeArr[0].y === food.y;
}

function aiMove() {
    // Simple greedy AI: move towards food, avoid reversing and walls
    const head = aiSnake[0];
    let dx = food.x - head.x;
    let dy = food.y - head.y;
    let move = {x: aiDir.x, y: aiDir.y};

    let options = [
        {x: 1, y: 0},
        {x: -1, y: 0},
        {x: 0, y: 1},
        {x: 0, y: -1}
    ];

    // Prefer direction towards food
    options.sort((a, b) => {
        let aDist = Math.abs((head.x + a.x) - food.x) + Math.abs((head.y + a.y) - food.y);
        let bDist = Math.abs((head.x + b.x) - food.x) + Math.abs((head.y + b.y) - food.y);
        return aDist - bDist;
    });

    for (let opt of options) {
        // Prevent reversing
        if (aiSnake.length > 1 && opt.x === -aiDir.x && opt.y === -aiDir.y) continue;
        let nx = head.x + opt.x, ny = head.y + opt.y;
        // Avoid walls and permanent walls
        if (
            nx < 0 || nx >= tileCount || ny < 0 || ny >= tileCount ||
            aiSnake.some((s, i) => i > 0 && s.x === nx && s.y === ny) ||
            walls.some(w => w.x === nx && w.y === ny)
        ) continue;
        aiDir = {x: opt.x, y: opt.y};
        break;
    }
}

function playerHitsAISegment() {
    // Player head hits any AI segment or wall
    const head = snake[0];
    for (let seg of aiSnake) {
        if (head.x === seg.x && head.y === seg.y) return true;
    }
    for (let wall of walls) {
        if (head.x === wall.x && head.y === wall.y) return true;
    }
    return false;
}

function resetAI() {
    aiActive = false;
    aiSnake = [];
    aiDir = {x: 0, y: 1};
    aiLen = 5;
    if (aiRespawnTimeout) clearTimeout(aiRespawnTimeout);
    aiRespawnTimeout = setTimeout(() => {
        aiSnake = [{x: Math.floor(tileCount/2), y: Math.floor(tileCount/2)}];
        aiActive = true;
    }, 5000);
}

// Add popup element to the DOM
function createPopup() {
    let popup = document.createElement('div');
    popup.id = 'levelup-popup';
    popup.style.position = 'fixed';
    popup.style.top = '50%';
    popup.style.left = '50%';
    popup.style.transform = 'translate(-50%, -50%) scale(1)';
    popup.style.background = 'linear-gradient(135deg, #00ff99 0%, #00c3ff 100%)';
    popup.style.color = '#fff';
    popup.style.padding = '50px 80px';
    popup.style.borderRadius = '30px';
    popup.style.boxShadow = '0 0 60px #00ff99, 0 0 120px #00c3ff';
    popup.style.fontSize = '2.5rem';
    popup.style.fontWeight = 'bold';
    popup.style.textAlign = 'center';
    popup.style.zIndex = '9999';
    popup.style.opacity = '0';
    popup.style.transition = 'opacity 0.3s, transform 0.5s cubic-bezier(.68,-0.55,.27,1.55)';
    document.body.appendChild(popup);
}
createPopup();

// Add popup animation
const style = document.createElement('style');
style.innerHTML = `
@keyframes pop {
    0% { transform: scale(0.5) rotate(-10deg);}
    60% { transform: scale(1.3) rotate(10deg);}
    100% { transform: scale(1) rotate(0);}
}
@keyframes flashOpacity {
    0%, 100% { opacity: 1; }
    20% { opacity: 0; }
    40% { opacity: 1; }
    60% { opacity: 0; }
    80% { opacity: 1; }
}
#levelup-popup {
    pointer-events: none;
    user-select: none;
}
`;
document.head.appendChild(style);

function showLevelUpPopup(score) {
    const popup = document.getElementById('levelup-popup');
    popup.innerHTML = `
        <div style="font-size:3.5rem; margin-bottom:10px; animation: pop 0.5s;">🎉</div>
        <div>LEVEL UP!</div>
        <div style="font-size:2rem; margin-top:10px;">Score: <span style="color:#ff0">${score}</span></div>
        <div style="font-size:1.2rem; margin-top:10px;">Grid size increased!<br><span style="color:#00c3ff">The world is expanding!</span></div>
    `;
    popup.style.opacity = '1';
    popup.style.transform = 'translate(-50%, -50%) scale(1.2)';
    popup.style.animation = 'flashOpacity 1.2s 2'; // Opacity flashing effect
    setTimeout(() => {
        popup.style.opacity = '0';
        popup.style.transform = 'translate(-50%, -50%) scale(0.7)';
        popup.style.animation = '';
    }, 2400);
}

function update() {
    // Player snake
    updateSnake(snake, snakeDir, snakeLen);
    if (checkCollision(snake) || playerHitsAISegment()) {
        playSound('gameover');
        alert('Game Over! Your score: ' + score);
        document.location.reload();
        return;
    }
    if (checkEat(snake)) {
        playSound('eat');
        snakeLen++;
        score += doubleActive ? 2 : 1;
        document.getElementById('score').textContent = score;
        food = randomFood();

        // Increase grid size every 10th point
        if (score % 10 === 0) {
            showLevelUpPopup(score);
            setTimeout(() => {
                increaseGridSize();
            }, 700); // Delay grid increase for effect
        }
    }

    // AI snake
    if (aiActive && aiSnake.length > 0) {
        aiMove();
        updateSnake(aiSnake, aiDir, aiLen);

        const aiHead = aiSnake[0];

        // --- CHANGED: If AI hits player, AI turns into walls and respawns ---
        let aiHitPlayer = false;
        for (let seg of snake) {
            if (aiHead.x === seg.x && aiHead.y === seg.y) {
                aiHitPlayer = true;
                break;
            }
        }
        if (aiHitPlayer) {
            // Add AI segments as walls
            for (let seg of aiSnake) {
                if (!walls.some(w => w.x === seg.x && w.y === seg.y)) {
                    walls.push({x: seg.x, y: seg.y});
                }
            }
            // Add AI length to score
            let oldScore = score;
            score += aiSnake.length;
            document.getElementById('score').textContent = score;

            // Check for every 10th score crossed and trigger popup/grid increase for each
            let nextLevel = Math.ceil(oldScore / 10) * 10;
            while (nextLevel <= score && nextLevel > oldScore) {
                // Use a closure to capture the correct value for the popup
                ((levelScore) => {
                    setTimeout(() => {
                        showLevelUpPopup(levelScore);
                        increaseGridSize();
                    }, 700 * (Math.floor((nextLevel - Math.ceil(oldScore / 10) * 10) / 10)));
                })(nextLevel);
                nextLevel += 10;
            }
            resetAI();
            return; // Don't continue AI update this frame
        }
        // --- END CHANGED ---

        // If AI hits wall or itself or permanent wall, convert its body to walls and reset AI
        if (
            aiHead.x < 0 || aiHead.x >= tileCount ||
            aiHead.y < 0 || aiHead.y >= tileCount ||
            aiSnake.slice(1).some(seg => seg.x === aiHead.x && seg.y === aiHead.y) ||
            walls.some(w => w.x === aiHead.x && w.y === aiHead.y)
        ) {
            // Add all AI segments as walls
            for (let seg of aiSnake) {
                if (!walls.some(w => w.x === seg.x && w.y === seg.y)) {
                    walls.push({x: seg.x, y: seg.y});
                }
            }
            resetAI();
            return;
        }
        if (checkEat(aiSnake)) {
            aiLen++;
            food = randomFood();
        }
    }
}

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawWalls();
    drawSnake(snake, "#00ff99");
    if (aiActive && aiSnake.length > 0) {
        drawSnake(aiSnake, "#ff3366");
    }
    drawFood();
}

// --- Main Menu Logic ---
let gameStarted = false;
const menu = document.getElementById('mainmenu');
const gameContainer = document.getElementById('game-container');
const startBtn = document.getElementById('startBtn');

startBtn.onclick = () => {
    menu.style.display = 'none';
    gameContainer.style.display = '';
    gameStarted = true;
    gameLoop();
};

// Prevent game from running until started
function gameLoopWrapper() {
    if (gameStarted) {
        gameLoop();
    }
}
window.onload = () => {
    menu.style.display = '';
    gameContainer.style.display = 'none';
};

function gameLoop() {
    update();
    draw();
    setTimeout(gameLoop, speed);
}


document.addEventListener('keydown', e => {
    switch (e.key) {
        case 'ArrowUp':
        case 'w':
        case 'W':
            if (snakeDir.y !== 1) snakeDir = {x: 0, y: -1};
            break;
        case 'ArrowDown':
        case 's':
        case 'S':
            if (snakeDir.y !== -1) snakeDir = {x: 0, y: 1};
            break;
        case 'ArrowLeft':
        case 'a':
        case 'A':
            if (snakeDir.x !== 1) snakeDir = {x: -1, y: 0};
            break;
        case 'ArrowRight':
        case 'd':
        case 'D':
            if (snakeDir.x !== -1) snakeDir = {x: 1, y: 0};
            break;
    }
});

// Remove Speed Up and x2 button event listeners
// document.getElementById('speedUpBtn').onclick = () => { ... };
// document.getElementById('doubleBtn').onclick = () => { ... };

function increaseGridSize() {
    // Increase grid size by 2x2, keep canvas 1000x1000
    tileCount += 2;
    gridSize = Math.floor(1000 / tileCount);

    // Clamp all snakes and walls to new grid
    snake = snake.map(seg => ({
        x: Math.min(seg.x, tileCount - 1),
        y: Math.min(seg.y, tileCount - 1)
    }));
    aiSnake = aiSnake.map(seg => ({
        x: Math.min(seg.x, tileCount - 1),
        y: Math.min(seg.y, tileCount - 1)
    }));
    walls = walls.map(w => ({
        x: Math.min(w.x, tileCount - 1),
        y: Math.min(w.y, tileCount - 1)
    }));
}

// --- Fake Scoreboard Logic ---
const playerName = "You";
const fakeNames = [
    "NeoSnake", "PixelAI", "SlytherBot", "CobraKing", "SerpentX", "BitBiter", "Glitchy", "ViperAI", "Wormy", "SnakeGPT"
];
let fakeScores = fakeNames.map((name, i) => ({
    name,
    score: Math.floor(200 - i * 15 + Math.random() * 30)
}));
let playerScoreObj = { name: playerName, score: 0 };

// Always keep player out of 1st place
function updateFakeScoreboard(realScore) {
    playerScoreObj.score = realScore;
    // Randomly update fake scores
    fakeScores.forEach(obj => {
        if (Math.random() < 0.5) obj.score += Math.floor(Math.random() * 4);
    });
    // Insert player, but never at 1st
    let all = [...fakeScores, playerScoreObj];
    all.sort((a, b) => b.score - a.score);

    // If player is 1st, swap with 2nd
    if (all[0].name === playerName) {
        [all[0], all[1]] = [all[1], all[0]];
    }
    // Render
    const ul = document.getElementById('score-list');
    ul.innerHTML = "";
    all.forEach((obj, idx) => {
        const li = document.createElement('li');
        li.className = obj.name === playerName ? "me" : "";
        li.innerHTML = `<span class="rank">#${idx + 1}</span>
                        <span class="name">${obj.name}</span>
                        <span class="score">${obj.score}</span>`;
        ul.appendChild(li);
    });
}

// Call this after every score update and also on interval
setInterval(() => updateFakeScoreboard(score), 2500);