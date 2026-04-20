const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
const scoreDisplay = document.getElementById("scoreDisplay");
const stageDisplay = document.getElementById("stageDisplay");
const statusDisplay = document.getElementById("statusDisplay");
const modal = document.getElementById("gameModal");
const modalTitle = document.getElementById("modalTitle");
const modalText = document.getElementById("modalText");
const startBtn = document.getElementById("startBtn");

const TILE_SIZE = 20;
const ROWS = 19;
const COLS = 19;
canvas.width = TILE_SIZE * COLS;
canvas.height = TILE_SIZE * ROWS;

let score = 0;
let stage = 1;
let gameActive = false;
let frameCount = 0;
let animationId = null;
let MAP = [];

let player = {
	x: 9 * TILE_SIZE,
	y: 15 * TILE_SIZE,
	dir: { x: 0, y: 0 },
	nextDir: { x: 0, y: 0 },
	speed: 2,
	isOpen: false,
};

// 랜덤 미로 생성 알고리즘 (Recursive Backtracking)
function generateRandomMap() {
	let newMap = Array.from({ length: ROWS }, () => Array(COLS).fill(1));
	function carvePath(r, c) {
		const dirs = [
			[0, 2],
			[0, -2],
			[2, 0],
			[-2, 0],
		].sort(() => Math.random() - 0.5);
		newMap[r][c] = 0;
		for (let [dr, dc] of dirs) {
			let nr = r + dr,
				nc = c + dc;
			if (
				nr > 0 &&
				nr < ROWS - 1 &&
				nc > 0 &&
				nc < COLS - 1 &&
				newMap[nr][nc] === 1
			) {
				newMap[r + dr / 2][c + dc / 2] = 0;
				carvePath(nr, nc);
			}
		}
	}
	carvePath(1, 1);
	// 중앙 몬스터 방 & 플레이어 시작점 강제 개방
	for (let r = 8; r <= 10; r++) for (let c = 8; c <= 10; c++) newMap[r][c] = 3;
	newMap[7][9] = 3;
	newMap[15][9] = 3;
	// 아이템 배치 및 순환 통로 생성
	for (let r = 1; r < ROWS - 1; r++) {
		for (let c = 1; c < COLS - 1; c++) {
			// 모든 길(0)에 채우지 않고, 60% 확률로만 픽셀을 배치 (0.4보다 클 때)
			// 이 숫자를 높이면(예: 0.7) 픽셀이 더 적어지고, 낮추면 더 많아집니다.
			if (newMap[r][c] === 0 && Math.random() > 0.6) {
				newMap[r][c] = 2;
			} else if (newMap[r][c] === 1 && Math.random() > 0.85) newMap[r][c] = 2;
		}
	}
	return newMap;
}

class Bug {
	constructor(x, y, color, speed) {
		this.startX = x * TILE_SIZE;
		this.startY = y * TILE_SIZE;
		this.x = this.startX;
		this.y = this.startY;
		this.color = color;
		this.dir = { x: 1, y: 0 };
		this.speed = speed;
	}
	reset() {
		this.x = this.startX;
		this.y = this.startY;
		this.dir = { x: 1, y: 0 };
	}
	update() {
		const onGrid =
			Math.abs(this.x % TILE_SIZE) < this.speed &&
			Math.abs(this.y % TILE_SIZE) < this.speed;
		if (onGrid) {
			this.x = Math.round(this.x / TILE_SIZE) * TILE_SIZE;
			this.y = Math.round(this.y / TILE_SIZE) * TILE_SIZE;
			const possibleDirs = [
				{ x: 1, y: 0 },
				{ x: -1, y: 0 },
				{ x: 0, y: 1 },
				{ x: 0, y: -1 },
			].filter(
				(d) => !isWall(this.x + d.x * TILE_SIZE, this.y + d.y * TILE_SIZE),
			);
			if (possibleDirs.length > 0) {
				// 추적 AI: 70% 확률로 가장 가까운 길 선택
				possibleDirs.sort((a, b) => {
					const distA = Math.hypot(
						player.x - (this.x + a.x * TILE_SIZE),
						player.y - (this.y + a.y * TILE_SIZE),
					);
					const distB = Math.hypot(
						player.x - (this.x + b.x * TILE_SIZE),
						player.y - (this.y + b.y * TILE_SIZE),
					);
					return distA - distB;
				});
				this.dir =
					Math.random() < 0.7
						? possibleDirs[0]
						: possibleDirs[Math.floor(Math.random() * possibleDirs.length)];
			}
		}
		if (
			!isWall(
				this.x + this.dir.x * this.speed,
				this.y + this.dir.y * this.speed,
			)
		) {
			this.x += this.dir.x * this.speed;
			this.y += this.dir.y * this.speed;
		} else {
			this.x = Math.round(this.x / TILE_SIZE) * TILE_SIZE;
			this.y = Math.round(this.y / TILE_SIZE) * TILE_SIZE;
			this.dir = { x: 0, y: 0 };
		}
	}
	draw() {
		ctx.fillStyle = this.color;
		const s = TILE_SIZE / 5;
		ctx.fillRect(this.x + s, this.y, s * 3, TILE_SIZE);
		ctx.fillRect(this.x, this.y + s, TILE_SIZE, s * 3);
		ctx.fillStyle = "white";
		ctx.fillRect(this.x + s * 1.5, this.y + s * 1.5, s * 2, s * 2);
		ctx.fillStyle = "black";
		ctx.fillRect(
			this.x + s * 2 + this.dir.x * 2,
			this.y + s * 2 + this.dir.y * 2,
			s,
			s,
		);
	}
}

