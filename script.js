
const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
const statusText = document.getElementById("status");
const fullscreenButton = document.getElementById("fullscreenButton");

fullscreenButton.addEventListener("click", async () => {
  try {
    if (document.fullscreenElement) {
      await document.exitFullscreen();
    } else {
      await canvas.requestFullscreen();
    }
  } catch (error) {
    statusText.textContent = "Mode layar penuh tidak didukung browser ini.";
  }
});

document.addEventListener("fullscreenchange", () => {
  fullscreenButton.textContent = document.fullscreenElement
    ? "Keluar layar penuh"
    : "Layar penuh";
});

const W = canvas.width;
const H = canvas.height;

// Adjust these values to customize the boss.
const BOSS_SETTINGS = {
  radius: 50,
  color: "#ff4fa3",
  health: 1945,
  movement: "vertical", // "idle", "horizontal", or "vertical"
  speed: 1.5
};

// Randomly change the boss's movement mode and speed during the fight.
const RANDOM_BOSS_MOVEMENT = {
  enabled: true,
  changeInterval: 600, // Frames between changes (about 3 seconds at 60 FPS)
  minSpeed: 0.5,
  maxSpeed: 5
};

// Adjust player movement, health, and visual appearance here.
const PLAYER_SETTINGS = {
  speed: 5,
  slowSpeed: 2,
  health: 100,
  imageSize: 50,
  hitboxRadius: 5,
  color: "#79eaff"
};

// Adjust player shots here. Spread is the total angle across the volley.
// Use 0 for vertical shots; positive values spread bullets diagonally.
const PLAYER_BULLET_SETTINGS = {
  speed: 8,
  radius: 4,
  width: 4,
  height: 12,
  cooldown: 9,
  count: 5,
  spreadDegrees: 10,
  color: "#7df9ff"
};

// Adjust the large foreground image entrance here. Timing is measured in frames.
const BOSS_APPEARANCE = {
  size: 500,
  opacity: 0.85,
  duration: 240,
  midSlowdown: 0.8, // 0 = steady speed; closer to 1 = slower at the midpoint
  fadeStart: 0.55 // Fraction of the animation when fading begins
};

// Adjust the boss bullet patterns here. Intervals are measured in frames.
const BULLET_SETTINGS = {
  circleInterval: 25, // Faster circle attack
  circleCount: 35,
  circleSpeed: 2,
  circleRadius: 5,
  aimedInterval: 15, // Slower aimed attack
  aimedCount: 5,
  aimedSpread: 0.1, // Total spread in radians
  aimedSpeed: 7,
  aimedRadius: 6,
  fanInterval: 8, // Frames between individual fan bullets
  fanCount: 25,
  fanSpread: 1.2, // Total spread in radians
  fanSpeed: 2.5,
  fanRadius: 5,
  color:"#cdd620"
};

// The boss randomly switches between these attack patterns.
const RANDOM_BOSS_BULLET_PATTERN = {
  enabled: true,
  changeInterval: 300 // Frames between pattern changes (about 4 seconds at 60 FPS)
};

const BOSS_BULLET_PATTERNS = ["circle", "aimed", "fan"];

const backgroundImage = new Image();
backgroundImage.src = "https://uploads.onecompiler.io/44xe3pjkf/456wfymut/Tak%20berjudul42_20261022100605.png";

// Replace boss.png with the filename of your boss image.
const bossImage = new Image();
bossImage.src = "https://uploads.onecompiler.io/44xe3pjkf/456wfymut/Tak%20berjudul43_20261024172643.png";

// Set this to your player image URL or workspace filename (for example, "player.png").
const playerImage = new Image();
playerImage.src = "https://uploads.onecompiler.io/44xe3pjkf/456wfymut/Tak%20berjudul14_20261029132800.png";

const keys = {};

let player = {
  x: W / 2,
  y: H - 70,
  r: PLAYER_SETTINGS.hitboxRadius,
  speed: PLAYER_SETTINGS.speed,
  hp: PLAYER_SETTINGS.health,
  cooldown: 0,
  invincible: 0
};

