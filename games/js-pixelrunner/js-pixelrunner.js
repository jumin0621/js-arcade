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

class Obstacle {
	constructor(type) {
		this.type = type;
		this.width = 24;
		this.height = 24;
		this.x = canvas.width;
		// 공중 몬스터는 화면 상단에서 랜덤하게 생성
		this.y =
			type === "ground"
				? canvas.height - 20 - this.height
				: Math.random() * 50 + 20;
		this.color = type === "ground" ? "#00e5ff" : "#ff0266";

		// 사선 공격을 위한 벡터 계산
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
			// [수정] 캐릭터와 일정 거리가 되면 캐릭터 위치를 향해 사선 돌진
			if (!this.isTargeted && this.x < 350) {
				const dx = player.x - this.x;
				const dy = player.y - this.y;
				const dist = Math.sqrt(dx * dx + dy * dy);
				this.vx = (dx / dist) * (gameSpeed + 3);
				this.vy = (dy / dist) * (gameSpeed + 3);
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
		ctx.fillStyle = "#000";
		ctx.fillRect(this.x + 4, this.y + 4, 12, 12);
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
	items = [];
	isInvincible = false;
	invincibleTimer = 0;

	player.width = player.baseWidth;
	player.height = player.baseHeight;
	player.y = canvas.height - 20 - player.height;
	player.dy = 0;

	scoreEl.innerText = "0";
	statusEl.innerText = "RUNNING";
	modal.style.display = "none";
	updateLoop();
}

function updateLoop() {
	if (!gameActive) return;

	if (frameCount > 0 && frameCount % 200 === 0) gameSpeed += 0.3;

	if (frameCount >= nextSpawnFrame) {
		obstacles.push(new Obstacle(Math.random() > 0.4 ? "ground" : "air"));
		// 다음 출현까지의 대기 시간을 랜덤하게 설정 (속도가 빠를수록 대기 시간의 최대치 감소)
		nextSpawnFrame =
			frameCount + Math.floor(Math.random() * (150 - gameSpeed * 5) + 30);
	}

	// 무적 모드: 거대화 + 반짝임(투명도 조절)
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

	if (frameCount % 180 === 0) clouds.push(new Cloud());
	clouds.forEach((c, i) => {
		c.update();
		if (c.x + 40 < 0) clouds.splice(i, 1);
	});

	if (frameCount % Math.max(45, Math.floor(120 - gameSpeed * 2.5)) === 0) {
		obstacles.push(new Obstacle(Math.random() > 0.4 ? "ground" : "air"));
	}

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
		if (ob.x + ob.width < 0 || ob.y > canvas.height) {
			obstacles.splice(i, 1);
			score += 10;
			scoreEl.innerText = score;
		}
	});

	if (frameCount % 1200 === 0) items.push(new Item());
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
	frameCount++;
	render();
	requestAnimationFrame(updateLoop);
}

function handleJumpAction(e) {
	if (e) {
		// 브라우저가 터치를 스크롤로 오해하지 않게 차단
		if (e.cancelable) e.preventDefault();
	}

	// 원래 소스의 점프 방식에 맞춰 한 줄만 선택하세요
	if (typeof player !== "undefined" && player.jump) {
		player.jump(); // 직접 호출 방식일 때
	}
}

function handleJumpEnd() {
	if (typeof keys !== "undefined") {
		keys.jumping = false;
	}
}

// 1. 점프 버튼에 리스너 등록
btnJump.addEventListener("touchstart", handleJumpAction, { passive: false });
btnJump.addEventListener("mousedown", handleJumpAction);

// 2. 버튼에서 손을 뗐을 때 (keys 방식 사용 시 필요)
btnJump.addEventListener("touchend", handleJumpEnd);
btnJump.addEventListener("mouseup", handleJumpEnd);

// 3. 캔버스 영역 터치 시에도 점프하게 하려면 추가
canvas.addEventListener("touchstart", handleJumpAction, { passive: false });

function render() {
	ctx.clearRect(0, 0, canvas.width, canvas.height);
	clouds.forEach((c) => c.draw());
	ctx.strokeStyle = "#444";
	ctx.strokeRect(0, canvas.height - 20, canvas.width, 1);

	ctx.save();
	// [수정] 무적 상태일 때 거대해진 상태에서 깜빡임 효과 추가
	if (isInvincible && frameCount % 10 < 5) {
		ctx.globalAlpha = 0.3;
	}

	ctx.shadowBlur = 10;
	ctx.shadowColor = player.color;
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
	document.getElementById("modalTitle").innerText = "GAME OVER";
	document.getElementById("modalText").innerText =
		"밀려오는 버그를 피하지 못했습니다!";
	document.getElementById("startBtn").innerText = "다시 달리기";
	modal.style.display = "flex";
}

// --- 이벤트 핸들러 ---
window.onkeydown = (e) => {
	if (
		e.code === "Space" ||
		e.code === "ArrowUp" ||
		e.keyCode === 32 ||
		e.keyCode === 38
	) {
		e.preventDefault();
		input.jumping = true;
	}
};
window.onkeyup = (e) => {
	if (
		e.code === "Space" ||
		e.code === "ArrowUp" ||
		e.keyCode === 32 ||
		e.keyCode === 38
	) {
		input.jumping = false;
	}
};
btnJump.onmousedown = btnJump.ontouchstart = (e) => {
	e.preventDefault();
	input.jumping = true;
};
btnJump.onmouseup =
	btnJump.onmouseleave =
	btnJump.ontouchend =
		() => {
			input.jumping = false;
		};
startBtn.onclick = initGame;
