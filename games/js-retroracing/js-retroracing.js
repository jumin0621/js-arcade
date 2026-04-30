// 🔥 Firebase DB 연동 모듈 불러오기
import { saveGameScore } from "../../common/firebase-config.js";

window.addEventListener("contextmenu", (e) => e.preventDefault());

const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const scoreEl = document.getElementById("scoreDisplay");
const speedEl = document.getElementById("speedDisplay");
const modal = document.getElementById("gameModal");
const modalTitle = document.getElementById("modalTitle");
const modalDesc = document.getElementById("modalDesc");
const startBtn = document.getElementById("startBtn");
const restartBtn = document.getElementById("restartBtn");
const rankInputArea = document.getElementById("rankInputArea");
const nicknameInput = document.getElementById("nicknameInput");

function resizeCanvas() {
	canvas.width = canvas.parentElement.clientWidth;
	canvas.height = canvas.parentElement.clientHeight;
	if (player) player.y = canvas.height - 140;
}
window.addEventListener("resize", resizeCanvas);

// --- 🎨 픽셀 아트 데이터 ---
const colors = {
	1: "#111",
	2: "#222",
	3: "#e52521",
	4: "#004ae5",
	5: "#e5e521",
	6: "#ffffff",
	7: "#ff5722",
	8: "#4caf50",
	9: "#1b5e20",
	10: "#d500f9", // 보라색(돌진형)
};

const myCarArt = [
	[0, 0, 0, 1, 1, 1, 1, 0, 0, 0],
	[0, 0, 1, 6, 3, 3, 6, 1, 0, 0],
	[0, 1, 3, 3, 3, 3, 3, 3, 1, 0],
	[1, 1, 1, 3, 3, 3, 3, 1, 1, 1],
	[1, 2, 2, 2, 2, 2, 2, 2, 2, 1],
	[0, 1, 3, 6, 6, 6, 6, 3, 1, 0],
	[0, 1, 3, 6, 6, 6, 6, 3, 1, 0],
	[0, 1, 3, 6, 6, 6, 6, 3, 1, 0],
	[1, 2, 2, 2, 2, 2, 2, 2, 2, 1],
	[1, 1, 1, 3, 3, 3, 3, 1, 1, 1],
	[0, 1, 3, 3, 3, 3, 3, 3, 1, 0],
	[0, 0, 1, 7, 3, 3, 7, 1, 0, 0],
];

const blueCarArt = myCarArt.map((row) => row.map((c) => (c === 3 ? 4 : c)));
const yellowCarArt = myCarArt.map((row) => row.map((c) => (c === 3 ? 5 : c)));
const purpleCarArt = myCarArt.map((row) => row.map((c) => (c === 3 ? 10 : c)));

const treeArt = [
	[0, 0, 1, 1, 1, 0, 0],
	[0, 1, 8, 8, 9, 1, 0],
	[1, 8, 8, 8, 9, 9, 1],
	[1, 8, 8, 8, 9, 9, 1],
	[1, 8, 8, 9, 9, 9, 1],
	[0, 1, 9, 9, 9, 1, 0],
	[0, 0, 1, 1, 1, 0, 0],
];

// --- 🏎️ 핵심 게임 변수 ---
let gameActive = false;
let animationId;
let score = 0;
let speed = 5;
let roadOffset = 0;
let frameCount = 0;
let enemies = [];
let trees = [];
let explosionParticles = [];
const PIXEL_SIZE = 6;

let player = { x: 0, y: 0, vx: 0, isDead: false };
let keys = {};

function initGame() {
	resizeCanvas();
	player = { x: 0, y: canvas.height - 140, vx: 0, isDead: false };
	score = 0;
	speed = 5;
	frameCount = 0;
	enemies = [];
	trees = [];
	explosionParticles = [];
	scoreEl.innerText = "0";
	gameActive = true;
	requestAnimationFrame(update);
}

function drawPixelArt(art, x, y, isVehicle = false, pSize = 5) {
	let width = art[0].length * pSize;
	let height = art.length * pSize;

	ctx.save();

	if (isVehicle) {
		ctx.shadowColor = "rgba(0, 0, 0, 0.5)";
		ctx.shadowBlur = 8;
		ctx.shadowOffsetY = 6;
		ctx.shadowOffsetX = 3;
	}

	ctx.translate(x - width / 2, y - height / 2);

	for (let r = 0; r < art.length; r++) {
		for (let c = 0; c < art[r].length; c++) {
			if (art[r][c] !== 0) {
				ctx.fillStyle = colors[art[r][c]];
				ctx.fillRect(c * pSize, r * pSize, pSize + 0.5, pSize + 0.5);
			}
		}
	}
	ctx.restore();
}

