const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
const scoreEl = document.getElementById("scoreDisplay");
const statusEl = document.getElementById("statusDisplay");
const modal = document.getElementById("gameModal");
const startBtn = document.getElementById("startBtn");
const btnJump = document.getElementById("btnJump");

canvas.width = 480;
canvas.height = 270;

let gameActive = false;
let score = 0;
let gameSpeed = 3;
let frameCount = 0;
let bgObjects = [];
let obstacles = [],
	clouds = [],
	items = [];
let isInvincible = false;
let invincibleTimer = 0;
let nextSpawnFrame = 100;
const input = { jumping: false };

// --- 픽셀 데이터 ---
const playerPixel = [
	[0, 1, 1, 0],
	[0, 1, 1, 0],
	[1, 1, 1, 1],
	[0, 1, 1, 0],
	[0, 1, 0, 1],
];
const bugPixel = [
	[1, 0, 1],
	[1, 1, 1],
	[1, 1, 1],
];
const errorPixel = [
	[1, 1, 1],
	[1, 0, 1],
	[1, 1, 1],
	[0, 1, 0],
];

let player = {
	x: 60,
	y: 0,
	baseWidth: 24,
	baseHeight: 30,
	width: 24,
	height: 30,
	dy: 0,
	jumpForce: -12,
	gravity: 0.6,
	grounded: false,
	color: "#bb86fc",
	animFrame: 0,
};

// --- 클래스 정의 ---
class Cloud {
	constructor() {
		this.x = canvas.width + Math.random() * 200;
		this.y = 20 + Math.random() * 50;
		this.speed = 0.5 + Math.random() * 0.5;
	}
	draw() {
		ctx.fillStyle = "rgba(187, 134, 252, 0.2)";
		ctx.fillRect(this.x, this.y, 25, 8);
		ctx.fillRect(this.x + 8, this.y - 6, 20, 6);
	}
	update() {
		this.x -= this.speed;
	}
}

class BackgroundObject {
	constructor(type) {
		this.type = type;
		this.x = canvas.width + 50;
		if (this.type === "tree") {
			this.width = 40;
			this.height = 60 + Math.random() * 20;
			this.y = canvas.height - 20 - this.height;
			this.speed = 2.0;
			this.color = "#2d5a27";
		} else {
			this.width = 60 + Math.random() * 20;
			this.height = 100 + Math.random() * 80;
			this.y = canvas.height - 20 - this.height;
			this.speed = 1.2;
			this.color = "#2a2a35";
		}
	}
	update() {
		this.x -= this.speed;
	}
	draw() {
		ctx.fillStyle = this.color;
		if (this.type === "tree") {
			// [수정] 소나무처럼 뾰족한 픽셀 나무 그리기
			const centerX = this.x + this.width / 2;
			ctx.fillRect(centerX - 4, this.y + this.height - 15, 8, 15); // 기둥
			// 3단 잎 (삼각형 느낌의 픽셀 레이어)
			ctx.fillRect(centerX - 20, this.y + this.height - 35, 40, 10); // 하단 잎
			ctx.fillRect(centerX - 15, this.y + this.height - 50, 30, 10); // 중단 잎
			ctx.fillRect(centerX - 8, this.y + this.height - 65, 16, 15); // 상단 뾰족 잎
		} else {
			ctx.fillRect(this.x, this.y, this.width, this.height);
			ctx.fillStyle = "rgba(255, 255, 255, 0.05)";
			ctx.fillRect(this.x + 5, this.y + 10, this.width - 10, 5);
		}
	}
}

class Obstacle {
	constructor(type) {
		this.type = type;
		this.width = 24;
		this.height = 24;
		this.x = canvas.width;
		this.y =
			type === "ground"
				? canvas.height - 20 - this.height
				: Math.random() * 80 + 20;
		this.color = type === "ground" ? "#00e5ff" : "#ff0266";
		this.vx = -gameSpeed;
		this.vy = 0;
		this.isTargeted = false;
	}
	draw() {
		ctx.save();
		ctx.shadowBlur = 10;
		ctx.shadowColor = this.color;
		ctx.fillStyle = this.color;
		const pSize = this.width / 3;
		const pixelMap = this.type === "ground" ? bugPixel : errorPixel;
		pixelMap.forEach((row, ri) => {
			row.forEach((col, ci) => {
				if (col)
					ctx.fillRect(this.x + ci * pSize, this.y + ri * pSize, pSize, pSize);
			});
		});
		ctx.restore();
	}
	update() {
		if (this.type === "air") {
			if (!this.isTargeted && this.x < 300) {
				const dx = player.x - this.x;
				const dy = player.y - this.y;
				const dist = Math.sqrt(dx * dx + dy * dy);
				this.vx = (dx / dist) * (gameSpeed + 2);
				this.vy = (dy / dist) * (gameSpeed + 2);
				this.isTargeted = true;
			}
			this.x += this.vx;
			this.y += this.vy;
		} else {
			this.x -= gameSpeed;
		}
	}
}

class Item {
	constructor() {
		this.width = 20;
		this.height = 20;
		this.x = canvas.width;
		this.y = canvas.height - 75;
	}
	draw() {
		ctx.save();
		ctx.shadowBlur = 15;
		ctx.shadowColor = "#ffff00";
		ctx.fillStyle = "#ffff00";
		ctx.fillRect(this.x, this.y, this.width, this.height);
		ctx.restore();
	}
	update() {
		this.x -= gameSpeed;
	}
}

