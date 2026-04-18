const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
const scoreEl = document.getElementById("scoreDisplay");
const stageEl = document.getElementById("stageDisplay");
const modal = document.getElementById("gameModal");
const modalTitle = document.getElementById("modalTitle");
const modalText = document.getElementById("modalText");
const startBtn = document.getElementById("startBtn");

canvas.width = 360;
canvas.height = 400;

let stage = 1;
let score = 0;
let gameActive = false;
let player, enemies, bullets, enemyBullets, particles;
let keys = {};
let enemyDirection = 1;
let enemyMoveTimer = 0;
let lastFireTime = 0;

// 픽셀 적 모양 (배열 드로잉)
const enemyPixel = [
	[0, 1, 1, 1, 0],
	[1, 1, 0, 1, 1],
	[1, 1, 1, 1, 1],
	[0, 1, 0, 1, 0],
];

const playerPixel = [
	[0, 0, 1, 0, 0],
	[0, 1, 1, 1, 0],
	[1, 1, 1, 1, 1],
	[1, 1, 0, 1, 1],
];

const codeFragments = [
	"<div>",
	"</span>",
	";",
	"err",
	"404",
	"{}",
	"=>",
	"let",
	"const",
];

// 파편(코드 조각) 클래스
class Particle {
	constructor(x, y, color) {
		this.x = x;
		this.y = y;
		this.text = codeFragments[Math.floor(Math.random() * codeFragments.length)];
		this.vx = (Math.random() - 0.5) * 4;
		this.vy = (Math.random() - 0.5) * 4;
		this.alpha = 1;
		this.color = color;
	}
	update() {
		this.x += this.vx;
		this.y += this.vy;
		this.alpha -= 0.02;
	}
	draw() {
		ctx.save();
		ctx.globalAlpha = this.alpha;
		ctx.fillStyle = this.color;
		ctx.font = "10px monospace";
		ctx.fillText(this.text, this.x, this.y);
		ctx.restore();
	}
}

// 기체 [JS] 클래스
class Player {
	constructor() {
		this.width = 30; // 픽셀 크기에 맞게 조정
		this.height = 24;
		this.x = canvas.width / 2 - this.width / 2;
		this.y = canvas.height - 40;
		this.speed = 4;
		this.color = "#bb86fc"; // 네온 퍼플
	}
	draw() {
		ctx.fillStyle = this.color;
		const pSize = this.width / 5; // 5x4 그리드 기준

		// [수정] 텍스트 대신 픽셀 배열로 그리기
		playerPixel.forEach((row, ri) => {
			row.forEach((col, ci) => {
				if (col) {
					ctx.fillRect(this.x + ci * pSize, this.y + ri * pSize, pSize, pSize);
				}
			});
		});

		// 기체 아래에 작게 [JS] 텍스트를 남겨서 정체성 유지 (선택 사항)
		ctx.fillStyle = "rgba(0, 229, 255, 0.5)";
		ctx.font = "bold 10px monospace";
		ctx.textAlign = "center";
		ctx.fillText("JS", this.x + this.width / 2, this.y + this.height + 12);
	}
	move() {
		if ((keys["ArrowLeft"] || keys["leftBtn"]) && this.x > 0)
			this.x -= this.speed;
		if (
			(keys["ArrowRight"] || keys["rightBtn"]) &&
			this.x < canvas.width - this.width
		)
			this.x += this.speed;
	}
}

// 적 클래스
class Enemy {
	constructor(x, y, isBoss = false) {
		this.x = x;
		this.y = y;
		this.isBoss = isBoss;
		this.width = isBoss ? 60 : 25;
		this.height = isBoss ? 40 : 20;
		this.hp = isBoss ? stage * 3 : 1;
		this.color = isBoss ? "#ff00ff" : "#00e5ff";
	}
	draw() {
		ctx.fillStyle = this.color;
		if (this.isBoss) {
			ctx.shadowBlur = 10;
			ctx.shadowColor = this.color;
			ctx.fillRect(this.x, this.y, this.width, this.height);
			ctx.shadowBlur = 0;
			// 체력바
			ctx.fillStyle = "#333";
			ctx.fillRect(this.x, this.y - 15, this.width, 4);
			ctx.fillStyle = this.color;
			ctx.fillRect(
				this.x,
				this.y - 15,
				this.width * (this.hp / (stage * 3)),
				4,
			);
		} else {
			const pSize = this.width / 5;
			enemyPixel.forEach((row, ri) => {
				row.forEach((col, ci) => {
					if (col)
						ctx.fillRect(
							this.x + ci * pSize,
							this.y + ri * pSize,
							pSize,
							pSize,
						);
				});
			});
		}
	}
}

class Bullet {
	constructor(x, y, isEnemy = false) {
		this.x = x;
		this.y = y;
		this.isEnemy = isEnemy;
		// 적 총알은 조금 더 천천히 내려오게 해서 시각적 대응 시간을 확보 (선택 사항)
		this.speed = isEnemy ? 2.5 + stage * 0.1 : -6;

		// [수정] 두께 조절: 아군은 2px, 적군은 4px로 더 두껍게 설정
		this.width = isEnemy ? 4 : 2;
		this.height = isEnemy ? 10 : 8;
	}
	update() {
		this.y += this.speed;
	}
	draw() {
		if (this.isEnemy) {
			// [추가] 적 총알에 네온 레드 글로우 효과를 주어 눈에 확 띄게 함
			ctx.save();
			ctx.shadowBlur = 8;
			ctx.shadowColor = "#ff1744";
			ctx.fillStyle = "#ff1744"; // 선명한 네온 레드
			ctx.fillRect(this.x, this.y, this.width, this.height);
			ctx.restore();
		} else {
			// 아군 총알은 깔끔한 흰색 유지
			ctx.fillStyle = "#fff";
			ctx.fillRect(this.x, this.y, this.width, this.height);
		}
	}
}