let bugs = [];

function isWall(x, y) {
	const col = Math.floor(x / TILE_SIZE);
	const row = Math.floor(y / TILE_SIZE);
	if (row < 0 || row >= ROWS || col < 0 || col >= COLS) return true;
	return MAP[row][col] === 1;
}

function initGame(next = false) {
	if (!next) {
		score = 0;
		stage = 1;
	}

	// 몬스터 속도 설정
	// 그리드에 맞게 2.0 또는 2.5로 추천
	let bugSpeed = 1.0;
	let bugCount = 2;
	if (stage >= 3) bugSpeed = 1.2;

	if (stage == 6) {
		bugCount = 3;
		bugSpeed = 1.0;
	}

	if (stage >= 7) {
		bugCount = 3;
		bugSpeed = 1.2;
	}

	if (stage >= 10) bugCount = 4;

	MAP = generateRandomMap();
	bugs = [];
	const colors = ["#ff0266", "#00e5ff", "#ffff00", "#ff5722"];
	for (let i = 0; i < bugCount; i++)
		bugs.push(new Bug(9, 9, colors[i % 4], bugSpeed));

	player.x = 9 * TILE_SIZE;
	player.y = 15 * TILE_SIZE;
	player.dir = { x: 0, y: 0 };
	player.nextDir = { x: 0, y: 0 };

	scoreDisplay.innerText = score;
	stageDisplay.innerText = stage;
	statusDisplay.innerText = "RUNNING";
	modal.style.display = "none";
	gameActive = true;

	if (animationId) cancelAnimationFrame(animationId);
	update();
}

function shuffleMap() {
	let cells = [];
	for (let r = 0; r < ROWS; r++) {
		for (let c = 0; c < COLS; c++) {
			if (MAP[r][c] === 2) cells.push({ r, c });
		}
	}
	cells.forEach((cell) => (MAP[cell.r][cell.c] = 3));
	for (let i = cells.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1));
		[cells[i], cells[j]] = [cells[j], cells[i]];
	}
	cells.forEach((cell) => (MAP[cell.r][cell.c] = 2));
}