let boss = {
  x: W / 2,
  y: 90,
  r: BOSS_SETTINGS.radius,
  hp: BOSS_SETTINGS.health,
  maxHp: BOSS_SETTINGS.health,
  dir: 1
};

let bossMovement = BOSS_SETTINGS.movement;
let bossSpeed = BOSS_SETTINGS.speed;
let bossBulletPattern = BOSS_BULLET_PATTERNS[0];
let fanBulletIndex = 0;
let fanBulletDirection = 1;

let bullets = [];
let shots = [];
let particles = [];

let score = 0;
let frame = 0;
let bossAppearanceFrame = 0;
let bombFlash = 0;
let gameOver = false;
let victory = false;

// Keep punctuation controls consistent when Shift changes their displayed characters.
function getControlKey(e) {
  if (e.code === "Semicolon") return ";";
  if (e.code === "Quote") return "'";
  return e.key.toLowerCase();
}

// Membaca tombol keyboard
document.addEventListener("keydown", e => {
  const k = getControlKey(e);

  if (["p", "l", ";", "'", "z", "x"].includes(k)) {
    e.preventDefault();
  }

  keys[k] = true;

  if (k === "x" && !e.repeat && !gameOver && !victory) {
    useBomb();
  }

  if ((gameOver || victory) && k === "enter") {
    restart();
  }
});

document.addEventListener("keyup", e => {
  keys[getControlKey(e)] = false;
});

// Membuat ledakan bomb
function useBomb() {
  bullets = [];
  boss.hp -= 10;
  score += 100;
  bombFlash = 12;

  if (boss.hp <= 0) {
    boss.hp = 0;
    victory = true;
  }
}

// Mengulang permainan
function restart() {
  player.x = W / 2;
  player.y = H - 70;
  player.hp = PLAYER_SETTINGS.health;
  player.speed = PLAYER_SETTINGS.speed;
  player.r = PLAYER_SETTINGS.hitboxRadius;
  player.cooldown = 0;
  player.invincible = 0;

  boss.x = W / 2;
  boss.hp = boss.maxHp;
  boss.dir = 1;
  bossMovement = BOSS_SETTINGS.movement;
  bossSpeed = BOSS_SETTINGS.speed;
  bossBulletPattern = BOSS_BULLET_PATTERNS[0];
  fanBulletIndex = 0;
  fanBulletDirection = 1;

  bullets = [];
  shots = [];
  particles = [];

  score = 0;
  frame = 0;
  bossAppearanceFrame = 0;
  bombFlash = 0;
  gameOver = false;
  victory = false;
}

// Menghasilkan pola peluru boss
function bossAttack() {
  if (bossBulletPattern === "circle") {
    if (
      BULLET_SETTINGS.circleCount > 0 &&
      BULLET_SETTINGS.circleInterval > 0 &&
      frame % BULLET_SETTINGS.circleInterval === 0
    ) {
      for (let i = 0; i < BULLET_SETTINGS.circleCount; i++) {
        const angle = (Math.PI * 2 * i) / BULLET_SETTINGS.circleCount;

        bullets.push({
          x: boss.x,
          y: boss.y,
          vx: Math.cos(angle) * BULLET_SETTINGS.circleSpeed,
          vy: Math.sin(angle) * BULLET_SETTINGS.circleSpeed,
          r: BULLET_SETTINGS.circleRadius
        });
      }
    }
    return;
  }

  const isAimed = bossBulletPattern === "aimed";
  const count = isAimed ? BULLET_SETTINGS.aimedCount : BULLET_SETTINGS.fanCount;
  const interval = isAimed ? BULLET_SETTINGS.aimedInterval : BULLET_SETTINGS.fanInterval;
  const spread = isAimed ? BULLET_SETTINGS.aimedSpread : BULLET_SETTINGS.fanSpread;
  const speed = isAimed ? BULLET_SETTINGS.aimedSpeed : BULLET_SETTINGS.fanSpeed;
  const radius = isAimed ? BULLET_SETTINGS.aimedRadius : BULLET_SETTINGS.fanRadius;

  if (count <= 0 || interval <= 0 || frame % interval !== 0) return;

  const angle = Math.atan2(player.y - boss.y, player.x - boss.x);

  if (!isAimed) {
    const step = count > 1 ? spread / (count - 1) : 0;
    const a = angle - spread / 2 + fanBulletIndex * step;
    bullets.push({
      x: boss.x,
      y: boss.y,
      vx: Math.cos(a) * speed,
      vy: Math.sin(a) * speed,
      r: radius
    });
    if (count > 1) {
      fanBulletIndex += fanBulletDirection;
      if (fanBulletIndex >= count - 1 || fanBulletIndex <= 0) {
        fanBulletDirection *= -1;
      }
    }
    return;
  }

  const step = count > 1 ? spread / (count - 1) : 0;

  for (let i = 0; i < count; i++) {
    const a = angle - spread / 2 + i * step;
    bullets.push({
      x: boss.x,
      y: boss.y,
      vx: Math.cos(a) * speed,
      vy: Math.sin(a) * speed,
      r: radius
    });
  }
}