function spawnEnemies() {
	enemies = [];
	bullets = [];
	enemyBullets = [];
	particles = [];
	enemyDirection = 1;
	if (stage % 5 === 0) {
		enemies.push(new Enemy(canvas.width / 2 - 30, 60, true));
	} else {
		const rows = 3 + Math.floor(stage / 6);
		const cols = 7;
		const xOff = (canvas.width - cols * 40) / 2;
		for (let r = 0; r < rows; r++) {
			for (let c = 0; c < cols; c++) {
				enemies.push(new Enemy(xOff + c * 40, 60 + r * 30));
			}
		}
	}
}

function initGame() {
	player = new Player();
	spawnEnemies();
	gameActive = true;
	requestAnimationFrame(update);
}

function update() {
	if (!gameActive) return;
	ctx.clearRect(0, 0, canvas.width, canvas.height);

	player.move();
	player.draw();

	// 연사 로직
	if (keys[" "] || keys["fireBtn"]) {
		const now = Date.now();
		if (now - lastFireTime > 180) {
			bullets.push(new Bullet(player.x + player.width / 2 - 1, player.y - 15));
			lastFireTime = now;
		}
	}

	// 적 이동
	enemyMoveTimer++;
	let threshold = Math.max(4, 40 - stage * 2);
	if (enemyMoveTimer > threshold) {
		let reachEdge = false;
		enemies.forEach((e) => {
			e.x += 6 * enemyDirection;
			if (e.x > canvas.width - e.width || e.x < 0) reachEdge = true;
		});
		if (reachEdge) {
			enemyDirection *= -1;
			enemies.forEach((e) => {
				e.y += 15;
				if (e.y > player.y) gameOver();
			});
		}
		enemyMoveTimer = 0;
	}

	// 파편 업데이트
	particles.forEach((p, i) => {
		p.update();
		p.draw();
		if (p.alpha <= 0) particles.splice(i, 1);
	});

	// 아군 총알 & 충돌
	bullets.forEach((b, bi) => {
		b.update();
		b.draw();
		if (b.y < 0) bullets.splice(bi, 1);
		enemies.forEach((e, ei) => {
			if (
				b.x > e.x &&
				b.x < e.x + e.width &&
				b.y < e.y + e.height &&
				b.y > e.y
			) {
				bullets.splice(bi, 1);
				e.hp--;
				if (e.hp <= 0) {
					for (let k = 0; k < 6; k++)
						particles.push(
							new Particle(e.x + e.width / 2, e.y + e.height / 2, e.color),
						);
					enemies.splice(ei, 1);
					score += e.isBoss ? 500 : 10;
					scoreEl.innerText = score;
				}
			}
		});
	});

	// 적 공격
	if (enemies.length > 0 && Math.random() < 0.006 + stage * 0.001) {
		const s = enemies[Math.floor(Math.random() * enemies.length)];
		enemyBullets.push(new Bullet(s.x + s.width / 2, s.y + s.height, true));
	}
	enemyBullets.forEach((eb, i) => {
		eb.update();
		eb.draw();
		if (eb.y > canvas.height) enemyBullets.splice(i, 1);
		if (
			eb.x > player.x &&
			eb.x < player.x + player.width &&
			eb.y > player.y - 15 &&
			eb.y < player.y
		)
			gameOver();
	});

	enemies.forEach((e) => e.draw());

	if (enemies.length === 0 && gameActive) {
		if (stage >= 20) gameWin();
		else {
			stage++;
			stageEl.innerText = stage;
			spawnEnemies();
		}
	}
	requestAnimationFrame(update);
}

function gameOver() {
	gameActive = false;
	modalTitle.innerText = "SYSTEM CRASHED";
	modalText.innerText = `에러 코드에게 침투 당했습니다.`;
	startBtn.innerText = "재시도";
	modal.style.display = "flex";
}

function gameWin() {
	gameActive = false;
	modalTitle.innerText = "ALL COMPILED";
	modalText.innerText = "완벽한 최적화! 모든 에러를 소거했습니다.";
	startBtn.innerText = "다시 하기";
	modal.style.display = "flex";
}

// 이벤트 핸들러
window.addEventListener("keydown", (e) => (keys[e.key] = true));
window.addEventListener("keyup", (e) => (keys[e.key] = false));

const bLeft = document.getElementById("btnLeft"),
	bRight = document.getElementById("btnRight"),
	bFire = document.getElementById("btnFire");
const prevent = (e) => e.preventDefault();
bLeft.addEventListener("touchstart", (e) => {
	prevent(e);
	keys["leftBtn"] = true;
});
bLeft.addEventListener("touchend", () => (keys["leftBtn"] = false));
bRight.addEventListener("touchstart", (e) => {
	prevent(e);
	keys["rightBtn"] = true;
});
bRight.addEventListener("touchend", () => (keys["rightBtn"] = false));
bFire.addEventListener("touchstart", (e) => {
	prevent(e);
	keys["fireBtn"] = true;
});
bFire.addEventListener("touchend", () => (keys["fireBtn"] = false));

startBtn.onclick = () => {
	modal.style.display = "none";
	stage = 1;
	score = 0;
	scoreEl.innerText = 0;
	stageEl.innerText = 1;
	initGame();
};
