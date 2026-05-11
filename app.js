const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const startScreen = document.getElementById('start-screen');
const gameOverScreen = document.getElementById('game-over-screen');
const hud = document.getElementById('hud');
const scoreDisplay = document.getElementById('score-display');
const finalScore = document.getElementById('final-score');
const startBtn = document.getElementById('start-btn');
const restartBtn = document.getElementById('restart-btn');

let gameLoopId;
let isPlaying = false;
let score = 0;
let frames = 0;
let gameSpeed = 5.5;
let isInvincible = false;
let invincibleTimer = 0;

let bgX_sky = 0;
let bgX_city = 0;
let bgX_street = 0;

const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
const SoundEngine = {
    playTone(freq, type, duration, vol=0.1, slideFreq=null) {
        if(audioCtx.state === 'suspended') audioCtx.resume();
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = type;
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        
        osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
        if (slideFreq) {
            osc.frequency.exponentialRampToValueAtTime(slideFreq, audioCtx.currentTime + duration);
        }
        
        gain.gain.setValueAtTime(vol, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + duration);
        
        osc.start();
        osc.stop(audioCtx.currentTime + duration);
    },
    jump() { this.playTone(300, 'square', 0.2, 0.05, 600); },
    coin() { this.playTone(800, 'sine', 0.1, 0.05, 1200); },
    powerup() { 
        this.playTone(400, 'square', 0.1, 0.05, 600); 
        setTimeout(()=>this.playTone(600, 'square', 0.1, 0.05, 800), 100);
        setTimeout(()=>this.playTone(800, 'square', 0.2, 0.05, 1200), 200);
    },
    hit() { this.playTone(150, 'sawtooth', 0.4, 0.1, 50); },
    
    isPlayingBgm: false,
    bgmInterval: null,
    startBGM() {
        if(this.isPlayingBgm) return;
        this.isPlayingBgm = true;
        if(audioCtx.state === 'suspended') audioCtx.resume();
        const melody = [261.63, 329.63, 392.00, 523.25, 392.00, 329.63];
        let noteIdx = 0;
        this.bgmInterval = setInterval(() => {
            if(!this.isPlayingBgm) return;
            this.playTone(melody[noteIdx], 'triangle', 0.2, 0.03);
            noteIdx = (noteIdx + 1) % melody.length;
        }, 250);
    },
    stopBGM() {
        this.isPlayingBgm = false;
        clearInterval(this.bgmInterval);
    }
};

function resizeCanvas() {
    canvas.width = canvas.parentElement.clientWidth;
    canvas.height = canvas.parentElement.clientHeight;
    
    // Optimize player size and position for mobile/small viewports
    const isSmallScreen = (canvas.width < 600 || canvas.height < 500);
    if (isSmallScreen) {
        player.width = 50;
        player.height = 60;
        player.x = canvas.width < 500 ? 20 : 40; // Move character further left on narrow screens to increase reaction time
    } else {
        player.width = 80;
        player.height = 95;
        player.x = 50;
    }
}

const ASSETS = {
    bgSky: 'assets/slices/bg_sky.png',
    bgCity: 'assets/slices/bg_city.png',
    bgStreet: 'assets/slices/bg_street.png',
    player0: 'assets/slices/player_0.png',
    player1: 'assets/slices/player_1.png',
    player2: 'assets/slices/player_2.png',
    player3: 'assets/slices/player_3.png',
    itemCoin: 'assets/slices/coin.png',
    itemShield: 'assets/slices/shield.png',
    obsSpike: 'assets/slices/spike.png',
    obsBat: 'assets/slices/bat.png',
    obsGoblin: 'assets/slices/goblin.png'
};

const images = {};
let imagesLoaded = 0;
const totalImages = Object.keys(ASSETS).length;

for (let key in ASSETS) {
    images[key] = new Image();
    images[key].src = ASSETS[key];
    images[key].onload = () => { imagesLoaded++; };
}

