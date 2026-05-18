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
	10: "#d500f9",
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

// --- 🏎️ 게임 및 연출 변수 ---
let gameActive = false;
let animationId;
let score = 0;
let speed = 5;
let roadOffset = 0;
let frameCount = 0;
let enemies = [];
let trees = [];
let explosionParticles = [];

let player = { x: 0, y: 0, vx: 0, isDead: false };
let keys = {};

// 🎬 [디렉터 제어 시스템] 상황별 실제 코드 매핑 데이터
let activeDirectorKey = null;
const directorScripts = {
	1: {
		title: "🏁 BACKGROUND SCROLL CODE",
		code: [
			"roadOffset += speed * dt;",
			"if (roadOffset >= 280) roadOffset -= 280;",
		],
	},
	2: {
		title: "🚀 ACCELERATION PHYSICS CODE",
		code: ["if (speed < 11) speed += 0.001 * dt;"],
	},
	3: {
		title: "🕹️ PLAYER MOVEMENT & FRICTION CODE",
		code: [
			"if (keys['ArrowLeft']) player.vx -= 1.8 * dt;",
			"player.vx *= Math.pow(0.82, dt);",
			"player.x += player.vx * dt;",
		],
	},
	4: {
		title: "⚠️ AI PURPLE_DASHER STEERING CODE",
		code: [
			"if (e.isDasher && e.y > player.y - 250) {",
			"  if (e.x < player.x) e.x += 1.5 * dt;",
			"  if (e.x > player.x) e.x -= 1.5 * dt;",
			"}",
		],
	},
	5: {
		title: "💥 BOX COLLISION DETECT CODE",
		code: [
			"let dx = Math.abs(player.x - e.x);",
			"let dy = Math.abs(player.y - e.y);",
			"if (dx < 35 && dy < 50) player.isDead = true;",
		],
	},
};

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
	activeDirectorKey = null;
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
	update(dt) {
		this.x += this.vx * dt;
		this.y += this.vy * dt;
		this.life -= 0.03 * dt;
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

	// 🎬 디렉터 키(1~5)가 눌려있으면 0.15배속 초슬로우 모션 발동, 아니면 정상 속도(1배)
	let dt = activeDirectorKey ? 0.15 : 1.0;

	if (!player.isDead) {
		if (speed < 11) speed += 0.001 * dt;

		roadOffset += speed * dt;
		if (roadOffset >= 280) roadOffset -= 280;

		if (keys["ArrowLeft"]) player.vx -= 1.8 * dt;
		if (keys["ArrowRight"]) player.vx += 1.8 * dt;
		player.vx *= Math.pow(0.82, dt);
		player.x += player.vx * dt;

		if (player.x < -130) player.x = -130;
		if (player.x > 130) player.x = 130;

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
			e.y += (speed - enemySpeed) * dt;

			// 보라색 차 추격 로직
			if (e.isDasher && e.y > player.y - 250 && e.y < player.y + 20) {
				if (e.x < player.x - 5) e.x += 1.5 * dt;
				if (e.x > player.x + 5) e.x -= 1.5 * dt;
			}

			let dx = Math.abs(player.x - e.x);
			let dy = Math.abs(player.y - e.y);

			if (dx < 35 && dy < 50) {
				player.isDead = true;
				activeDirectorKey = null; // 사망 시 연출 해제
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
			trees[i].y += speed * dt;
			if (trees[i].y > canvas.height + 100) trees.splice(i, 1);
		}
	}

	speedEl.innerText = Math.floor(speed * 10) + " km/h";
	drawWorld();

	// 🎬 디렉터 키가 눌려있다면 화면 위에 개발 코드 오버레이 마스크 렌더링
	if (activeDirectorKey && directorScripts[activeDirectorKey]) {
		drawDirectorOverlay(directorScripts[activeDirectorKey]);
	}

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

	let dt = activeDirectorKey ? 0.15 : 1.0;
	explosionParticles.forEach((p) => {
		p.update(dt);
		p.draw();
	});

	let gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
	gradient.addColorStop(0, "rgba(0, 0, 0, 0.7)");
	gradient.addColorStop(0.2, "rgba(0, 0, 0, 0)");
	gradient.addColorStop(0.8, "rgba(0, 0, 0, 0)");
	gradient.addColorStop(1, "rgba(0, 0, 0, 0.7)");
	ctx.fillStyle = gradient;
	ctx.fillRect(0, 0, canvas.width, canvas.height);
}

