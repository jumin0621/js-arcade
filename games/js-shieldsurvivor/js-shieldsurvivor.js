// ✅ 랭킹 저장 함수 임포트
import { saveGameScore } from "../../common/firebase-config.js";

const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
const scoreEl = document.getElementById("scoreDisplay");
const shieldEl = document.getElementById("shieldDisplay");

const modal = document.getElementById("gameModal");
const modalTitle = document.getElementById("modalTitle");
const modalDesc = document.getElementById("modalDesc");
const startBtn = document.getElementById("startBtn");
const restartBtn = document.getElementById("restartBtn");
const rankInputArea = document.getElementById("rankInputArea");
const nicknameInput = document.getElementById("nicknameInput");

canvas.width = 360;
canvas.height = 400;

// [게임 상태 변수]
let score = 0;
let gameActive = false;
let animationId;
let player, enemies, bullets, particles;
let spawnTimer = 0;
let spawnRate = 90; // 적 스폰 주기 (낮을수록 자주 나옴)
let lastFireTime = 0;

// 마우스/터치 타겟 위치 (기본 중앙)
let targetX = canvas.width / 2;
let targetY = canvas.height / 4;

// [픽셀 아트 디자인]
// 1. 귀여운 슬라임 (느림)
const slimePixel = [
	[0, 1, 1, 1, 0],
	[1, 0, 1, 0, 1],
	[1, 1, 1, 1, 1],
	[1, 1, 1, 1, 1],
];
// 2. 꼬마 유령 (보통, 지그재그)
const ghostPixel = [
	[0, 1, 1, 1, 0],
	[1, 0, 1, 0, 1],
	[1, 1, 1, 1, 1],
	[1, 0, 1, 0, 1],
];
// 3. 붉은 폭탄 (빠름)
const bombPixel = [
	[0, 0, 1, 0, 0],
	[0, 1, 1, 1, 0],
	[1, 0, 1, 0, 1],
	[1, 1, 1, 1, 1],
	[0, 1, 1, 1, 0],
];

// 플레이어 (중앙 코어)
const corePixel = [
	[0, 1, 1, 1, 0],
	[1, 1, 0, 1, 1],
	[1, 0, 1, 0, 1],
	[1, 1, 0, 1, 1],
	[0, 1, 1, 1, 0],
];

// [클래스 정의]
class Player {
	constructor() {
		this.x = canvas.width / 2;
		this.y = canvas.height / 2;
		this.width = 25;
		this.height = 25;
		this.hp = 100;
		this.color = "#aeea00";
	}
	draw() {
		// 1. 실드 그리기
		ctx.beginPath();
		ctx.arc(this.x, this.y, 35, 0, Math.PI * 2);
		ctx.strokeStyle = `rgba(174, 234, 0, ${this.hp / 100})`;
		ctx.lineWidth = 2;
		ctx.stroke();

		// 2. 코어(플레이어) 그리기
		ctx.fillStyle = this.hp > 30 ? this.color : "#ff1744";
		const pSize = this.width / 5;
		const startX = this.x - this.width / 2;
		const startY = this.y - this.height / 2;

		corePixel.forEach((row, ri) => {
			row.forEach((col, ci) => {
				if (col)
					ctx.fillRect(startX + ci * pSize, startY + ri * pSize, pSize, pSize);
			});
		});

		// 3. 조준선 그리기 (코어에서 타겟 방향으로)
		const angle = Math.atan2(targetY - this.y, targetX - this.x);
		const gunLength = 20;
		ctx.beginPath();
		ctx.moveTo(this.x, this.y);
		ctx.lineTo(
			this.x + Math.cos(angle) * gunLength,
			this.y + Math.sin(angle) * gunLength,
		);
		ctx.strokeStyle = "#fff";
		ctx.lineWidth = 3;
		ctx.stroke();
	}
}

