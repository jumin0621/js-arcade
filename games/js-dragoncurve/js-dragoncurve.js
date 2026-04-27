import { saveGameScore } from "../../common/firebase-config.js";

const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
const scoreEl = document.getElementById("scoreDisplay");
const hpEl = document.getElementById("hpDisplay");

const modal = document.getElementById("gameModal");
const modalTitle = document.getElementById("modalTitle");
const modalDesc = document.getElementById("modalDesc");
const startBtn = document.getElementById("startBtn");
const restartBtn = document.getElementById("restartBtn");
const rankInputArea = document.getElementById("rankInputArea");
const nicknameInput = document.getElementById("nicknameInput");

// --- 🔥 모바일 터치 컨트롤 이벤트 ---
const btnUp = document.getElementById("btnUp");
const btnDown = document.getElementById("btnDown");
const btnLeft = document.getElementById("btnLeft");
const btnRight = document.getElementById("btnRight");
const btnFire = document.getElementById("btnFire");

// PC 와이드 해상도 고정
canvas.width = 800;
canvas.height = 450;

// [배경 이미지 로드]
const bgImage = new Image();
bgImage.src = "../../assets/games/bg_1.jpg";
let bgX = 0;

let score = 0;
let gameActive = false;
let animationId;
let player, enemies, bullets, enemyBullets, particles, terrains;
let keys = {};
let lastFireTime = 0;
let frameCount = 0;
let gameSpeed = 3;

// --- 🔥 수정된 픽셀 아트 디자인 ---
// 옆모습으로 날아가는 픽셀 드래곤 (가로 8 x 세로 7)
const dragonPixel = [
	[0, 0, 0, 0, 0, 0, 1, 0], // 뿔
	[0, 0, 0, 0, 0, 1, 1, 1], // 머리
	[0, 0, 0, 0, 1, 1, 0, 1], // 눈(빈칸)
	[0, 0, 1, 1, 1, 1, 1, 1], // 목
	[0, 1, 1, 1, 1, 1, 0, 0], // 날개 (위로 펼침)
	[1, 1, 1, 1, 1, 1, 0, 0], // 몸통과 꼬리
	[0, 0, 1, 0, 1, 0, 0, 0], // 작은 발
];

// 적 1호기 (둥근 비행선)
const enemyPixel1 = [
	[0, 1, 1, 1, 0],
	[1, 1, 0, 1, 1],
	[1, 1, 1, 1, 1],
	[0, 1, 1, 1, 0],
];

class Player {
	constructor() {
		this.width = 48; // 드래곤 비율에 맞춰 가로 크기 조정
		this.height = 42; // 세로 크기 조정
		this.x = 100;
		this.y = canvas.height / 2;
		this.speed = 5;
		this.hp = 3;
		this.color = "#00e5ff";
		this.invincibleTimer = 0;
	}
	draw() {
		if (this.invincibleTimer > 0) {
			this.invincibleTimer--;
			if (this.invincibleTimer % 10 < 5) return;
		}
		ctx.fillStyle = this.color;
		const pSizeX = this.width / 8; // 8칸
		const pSizeY = this.height / 7; // 7칸

		dragonPixel.forEach((row, ri) => {
			row.forEach((col, ci) => {
				if (col)
					ctx.fillRect(
						this.x + ci * pSizeX,
						this.y + ri * pSizeY,
						pSizeX,
						pSizeY,
					);
			});
		});

		// 꼬리 쪽 부스터 파티클 효과
		if (Math.random() > 0.5) {
			ctx.fillStyle = "#ff1744";
			ctx.fillRect(this.x - 8, this.y + 25, 8, 4);
		}
	}
	move() {
		if (keys["ArrowUp"] && this.y > 0) this.y -= this.speed;
		if (keys["ArrowDown"] && this.y < canvas.height - this.height)
			this.y += this.speed;
		if (keys["ArrowLeft"] && this.x > 0) this.x -= this.speed;
		if (keys["ArrowRight"] && this.x < canvas.width / 2) this.x += this.speed;
	}
	hit() {
		if (this.invincibleTimer > 0) return;
		this.hp--;
		this.invincibleTimer = 60;
		updateHUD();
		ctx.translate(Math.random() * 10 - 5, Math.random() * 10 - 5);
		if (this.hp <= 0) gameOver();
	}
}

class Bullet {
	constructor(x, y, isEnemy = false) {
		this.x = x;
		this.y = y;
		this.isEnemy = isEnemy;
		this.speed = isEnemy ? -7 : 12;
		this.width = isEnemy ? 8 : 15;
		this.height = isEnemy ? 8 : 4;
	}
	update() {
		this.x += this.speed;
	}
	draw() {
		ctx.save();
		ctx.fillStyle = this.isEnemy ? "#ff1744" : "#00e5ff";
		ctx.shadowBlur = 10;
		ctx.shadowColor = ctx.fillStyle;
		ctx.fillRect(this.x, this.y, this.width, this.height);
		ctx.restore();
	}
}

