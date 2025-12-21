// Constants
const GAME_WIDTH = 800;
const GAME_HEIGHT = 600;
const ASPECT_RATIO = GAME_WIDTH / GAME_HEIGHT;

// Colors
const SEA_DARK_BLUE = "#456078";
const WATER_GRADIENT_TOP = "#87CEEB";
const WATER_GRADIENT_BOTTOM = "#4682B4";
const SAND_COLOR = "#C4A55A";
const SEAWEED_COLOR = "#3A7A3A";

// Fish colors
const FISH_COLORS = [
  ["#FF6B4A", "#FF8B3A"], // Orange-red
  ["#FFD700", "#FFA500"], // Gold-orange
  ["#87CEEB", "#4A90D9"], // Light blue
  ["#DDA0DD", "#BA55D3"], // Purple-pink
  ["#90EE90", "#32CD32"], // Light green
  ["#FFB6C1", "#FF69B4"], // Pink
];

// Game state enum
type GameState = "menu" | "instructions" | "playing" | "gameover" | "playagain";

// Interfaces
interface Fish {
  x: number;
  y: number;
  size: number;
  speed: number;
  direction: 1 | -1;
  colorIndex: number;
  animationPhase: number;
}

interface Bubble {
  x: number;
  y: number;
  size: number;
  speed: number;
  opacity: number;
}

interface Seaweed {
  x: number;
  height: number;
  phase: number;
  opacity: number;
}

// Game class
class FishyGame {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private gameState: GameState = "menu";

  // Player state
  private playerX = GAME_WIDTH / 2;
  private playerY = 50;
  private playerSize = 20;
  private playerVelX = 0;
  private playerVelY = 5; // Start going downwards
  private playerDirection: 1 | -1 = 1;
  private playerAnimationPhase = 0;
  private playerPulse = 0;

  // Input state
  private keys: Record<string, boolean> = {};

  // Game objects
  private npcs: Fish[] = [];
  private bubbles: Bubble[] = [];
  private seaweeds: Seaweed[] = [];

  // Score
  private score = 0;
  private fishEaten = 0;

  // Animation state
  private titleBounce: number[] = [];
  private ghostY = 0;
  private ghostTargetY = 0;

  // UI hover state
  private hoveredButton: string | null = null;

  // Time tracking
  private lastTime = 0;
  private bubbleTimer = 0;
  private npcSpawnTimer = 0;

  constructor() {
    const canvas = document.getElementById("gameCanvas");
    if (!(canvas instanceof HTMLCanvasElement)) {
      throw new Error("Canvas element not found");
    }
    this.canvas = canvas;
    const ctx = this.canvas.getContext("2d");
    if (!ctx) {
      throw new Error("Could not get 2d context");
    }
    this.ctx = ctx;

    // Initialize title bounce
    const title = "! FISHY !";
    for (let i = 0; i < title.length; i++) {
      this.titleBounce.push(Math.random() * Math.PI * 2);
    }

    // Initialize seaweeds
    this.initSeaweeds();

    // Set up event listeners
    this.setupEventListeners();

    // Start game loop
    this.resize();
    window.addEventListener("resize", () => this.resize());
    requestAnimationFrame((t: number) => this.gameLoop(t));
  }

  private initSeaweeds(): void {
    this.seaweeds = [];
    const seaweedPositions = [0.08, 0.2, 0.35, 0.5, 0.65, 0.8, 0.92];
    for (const pos of seaweedPositions) {
      this.seaweeds.push({
        x: GAME_WIDTH * pos,
        height: 80 + Math.random() * 100,
        phase: Math.random() * Math.PI * 2,
        opacity: 0.5 + Math.random() * 0.5,
      });
    }
  }

  private setupEventListeners(): void {
    window.addEventListener("keydown", (e: KeyboardEvent) => {
      this.keys[e.key.toLowerCase()] = true;
      this.keys[e.code] = true;
    });

    window.addEventListener("keyup", (e: KeyboardEvent) => {
      this.keys[e.key.toLowerCase()] = false;
      this.keys[e.code] = false;
    });

    this.canvas.addEventListener("mousemove", (e: MouseEvent) =>
      this.handleMouseMove(e),
    );
    this.canvas.addEventListener("click", (e: MouseEvent) =>
      this.handleClick(e),
    );
  }