class Particle {
	constructor(x, y) {
		this.x = x;
		this.y = y;
		this.vx = (Math.random() - 0.5) * 12;
		this.vy = (Math.random() - 0.5) * 12;
		this.color = ["#ff2e63", "#ffeb3b", "#ff9800", "#111"][
			Math.floor(Math.random() * 4)
		];
		this.life = 1;
	}
	update() {
		this.x += this.vx;
		this.y += this.vy;
		this.life -= 0.03;
	}
	draw() {
		ctx.fillStyle = this.color;
		ctx.globalAlpha = Math.max(0, this.life);
		ctx.fillRect(this.x, this.y, 8, 8);
		ctx.globalAlpha = 1;
	}
}

function update() {
	if (!gameActive) return;
	frameCount++;

	if (!player.isDead) {
		if (speed < 11) speed += 0.001;

		roadOffset += speed;
		if (roadOffset >= 280) roadOffset -= 280;

		if (keys["ArrowLeft"] || keys["btnLeft"]) player.vx -= 1.8;
		if (keys["ArrowRight"] || keys["btnRight"]) player.vx += 1.8;
		player.vx *= 0.82;
		player.x += player.vx;

		player.x = Math.max(-130, Math.min(130, player.x));

		let spawnRate = Math.max(45, Math.floor(140 - speed * 5));
		if (frameCount % spawnRate === 0) {
			let numCars = Math.random() < 0.1 ? 2 : 1;
			let lanes = [-90, 0, 90];

			lanes.sort(() => Math.random() - 0.5);

			for (let i = 0; i < numCars; i++) {
				let isDasher = Math.random() < 0.2;
				enemies.push({
					x: lanes[i],
					y: -100,
					type: isDasher
						? purpleCarArt
						: Math.random() > 0.5
							? blueCarArt
							: yellowCarArt,
					passed: false,
					isDasher: isDasher,
				});
			}
		}

		if (frameCount % 60 === 0) {
			trees.push({ x: -220, y: -100 });
			trees.push({ x: 220, y: -100 });
		}

		let centerX = canvas.width / 2;

		for (let i = enemies.length - 1; i >= 0; i--) {
			let e = enemies[i];
			let enemySpeed = speed * (e.isDasher ? 0.65 : 0.6);
			e.y += speed - enemySpeed;

			// 돌진 차량(보라색)의 끼어들기 로직
			if (e.isDasher && e.y > player.y - 250 && e.y < player.y + 20) {
				if (e.x < player.x - 5) e.x += 1.5;
				if (e.x > player.x + 5) e.x -= 1.5;
			}

			let dx = Math.abs(player.x - e.x);
			let dy = Math.abs(player.y - e.y);

			if (dx < 35 && dy < 50) {
				player.isDead = true;
				for (let j = 0; j < 40; j++) {
					explosionParticles.push(new Particle(centerX + player.x, player.y));
				}
				setTimeout(gameOver, 1500);
			}

			if (!e.passed && e.y > player.y + 55) {
				e.passed = true;
				score += 10;
				scoreEl.innerText = score;
			}

			if (e.y > canvas.height + 100) enemies.splice(i, 1);
		}

		for (let i = trees.length - 1; i >= 0; i--) {
			trees[i].y += speed;
			if (trees[i].y > canvas.height + 100) trees.splice(i, 1);
		}
	}

	speedEl.innerText = Math.floor(speed * 10) + " km/h";
	drawWorld();
	animationId = requestAnimationFrame(update);
}