class Enemy {
	constructor() {
		this.width = 35;
		this.height = 30;
		this.x = canvas.width + 50;
		this.y = Math.random() * (canvas.height - 100) + 50;
		this.speed = Math.random() * 2 + 2 + score * 0.001;
		this.hp = 2;
		this.color = "#ffeb3b";
		this.moveType = Math.random() > 0.5 ? "straight" : "sine";
		this.startY = this.y;
	}
	update() {
		this.x -= this.speed;
		if (this.moveType === "sine") {
			this.y = this.startY + Math.sin(frameCount * 0.05) * 50;
		}
		if (Math.random() < 0.01) {
			enemyBullets.push(new Bullet(this.x, this.y + this.height / 2, true));
		}
	}
	draw() {
		ctx.fillStyle = this.color;
		const pSize = this.width / 5;
		enemyPixel1.forEach((row, ri) => {
			row.forEach((col, ci) => {
				if (col)
					ctx.fillRect(
						this.x + ci * pSize,
						this.y + ri * (this.height / 4),
						pSize,
						this.height / 4,
					);
			});
		});
	}
}

// --- 🔥 수정된 장애물(Terrain) 클래스 ---
// 무조건 막혀있는게 아니라, 기둥 형태로 틈틈이 등장함
class Terrain {
	constructor(x) {
		this.x = x;
		this.width = Math.random() * 40 + 60; // 폭 60~100 랜덤

		// type: 0(위쪽 기둥만), 1(아래쪽 기둥만), 2(위아래 통로형)
		this.type = Math.floor(Math.random() * 3);

		// 🔥 난이도(간격) 기준을 score에서 frameCount(생존 시간)로 변경
		let gap = Math.max(150, 250 - frameCount * 0.02);
		this.topHeight = Math.random() * (canvas.height - gap - 50) + 20;
		this.bottomY = this.topHeight + gap;
		this.bottomHeight = canvas.height - this.bottomY;
	}
	update() {
		this.x -= gameSpeed;
	}
	draw() {
		ctx.fillStyle = "#1e1e1e";
		ctx.strokeStyle = "#bb86fc";
		ctx.lineWidth = 2;

		if (this.type === 0 || this.type === 2) {
			// 윗 기둥
			ctx.fillRect(this.x, 0, this.width, this.topHeight);
			ctx.strokeRect(this.x, 0, this.width, this.topHeight);
		}
		if (this.type === 1 || this.type === 2) {
			// 아래 기둥
			ctx.fillRect(this.x, this.bottomY, this.width, this.bottomHeight);
			ctx.strokeRect(this.x, this.bottomY, this.width, this.bottomHeight);
		}
	}
}

