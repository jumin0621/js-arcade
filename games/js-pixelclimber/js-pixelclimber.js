import { saveGameScore } from "../../common/firebase-config.js";

// 마우스 우클릭 시 컨텍스트 메뉴 방지
window.addEventListener("contextmenu", (e) => e.preventDefault());

const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const scoreEl = document.getElementById("scoreDisplay");
const comboEl = document.getElementById("comboDisplay");
const feverEl = document.getElementById("feverDisplay");
const gaugeBar = document.getElementById("gaugeBar");

const modal = document.getElementById("gameModal");
const modalTitle = document.getElementById("modalTitle");
const modalDesc = document.getElementById("modalDesc");
const startBtn = document.getElementById("startBtn");
const restartBtn = document.getElementById("restartBtn");
const rankInputArea = document.getElementById("rankInputArea");
const nicknameInput = document.getElementById("nicknameInput");

const btnTurn = document.getElementById("btnTurn");
const btnClimb = document.getElementById("btnClimb");

// --- 🎨 픽셀 아트 데이터 ---
const charArtRight = [
	[0, 1, 1, 1, 1, 0, 0],
	[1, 1, 2, 2, 2, 2, 0],
	[1, 2, 2, 2, 1, 2, 0],
	[0, 1, 2, 2, 2, 2, 0],
	[0, 0, 3, 3, 3, 0, 0],
	[0, 0, 4, 0, 4, 0, 0],
	[0, 1, 1, 0, 1, 1, 0],
];

const charArtLeft = [
	[0, 0, 1, 1, 1, 1, 0],
	[0, 2, 2, 2, 2, 1, 1],
	[0, 2, 1, 2, 2, 2, 1],
	[0, 2, 2, 2, 2, 1, 0],
	[0, 0, 3, 3, 3, 0, 0],
	[0, 0, 4, 0, 4, 0, 0],
	[0, 1, 1, 0, 1, 1, 0],
];

// ☁️ 구름 픽셀 아트
const cloudArt = [
	[0, 0, 1, 1, 0, 0, 0],
	[0, 1, 1, 1, 1, 0, 0],
	[1, 1, 1, 1, 1, 1, 0],
	[0, 1, 1, 1, 1, 1, 1],
];

const colors = {
	1: "#000",
	2: "#ffccaa",
	3: "#00e5ff",
	4: "#ff2e63",
	5: "#444",
	6: "#fff",
};

const stairWidth = 70;
const stairHeight = 45;

// --- 게임 상태 ---
let score = 0;
let combo = 0;
let lastStepTime = 0;
let gauge = 100;
let isFever = false;
let feverTimer = 0;
let gameActive = false;
let animationId;
let stairs = [];
let particles = [];
let clouds = [];

// 플레이어 & 카메라
let player = { idx: 0, dir: 1, x: 0, y: 0, vY: 0, isFalling: false };
let camera = { x: 0, y: 0, targetX: 0, targetY: 0 };

function resizeCanvas() {
	canvas.width = canvas.parentElement.clientWidth;
	canvas.height = canvas.parentElement.clientHeight;
}
window.addEventListener("resize", resizeCanvas);
resizeCanvas();

function initGame() {
	score = 0;
	combo = 0;
	gauge = 100;
	isFever = false;
	feverTimer = 0;
	stairs = [];
	particles = [];
	clouds = [];
	player = { idx: 0, dir: 1, x: 0, y: 0, vY: 0, isFalling: false };
	camera = { x: 0, y: 0, targetX: 0, targetY: 0 };

	scoreEl.innerText = score;
	updateCombo(0);
	feverEl.innerText = "OFF";
	feverEl.style.color = "#ff2e63";

	// ☁️ 무한 스크롤 구름 세팅
	for (let i = 0; i < 8; i++) {
		clouds.push({
			x: Math.random() * canvas.width,
			y: Math.random() * canvas.height,
			speed: Math.random() * 0.5 + 0.2,
			size: Math.floor(Math.random() * 4) + 4,
		});
	}

	stairs.push({ x: 0, y: 0, dir: 1 });
	for (let i = 0; i < 50; i++) generateNextStair();

	player.x = stairs[0].x;
	player.y = stairs[0].y;
	camera.x = player.x;
	camera.y = player.y - canvas.height * 0.3;

	lastStepTime = Date.now();
	gameActive = true;
	requestAnimationFrame(update);
}

function generateNextStair() {
	const last = stairs[stairs.length - 1];
	let nextDir = Math.random() > 0.5 ? last.dir : -last.dir;

	if (last.x > 180) nextDir = -1;
	if (last.x < -180) nextDir = 1;

	stairs.push({
		x: last.x + nextDir * stairWidth,
		y: last.y - stairHeight,
		dir: nextDir,
	});
}