// --- 게임 엔진 ---
function initGame() {
	gameActive = true;
	score = 0;
	gameSpeed = 5;
	frameCount = 0;
	obstacles = [];
	clouds = [new Cloud()];
	bgObjects = [];
	items = [];
	isInvincible = false;
	invincibleTimer = 0;
	nextSpawnFrame = 100;
	player.y = canvas.height - 20 - player.height;
	player.dy = 0;

	scoreEl.innerText = "0";
	statusEl.innerText = "RUNNING";
	modal.style.display = "none";
	updateLoop();
}

function updateLoop() {
	if (!gameActive) return;

	frameCount++;
	// 1초(60프레임)마다 점수가 1씩 올라가도록 변경
	// frameCount를 60으로 나눈 나머지가 0일 때만 점수를 올립니다.
	if (frameCount % 60 === 0) {
		score += 1;
		scoreEl.innerText = score;
	}

	if (frameCount % 300 === 0) gameSpeed += 0.2;

	// 배경 요소 생성
	if (frameCount % 120 === 0) bgObjects.push(new BackgroundObject("tree"));
	if (frameCount % 450 === 0) bgObjects.push(new BackgroundObject("building"));
	bgObjects.forEach((obj, i) => {
		obj.update();
		if (obj.x + obj.width < -50) bgObjects.splice(i, 1);
	});

	// [수정] 2. 장애물 출현 빈도 보정 (강제 생성 주기 단축)
	if (frameCount >= nextSpawnFrame) {
		obstacles.push(new Obstacle(Math.random() > 0.4 ? "ground" : "air"));
		nextSpawnFrame =
			frameCount + Math.floor(Math.random() * (120 - gameSpeed * 4) + 40);
	}

	// 무적 상태 처리
	if (isInvincible) {
		invincibleTimer--;
		player.width = player.baseWidth * 1.5;
		player.height = player.baseHeight * 1.5;
		if (invincibleTimer <= 0) {
			isInvincible = false;
			player.width = player.baseWidth;
			player.height = player.baseHeight;
		}
	}

	// 점프 및 물리
	if (input.jumping && player.grounded) {
		player.dy = player.jumpForce;
		player.grounded = false;
	}
	player.dy += player.gravity;
	player.y += player.dy;

	if (player.y + player.height > canvas.height - 20) {
		player.y = canvas.height - 20 - player.height;
		player.dy = 0;
		player.grounded = true;
	}

	// 구름
	if (frameCount % 180 === 0) clouds.push(new Cloud());
	clouds.forEach((c, i) => {
		c.update();
		if (c.x + 50 < 0) clouds.splice(i, 1);
	});

	// 장애물 업데이트 및 충돌
	obstacles.forEach((ob, i) => {
		ob.update();
		if (
			!isInvincible &&
			player.x < ob.x + ob.width - 5 &&
			player.x + player.width - 5 > ob.x &&
			player.y < ob.y + ob.height &&
			player.y + player.height > ob.y
		) {
			gameOver();
		}
		if (ob.x + ob.width < -50 || ob.y > canvas.height + 50) {
			obstacles.splice(i, 1);
		}
	});

	// 아이템
	if (frameCount % 1500 === 0) items.push(new Item());
	items.forEach((it, i) => {
		it.update();
		if (
			player.x < it.x + it.width &&
			player.x + player.width > it.x &&
			player.y < it.y + it.height &&
			player.y + player.height > it.y
		) {
			items.splice(i, 1);
			isInvincible = true;
			invincibleTimer = 350;
		}
	});

	player.animFrame++;
	render();
	requestAnimationFrame(updateLoop);
}

function render() {
	ctx.clearRect(0, 0, canvas.width, canvas.height);
	clouds.forEach((c) => c.draw());
	bgObjects.forEach((obj) => obj.draw());

	ctx.strokeStyle = "#444";
	ctx.beginPath();
	ctx.moveTo(0, canvas.height - 20);
	ctx.lineTo(canvas.width, canvas.height - 20);
	ctx.stroke();

	ctx.save();
	if (isInvincible && frameCount % 10 < 5) ctx.globalAlpha = 0.3;
	ctx.fillStyle = player.color;
	const pSize = player.width / 4;
	playerPixel.forEach((row, ri) => {
		row.forEach((col, ci) => {
			if (col) {
				let drawY = player.y + ri * pSize;
				if (ri === 4) {
					const legPhase = Math.floor(player.animFrame / 6) % 2;
					if (
						player.grounded &&
						((legPhase === 0 && ci === 1) || (legPhase === 1 && ci === 3))
					)
						return;
				}
				ctx.fillRect(player.x + ci * pSize, drawY, pSize, pSize);
			}
		});
	});
	ctx.restore();

	obstacles.forEach((ob) => ob.draw());
	items.forEach((it) => it.draw());
}

function gameOver() {
	gameActive = false;
	statusEl.innerText = "CRASHED";
	modal.style.display = "flex";
}

// 이벤트 리스너
window.onkeydown = (e) => {
	if (["Space", "ArrowUp"].includes(e.code)) {
		e.preventDefault();
		input.jumping = true;
	}
};
window.onkeyup = (e) => {
	if (["Space", "ArrowUp"].includes(e.code)) input.jumping = false;
};
btnJump.onmousedown = btnJump.ontouchstart = (e) => {
	e.preventDefault();
	input.jumping = true;
};
btnJump.onmouseup = btnJump.ontouchend = () => {
	input.jumping = false;
};
startBtn.onclick = initGame;
