import { saveGameScore } from "../../common/firebase-config.js";

window.addEventListener("keydown", function (e) {
	if ([32, 37, 38, 39, 40].indexOf(e.keyCode) > -1) {
		e.preventDefault();
	}
}, false);

const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
const scoreEl = document.getElementById("scoreDisplay");
const stageEl = document.getElementById("stageDisplay");

const modal = document.getElementById("gameModal");
const modalTitle = document.getElementById("modalTitle");
const modalDesc = document.getElementById("modalDesc");
const startBtn = document.getElementById("startBtn");
const restartBtn = document.getElementById("restartBtn");
const rankInputArea = document.getElementById("rankInputArea");
const nicknameInput = document.getElementById("nicknameInput");

// 🔥 디렉터 모드 오버레이 컨테이너
const codeOverlay = document.getElementById("codeOverlay");

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

// 🔥 슬로우 모션을 위한 전역 시간 배율 변수 (1.0 = 정상속도)
let timeScale = 1.0; 

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
const codeFragments = ["<div>", "</span>", ";", "err", "404", "{}", "=>", "let", "const"];

// 🔥 디렉터 모드용 오버레이 코드 템플릿 데이터
const overlayCodes = {
	'1': `<span class="kd-comment">// 1. 이미지 없이 0과 1로 그리는 픽셀 몬스터</span>
<span class="kd-keyword">const</span> enemyPixel = [
  [0, 1, 1, 1, 0],
  [1, 1, 0, 1, 1],
  [1, 1, 1, 1, 1],
  [0, 1, 0, 1, 0],
];
<span class="kd-comment">// 배열을 순회하며 1인 영역만 색칠합니다.</span>`,

	'2': `<span class="kd-comment">// 2. 적 격파 시 코드 파편(Particle) 효과</span>
<span class="kd-keyword">class</span> Particle {
  <span class="kd-func">constructor</span>(x, y) {
    <span class="kd-keyword">this</span>.text = codeFragments[Math.random()];
    <span class="kd-keyword">this</span>.vx = (Math.random() - 0.5) * 4;
    <span class="kd-keyword">this</span>.vy = (Math.random() - 0.5) * 4;
  }
}`,

	'3': `<span class="kd-comment">// 3. 가장 완벽한 타격감: AABB 충돌 감지 알고리즘</span>
<span class="kd-keyword">if</span> (
  b.x > e.x && 
  b.x < e.x + e.width && 
  b.y < e.y + e.height && 
  b.y > e.y
) {
  e.hp--; <span class="kd-comment">// 적 체력 삭감</span>
  bullets.splice(bi, 1); <span class="kd-comment">// 총알 소멸</span>
}`,

	'4': `<span class="kd-comment">// 4. 극강 난이도의 거대 보스 출현 분기점</span>
<span class="kd-keyword">if</span> (stage % 5 === 0) {
  <span class="kd-comment">// 5스테이지 단위로 체력이 높은 보스 생성</span>
  enemies.push(<span class="kd-keyword">new</span> Enemy(center, 60, <span class="kd-keyword">true</span>));
} <span class="kd-keyword">else</span> {
  <span class="kd-comment">// 일반 적 부대 생성 로직</span>
}`
};

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
        // 🔥 timeScale 곱셈 적용
		this.x += this.vx * timeScale;
		this.y += this.vy * timeScale;
		this.alpha -= 0.02 * timeScale;
	}
	draw() {
		ctx.save();
		ctx.globalAlpha = this.alpha < 0 ? 0 : this.alpha;
		ctx.fillStyle = this.color;
		ctx.font = "10px monospace";
		ctx.fillText(this.text, this.x, this.y);
		ctx.restore();
	}
}