// Menghitung jarak dua objek
function distance(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

// Memperbarui game
function update() {
  if (bossAppearanceFrame < BOSS_APPEARANCE.duration) {
    bossAppearanceFrame++;
  }

  if (gameOver || victory) return;

  frame++;

  // Hold Shift to move more slowly; punctuation controls use their physical keys.
  const movementSpeed = keys["shift"]
    ? PLAYER_SETTINGS.slowSpeed
    : player.speed;

  // Gerakan pemain: P L ; '
  if (keys["p"]) player.y -= movementSpeed;
  if (keys[";"]) player.y += movementSpeed;
  if (keys["l"]) player.x -= movementSpeed;
  if (keys["'"]) player.x += movementSpeed;

  player.x = Math.max(12, Math.min(W - 12, player.x));
  player.y = Math.max(12, Math.min(H - 12, player.y));

  // Tembakan pemain dengan Z
  if (player.cooldown > 0) player.cooldown--;

  if (keys["z"] && player.cooldown === 0) {
    const shotCount = Math.max(1, Math.floor(PLAYER_BULLET_SETTINGS.count));
    const spread = PLAYER_BULLET_SETTINGS.spreadDegrees * Math.PI / 180;

    for (let i = 0; i < shotCount; i++) {
      const offset = shotCount > 1
        ? -spread / 2 + (spread * i) / (shotCount - 1)
        : 0;
      const angle = -Math.PI / 2 + offset;

      shots.push({
        x: player.x,
        y: player.y - 10,
        vx: Math.cos(angle) * PLAYER_BULLET_SETTINGS.speed,
        vy: Math.sin(angle) * PLAYER_BULLET_SETTINGS.speed,
        r: PLAYER_BULLET_SETTINGS.radius
      });
    }

    player.cooldown = PLAYER_BULLET_SETTINGS.cooldown;
  }

  if (player.invincible > 0) player.invincible--;

  // Randomly choose a new movement mode and speed at the configured interval.
  if (
    RANDOM_BOSS_MOVEMENT.enabled &&
    RANDOM_BOSS_MOVEMENT.changeInterval > 0 &&
    frame % RANDOM_BOSS_MOVEMENT.changeInterval === 0
  ) {
    const modes = ["idle", "horizontal", "vertical"];
    bossMovement = modes[Math.floor(Math.random() * modes.length)];
    const minSpeed = Math.max(0, RANDOM_BOSS_MOVEMENT.minSpeed);
    const maxSpeed = Math.max(minSpeed, RANDOM_BOSS_MOVEMENT.maxSpeed);
    bossSpeed = minSpeed + Math.random() * (maxSpeed - minSpeed);
    boss.dir = Math.random() < 0.5 ? -1 : 1;
  }

  if (bossMovement === "horizontal") {
    boss.x += boss.dir * bossSpeed;

    if (boss.x > W - 40 || boss.x < 40) {
      boss.dir *= -1;
    }
  } else if (bossMovement === "vertical") {
    boss.y += boss.dir * bossSpeed;

    if (boss.y > H * 0.4 || boss.y < 40) {
      boss.dir *= -1;
    }
  }

  if (
    RANDOM_BOSS_BULLET_PATTERN.enabled &&
    RANDOM_BOSS_BULLET_PATTERN.changeInterval > 0 &&
    frame % RANDOM_BOSS_BULLET_PATTERN.changeInterval === 0 &&
    BOSS_BULLET_PATTERNS.length > 1
  ) {
    const alternatives = BOSS_BULLET_PATTERNS.filter(
      pattern => pattern !== bossBulletPattern
    );
    bossBulletPattern = alternatives[Math.floor(Math.random() * alternatives.length)];
  }

  bossAttack();

  // Gerakkan peluru boss
  for (const b of bullets) {
    b.x += b.vx;
    b.y += b.vy;
  }

  // Gerakkan tembakan pemain
  for (const s of shots) {
    s.x += s.vx;
    s.y += s.vy;
  }

  // Tembakan mengenai boss
  for (const s of shots) {
    if (
      s.y >= 0 &&
      distance(s, boss) < s.r + boss.r
    ) {
      boss.hp -= 1;
      score += 10;
      s.y = -20;

      if (boss.hp <= 0) {
        boss.hp = 0;
        victory = true;
      }
    }
  }

  // Peluru boss mengenai pemain
  if (player.invincible === 0) {
    for (const b of bullets) {
      if (distance(b, player) < b.r + player.r) {
        player.hp--;
        player.invincible = 70;
        b.y = H + 100;

        if (player.hp <= 0) {
          player.hp = 0;
          gameOver = true;
        }

        break;
      }
    }
  }

  // Membersihkan objek yang keluar layar
  bullets = bullets.filter(
    b => b.x > -20 && b.x < W + 20 &&
         b.y > -20 && b.y < H + 20
  );

  shots = shots.filter(s => s.y > -20);

  if (bombFlash > 0) bombFlash--;

  statusText.textContent =
    `HP: ${player.hp} | Boss HP: ${boss.hp} | Skor: ${score}`;
}

// Menggambar pemain
function drawPlayer() {
  if (
    player.invincible > 0 &&
    Math.floor(frame / 5) % 2 === 0
  ) return;

  if (playerImage.complete && playerImage.naturalWidth > 0) {
    drawImageContained(playerImage, player.x, player.y, PLAYER_SETTINGS.imageSize);
    return;
  }

  // Fallback ship drawing until the player image loads.
  const sizeScale = PLAYER_SETTINGS.imageSize / 32;
  ctx.fillStyle = PLAYER_SETTINGS.color;
  ctx.beginPath();
  ctx.moveTo(player.x, player.y - 12 * sizeScale);
  ctx.lineTo(player.x - 10 * sizeScale, player.y + 10 * sizeScale);
  ctx.lineTo(player.x, player.y + 5 * sizeScale);
  ctx.lineTo(player.x + 10 * sizeScale, player.y + 10 * sizeScale);
  ctx.closePath();
  ctx.fill();

  // Hitbox kecil
  ctx.fillStyle = "white";
  ctx.beginPath();
  ctx.arc(player.x, player.y, 3 * sizeScale, 0, Math.PI * 2);
  ctx.fill();
}

// Draw an image inside a square while preserving its original proportions.
function drawImageContained(image, centerX, centerY, maxSize) {
  const scale = Math.min(maxSize / image.naturalWidth, maxSize / image.naturalHeight);
  const width = image.naturalWidth * scale;
  const height = image.naturalHeight * scale;
  ctx.drawImage(image, centerX - width / 2, centerY - height / 2, width, height);
}

// Menggambar boss dan bar HP
function drawBoss() {
  if (bossImage.complete && bossImage.naturalWidth > 0) {
    drawImageContained(bossImage, boss.x, boss.y, boss.r * 2);
  } else {
    ctx.fillStyle = BOSS_SETTINGS.color;
    ctx.beginPath();
    ctx.arc(boss.x, boss.y, boss.r, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.fillStyle = "#4b2944";
  ctx.fillRect(40, 20, W - 80, 10);

  ctx.fillStyle = "#ff4fa3";
  ctx.fillRect(
    40, 20,
    (W - 80) * (boss.hp / boss.maxHp),
    10
  );
}

// Draw the large boss portrait rising in front of the gameplay.
function drawBossAppearance() {
  const duration = Math.max(1, BOSS_APPEARANCE.duration);
  if (!bossImage.complete || bossImage.naturalWidth === 0 || bossAppearanceFrame >= duration) {
    return;
  }

  const t = Math.max(0, bossAppearanceFrame / duration);
  const slowdown = Math.max(0, Math.min(0.99, BOSS_APPEARANCE.midSlowdown));
  const progress = t + slowdown * Math.sin(2 * Math.PI * t) / (2 * Math.PI);
  const size = BOSS_APPEARANCE.size;
  const y = H + size / 2 - progress * (H + size);
  const fadeStart = Math.max(0, Math.min(1, BOSS_APPEARANCE.fadeStart));
  const fade = t <= fadeStart ? 1 : 1 - (t - fadeStart) / (1 - fadeStart);

  ctx.save();
  ctx.globalAlpha = Math.max(0, Math.min(1, BOSS_APPEARANCE.opacity)) * fade;
  drawImageContained(bossImage, W / 2, y, size);
  ctx.restore();
}

// Menggambar semua objek
function draw() {
  if (backgroundImage.complete && backgroundImage.naturalWidth > 0) {
    // Scale to cover the canvas while preserving the image's aspect ratio.
    const scale = Math.max(W / backgroundImage.width, H / backgroundImage.height);
    const imageWidth = backgroundImage.width * scale;
    const imageHeight = backgroundImage.height * scale;
    ctx.drawImage(
      backgroundImage,
      (W - imageWidth) / 2,
      (H - imageHeight) / 2,
      imageWidth,
      imageHeight
    );
    ctx.fillStyle = "rgba(16, 13, 32, 0.3)";
    ctx.fillRect(0, 0, W, H);
  } else {
    ctx.fillStyle = "#17132c";
    ctx.fillRect(0, 0, W, H);
  }

  // Bintang latar
  ctx.fillStyle = "#777099";

  for (let i = 0; i < 35; i++) {
    const x = (i * 83) % W;
    const y = (i * 127 + frame * 0.5) % H;

    ctx.fillRect(x, y, 2, 2);
  }

  drawBoss();

  // Peluru boss
  for (const b of bullets) {
    ctx.fillStyle = BULLET_SETTINGS.color;
    ctx.beginPath();
    ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
    ctx.fill();
  }

  // Tembakan pemain
  ctx.fillStyle = PLAYER_BULLET_SETTINGS.color;

  for (const s of shots) {
    ctx.fillRect(
      s.x - PLAYER_BULLET_SETTINGS.width / 2,
      s.y - PLAYER_BULLET_SETTINGS.height / 2,
      PLAYER_BULLET_SETTINGS.width,
      PLAYER_BULLET_SETTINGS.height
    );
  }

  drawPlayer();

  if (bombFlash > 0) {
    ctx.fillStyle = `rgba(160, 100, 255, ${bombFlash / 20})`;
    ctx.fillRect(0, 0, W, H);
  }

  drawBossAppearance();

  if (gameOver || victory) {
    ctx.fillStyle = "rgba(0, 0, 0, 0.75)";
    ctx.fillRect(0, 0, W, H);

    ctx.textAlign = "center";
    ctx.fillStyle = victory ? "#7dffbd" : "#ff7799";
    ctx.font = "bold 32px Arial";

    ctx.fillText(
      victory ? "YOU WIN!" : "GAME OVER",
      W / 2,
      H / 2
    );

    ctx.fillStyle = "white";
    ctx.font = "16px Arial";
    ctx.fillText(
      "Tekan ENTER untuk mengulang",
      W / 2,
      H / 2 + 35
    );
  }
}

// Game loop
function loop() {
  update();
  draw();
  requestAnimationFrame(loop);
}

loop();
50