function handleAction(action) {
	if (!gameActive || player.isFalling) return;

	lastStepTime = Date.now();
	const nextStair = stairs[player.idx + 1];

	let attemptDir = action === "climb" ? player.dir : -player.dir;

	if (action === "turn") player.dir = attemptDir;

	if (attemptDir === nextStair.dir) {
		successStep();
	} else {
		failFall(attemptDir);
	}
}

function successStep() {
	player.idx++;
	player.x = stairs[player.idx].x;
	player.y = stairs[player.idx].y;

	score += isFever ? 2 : 1;
	scoreEl.innerText = score;

	combo++;
	updateCombo(combo);

	gauge = Math.min(100, gauge + (isFever ? 10 : 5));

	createParticles(player.x, player.y, 5);

	if (combo > 0 && combo % 50 === 0 && !isFever) {
		isFever = true;
		feverTimer = 300;
		feverEl.innerText = "ON!";
		feverEl.style.color = "#00ff88";
		createParticles(player.x, player.y, 30);
	}

	generateNextStair();
}

function failFall(fallDir) {
	player.isFalling = true;
	player.vY = -12;
	player.x += fallDir * 35;
	setTimeout(gameOver, 1000);
}

function updateCombo(c) {
	if (c > 1) {
		comboEl.innerText = `${c} COMBO!`;
		comboEl.classList.add("active");
		setTimeout(() => comboEl.classList.remove("active"), 100);
	} else {
		comboEl.innerText = "";
	}
}

class Particle {
	constructor(x, y, isFeverEffect) {
		this.x = x;
		this.y = y;
		this.vx = (Math.random() - 0.5) * (isFeverEffect ? 15 : 8);
		this.vy = (Math.random() - 0.5) * (isFeverEffect ? 15 : 8);
		this.life = 1;
		this.color = isFeverEffect
			? ["#bb86fc", "#00e5ff", "#ff2e63", "#ffeb3b"][
					Math.floor(Math.random() * 4)
				]
			: ["#ffffff", "#dddddd", "#aaaaaa"][Math.floor(Math.random() * 3)];
	}
	update() {
		this.x += this.vx;
		this.y += this.vy;
		this.life -= 0.02;
	}
	draw(ctx) {
		ctx.globalAlpha = Math.max(0, this.life);
		ctx.fillStyle = this.color;
		ctx.fillRect(this.x, this.y, 6, 6);
		ctx.globalAlpha = 1;
	}
}

function createParticles(x, y, count) {
	for (let i = 0; i < count; i++) {
		particles.push(new Particle(x, y, isFever));
	}
}

function drawGenericPixelArt(art, x, y, size, color) {
	ctx.fillStyle = color;
	for (let r = 0; r < art.length; r++) {
		for (let c = 0; c < art[r].length; c++) {
			if (art[r][c] === 1) {
				ctx.fillRect(x + c * size, y + r * size, size, size);
			}
		}
	}
}

function update() {
	if (!gameActive && !player.isFalling) return;

	ctx.clearRect(0, 0, canvas.width, canvas.height);

	if (gameActive && !player.isFalling) {
		if (Date.now() - lastStepTime > 1000) {
			combo = 0;
			updateCombo(0);
		}

		if (!isFever) {
			const dropRate = 0.1 + score * 0.002;
			gauge -= dropRate;
		}

		gaugeBar.style.width = `${Math.max(0, gauge)}%`;

		if (isFever)
			gaugeBar.style.background = "linear-gradient(90deg, #ffeb3b, #ff2e63)";
		else if (gauge > 50)
			gaugeBar.style.background = "linear-gradient(90deg, #00ff88, #00e5ff)";
		else if (gauge > 20)
			gaugeBar.style.background = "linear-gradient(90deg, #ffeb3b, #ff9800)";
		else gaugeBar.style.background = "linear-gradient(90deg, #ff2e63, #ff0000)";

		if (gauge <= 0 && !isFever) {
			player.isFalling = true;
			player.vY = 0;
			setTimeout(gameOver, 500);
		}

		if (isFever) {
			feverTimer--;
			if (feverTimer <= 0) {
				isFever = false;
				feverEl.innerText = "OFF";
				feverEl.style.color = "#ff2e63";
			}
		}
	}

	camera.targetX = player.x * 0.5;
	camera.targetY = player.y - canvas.height * 0.25;

	camera.x += (camera.targetX - camera.x) * 0.15;
	camera.y += (camera.targetY - camera.y) * 0.15;

	// --- ☁️ 1. 무한 스크롤 구름 ---
	clouds.forEach((c) => {
		c.x -= c.speed;
		if (c.x < -100) c.x = canvas.width + 100;

		let parallaxY = (c.y - camera.y * 0.1) % (canvas.height + 200);
		if (parallaxY < -100) parallaxY += canvas.height + 200;
		if (parallaxY > canvas.height + 100) parallaxY -= canvas.height + 200;

		drawGenericPixelArt(
			cloudArt,
			c.x,
			parallaxY,
			c.size,
			"rgba(255, 255, 255, 0.05)",
		);
	});

	ctx.save();
	ctx.translate(canvas.width / 2 - camera.x, canvas.height / 2 - camera.y);

	if (isFever && Math.random() > 0.5) {
		ctx.fillStyle = "rgba(187, 134, 252, 0.1)";
		ctx.fillRect(
			camera.x - canvas.width,
			camera.y - canvas.height,
			canvas.width * 2,
			canvas.height * 2,
		);
	}

	stairs.forEach((s, i) => {
		if (s.y > camera.y + canvas.height / 2 + 100) return;
		if (s.y < camera.y - canvas.height / 2 - 100) return;

		ctx.fillStyle =
			i === player.idx ? "#00e5ff" : i < player.idx ? "#222" : "#444";
		ctx.fillRect(s.x - stairWidth / 2, s.y, stairWidth, 15);
		ctx.fillStyle =
			i === player.idx ? "#008b99" : i < player.idx ? "#111" : "#2a2a2a";
		ctx.fillRect(s.x - stairWidth / 2, s.y + 15, stairWidth, stairHeight - 15);
	});

	particles.forEach((p, i) => {
		p.update();
		p.draw(ctx);
		if (p.life <= 0) particles.splice(i, 1);
	});

	if (player.isFalling) {
		player.y += player.vY;
		player.vY += 0.8;
	}

	drawPixelChar(player.x, player.y, player.dir, isFever);

	ctx.restore();

	if (gameActive || player.isFalling) {
		animationId = requestAnimationFrame(update);
	}
}