function update() {
	if (!gameActive) return;
	frameCount++;
	player.isOpen = Math.floor(frameCount / 10) % 2 === 0;

	if (player.x % TILE_SIZE === 0 && player.y % TILE_SIZE === 0) {
		const r = player.y / TILE_SIZE,
			c = player.x / TILE_SIZE;
		if (MAP[r][c] === 2) {
			MAP[r][c] = 3;
			score += 10;
			scoreDisplay.innerText = score;
			if (!MAP.flat().includes(2)) {
				gameWin();
				return;
			}
		}
		if (player.nextDir.x !== 0 || player.nextDir.y !== 0) {
			if (
				!isWall(
					player.x + player.nextDir.x * TILE_SIZE,
					player.y + player.nextDir.y * TILE_SIZE,
				)
			) {
				player.dir = { ...player.nextDir };
			}
		}
		if (
			isWall(
				player.x + player.dir.x * TILE_SIZE,
				player.y + player.dir.y * TILE_SIZE,
			)
		)
			player.dir = { x: 0, y: 0 };
	}
	player.x += player.dir.x * player.speed;
	player.y += player.dir.y * player.speed;

	bugs.forEach((bug) => {
		bug.update();
		if (Math.hypot(player.x - bug.x, player.y - bug.y) < TILE_SIZE * 0.7)
			gameOver();
	});

	render();
	animationId = requestAnimationFrame(update);
}

function render() {
	ctx.clearRect(0, 0, canvas.width, canvas.height);
	for (let r = 0; r < ROWS; r++) {
		for (let c = 0; c < COLS; c++) {
			const tile = MAP[r][c],
				tx = c * TILE_SIZE,
				ty = r * TILE_SIZE;
			if (tile === 1) {
				ctx.fillStyle = "#2c2c2c";
				ctx.fillRect(tx + 2, ty + 2, TILE_SIZE - 4, TILE_SIZE - 4);
				ctx.strokeStyle = "#bb86fc33";
				ctx.strokeRect(tx, ty, TILE_SIZE, TILE_SIZE);
			} else if (tile === 2) {
				ctx.fillStyle = "#00e5ff";
				ctx.fillRect(tx + 8, ty + 8, 4, 4);
			}
		}
	}
	// 보물상자 디자인
	ctx.save();
	ctx.translate(player.x, player.y);
	ctx.fillStyle = "#ffc107";
	ctx.fillRect(2, 2, 16, 16);
	ctx.fillStyle = "#ff9800";
	ctx.fillRect(2, 2, 16, 2);
	ctx.fillRect(2, 16, 16, 2);
	if (player.isOpen) {
		ctx.fillStyle = "#121212";
		ctx.fillRect(4, 8, 12, 4);
	} else {
		ctx.fillStyle = "#424242";
		ctx.fillRect(7, 8, 6, 4);
	}
	ctx.restore();
	bugs.forEach((bug) => bug.draw());
}

function gameWin() {
	gameActive = false;
	if (stage >= 10) {
		modalTitle.innerText = "ALL CLEAR!";
		modalText.innerText = "모든 픽셀을 먹어치웠습니다!";
		stage = 1;
		startBtn.innerText = "처음부터 다시";
	} else {
		stage++;
		modalTitle.innerText = `STAGE ${stage - 1} CLEAR!`;
		modalText.innerText = "다음 단계로 도전하세요.";
		startBtn.innerText = "다음 단계";
	}
	startBtn.onclick = () => initGame(true);
	modal.style.display = "flex";
}

function gameOver() {
	gameActive = false;
	statusDisplay.innerText = "CRASHED";
	modalTitle.innerText = "GAME OVER";
	modalText.innerText =
		`STAGE${stage}에서 픽셀과 마주쳤습니다.` + `최종스코어 : ${score}`;
	startBtn.innerText = "다시 시작";
	startBtn.onclick = () => initGame(false);
	modal.style.display = "flex";
}

function setDir(x, y) {
	if (gameActive) player.nextDir = { x, y };
}

window.addEventListener("keydown", (e) => {
	if (e.key === "ArrowUp") setDir(0, -1);
	if (e.key === "ArrowDown") setDir(0, 1);
	if (e.key === "ArrowLeft") setDir(-1, 0);
	if (e.key === "ArrowRight") setDir(1, 0);
	if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.key))
		e.preventDefault();
});

// 가상 패드 터치 이벤트 (touchstart, mousedown 모두 대응)
const bindPad = (id, x, y) => {
	const btn = document.getElementById(id);
	const handler = (e) => {
		e.preventDefault();
		setDir(x, y);
	};
	btn.addEventListener("touchstart", handler, { passive: false });
	btn.addEventListener("mousedown", handler);
};

bindPad("padUp", 0, -1);
bindPad("padDown", 0, 1);
bindPad("padLeft", -1, 0);
bindPad("padRight", 1, 0);