class Enemy {
	constructor() {
		// 사방에서 랜덤 스폰
		const edge = Math.floor(Math.random() * 4);
		if (edge === 0) {
			this.x = Math.random() * canvas.width;
			this.y = -30;
		} // Top
		else if (edge === 1) {
			this.x = canvas.width + 30;
			this.y = Math.random() * canvas.height;
		} // Right
		else if (edge === 2) {
			this.x = Math.random() * canvas.width;
			this.y = canvas.height + 30;
		} // Bottom
		else {
			this.x = -30;
			this.y = Math.random() * canvas.height;
		} // Left

		// 랜덤 몬스터 타입 배정
		const rand = Math.random();
		if (rand < 0.6) {
			this.type = "slime";
			this.color = "#00e5ff";
			this.speed = 0.8 + score * 0.005;
			this.pixels = slimePixel;
			this.hp = 1;
		} else if (rand < 0.9) {
			this.type = "ghost";
			this.color = "#bb86fc";
			this.speed = 1.2 + score * 0.005;
			this.pixels = ghostPixel;
			this.hp = 2;
		} else {
			this.type = "bomb";
			this.color = "#ff1744";
			this.speed = 1.8 + score * 0.005;
			this.pixels = bombPixel;
			this.hp = 1;
		}

		this.width = 20;
		this.height = 20;
		// 목표: 플레이어(중앙)
		this.angle = Math.atan2(
			canvas.height / 2 - this.y,
			canvas.width / 2 - this.x,
		);
	}
	update() {
		// 유령은 약간 지그재그로 움직임
		let currentAngle = this.angle;
		if (this.type === "ghost") {
			currentAngle += Math.sin(Date.now() / 200) * 0.5;
		}

		this.x += Math.cos(currentAngle) * this.speed;
		this.y += Math.sin(currentAngle) * this.speed;
	}
	draw() {
		ctx.fillStyle = this.color;
		const pSize = this.width / 5;
		const startX = this.x - this.width / 2;
		const startY = this.y - this.height / 2;

		this.pixels.forEach((row, ri) => {
			row.forEach((col, ci) => {
				if (col)
					ctx.fillRect(startX + ci * pSize, startY + ri * pSize, pSize, pSize);
			});
		});
	}
}

class Bullet {
	constructor(x, y, targetX, targetY) {
		this.x = x;
		this.y = y;
		this.speed = 8;
		const angle = Math.atan2(targetY - y, targetX - x);
		this.vx = Math.cos(angle) * this.speed;
		this.vy = Math.sin(angle) * this.speed;
		this.radius = 3;
	}
	update() {
		this.x += this.vx;
		this.y += this.vy;
	}
	draw() {
		ctx.save();
		ctx.shadowBlur = 10;
		ctx.shadowColor = "#ffeb3b";
		ctx.fillStyle = "#ffeb3b";
		ctx.beginPath();
		ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
		ctx.fill();
		ctx.restore();
	}
}

class Particle {
	constructor(x, y, color) {
		this.x = x;
		this.y = y;
		this.vx = (Math.random() - 0.5) * 5;
		this.vy = (Math.random() - 0.5) * 5;
		this.alpha = 1;
		this.color = color;
		this.size = Math.random() * 3 + 1;
	}
	update() {
		this.x += this.vx;
		this.y += this.vy;
		this.alpha -= 0.03;
	}
	draw() {
		ctx.save();
		ctx.globalAlpha = this.alpha;
		ctx.fillStyle = this.color;
		ctx.fillRect(this.x, this.y, this.size, this.size);
		ctx.restore();
	}
}

// [조준점 업데이트 함수]
function updateTarget(e) {
	const rect = canvas.getBoundingClientRect();
	const scaleX = canvas.width / rect.width;
	const scaleY = canvas.height / rect.height;

	if (e.touches) {
		targetX = (e.touches[0].clientX - rect.left) * scaleX;
		targetY = (e.touches[0].clientY - rect.top) * scaleY;
	} else {
		targetX = (e.clientX - rect.left) * scaleX;
		targetY = (e.clientY - rect.top) * scaleY;
	}
}

canvas.addEventListener("mousemove", updateTarget);
canvas.addEventListener(
	"touchmove",
	(e) => {
		e.preventDefault();
		updateTarget(e);
	},
	{ passive: false },
);
canvas.addEventListener(
	"touchstart",
	(e) => {
		e.preventDefault();
		updateTarget(e);
	},
	{ passive: false },
);

function initGame() {
	player = new Player();
	enemies = [];
	bullets = [];
	particles = [];
	score = 0;
	spawnRate = 90;
	scoreEl.innerText = score;
	shieldEl.innerText = "100%";
	shieldEl.style.color = "#00ff00";

	gameActive = true;
	requestAnimationFrame(update);
}