function drawPixelChar(x, y, dir, fever) {
	const pixelSize = 5;
	const art = dir === 1 ? charArtRight : charArtLeft;
	const width = art[0].length * pixelSize;
	const height = art.length * pixelSize;

	ctx.save();
	ctx.translate(x, y - height);

	for (let row = 0; row < art.length; row++) {
		for (let col = 0; col < art[row].length; col++) {
			const colorCode = art[row][col];
			if (colorCode !== 0) {
				if (fever && colorCode === 6) {
					ctx.shadowBlur = 10;
					ctx.shadowColor = "#fff";
				}
				ctx.fillStyle = colors[colorCode];
				ctx.fillRect(
					col * pixelSize - width / 2,
					row * pixelSize,
					pixelSize,
					pixelSize,
				);
			}
		}
	}
	ctx.restore();
}

function showStartModal() {
	modalTitle.innerText = "PIXEL CLIMBER";
	modalDesc.innerHTML =
		"버튼 두 개로 무한히 계단을 오르세요!<br>빠르게 올라가면 피버 타임이 발동합니다.";
	rankInputArea.style.display = "none";
	restartBtn.style.display = "none";

	startBtn.innerText = "게임 시작";
	startBtn.disabled = false;
	startBtn.onclick = () => {
		modal.style.display = "none";
		initGame();
	};
	modal.style.display = "flex";
}

function gameOver() {
	gameActive = false;
	cancelAnimationFrame(animationId);

	modalTitle.innerText = "GAME OVER";
	modalDesc.innerHTML = `발을 헛디뎠습니다!<br>최종 기록: <strong style="color:#00e5ff; font-size:1.2rem;">${score}</strong> 계단`;

	rankInputArea.style.display = "block";
	restartBtn.style.display = "block";
	nicknameInput.value = "";

	startBtn.innerText = "랭킹 등록";
	startBtn.disabled = false;
	restartBtn.innerText = "처음으로";

	startBtn.onclick = async () => {
		const nickname = nicknameInput.value.trim();
		if (!nickname || nickname.length < 2)
			return alert("닉네임을 2자 이상 입력해주세요!");

		startBtn.disabled = true;
		startBtn.innerText = "데이터 등록 중...";

		const result = await saveGameScore("pixelclimber", nickname, score);
		alert(result.msg);

		if (result.status !== "error") {
			showStartModal();
		} else {
			startBtn.disabled = false;
			startBtn.innerText = "랭킹 등록";
		}
	};

	restartBtn.onclick = () => showStartModal();

	modal.style.display = "flex";
}

const bindControl = (elem, action) => {
	if (!elem) return;
	elem.addEventListener("mousedown", (e) => {
		e.preventDefault();
		handleAction(action);
	});
	elem.addEventListener(
		"touchstart",
		(e) => {
			e.preventDefault();
			handleAction(action);
		},
		{ passive: false },
	);
};

bindControl(btnTurn, "turn");
bindControl(btnClimb, "climb");

window.addEventListener("keydown", (e) => {
	if (!gameActive) return;
	if (e.key === "ArrowLeft" || e.key === "z" || e.key === "Z")
		handleAction("turn");
	if (e.key === "ArrowRight" || e.key === "x" || e.key === "X")
		handleAction("climb");
});

showStartModal();