class Player {
	constructor() {
		this.width = 30;
		this.height = 24;
		this.x = canvas.width / 2 - this.width / 2;
		this.y = canvas.height - 40;
		this.speed = 4;
		this.color = "#bb86fc";
	}
	draw() {
		ctx.fillStyle = this.color;
		const pSize = this.width / 5;
		playerPixel.forEach((row, ri) => {
			row.forEach((col, ci) => {
				if (col) {
					ctx.fillRect(this.x + ci * pSize, this.y + ri * pSize, pSize, pSize);
				}
			});
		});
		ctx.fillStyle = "rgba(0, 229, 255, 0.5)";
		ctx.font = "bold 10px monospace";
		ctx.textAlign = "center";
		ctx.fillText("JS", this.x + this.width / 2, this.y + this.height + 12);
	}
	move() {
        // 🔥 timeScale 곱셈 적용
		if ((keys["ArrowLeft"] || keys["leftBtn"]) && this.x > 0)
			this.x -= this.speed * timeScale;
		if ((keys["ArrowRight"] || keys["rightBtn"]) && this.x < canvas.width - this.width)
			this.x += this.speed * timeScale;
	}
}

class Enemy {
	constructor(x, y, isBoss = false) {
		this.x = x;
		this.y = y;
		this.isBoss = isBoss;
		this.width = isBoss ? 60 : 25;
		this.height = isBoss ? 40 : 20;
		this.hp = isBoss ? stage * 4 : 1;
		this.color = isBoss ? "#ff00ff" : "#00e5ff";
	}
	draw() {
		ctx.fillStyle = this.color;
		if (this.isBoss) {
			ctx.shadowBlur = 10;
			ctx.shadowColor = this.color;
			const bossPixel = [
				[0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0],
				[0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0],
				[1, 1, 0, 0, 1, 1, 1, 1, 0, 0, 1, 1],
				[1, 1, 0, 0, 1, 1, 1, 1, 0, 0, 1, 1],
				[1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
				[0, 1, 1, 1, 0, 0, 0, 0, 1, 1, 1, 0],
				[0, 0, 1, 0, 1, 0, 0, 1, 0, 1, 0, 0],
				[0, 0, 0, 1, 0, 1, 1, 0, 1, 0, 0, 0],
			];
			const pWidth = this.width / 12;
			const pHeight = this.height / 8;
			bossPixel.forEach((row, ri) => {
				row.forEach((col, ci) => {
					if (col) ctx.fillRect(this.x + ci * pWidth, this.y + ri * pHeight, pWidth, pHeight);
				});
			});

			ctx.shadowBlur = 0;
			ctx.fillStyle = "#333";
			ctx.fillRect(this.x, this.y - 15, this.width, 4);
			ctx.fillStyle = this.color;
			ctx.fillRect(this.x, this.y - 15, this.width * (this.hp / (stage * 3)), 4);
		} else {
			const pSize = this.width / 5;
			enemyPixel.forEach((row, ri) => {
				row.forEach((col, ci) => {
					if (col) ctx.fillRect(this.x + ci * pSize, this.y + ri * pSize, pSize, pSize);
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
		this.speed = isEnemy ? 2.5 + stage * 0.1 : -6;
		this.width = isEnemy ? 4 : 2;
		this.height = isEnemy ? 10 : 8;
	}
	update() {
        // 🔥 timeScale 곱셈 적용
		this.y += this.speed * timeScale;
	}
	draw() {
		if (this.isEnemy) {
			ctx.save();
			ctx.shadowBlur = 8;
			ctx.shadowColor = "#ff1744";
			ctx.fillStyle = "#ff1744";
			ctx.fillRect(this.x, this.y, this.width, this.height);
			ctx.restore();
		} else {
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

	if (keys[" "] || keys["fireBtn"]) {
		const now = Date.now();
        // 발사 속도는 플레이어 체감을 위해 그대로 유지
		if (now - lastFireTime > 180) {
			bullets.push(new Bullet(player.x + player.width / 2 - 1, player.y - 15));
			lastFireTime = now;
		}
	}

    // 🔥 적군의 움직임 딜레이에도 timeScale 적용
	enemyMoveTimer += 1 * timeScale;
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

	particles.forEach((p, i) => {
		p.update();
		p.draw();
		if (p.alpha <= 0) particles.splice(i, 1);
	});

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
						particles.push(new Particle(e.x + e.width / 2, e.y + e.height / 2, e.color));
					enemies.splice(ei, 1);
					score += e.isBoss ? 500 : 10;
					scoreEl.innerText = score;
				}
			}
		});
	});

    // 🔥 적군의 총알 발사 확률에도 timeScale 적용 (슬로우 모션 시 총알 융단폭격 방지)
	if (enemies.length > 0 && Math.random() < (0.006 + stage * 0.001) * timeScale) {
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

// --- 모달 제어 로직 ---
function showStartModal() {
	gameActive = false;
	modalTitle.innerText = "CODE BREAKER";
	modalDesc.innerText = "JS코드를 지닌 적들을 격파하세요!";
	rankInputArea.style.display = "none";
	restartBtn.style.display = "none";

	startBtn.innerText = "게임 시작";
	startBtn.disabled = false;
	startBtn.onclick = () => {
		modal.style.display = "none";
		stage = 1;
		score = 0;
		scoreEl.innerText = 0;
		stageEl.innerText = 1;
		initGame();
	};
	modal.style.display = "flex";
}

function showGameOverModal(finalScore, isAllClear = false) {
	gameActive = false;
	modalTitle.innerText = isAllClear ? "ALL COMPILED" : "SYSTEM CRASHED";
	modalDesc.innerText = isAllClear
		? `완벽한 최적화!\n최종 점수: ${finalScore}점`
		: `에러 코드에게 침투 당했습니다.\n최종 점수: ${finalScore}점`;

	rankInputArea.style.display = "block";
	restartBtn.style.display = "block";
	nicknameInput.value = "";

	startBtn.innerText = "랭킹 등록";
	startBtn.disabled = false;

	startBtn.onclick = async () => {
		const nickname = nicknameInput.value.trim();
		if (!nickname || nickname.length < 2) return alert("닉네임을 2자 이상 입력해주세요!");
		startBtn.disabled = true;
		startBtn.innerText = "데이터 확인 중...";
		const result = await saveGameScore("invader", nickname, finalScore);
		alert(result.msg);
		if (result.status !== "error") showStartModal();
		else {
			startBtn.disabled = false;
			startBtn.innerText = "랭킹 등록";
		}
	};

	restartBtn.onclick = () => {
		modal.style.display = "none";
		stage = 1;
		score = 0;
		scoreEl.innerText = 0;
		stageEl.innerText = 1;
		initGame();
	};
	modal.style.display = "flex";
}

function gameOver() { showGameOverModal(score, false); }
function gameWin() { showGameOverModal(score, true); }

// --- 🔥 조작 및 디렉터 모드 키보드 이벤트 ---
window.addEventListener("keydown", (e) => {
	keys[e.key] = true;
    
    // 1~4 키 입력 시 슬로우 모션(0.2배속) + 해당 로직 팝업
    if (['1', '2', '3', '4'].includes(e.key)) {
        timeScale = 0.2; 
        codeOverlay.innerHTML = overlayCodes[e.key];
        codeOverlay.style.display = 'block';
    } 
    // 0 키 입력 시 정상 속도 + 팝업 숨김
    else if (e.key === '0') {
        timeScale = 1.0; 
        codeOverlay.style.display = 'none';
    }
});

window.addEventListener("keyup", (e) => (keys[e.key] = false));

const bLeft = document.getElementById("btnLeft"),
	bRight = document.getElementById("btnRight"),
	bFire = document.getElementById("btnFire");
const prevent = (e) => e.preventDefault();
bLeft.addEventListener("touchstart", (e) => { prevent(e); keys["leftBtn"] = true; });
bLeft.addEventListener("touchend", () => (keys["leftBtn"] = false));
bRight.addEventListener("touchstart", (e) => { prevent(e); keys["rightBtn"] = true; });
bRight.addEventListener("touchend", () => (keys["rightBtn"] = false));
bFire.addEventListener("touchstart", (e) => { prevent(e); keys["fireBtn"] = true; });
bFire.addEventListener("touchend", () => (keys["fireBtn"] = false));

showStartModal();