function update() {
	if (!gameActive) return;
	ctx.setTransform(1, 0, 0, 1, 0, 0);
	ctx.clearRect(0, 0, canvas.width, canvas.height);

	// 1. 자동 사격 (일정 쿨타임마다 마우스 방향으로 발사)
	const now = Date.now();
	// 연사 속도는 기본 150ms
	if (now - lastFireTime > 150) {
		bullets.push(new Bullet(player.x, player.y, targetX, targetY));
		lastFireTime = now;
	}

	// 2. 적 스폰
	spawnTimer++;
	if (spawnTimer > spawnRate) {
		enemies.push(new Enemy());
		spawnTimer = 0;
		if (spawnRate > 20) spawnRate -= 1; // 시간이 지날수록 스폰 속도 증가
	}

	// 3. 파티클 업데이트
	particles.forEach((p, i) => {
		p.update();
		p.draw();
		if (p.alpha <= 0) particles.splice(i, 1);
	});

	// 4. 총알 업데이트 & 화면 밖 제거
	bullets.forEach((b, bi) => {
		b.update();
		b.draw();
		if (b.x < 0 || b.x > canvas.width || b.y < 0 || b.y > canvas.height) {
			bullets.splice(bi, 1);
		}
	});

	// 5. 적 업데이트 & 충돌 감지
	for (let i = enemies.length - 1; i >= 0; i--) {
		let e = enemies[i];
		e.update();
		e.draw();

		// 5-1. 적 <-> 총알 충돌 (원형/AABB 믹스)
		for (let j = bullets.length - 1; j >= 0; j--) {
			let b = bullets[j];
			const dist = Math.hypot(b.x - e.x, b.y - e.y);

			if (dist < e.width / 2 + b.radius) {
				bullets.splice(j, 1);
				e.hp--;

				// 타격 파티클 살짝
				for (let k = 0; k < 3; k++)
					particles.push(new Particle(e.x, e.y, "#fff"));

				if (e.hp <= 0) {
					for (let k = 0; k < 15; k++)
						particles.push(new Particle(e.x, e.y, e.color));

					score += e.type === "bomb" ? 30 : e.type === "ghost" ? 20 : 10;
					scoreEl.innerText = score;
					enemies.splice(i, 1);
					break;
				}
			}
		}

		// 5-2. 적 <-> 플레이어(실드) 충돌
		const distToPlayer = Math.hypot(player.x - e.x, player.y - e.y);
		if (distToPlayer < 35 && enemies[i]) {
			player.hp -= e.type === "bomb" ? 20 : 10;
			shieldEl.innerText = Math.max(0, player.hp) + "%";

			if (player.hp <= 30) shieldEl.style.color = "#ff1744";
			else if (player.hp <= 60) shieldEl.style.color = "#ffeb3b";

			for (let k = 0; k < 20; k++)
				particles.push(new Particle(e.x, e.y, e.color));
			enemies.splice(i, 1);

			// 화면 흔들림 효과 (야매 구현)
			ctx.translate(Math.random() * 4 - 2, Math.random() * 4 - 2);

			if (player.hp <= 0) {
				gameOver();
			}
		}
	}

	player.draw();

	if (gameActive) {
		animationId = requestAnimationFrame(update);
	}
}

// --- 모달 제어 로직 ---
function showStartModal() {
	gameActive = false;
	modalTitle.innerText = "SHIELD SURVIVOR";
	modalDesc.innerText = "사방에서 몰려오는 적들을 막아내세요!";
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

	modalTitle.innerText = "SHIELD BROKEN";
	modalDesc.innerText = `코어가 파괴되었습니다.\n최종 점수: ${score}점`;

	rankInputArea.style.display = "block";
	restartBtn.style.display = "block";
	nicknameInput.value = "";

	startBtn.innerText = "랭킹 등록";
	startBtn.disabled = false;

	// 랭킹 등록
	startBtn.onclick = async () => {
		const nickname = nicknameInput.value.trim();
		if (!nickname || nickname.length < 2)
			return alert("닉네임을 2자 이상 입력해주세요!");

		startBtn.disabled = true;
		startBtn.innerText = "데이터 확인 중...";

		// gameId는 shieldsurvivor
		const result = await saveGameScore("shieldsurvivor", nickname, score);
		alert(result.msg);

		if (result.status !== "error") {
			showStartModal();
		} else {
			startBtn.disabled = false;
			startBtn.innerText = "랭킹 등록";
		}
	};

	// 다시 시작
	restartBtn.onclick = () => {
		modal.style.display = "none";
		initGame();
	};

	modal.style.display = "flex";
}

// 최초 진입 시 시작 모달
showStartModal();