function getStreetH() { return Math.max(120, canvas.height * 0.25); }
function getGroundY() { return canvas.height - getStreetH() * 0.45; }

function drawTiledBg(img, x, y, h) {
    if(!img || !img.width) return;
    let scale = h / img.height;
    let w = img.width * scale;
    let drawX = x % w;
    if (drawX > 0) drawX -= w;
    while(drawX < canvas.width) {
        ctx.drawImage(img, drawX, y, w, h);
        drawX += w;
    }
}

const player = {
    x: 50,
    y: 0,
    width: 80,
    height: 95,
    dy: 0,
    gravity: 0.85, 
    jumpForce: -14.5,
    grounded: false,
    jumpCount: 0,
    
    draw() {
        if (isInvincible) {
            ctx.save();
            ctx.globalAlpha = (Math.floor(frames / 5) % 2 === 0) ? 0.6 : 1.0; 
            ctx.shadowBlur = 15;
            ctx.shadowColor = "#3498db";
        }

        if (imagesLoaded === totalImages) {
            let frameIdx = (!this.grounded) ? 3 : Math.floor(frames / 8) % 4; 
            const bodyImg = images['player' + frameIdx];
            ctx.drawImage(bodyImg, this.x, this.y, this.width, this.height);
        } else {
            ctx.fillStyle = '#feca57';
            ctx.fillRect(this.x, this.y, this.width, this.height);
        }

        if (isInvincible) ctx.restore();
    },
    
    update() {
        this.dy += this.gravity;
        this.y += this.dy;
        const groundY = getGroundY() - this.height;
        if (this.y > groundY) {
            this.y = groundY;
            this.dy = 0;
            this.grounded = true;
            this.jumpCount = 0;
        } else {
            this.grounded = false;
        }
    },
    
    jump() {
        if (this.grounded || this.jumpCount < 2) {
            SoundEngine.jump();
            this.dy = this.jumpForce;
            this.grounded = false;
            this.jumpCount++;
        }
    }
};

window.addEventListener('resize', resizeCanvas);
resizeCanvas();

let obstacles = [];
let items = [];

class Obstacle {
    constructor() {
        const r = Math.random();
        if (r < 0.35) this.type = 'obsSpike';
        else if (r < 0.7) this.type = 'obsBat';
        else this.type = 'obsGoblin';
        
        this.x = canvas.width;
        let groundY = getGroundY();
        this.bobOffset = Math.random() * Math.PI * 2; // 각 장애물마다 개별적인 타이밍 부여
        
        const isSmall = (canvas.width < 600 || canvas.height < 500);
        if (this.type === 'obsSpike') {
            this.width = isSmall ? 45 : 70; 
            this.height = isSmall ? 30 : 45;
            this.y = groundY - this.height + 3;
        } else if (this.type === 'obsBat') {
            this.width = isSmall ? 40 : 60; 
            this.height = isSmall ? 35 : 50;
            this.y = groundY - (isSmall ? 90 : 140) - Math.random() * (isSmall ? 30 : 50); 
        } else { // goblin
            this.width = isSmall ? 45 : 65; 
            this.height = isSmall ? 55 : 80;
            this.y = groundY - this.height;
        }
    }
    