class Particle {
	constructor(x, y, color) {
		this.x = x;
		this.y = y;
		this.vx = (Math.random() - 0.5) * 6;
		this.vy = (Math.random() - 0.5) * 6;
		this.alpha = 1;
		this.color = color;
		this.size = Math.random() * 4 + 2;
	}
	update() {
		this.x += this.vx - gameSpeed * 0.5;
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

function initGame() {
	player = new Player();
	enemies = [];
	bullets = [];
	enemyBullets = [];
	particles = [];
	terrains = []; // 초기에는 맵을 비워둡니다.
	score = 0;
	frameCount = 0;
	gameSpeed = 3;

	updateHUD();
	gameActive = true;
	requestAnimationFrame(update);
}

function updateHUD() {
	scoreEl.innerText = score;
	let hearts = "";
	for (let i = 0; i < player.hp; i++) hearts += "♥";
	hpEl.innerText = hearts;
}

function update() {
	if (!gameActive) return;

	ctx.setTransform(1, 0, 0, 1, 0, 0);
	ctx.clearRect(0, 0, canvas.width, canvas.height);

	frameCount++;
	// 🔥 1프레임당 1점씩 오르던 자동 점수 획득 삭제 (score += 1; 제거)

	if (frameCount % 60 === 0) updateHUD();

	// 🔥 게임 속도 기준을 score에서 frameCount(생존 시간)로 변경하여 텐션 유지
	gameSpeed = 3 + frameCount * 0.0005;

	bgX -= gameSpeed * 0.3;
	if (bgX <= -canvas.width) bgX = 0;
	ctx.drawImage(bgImage, bgX, 0, canvas.width, canvas.height);
	ctx.drawImage(bgImage, bgX + canvas.width, 0, canvas.width, canvas.height);

	ctx.fillStyle = "rgba(18, 18, 18, 0.6)";
	ctx.fillRect(0, 0, canvas.width, canvas.height);

	player.move();
	if (keys[" "]) {
		const now = Date.now();
		if (now - lastFireTime > 150) {
			bullets.push(
				new Bullet(player.x + player.width, player.y + player.height / 2 - 2),
			);
			lastFireTime = now;
		}
	}

	if (frameCount % 120 === 0) {
		terrains.push(new Terrain(canvas.width + 50));
	}

	for (let i = terrains.length - 1; i >= 0; i--) {
		let t = terrains[i];
		t.update();
		t.draw();

		if (player.x + player.width - 15 > t.x && player.x + 15 < t.x + t.width) {
			if (t.type === 0 || t.type === 2) {
				if (player.y < t.topHeight) player.hit();
			}
			if (t.type === 1 || t.type === 2) {
				if (player.y + player.height > t.bottomY) player.hit();
			}
		}

		if (t.x + t.width < 0) {
			terrains.splice(i, 1);
		}
	}

	if (frameCount % 80 === 0) {
		enemies.push(new Enemy());
	}

	bullets.forEach((b, bi) => {
		b.update();
		b.draw();
		if (b.x > canvas.width) bullets.splice(bi, 1);

		enemies.forEach((e, ei) => {
			if (
				b.x > e.x &&
				b.x < e.x + e.width &&
				b.y > e.y &&
				b.y < e.y + e.height
			) {
				bullets.splice(bi, 1);
				e.hp--;
				for (let k = 0; k < 5; k++)
					particles.push(new Particle(b.x, b.y, "#fff"));
				if (e.hp <= 0) {
					for (let k = 0; k < 15; k++)
						particles.push(
							new Particle(e.x + e.width / 2, e.y + e.height / 2, e.color),
						);
					enemies.splice(ei, 1);

					// 🔥 적 격추 시 기존 100점에서 10점 획득으로 변경
					score += 10;
					updateHUD();
				}
			}
		});
	});

	enemyBullets.forEach((eb, i) => {
		eb.update();
		eb.draw();
		if (eb.x < 0) enemyBullets.splice(i, 1);
		if (
			eb.x < player.x + player.width &&
			eb.x > player.x &&
			eb.y > player.y &&
			eb.y < player.y + player.height
		) {
			enemyBullets.splice(i, 1);
			player.hit();
		}
	});

	enemies.forEach((e, i) => {
		e.update();
		e.draw();
		if (e.x + e.width < 0) enemies.splice(i, 1);
		if (
			player.x + player.width > e.x &&
			player.x < e.x + e.width &&
			player.y + player.height > e.y &&
			player.y < e.y + e.height
		) {
			player.hit();
			enemies.splice(i, 1);
		}
	});

	particles.forEach((p, i) => {
		p.update();
		p.draw();
		if (p.alpha <= 0) particles.splice(i, 1);
	});

	player.draw();

	if (gameActive) {
		animationId = requestAnimationFrame(update);
	}
}

window.addEventListener("keydown", (e) => {
	keys[e.key] = true;
	if (
		["Space", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", " "].indexOf(
			e.key,
		) > -1
	) {
		e.preventDefault();
	}
});
window.addEventListener("keyup", (e) => (keys[e.key] = false));

// 터치 이벤트를 기존 방향키/스페이스바(키보드) 변수와 동일하게 매핑
const bindTouch = (elem, keyName) => {
	if (!elem) return;
	elem.addEventListener(
		"touchstart",
		(e) => {
			e.preventDefault();
			keys[keyName] = true;
		},
		{ passive: false },
	);

	elem.addEventListener(
		"touchend",
		(e) => {
			e.preventDefault();
			keys[keyName] = false;
		},
		{ passive: false },
	);
};

// 키 매핑 (키보드 화살표 및 스페이스바와 완벽 연동)
bindTouch(btnUp, "ArrowUp");
bindTouch(btnDown, "ArrowDown");
bindTouch(btnLeft, "ArrowLeft");
bindTouch(btnRight, "ArrowRight");
bindTouch(btnFire, " "); // Space바 역할

function showStartModal() {
	gameActive = false;
	modalTitle.innerText = "DRAGON CURVE";
	modalDesc.innerText = "다가오는 벽을 피하며 적을 섬멸하세요!";
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
	modalDesc.innerText = `드래곤 추락.\n최종 점수: ${score}점`;

	rankInputArea.style.display = "block";
	restartBtn.style.display = "block";
	nicknameInput.value = "";

	startBtn.innerText = "랭킹 등록";
	startBtn.disabled = false;

	startBtn.onclick = async () => {
		const nickname = nicknameInput.value.trim();
		if (!nickname || nickname.length < 2)
			return alert("닉네임을 2자 이상 입력해주세요!");

		startBtn.disabled = true;
		startBtn.innerText = "데이터 확인 중...";

		const result = await saveGameScore("dragoncurve", nickname, score);
		alert(result.msg);

		if (result.status !== "error") {
			showStartModal();
		} else {
			startBtn.disabled = false;
			startBtn.innerText = "랭킹 등록";
		}
	};

	restartBtn.onclick = () => {
		modal.style.display = "none";
		initGame();
	};

	modal.style.display = "flex";
}

bgImage.onload = () => {
	showStartModal();
};