  private resize(): void {
    const container = document.getElementById("game-container")!;
    const containerWidth = container.clientWidth;
    const containerHeight = container.clientHeight;
    const containerRatio = containerWidth / containerHeight;

    let canvasWidth: number;
    let canvasHeight: number;

    if (containerRatio > ASPECT_RATIO) {
      canvasHeight = containerHeight;
      canvasWidth = canvasHeight * ASPECT_RATIO;
    } else {
      canvasWidth = containerWidth;
      canvasHeight = canvasWidth / ASPECT_RATIO;
    }

    this.canvas.width = GAME_WIDTH;
    this.canvas.height = GAME_HEIGHT;
    this.canvas.style.width = `${canvasWidth}px`;
    this.canvas.style.height = `${canvasHeight}px`;
  }

  private getMousePos(e: MouseEvent): { x: number; y: number } {
    const rect = this.canvas.getBoundingClientRect();
    const scaleX = GAME_WIDTH / rect.width;
    const scaleY = GAME_HEIGHT / rect.height;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  }

  private handleMouseMove(e: MouseEvent): void {
    const pos = this.getMousePos(e);
    this.hoveredButton = null;

    if (this.gameState === "menu") {
      if (this.isOverButton(pos, GAME_WIDTH / 2, 420, "PLAY")) {
        this.hoveredButton = "play";
      } else if (this.isOverButton(pos, GAME_WIDTH / 2, 480, "INSTRUCTIONS")) {
        this.hoveredButton = "instructions";
      }
    } else if (this.gameState === "instructions") {
      if (this.isOverButton(pos, GAME_WIDTH / 2, 560, "BACK")) {
        this.hoveredButton = "back";
      }
    } else if (this.gameState === "gameover") {
      if (this.isOverButton(pos, GAME_WIDTH / 2, 380, "OK")) {
        this.hoveredButton = "ok";
      }
    } else if (this.gameState === "playagain") {
      if (this.isOverButton(pos, GAME_WIDTH / 2, 300, "PLAY AGAIN")) {
        this.hoveredButton = "playagain";
      }
    }

    // Fullscreen button
    if (this.isOverFullscreenButton(pos)) {
      this.hoveredButton = "fullscreen";
    }

    this.canvas.style.cursor = this.hoveredButton ? "pointer" : "default";
  }

  private handleClick(e: MouseEvent): void {
    const pos = this.getMousePos(e);

    // Fullscreen button (available on all screens)
    if (this.isOverFullscreenButton(pos)) {
      this.toggleFullscreen();
      return;
    }

    if (this.gameState === "menu") {
      if (this.isOverButton(pos, GAME_WIDTH / 2, 420, "PLAY")) {
        this.startGame();
      } else if (this.isOverButton(pos, GAME_WIDTH / 2, 480, "INSTRUCTIONS")) {
        this.gameState = "instructions";
      }
    } else if (this.gameState === "instructions") {
      if (this.isOverButton(pos, GAME_WIDTH / 2, 560, "BACK")) {
        this.gameState = "menu";
      }
    } else if (this.gameState === "gameover") {
      if (this.isOverButton(pos, GAME_WIDTH / 2, 380, "OK")) {
        this.gameState = "playagain";
      }
    } else if (this.gameState === "playagain") {
      if (this.isOverButton(pos, GAME_WIDTH / 2, 300, "PLAY AGAIN")) {
        this.startGame();
      }
    }
  }

  private isOverButton(
    pos: { x: number; y: number },
    bx: number,
    by: number,
    text: string,
  ): boolean {
    this.ctx.font = "bold 32px 'Comic Sans MS', cursive";
    const metrics = this.ctx.measureText(text);
    const width = metrics.width + 40;
    const height = 50;
    return (
      pos.x >= bx - width / 2 &&
      pos.x <= bx + width / 2 &&
      pos.y >= by - height / 2 &&
      pos.y <= by + height / 2
    );
  }

  private isOverFullscreenButton(pos: { x: number; y: number }): boolean {
    return (
      pos.x >= GAME_WIDTH - 40 &&
      pos.x <= GAME_WIDTH - 10 &&
      pos.y >= 10 &&
      pos.y <= 40
    );
  }