    draw() {
        ctx.save();
        
        // 1. 깜빡임 / 맥박치는 위험 네온 글로우 효과
        const pulse = Math.abs(Math.sin(frames * 0.15 + this.bobOffset));
        ctx.shadowColor = "#ff3838"; // 경고의 의미를 담은 강력한 레드 네온
        ctx.shadowBlur = 5 + pulse * 18; // 5 ~ 23px 사이로 맥박치듯 반짝임
        
        // 2. 부드러운 유기적 움직임 연출
        let offsetY = 0;
        if (this.type === 'obsBat') {
            // 박쥐는 위아래로 펄럭이며 비행하는 움직임
            offsetY = Math.sin(frames * 0.12 + this.bobOffset) * 12;
        } else if (this.type === 'obsGoblin') {
            // 고블린은 통통 뛰어오는 리드미컬한 움직임
            offsetY = Math.abs(Math.sin(frames * 0.15 + this.bobOffset)) * -8;
        } else if (this.type === 'obsSpike') {
            // 바닥 가시는 금방이라도 튀어오를 듯 미세하게 진동
            offsetY = Math.sin(frames * 0.35 + this.bobOffset) * 2.5;
        }
        
        if (imagesLoaded === totalImages) {
            ctx.drawImage(images[this.type], this.x, this.y + offsetY, this.width, this.height);
        } else {
            ctx.fillStyle = '#2d3436';
            ctx.fillRect(this.x, this.y + offsetY, this.width, this.height);
        }
        
        ctx.restore();
    }
    
    update() {
        this.x -= gameSpeed * (this.type === 'obsBat' ? 1.3 : 1.0);
        this.draw();
    }
}

class Item {
    constructor() {
        this.type = Math.random() < 0.15 ? 'itemShield' : 'itemCoin'; 
        const isSmall = (canvas.width < 600 || canvas.height < 500);
        this.radius = isSmall ? 13 : 20;
        this.x = canvas.width;
        let groundY = getGroundY();
        this.y = groundY - (isSmall ? 65 : 100) - Math.random() * (isSmall ? 40 : 60);
        this.bobOffset = Math.random() * Math.PI * 2; // 개별적인 둥둥 뜨는 리듬 부여
    }
    
    draw() {
        ctx.save();
        
        // 1. 공중에 떠 있는 신비로운 연출 (부드러운 위아래 둥둥 뜨기)
        const offsetY = Math.sin(frames * 0.08 + this.bobOffset) * 8;
        
        // 2. 신비롭게 반짝이는 이펙트 (네온 펄싱 효과)
        const pulse = Math.abs(Math.sin(frames * 0.1 + this.bobOffset));
        if (this.type === 'itemShield') {
            ctx.shadowColor = '#00ecff'; // 시원한 사이언/블루 보호막 글로우
            ctx.shadowBlur = 8 + pulse * 14;
        } else {
            ctx.shadowColor = '#ffd32a'; // 따뜻한 황금빛 골드 글로우
            ctx.shadowBlur = 8 + pulse * 14;
        }
        
        if (imagesLoaded === totalImages) {
            const img = this.type === 'itemShield' ? images.itemShield : images.itemCoin;
            ctx.drawImage(img, this.x - this.radius, this.y - this.radius + offsetY, this.radius*2, this.radius*2);
        } else {
            ctx.fillStyle = this.type === 'itemShield' ? '#3498db' : '#f1c40f';
            ctx.beginPath();
            ctx.arc(this.x, this.y + offsetY, this.radius, 0, Math.PI*2);
            ctx.fill();
        }
        
        ctx.restore();
    }
    
    update() {
        this.x -= gameSpeed;
        this.draw();
    }
}

function handleInput() {
    if (isPlaying) player.jump();
}
window.addEventListener('keydown', (e) => {
    if (e.code === 'Space' || e.code === 'ArrowUp') handleInput();
});
canvas.addEventListener('mousedown', handleInput);
canvas.addEventListener('touchstart', (e) => {
    if(isPlaying) e.preventDefault();
    handleInput();
}, {passive: false});

function spawnEntities() {
    if (frames % Math.max(50, 110 - Math.floor(gameSpeed*5)) === 0) {
        obstacles.push(new Obstacle());
    }
    if (frames % 80 === 0) {
        items.push(new Item());
    }
}