// 🎬 [디렉터 코드 UI 연출 렌더러] 바운스볼 영상 완벽 오마주
function drawDirectorOverlay(script) {
	ctx.save();
	// 1. 다크 스크린 필터 마스크
	ctx.fillStyle = "rgba(10, 10, 15, 0.75)";
	ctx.fillRect(0, 0, canvas.width, canvas.height);

	// 2. 포커스 테두리
	ctx.strokeStyle = "rgba(0, 229, 255, 0.5)";
	ctx.lineWidth = 4;
	ctx.strokeRect(10, 10, canvas.width - 20, canvas.height - 20);

	let boxY = canvas.height / 2 - 80;
	let boxH = 45 + script.code.length * 24;

	// 3. 코드창 배경 플레이트
	ctx.fillStyle = "rgba(20, 22, 30, 0.95)";
	ctx.strokeStyle = "#00e5ff";
	ctx.lineWidth = 2;
	ctx.fillRect(20, boxY, canvas.width - 40, boxH);
	ctx.strokeRect(20, boxY, canvas.width - 40, boxH);

	// 4. 기믹 타이틀 인쇄
	ctx.font = "bold 15px 'Courier New', monospace";
	ctx.fillStyle = "#ffeb3b";
	ctx.textAlign = "left";
	ctx.fillText(script.title, 35, boxY + 28);

	// 5. 실제 하이라이트 자바스크립트 코드 라인 드로우
	ctx.font = "14px 'Courier New', monospace";
	ctx.fillStyle = "#00ffcc";

	for (let i = 0; i < script.code.length; i++) {
		ctx.fillText(script.code[i], 35, boxY + 60 + i * 24);
	}
	ctx.restore();
}

// 🏆 모달 및 하위 시스템
function showStartModal() {
	modalTitle.innerText = "RETRO RACING";
	modalTitle.style.color = "#fff";
	modalDesc.innerHTML = `방향키로 조작하며 달리세요!<br><br><span style='color:#00e5ff; font-weight:bold;'>[디렉터 치트키 전용 촬영 모드]</span><br>주행 중 키보드 <strong style='color:#ffeb3b;'>숫자키 1 ~ 5</strong>를 누르고 있으면<br>해당 물리 공식 코드창과 함께 슬로우 모션이 터집니다!`;
	rankInputArea.style.display = "none";
	restartBtn.style.display = "none";
	startBtn.innerText = "START ENGINE";
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
	modalDesc.innerHTML = `최종 점수: <strong style="color:#ffeb3b">${score}</strong> 점`;
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
		startBtn.innerText = "등록 중...";
		const result = await saveGameScore("retroracing", nickname, score);
		alert(result.msg);
		if (result.status !== "error") showStartModal();
		else {
			startBtn.disabled = false;
			startBtn.innerText = "랭킹 등록";
		}
	};
	restartBtn.onclick = () => showStartModal();
	modal.style.display = "flex";
}

// ⌨️ 키보드 리스너 통합 (일반 조작 + 디렉터 단축키)
window.addEventListener("keydown", (e) => {
	if (!gameActive) return;
	keys[e.key] = true;

	// 1~5번 키 매핑 체크
	if (["1", "2", "3", "4", "5"].includes(e.key)) {
		activeDirectorKey = e.key;
	}
});

window.addEventListener("keyup", (e) => {
	keys[e.key] = false;
	if (
		["1", "2", "3", "4", "5"].includes(e.key) &&
		activeDirectorKey === e.key
	) {
		activeDirectorKey = null; // 키를 떼면 정상 속도로 원복 및 코드창 제거
	}
});

showStartModal();