  private toggleFullscreen(): void {
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      document.documentElement.requestFullscreen();
    }
  }

  private startGame(): void {
    this.gameState = "playing";
    this.playerX = GAME_WIDTH / 2;
    this.playerY = 50;
    this.playerSize = 20;
    this.playerVelX = 0;
    this.playerVelY = 5;
    this.playerDirection = 1;
    this.score = 0;
    this.fishEaten = 0;
    this.npcs = [];
    this.bubbles = [];
    this.npcSpawnTimer = 0;
  }

  private gameLoop(time: number): void {
    const dt = Math.min((time - this.lastTime) / 1000, 0.1);
    this.lastTime = time;

    this.update(dt);
    this.render();

    requestAnimationFrame((t: number) => this.gameLoop(t));
  }

  private update(dt: number): void {
    // Update title bounce
    for (let i = 0; i < this.titleBounce.length; i++) {
      const val = this.titleBounce[i];
      if (val !== undefined) {
        this.titleBounce[i] = val + dt * 3;
      }
    }

    // Update seaweed animation
    for (const seaweed of this.seaweeds) {
      seaweed.phase += dt * 1.5;
    }

    if (this.gameState === "playing") {
      this.updatePlaying(dt);
    } else if (this.gameState === "gameover") {
      // Move ghost fish up
      if (this.ghostY > this.ghostTargetY) {
        this.ghostY -= 80 * dt;
      }
    }
  }

  private updatePlaying(dt: number): void {
    // Player movement with momentum
    const acceleration = 400;
    const friction = 3;
    const maxSpeed = 250;

    // Horizontal input
    let inputX = 0;
    if (
      (this.keys.arrowleft || this.keys.a) &&
      !(this.keys.arrowright || this.keys.d)
    ) {
      inputX = -1;
    } else if (
      (this.keys.arrowright || this.keys.d) &&
      !(this.keys.arrowleft || this.keys.a)
    ) {
      inputX = 1;
    }

    // Vertical input (up overrides down)
    let inputY = 0;
    if (this.keys.arrowup || this.keys.w) {
      inputY = -1;
    } else if (this.keys.arrowdown || this.keys.s) {
      inputY = 1;
    }

    // Apply acceleration
    this.playerVelX += inputX * acceleration * dt;
    this.playerVelY += inputY * acceleration * dt;

    // Apply friction (momentum decay)
    this.playerVelX *= (1 - friction * 0.3) ** (dt * 10);
    this.playerVelY *= (1 - friction * 0.3) ** (dt * 10);

    // Clamp velocity
    this.playerVelX = Math.max(-maxSpeed, Math.min(maxSpeed, this.playerVelX));
    this.playerVelY = Math.max(-maxSpeed, Math.min(maxSpeed, this.playerVelY));

    // Update position
    this.playerX += this.playerVelX * dt;
    this.playerY += this.playerVelY * dt;

    // Player animation
    if (inputX !== 0 || inputY !== 0) {
      this.playerAnimationPhase += dt * 15;
    }

    // Update player direction based on velocity
    if (Math.abs(this.playerVelX) > 10) {
      this.playerDirection = this.playerVelX > 0 ? 1 : -1;
    }

    // Boundary collision
    const playAreaTop = 50;
    const playAreaBottom = GAME_HEIGHT - 100;
    const playAreaLeft = 0;
    const playAreaRight = GAME_WIDTH;

    // Top/bottom boundaries stop momentum
    if (this.playerY - this.playerSize / 2 < playAreaTop) {
      this.playerY = playAreaTop + this.playerSize / 2;
      this.playerVelY = 0;
    }
    if (this.playerY + this.playerSize / 2 > playAreaBottom) {
      this.playerY = playAreaBottom - this.playerSize / 2;
      this.playerVelY = 0;
    }

    // Left/right boundaries teleport
    if (this.playerX < playAreaLeft - this.playerSize) {
      this.playerX = playAreaRight + this.playerSize;
    }
    if (this.playerX > playAreaRight + this.playerSize) {
      this.playerX = playAreaLeft - this.playerSize;
    }

    // Update player pulse
    if (this.playerPulse > 0) {
      this.playerPulse -= dt * 5;
    }

    // Spawn bubbles
    this.bubbleTimer += dt;
    if (this.bubbleTimer > 0.3 + Math.random() * 0.5) {
      this.bubbleTimer = 0;
      this.bubbles.push({
        x:
          this.playerX +
          (this.playerDirection === 1 ? this.playerSize : -this.playerSize) *
            0.3,
        y: this.playerY - this.playerSize * 0.2,
        size: 2 + Math.random() * 3,
        speed: 30 + Math.random() * 20,
        opacity: 0.7,
      });
    }

    // Update bubbles
    for (let i = this.bubbles.length - 1; i >= 0; i--) {
      const bubble = this.bubbles[i];
      if (!bubble) continue;
      bubble.y -= bubble.speed * dt;
      bubble.opacity -= dt * 0.3;
      if (bubble.opacity <= 0 || bubble.y < 0) {
        this.bubbles.splice(i, 1);
      }
    }

    // Spawn NPCs
    this.npcSpawnTimer += dt;
    const spawnRate = Math.max(0.3, 1.5 - this.fishEaten * 0.01);
    if (this.npcSpawnTimer > spawnRate) {
      this.npcSpawnTimer = 0;
      this.spawnNPC();
    }

    // Update NPCs
    for (let i = this.npcs.length - 1; i >= 0; i--) {
      const npc = this.npcs[i];
      if (!npc) continue;
      npc.x += npc.speed * npc.direction * dt;
      npc.animationPhase += dt * 10;

      // Remove if off screen
      const spawnMargin = 100;
      if (
        (npc.direction === 1 && npc.x > GAME_WIDTH + spawnMargin + npc.size) ||
        (npc.direction === -1 && npc.x < -spawnMargin - npc.size)
      ) {
        this.npcs.splice(i, 1);
        continue;
      }

      // Check collision with player
      if (this.checkCollision(npc)) {
        if (this.playerSize >= npc.size) {
          // Eat the fish
          this.npcs.splice(i, 1);
          this.fishEaten++;
          // Size increase scales with fish eaten, not fish size
          const sizeIncrease = 0.5 + this.fishEaten * 0.02;
          this.playerSize += sizeIncrease;
          // Points based on fish size
          this.score += Math.floor(npc.size * 2);
          this.playerPulse = 1;
        } else {
          // Game over
          this.gameState = "gameover";
          this.ghostY = 400;
          this.ghostTargetY = 150;
        }
      }
    }
  }

  private spawnNPC(): void {
    const direction = Math.random() > 0.5 ? 1 : -1;
    const spawnMargin = 100;

    // Size distribution - more small fish, fewer large
    let size: number;
    const rand = Math.random();
    if (rand < 0.4) {
      size = 10 + Math.random() * 15; // Tiny
    } else if (rand < 0.7) {
      size = 25 + Math.random() * 20; // Small
    } else if (rand < 0.9) {
      size = 45 + Math.random() * 30; // Medium
    } else {
      size = 75 + Math.random() * 50; // Large
    }

    // Speed inversely proportional to size
    const speed = 50 + (100 - size) * 1.5 + Math.random() * 30;

    const playAreaTop = 80;
    const playAreaBottom = GAME_HEIGHT - 130;

    const npc: Fish = {
      x:
        direction === 1 ? -spawnMargin - size : GAME_WIDTH + spawnMargin + size,
      y: playAreaTop + Math.random() * (playAreaBottom - playAreaTop),
      size,
      speed,
      direction: direction as 1 | -1,
      colorIndex: Math.floor(Math.random() * FISH_COLORS.length),
      animationPhase: Math.random() * Math.PI * 2,
    };

    this.npcs.push(npc);
  }

  private checkCollision(npc: Fish): boolean {
    // Simple rectangle collision
    const playerLeft = this.playerX - this.playerSize * 0.8;
    const playerRight = this.playerX + this.playerSize * 0.8;
    const playerTop = this.playerY - this.playerSize * 0.4;
    const playerBottom = this.playerY + this.playerSize * 0.4;

    const npcLeft = npc.x - npc.size * 0.8;
    const npcRight = npc.x + npc.size * 0.8;
    const npcTop = npc.y - npc.size * 0.4;
    const npcBottom = npc.y + npc.size * 0.4;

    return (
      playerLeft < npcRight &&
      playerRight > npcLeft &&
      playerTop < npcBottom &&
      playerBottom > npcTop
    );
  }

  private render(): void {
    this.ctx.clearRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

    // Draw water gradient background
    const gradient = this.ctx.createLinearGradient(0, 0, 0, GAME_HEIGHT);
    gradient.addColorStop(0, WATER_GRADIENT_TOP);
    gradient.addColorStop(1, WATER_GRADIENT_BOTTOM);
    this.ctx.fillStyle = gradient;
    this.ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

    // Draw sand
    this.drawSand();

    // Draw seaweeds (behind fish)
    this.drawSeaweeds();

    // Draw fullscreen button (on all screens)
    this.drawFullscreenButton();

    switch (this.gameState) {
      case "menu":
        this.renderMenu();
        break;
      case "instructions":
        this.renderInstructions();
        break;
      case "playing":
        this.renderPlaying();
        break;
      case "gameover":
        this.renderGameOver();
        break;
      case "playagain":
        this.renderPlayAgain();
        break;
    }
  }

  private drawSand(): void {
    this.ctx.fillStyle = SAND_COLOR;
    this.ctx.beginPath();
    this.ctx.moveTo(0, GAME_HEIGHT);

    // Wavy sand line
    for (let x = 0; x <= GAME_WIDTH; x += 20) {
      const y =
        GAME_HEIGHT -
        70 +
        Math.sin(x * 0.02) * 15 +
        Math.sin(x * 0.01 + 1) * 10;
      this.ctx.lineTo(x, y);
    }

    this.ctx.lineTo(GAME_WIDTH, GAME_HEIGHT);
    this.ctx.closePath();
    this.ctx.fill();

    // Darker sand border
    this.ctx.strokeStyle = "#8B7355";
    this.ctx.lineWidth = 3;
    this.ctx.beginPath();
    for (let x = 0; x <= GAME_WIDTH; x += 20) {
      const y =
        GAME_HEIGHT -
        70 +
        Math.sin(x * 0.02) * 15 +
        Math.sin(x * 0.01 + 1) * 10;
      if (x === 0) {
        this.ctx.moveTo(x, y);
      } else {
        this.ctx.lineTo(x, y);
      }
    }
    this.ctx.stroke();
  }

  private drawSeaweeds(): void {
    for (const seaweed of this.seaweeds) {
      this.ctx.save();
      this.ctx.globalAlpha = seaweed.opacity;

      const baseY =
        GAME_HEIGHT -
        60 +
        Math.sin(seaweed.x * 0.02) * 15 +
        Math.sin(seaweed.x * 0.01 + 1) * 10;

      // Draw wavy seaweed
      this.ctx.strokeStyle = SEAWEED_COLOR;
      this.ctx.lineWidth = 8;
      this.ctx.lineCap = "round";
      this.ctx.beginPath();

      const segments = 10;
      for (let i = 0; i <= segments; i++) {
        const t = i / segments;
        const y = baseY - t * seaweed.height;
        const wave = Math.sin(seaweed.phase + t * 3) * (10 + t * 15);
        const x = seaweed.x + wave;

        if (i === 0) {
          this.ctx.moveTo(x, y);
        } else {
          this.ctx.lineTo(x, y);
        }
      }
      this.ctx.stroke();

      this.ctx.restore();
    }
  }

  private drawFullscreenButton(): void {
    const scale = this.hoveredButton === "fullscreen" ? 1.2 : 1;
    const cx = GAME_WIDTH - 25;
    const cy = 25;

    this.ctx.save();
    this.ctx.translate(cx, cy);
    this.ctx.scale(scale, scale);
    this.ctx.translate(-cx, -cy);

    this.ctx.strokeStyle = "white";
    this.ctx.lineWidth = 2;

    // Draw fullscreen icon (4 corners)
    const size = 10;
    const gap = 4;

    // Top-left
    this.ctx.beginPath();
    this.ctx.moveTo(cx - size - gap, cy - gap);
    this.ctx.lineTo(cx - size - gap, cy - size - gap);
    this.ctx.lineTo(cx - gap, cy - size - gap);
    this.ctx.stroke();

    // Top-right
    this.ctx.beginPath();
    this.ctx.moveTo(cx + gap, cy - size - gap);
    this.ctx.lineTo(cx + size + gap, cy - size - gap);
    this.ctx.lineTo(cx + size + gap, cy - gap);
    this.ctx.stroke();

    // Bottom-left
    this.ctx.beginPath();
    this.ctx.moveTo(cx - size - gap, cy + gap);
    this.ctx.lineTo(cx - size - gap, cy + size + gap);
    this.ctx.lineTo(cx - gap, cy + size + gap);
    this.ctx.stroke();

    // Bottom-right
    this.ctx.beginPath();
    this.ctx.moveTo(cx + gap, cy + size + gap);
    this.ctx.lineTo(cx + size + gap, cy + size + gap);
    this.ctx.lineTo(cx + size + gap, cy + gap);
    this.ctx.stroke();

    this.ctx.restore();
  }

  private renderMenu(): void {
    // Draw bouncing title
    const title = "! FISHY !";
    this.ctx.font = "bold 120px 'Comic Sans MS', cursive";
    this.ctx.textAlign = "center";
    this.ctx.textBaseline = "middle";

    let x = GAME_WIDTH / 2 - this.ctx.measureText(title).width / 2 + 60;
    const baseY = 150;

    for (let i = 0; i < title.length; i++) {
      const char = title[i];
      if (!char) continue;
      const bounceVal = this.titleBounce[i] ?? 0;
      const bounce = Math.sin(bounceVal) * 15;

      // Draw shadow
      this.ctx.fillStyle = "rgba(0,0,0,0.2)";
      this.ctx.fillText(char, x + 3, baseY + bounce + 3);

      // Draw character
      this.ctx.fillStyle = SEA_DARK_BLUE;
      this.ctx.fillText(char, x, baseY + bounce);

      const charWidth = this.ctx.measureText(char).width;
      x += charWidth;
    }

    // Draw buttons
    this.drawButton(GAME_WIDTH / 2, 420, "PLAY", this.hoveredButton === "play");
    this.drawButton(
      GAME_WIDTH / 2,
      480,
      "INSTRUCTIONS",
      this.hoveredButton === "instructions",
    );
  }

  private renderInstructions(): void {
    this.ctx.font = "bold 28px 'Comic Sans MS', cursive";
    this.ctx.fillStyle = "#00CED1";
    this.ctx.textAlign = "center";

    // Instruction texts
    this.ctx.fillText("Eat smaller fish to grow bigger!", GAME_WIDTH / 2, 60);

    // Draw example fish (big eating small)
    this.drawFish(GAME_WIDTH / 2 - 40, 110, 25, 1, 0, 0);
    this.drawFish(GAME_WIDTH / 2 + 50, 110, 12, -1, 4, 0);

    this.ctx.fillText("Don't get eaten by bigger fish!", GAME_WIDTH / 2, 200);

    // Draw example (big fish chasing small)
    this.drawFish(GAME_WIDTH / 2 - 50, 260, 50, 1, 1, 0);
    this.drawFish(GAME_WIDTH / 2 + 70, 255, 18, -1, 0, 0);

    this.ctx.fillText(
      "Use the arrow keys to control movement",
      GAME_WIDTH / 2,
      360,
    );

    // Draw arrow keys
    this.drawArrowKeys(GAME_WIDTH / 2, 440);

    this.ctx.font = "italic 24px 'Comic Sans MS', cursive";
    this.ctx.fillText(
      "The bigger the fish, the more you will grow,",
      GAME_WIDTH / 2,
      530,
    );
    this.ctx.fillText(
      "and the more points you will recieve!",
      GAME_WIDTH / 2,
      560,
    );

    // Back button
    this.drawButton(GAME_WIDTH / 2, 610, "BACK", this.hoveredButton === "back");
  }

  private drawArrowKeys(cx: number, cy: number): void {
    const keySize = 40;
    const gap = 5;

    const drawKey = (x: number, y: number, arrow: string) => {
      // Key background
      this.ctx.fillStyle = "#D3D3D3";
      this.ctx.strokeStyle = "#808080";
      this.ctx.lineWidth = 2;

      this.ctx.beginPath();
      this.ctx.roundRect(x - keySize / 2, y - keySize / 2, keySize, keySize, 5);
      this.ctx.fill();
      this.ctx.stroke();

      // Arrow
      this.ctx.fillStyle = "#404040";
      this.ctx.font = "bold 20px Arial";
      this.ctx.textAlign = "center";
      this.ctx.textBaseline = "middle";
      this.ctx.fillText(arrow, x, y);
    };

    // Up
    drawKey(cx, cy - keySize - gap, "\u2191");
    // Left
    drawKey(cx - keySize - gap, cy, "\u2190");
    // Down
    drawKey(cx, cy, "\u2193");
    // Right
    drawKey(cx + keySize + gap, cy, "\u2192");
  }

  private renderPlaying(): void {
    // Draw bubbles
    for (const bubble of this.bubbles) {
      this.ctx.beginPath();
      this.ctx.arc(bubble.x, bubble.y, bubble.size, 0, Math.PI * 2);
      this.ctx.fillStyle = `rgba(200, 230, 255, ${bubble.opacity})`;
      this.ctx.fill();
      this.ctx.strokeStyle = `rgba(150, 200, 230, ${bubble.opacity})`;
      this.ctx.lineWidth = 1;
      this.ctx.stroke();
    }

    // Draw NPCs
    for (const npc of this.npcs) {
      this.drawFish(
        npc.x,
        npc.y,
        npc.size,
        npc.direction,
        npc.colorIndex,
        npc.animationPhase,
      );
    }

    // Draw player
    const pulseScale = 1 + this.playerPulse * 0.15;
    this.drawFish(
      this.playerX,
      this.playerY,
      this.playerSize * pulseScale,
      this.playerDirection,
      0, // Orange color
      this.playerAnimationPhase,
    );

    // Draw score
    this.ctx.font = "bold 48px 'Comic Sans MS', cursive";
    this.ctx.fillStyle = SEA_DARK_BLUE;
    this.ctx.textAlign = "center";
    this.ctx.fillText(this.score.toString(), GAME_WIDTH / 2, 50);

    // Draw fishbone counters
    this.drawFishboneCounters();
  }

  private drawFish(
    x: number,
    y: number,
    size: number,
    direction: 1 | -1,
    colorIndex: number,
    animPhase: number,
  ): void {
    const colors = FISH_COLORS[colorIndex] ?? FISH_COLORS[0]!;
    const color0 = colors[0] ?? "#FF6B4A";
    const color1 = colors[1] ?? "#FF8B3A";
    const tailWag = Math.sin(animPhase) * 0.3;

    this.ctx.save();
    this.ctx.translate(x, y);
    this.ctx.scale(direction, 1);

    // Body gradient
    const bodyGrad = this.ctx.createLinearGradient(
      0,
      -size * 0.4,
      0,
      size * 0.4,
    );
    bodyGrad.addColorStop(0, color0);
    bodyGrad.addColorStop(1, color1);

    // Body (ellipse)
    this.ctx.fillStyle = bodyGrad;
    this.ctx.beginPath();
    this.ctx.ellipse(0, 0, size * 0.8, size * 0.4, 0, 0, Math.PI * 2);
    this.ctx.fill();

    // Tail
    this.ctx.save();
    this.ctx.translate(-size * 0.6, 0);
    this.ctx.rotate(tailWag);
    this.ctx.fillStyle = color1;
    this.ctx.beginPath();
    this.ctx.moveTo(0, 0);
    this.ctx.lineTo(-size * 0.5, -size * 0.35);
    this.ctx.lineTo(-size * 0.3, 0);
    this.ctx.lineTo(-size * 0.5, size * 0.35);
    this.ctx.closePath();
    this.ctx.fill();
    this.ctx.restore();

    // Dorsal fin
    this.ctx.fillStyle = color1;
    this.ctx.beginPath();
    this.ctx.moveTo(0, -size * 0.35);
    this.ctx.quadraticCurveTo(
      size * 0.1,
      -size * 0.6,
      -size * 0.2,
      -size * 0.35,
    );
    this.ctx.closePath();
    this.ctx.fill();

    // Gill lines
    this.ctx.strokeStyle = "rgba(0,0,0,0.2)";
    this.ctx.lineWidth = size * 0.03;
    this.ctx.beginPath();
    this.ctx.arc(size * 0.15, 0, size * 0.25, -0.5, 0.5);
    this.ctx.stroke();

    // Eye
    const eyeX = size * 0.4;
    const eyeY = -size * 0.08;
    const eyeSize = size * 0.15;

    // Eye white
    this.ctx.fillStyle = "white";
    this.ctx.beginPath();
    this.ctx.arc(eyeX, eyeY, eyeSize, 0, Math.PI * 2);
    this.ctx.fill();

    // Eye pupil
    this.ctx.fillStyle = "black";
    this.ctx.beginPath();
    this.ctx.arc(eyeX + eyeSize * 0.2, eyeY, eyeSize * 0.6, 0, Math.PI * 2);
    this.ctx.fill();

    // Eye highlight
    this.ctx.fillStyle = "white";
    this.ctx.beginPath();
    this.ctx.arc(
      eyeX + eyeSize * 0.1,
      eyeY - eyeSize * 0.2,
      eyeSize * 0.25,
      0,
      Math.PI * 2,
    );
    this.ctx.fill();

    this.ctx.restore();
  }

  private drawFishboneCounters(): void {
    const startX = 20;
    const startY = GAME_HEIGHT - 30;

    // Calculate counts for each level
    const level1 = this.fishEaten % 5;
    const level2 = Math.floor(this.fishEaten / 5) % 5;
    const level3 = Math.floor(this.fishEaten / 25);

    // Draw level 1 (smallest)
    for (let i = 0; i < level1; i++) {
      this.drawFishbone(startX + i * 25, startY, 20);
    }

    // Draw level 2 (medium)
    for (let i = 0; i < level2; i++) {
      this.drawFishbone(startX + i * 35, startY - 25, 30);
    }

    // Draw level 3 (largest) - no cap
    for (let i = 0; i < level3; i++) {
      this.drawFishbone(startX + i * 45, startY - 55, 40);
    }
  }

  private drawFishbone(x: number, y: number, size: number): void {
    this.ctx.save();
    this.ctx.translate(x, y);

    const boneColor = "rgba(220, 220, 210, 0.85)";
    this.ctx.strokeStyle = boneColor;
    this.ctx.fillStyle = boneColor;
    this.ctx.lineWidth = size * 0.08;
    this.ctx.lineCap = "round";

    // Spine
    this.ctx.beginPath();
    this.ctx.moveTo(-size * 0.5, 0);
    this.ctx.lineTo(size * 0.3, 0);
    this.ctx.stroke();

    // Head
    this.ctx.beginPath();
    this.ctx.ellipse(
      size * 0.35,
      0,
      size * 0.15,
      size * 0.12,
      0,
      0,
      Math.PI * 2,
    );
    this.ctx.fill();

    // Ribs
    const ribCount = 4;
    for (let i = 0; i < ribCount; i++) {
      const ribX = -size * 0.3 + (i * size * 0.5) / ribCount;
      this.ctx.beginPath();
      this.ctx.moveTo(ribX, 0);
      this.ctx.lineTo(ribX - size * 0.08, -size * 0.2);
      this.ctx.moveTo(ribX, 0);
      this.ctx.lineTo(ribX - size * 0.08, size * 0.2);
      this.ctx.stroke();
    }

    // Tail
    this.ctx.beginPath();
    this.ctx.moveTo(-size * 0.5, 0);
    this.ctx.lineTo(-size * 0.65, -size * 0.15);
    this.ctx.moveTo(-size * 0.5, 0);
    this.ctx.lineTo(-size * 0.65, size * 0.15);
    this.ctx.stroke();

    this.ctx.restore();
  }

  private renderGameOver(): void {
    // Draw score at top
    this.ctx.font = "bold 48px 'Comic Sans MS', cursive";
    this.ctx.fillStyle = SEA_DARK_BLUE;
    this.ctx.textAlign = "center";
    this.ctx.fillText(this.score.toString(), GAME_WIDTH / 2, 50);

    // Draw fishbone counters
    this.drawFishboneCounters();

    // Draw ghost fish
    this.drawGhostFish(GAME_WIDTH / 2, this.ghostY);

    // Draw "GULP!!!"
    this.ctx.font = "bold 100px 'Comic Sans MS', cursive";
    this.ctx.fillStyle = SEA_DARK_BLUE;
    this.ctx.textAlign = "center";
    this.ctx.fillText("GULP!!!", GAME_WIDTH / 2, 280);

    // OK button
    this.drawButton(GAME_WIDTH / 2, 380, "OK", this.hoveredButton === "ok");
  }

  private drawGhostFish(x: number, y: number): void {
    this.ctx.save();
    this.ctx.globalAlpha = 0.6;

    // Ghost fish body
    const size = 40;
    this.ctx.fillStyle = "rgba(200, 210, 220, 0.8)";
    this.ctx.strokeStyle = "rgba(180, 190, 200, 0.8)";
    this.ctx.lineWidth = 2;

    // Body
    this.ctx.beginPath();
    this.ctx.ellipse(x, y, size * 0.8, size * 0.4, 0, 0, Math.PI * 2);
    this.ctx.fill();
    this.ctx.stroke();

    // Tail
    this.ctx.beginPath();
    this.ctx.moveTo(x - size * 0.6, y);
    this.ctx.lineTo(x - size, y - size * 0.3);
    this.ctx.lineTo(x - size * 0.8, y);
    this.ctx.lineTo(x - size, y + size * 0.3);
    this.ctx.closePath();
    this.ctx.fill();
    this.ctx.stroke();

    // Eye
    this.ctx.fillStyle = "rgba(150, 160, 170, 0.9)";
    this.ctx.beginPath();
    this.ctx.arc(x + size * 0.3, y - size * 0.05, size * 0.12, 0, Math.PI * 2);
    this.ctx.fill();

    // X marks for dead eyes
    this.ctx.strokeStyle = "rgba(100, 110, 120, 0.9)";
    this.ctx.lineWidth = 2;
    const eyeX = x + size * 0.3;
    const eyeY = y - size * 0.05;
    const xSize = size * 0.08;
    this.ctx.beginPath();
    this.ctx.moveTo(eyeX - xSize, eyeY - xSize);
    this.ctx.lineTo(eyeX + xSize, eyeY + xSize);
    this.ctx.moveTo(eyeX + xSize, eyeY - xSize);
    this.ctx.lineTo(eyeX - xSize, eyeY + xSize);
    this.ctx.stroke();

    this.ctx.restore();
  }

  private renderPlayAgain(): void {
    // Draw score at top
    this.ctx.font = "bold 48px 'Comic Sans MS', cursive";
    this.ctx.fillStyle = SEA_DARK_BLUE;
    this.ctx.textAlign = "center";
    this.ctx.fillText(this.score.toString(), GAME_WIDTH / 2, 80);

    // Draw fishbone counters
    this.drawFishboneCounters();

    // Play Again button
    this.drawButton(
      GAME_WIDTH / 2,
      300,
      "PLAY AGAIN",
      this.hoveredButton === "playagain",
    );
  }

  private drawButton(
    x: number,
    y: number,
    text: string,
    hovered: boolean,
  ): void {
    const scale = hovered ? 1.15 : 1;

    this.ctx.save();
    this.ctx.translate(x, y);
    this.ctx.scale(scale, scale);
    this.ctx.translate(-x, -y);

    this.ctx.font = "bold 32px 'Comic Sans MS', cursive";
    this.ctx.fillStyle = SEA_DARK_BLUE;
    this.ctx.textAlign = "center";
    this.ctx.textBaseline = "middle";
    this.ctx.fillText(text, x, y);

    this.ctx.restore();
  }
}

// Start the game
new FishyGame();