function checkCollisions() {
    let pBox = { x: player.x + 10, y: player.y + 10, w: player.width - 20, h: player.height - 20 };
    
    for (let i = 0; i < obstacles.length; i++) {
        let obs = obstacles[i];
        let oBox = { x: obs.x + 10, y: obs.y + 10, w: obs.width - 20, h: obs.height - 20 };
        if (pBox.x < oBox.x + oBox.w &&
            pBox.x + pBox.w > oBox.x &&
            pBox.y < oBox.y + oBox.h &&
            pBox.y + pBox.h > oBox.y) {
            if (!isInvincible) {
                gameOver();
                return;
            }
        }
    }
    for (let i = items.length - 1; i >= 0; i--) {
        let item = items[i];
        let iBox = { x: item.x - item.radius + 5, y: item.y - item.radius + 5, w: item.radius*2 - 10, h: item.radius*2 - 10 };
        if (pBox.x < iBox.x + iBox.w &&
            pBox.x + pBox.w > iBox.x &&
            pBox.y < iBox.y + iBox.h &&
            pBox.y + pBox.h > iBox.y) {
            
            if (item.type === 'itemShield') {
                SoundEngine.powerup();
                isInvincible = true;
                invincibleTimer = frames + 300;
                score += 50; 
            } else {
                SoundEngine.coin();
                score += 10;
            }
            
            items.splice(i, 1);
            scoreDisplay.innerText = score;
        }
    }
}

function drawBackground() {
    ctx.fillStyle = '#2b2b36'; 
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    if (imagesLoaded === totalImages) {
        let streetH = getStreetH();
        let cityH = Math.max(200, canvas.height * 0.45);
        let skyH = canvas.height - streetH - cityH + 50; 
        
        bgX_sky -= gameSpeed * 0.2;
        drawTiledBg(images.bgSky, bgX_sky, 0, skyH);
        
        bgX_city -= gameSpeed * 0.5;
        drawTiledBg(images.bgCity, bgX_city, skyH - 10, cityH);
        
        bgX_street -= gameSpeed;
        drawTiledBg(images.bgStreet, bgX_street, canvas.height - streetH, streetH);
        
    }
}

function update() {
    if (!isPlaying) return;
    
    if (isInvincible && frames > invincibleTimer) {
        isInvincible = false;
    }
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawBackground();
    
    player.update();
    player.draw();
    
    spawnEntities();
    
    for (let i = obstacles.length - 1; i >= 0; i--) {
        obstacles[i].update();
        if (obstacles[i].x + obstacles[i].width < 0) {
            obstacles.splice(i, 1);
            score += 1;
            scoreDisplay.innerText = score;
        }
    }
    
    for (let i = items.length - 1; i >= 0; i--) {
        items[i].update();
        if (items[i].x + items[i].radius < 0) items.splice(i, 1);
    }
    
    if (isPlaying) checkCollisions();
    
    if (frames > 0 && frames % 350 === 0) {
        gameSpeed += (canvas.width < 500) ? 0.35 : 0.5;
    }
    
    frames++;
    if (isPlaying) {
        gameLoopId = requestAnimationFrame(update);
    }
}

function startGame() {
    startScreen.classList.add('hidden');
    gameOverScreen.classList.add('hidden');
    hud.classList.remove('hidden');
    
    obstacles = [];
    items = [];
    score = 0;
    frames = 0;
    gameSpeed = (canvas.width < 500) ? 4.5 : 5.5;
    
    bgX_sky = 0;
    bgX_city = 0;
    bgX_street = 0;
    
    isInvincible = false;
    player.y = getGroundY() - player.height - 100;
    player.dy = 0;
    player.grounded = false;
    player.jumpCount = 0;
    scoreDisplay.innerText = score;
    
    SoundEngine.startBGM();
    isPlaying = true;
    update();
}

function gameOver() {
    isPlaying = false;
    cancelAnimationFrame(gameLoopId);
    
    SoundEngine.stopBGM();
    SoundEngine.hit();
    
    hud.classList.add('hidden');
    gameOverScreen.classList.remove('hidden');
    finalScore.innerText = score;
}

startBtn.addEventListener('click', startGame);
restartBtn.addEventListener('click', startGame);