function drawWorld() {
	ctx.fillStyle = "#2e7d32";
	ctx.fillRect(0, 0, canvas.width, canvas.height);

	let centerX = canvas.width / 2;

	ctx.fillStyle = "#222";
	ctx.fillRect(centerX - 150, 0, 300, canvas.height);

	ctx.fillStyle = "#fff";
	ctx.fillRect(centerX - 150, 0, 4, canvas.height);
	ctx.fillRect(centerX + 146, 0, 4, canvas.height);

	ctx.strokeStyle = "rgba(255, 255, 255, 0.4)";
	ctx.lineWidth = 6;
	ctx.setLineDash([120, 160]);
	ctx.lineDashOffset = -roadOffset;

	ctx.beginPath();
	ctx.moveTo(centerX - 50, 0);
	ctx.lineTo(centerX - 50, canvas.height);
	ctx.moveTo(centerX + 50, 0);
	ctx.lineTo(centerX + 50, canvas.height);
	ctx.stroke();
	ctx.setLineDash([]);

	trees.forEach((t) => drawPixelArt(treeArt, centerX + t.x, t.y, false, 7));
	enemies.forEach((e) => drawPixelArt(e.type, centerX + e.x, e.y, true, 4.5));

	if (!player.isDead) {
		drawPixelArt(myCarArt, centerX + player.x, player.y, true, 4.5);

		if (speed > 8 && frameCount % 4 < 2) {
			ctx.fillStyle = "#ffeb3b";
			ctx.fillRect(
				centerX + player.x - 10,
				player.y + 28,
				5,
				8 + Math.random() * 8,
			);
			ctx.fillRect(
				centerX + player.x + 5,
				player.y + 28,
				5,
				8 + Math.random() * 8,
			);
		}
	}

	explosionParticles.forEach((p) => {
		p.update();
		p.draw();
	});

	// 비네팅 효과 마스크
	let gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
	gradient.addColorStop(0, "rgba(0, 0, 0, 0.8)");
	gradient.addColorStop(0.2, "rgba(0, 0, 0, 0)");
	gradient.addColorStop(0.8, "rgba(0, 0, 0, 0)");
	gradient.addColorStop(1, "rgba(0, 0, 0, 0.8)");

	ctx.fillStyle = gradient;
	ctx.fillRect(0, 0, canvas.width, canvas.height);
}

// 🏆 랭킹 & 게임오버 시스템 (Firebase 연동)
function showStartModal() {
	modalTitle.innerText = "ROAD FIGHTER";
	modalTitle.style.color = "#fff";
	modalDesc.innerHTML = `앞차를 추월할 때마다 <strong style="color:#ffeb3b;">10점</strong>!<br><span style="color:#d500f9; font-weight:bold;">보라색 차</span>는 갑자기 끼어드니<br>항상 주의하세요.`;

	rankInputArea.style.display = "none";
	restartBtn.style.display = "none";

	startBtn.innerText = "START ENGINE";
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

	modalTitle.innerText = "WASTED!";
	modalTitle.style.color = "#ff2e63";
	modalDesc.innerHTML = `차량을 들이받았습니다!<br>최종 획득 점수: <strong style="color:#ffeb3b">${score}</strong> 점`;

	rankInputArea.style.display = "block";
	restartBtn.style.display = "block";
	nicknameInput.value = "";

	startBtn.innerText = "랭킹 등록";
	startBtn.disabled = false;
	restartBtn.innerText = "처음으로";

	// Firebase 랭킹 저장 연동
	startBtn.onclick = async () => {
		const nickname = nicknameInput.value.trim();
		if (!nickname || nickname.length < 2)
			return alert("닉네임을 2자 이상 입력해주세요!");

		startBtn.disabled = true;
		startBtn.innerText = "데이터 등록 중...";

		const result = await saveGameScore("retroracing", nickname, score);
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

// ⌨️ 컨트롤러 바인딩
const bindBtn = (id, keyName) => {
	const el = document.getElementById(id);
	if (!el) return;
	el.addEventListener("mousedown", (e) => {
		e.preventDefault();
		keys[keyName] = true;
	});
	el.addEventListener("mouseup", (e) => {
		e.preventDefault();
		keys[keyName] = false;
	});
	el.addEventListener("mouseleave", (e) => {
		keys[keyName] = false;
	});
	el.addEventListener(
		"touchstart",
		(e) => {
			e.preventDefault();
			keys[keyName] = true;
		},
		{ passive: false },
	);
	el.addEventListener("touchend", (e) => {
		e.preventDefault();
		keys[keyName] = false;
	});
};

bindBtn("btnLeft", "btnLeft");
bindBtn("btnRight", "btnRight");

window.addEventListener("keydown", (e) => {
	if (!gameActive) return;
	keys[e.key] = true;
});
window.addEventListener("keyup", (e) => (keys[e.key] = false));

// 최초 실행
showStartModal();
