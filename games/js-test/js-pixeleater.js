import { saveGameScore } from "../../common/firebase-config.js";

window.addEventListener("contextmenu", (e) => e.preventDefault());

const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
const modal = document.getElementById("gameModal");
const modalTitle = document.getElementById("modalTitle");
const modalDesc = document.getElementById("modalDesc");
const startBtn = document.getElementById("startBtn");
const restartBtn = document.getElementById("restartBtn");
const rankInputArea = document.getElementById("rankInputArea");
const nicknameInput = document.getElementById("nicknameInput");

const TILE_SIZE = 20;
const ROWS = 19;
const COLS = 19;
const BOARD = TILE_SIZE * COLS;

let score = 0;
let stage = 1;
let gameActive = false;
let frameCount = 0;
let animationId = null;
let MAP = [];
let boardOrigin = { x: 0, y: 0, scale: 1 };

let player = {
	x: 9 * TILE_SIZE,
	y: 15 * TILE_SIZE,
	dir: { x: 0, y: 0 },
	nextDir: { x: 0, y: 0 },
	speed: 2,
	isOpen: false,
};

let bugs = [];

function resizeCanvas() {
	canvas.width = canvas.parentElement.clientWidth;
	canvas.height = canvas.parentElement.clientHeight;
	const padTop = Math.round(canvas.height * 0.28);
	const padBottom = Math.round(canvas.height * 0.14);
	const padSide = 28;
	const availW = Math.max(120, canvas.width - padSide * 2);
	const availH = Math.max(120, canvas.height - padTop - padBottom);
	boardOrigin.scale = Math.min(availW / BOARD, availH / BOARD);
	boardOrigin.x = (canvas.width - BOARD * boardOrigin.scale) / 2;
	boardOrigin.y = padTop + (availH - BOARD * boardOrigin.scale) / 2;
}
window.addEventListener("resize", resizeCanvas);

function tileRemainder(v) {
	return ((v % TILE_SIZE) + TILE_SIZE) % TILE_SIZE;
}

function atTileCenter(v) {
	const m = tileRemainder(v);
	return m < 1e-6 || TILE_SIZE - m < 1e-6;
}

function snapGrid(v) {
	return Math.round(v / TILE_SIZE) * TILE_SIZE;
}

function moveOnAxis(v, dir, step) {
	if (!dir) return v;
	const start = tileRemainder(v);
	if (dir > 0) {
		const toGrid = start < 1e-6 ? TILE_SIZE : TILE_SIZE - start;
		if (step >= toGrid - 1e-6) return v + toGrid;
	} else {
		const toGrid = start < 1e-6 ? TILE_SIZE : start;
		if (step >= toGrid - 1e-6) return v - toGrid;
	}
	return v + dir * step;
}

// 🎬 [디렉터 제어 시스템] 상황별 실제 코드 매핑 데이터
let activeDirectorKey = null;
const directorScripts = {
	1: {
		title: "🌀 랜덤 미로 깎기",
		caption: "벽을 채운 뒤, 두 칸씩 길을 팝니다",
		code: [
			"newMap[r][c] = 0;",
			"newMap[r + dr / 2][c + dc / 2] = 0;",
			"carvePath(nr, nc);",
		],
	},
	2: {
		title: "🕹️ 격자 위에서만 회전",
		caption: "칸 한가운데 도착해야 코너를 돕니다",
		code: [
			"if (nearGrid(player.x) && nearGrid(player.y)) {",
			"  player.dir = { ...player.nextDir };",
			"}",
		],
	},
	3: {
		title: "🟡 픽셀 먹기 · 클리어",
		caption: "점 하나당 +10점, 다 먹으면 다음 스테이지",
		code: [
			"if (MAP[r][c] === 2) {",
			"  MAP[r][c] = 3; score += 10;",
			"}",
			"if (!MAP.flat().includes(2)) gameWin();",
		],
	},
	4: {
		title: "👻 버그 추적 AI 70/30",
		caption: "70%는 최단 추격, 30%는 아무 길",
		code: [
			"possibleDirs.sort(byDistToPlayer);",
			"this.dir = Math.random() < 0.7",
			"  ? possibleDirs[0]",
			"  : possibleDirs[random];",
		],
	},
	5: {
		title: "💥 충돌하면 게임 오버",
		caption: "거리가 타일 크기의 0.7배면 사망",
		code: [
			"d = Math.hypot(px - bx, py - by);",
			"if (d < TILE_SIZE * 0.7) gameOver();",
		],
	},
};

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
	for (let r = 8; r <= 10; r++) for (let c = 8; c <= 10; c++) newMap[r][c] = 3;
	newMap[7][9] = 3;
	newMap[15][9] = 3;
	for (let r = 1; r < ROWS - 1; r++) {
		for (let c = 1; c < COLS - 1; c++) {
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
	update(timeScale) {
		const step = this.speed * timeScale;
		if (atTileCenter(this.x) && atTileCenter(this.y)) {
			this.x = snapGrid(this.x);
			this.y = snapGrid(this.y);
			const possibleDirs = [
				{ x: 1, y: 0 },
				{ x: -1, y: 0 },
				{ x: 0, y: 1 },
				{ x: 0, y: -1 },
			].filter(
				(d) => !isWall(this.x + d.x * TILE_SIZE, this.y + d.y * TILE_SIZE),
			);
			if (possibleDirs.length > 0) {
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
		const nx = moveOnAxis(this.x, this.dir.x, step);
		const ny = moveOnAxis(this.y, this.dir.y, step);
		if (!isWall(nx, ny)) {
			this.x = nx;
			this.y = ny;
		} else {
			this.x = snapGrid(this.x);
			this.y = snapGrid(this.y);
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

function isWall(x, y) {
	const col = Math.floor(x / TILE_SIZE);
	const row = Math.floor(y / TILE_SIZE);
	if (row < 0 || row >= ROWS || col < 0 || col >= COLS) return true;
	return MAP[row][col] === 1;
}

function initGame(next = false) {
	resizeCanvas();
	if (!next) {
		score = 0;
		stage = 1;
	}

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

	activeDirectorKey = null;
	gameActive = true;
	canvas.focus();

	if (animationId) cancelAnimationFrame(animationId);
	update();
}

function update() {
	if (!gameActive) return;
	frameCount++;
	player.isOpen = Math.floor(frameCount / 10) % 2 === 0;

	const timeScale = activeDirectorKey ? 0.15 : 1.0;
	const step = player.speed * timeScale;

	if (atTileCenter(player.x) && atTileCenter(player.y)) {
		player.x = snapGrid(player.x);
		player.y = snapGrid(player.y);
		const r = Math.round(player.y / TILE_SIZE);
		const c = Math.round(player.x / TILE_SIZE);
		if (MAP[r] && MAP[r][c] === 2) {
			MAP[r][c] = 3;
			score += 10;
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
	player.x = moveOnAxis(player.x, player.dir.x, step);
	player.y = moveOnAxis(player.y, player.dir.y, step);

	for (const bug of bugs) {
		bug.update(timeScale);
	}

	drawWorld();
	if (activeDirectorKey && directorScripts[activeDirectorKey]) {
		drawDirectorOverlay(directorScripts[activeDirectorKey]);
	}

	animationId = requestAnimationFrame(update);
}

function drawWorld() {
	ctx.fillStyle = "#0a0a0f";
	ctx.fillRect(0, 0, canvas.width, canvas.height);

	ctx.save();
	ctx.translate(boardOrigin.x, boardOrigin.y);
	ctx.scale(boardOrigin.scale, boardOrigin.scale);

	ctx.fillStyle = "#121212";
	ctx.fillRect(-4, -4, BOARD + 8, BOARD + 8);
	ctx.strokeStyle = "#bb86fc";
	ctx.lineWidth = 3 / boardOrigin.scale;
	ctx.strokeRect(-4, -4, BOARD + 8, BOARD + 8);

	for (let r = 0; r < ROWS; r++) {
		for (let c = 0; c < COLS; c++) {
			const tile = MAP[r][c];
			const tx = c * TILE_SIZE;
			const ty = r * TILE_SIZE;
			if (tile === 1) {
				ctx.fillStyle = "#2c2c2c";
				ctx.fillRect(tx + 2, ty + 2, TILE_SIZE - 4, TILE_SIZE - 4);
				ctx.strokeStyle = "#bb86fc33";
				ctx.lineWidth = 1;
				ctx.strokeRect(tx, ty, TILE_SIZE, TILE_SIZE);
			} else if (tile === 2) {
				ctx.fillStyle = "#00e5ff";
				ctx.fillRect(tx + 8, ty + 8, 4, 4);
			}
		}
	}

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
	ctx.restore();
}

function drawDirectorGizmos() {
	ctx.save();
	ctx.translate(boardOrigin.x, boardOrigin.y);
	ctx.scale(boardOrigin.scale, boardOrigin.scale);
	if (activeDirectorKey === "5") {
		ctx.strokeStyle = "rgba(255, 46, 99, 0.95)";
		ctx.lineWidth = 2;
		ctx.beginPath();
		ctx.arc(
			player.x + TILE_SIZE / 2,
			player.y + TILE_SIZE / 2,
			TILE_SIZE * 0.7,
			0,
			Math.PI * 2,
		);
		ctx.stroke();
	}
	if (activeDirectorKey === "4") {
		ctx.strokeStyle = "rgba(255, 235, 59, 0.9)";
		ctx.lineWidth = 2;
		for (const bug of bugs) {
			ctx.beginPath();
			ctx.moveTo(bug.x + TILE_SIZE / 2, bug.y + TILE_SIZE / 2);
			ctx.lineTo(player.x + TILE_SIZE / 2, player.y + TILE_SIZE / 2);
			ctx.stroke();
		}
	}
	ctx.restore();
}

function drawDirectorOverlay(script) {
	ctx.save();
	drawDirectorGizmos();

	const hasCaption = Boolean(script.caption);
	const lineH = 24;
	const boxW = Math.min(canvas.width - 48, 780);
	const boxX = (canvas.width - boxW) / 2;
	const boxY = 14;
	const textX = boxX + 18;
	const codeStart = hasCaption ? 76 : 52;
	const lastBaseline = codeStart + Math.max(script.code.length - 1, 0) * lineH;
	const boxH = lastBaseline + 20;

	ctx.fillStyle = "rgba(20, 22, 30, 0.92)";
	ctx.strokeStyle = "#00e5ff";
	ctx.lineWidth = 2;
	ctx.fillRect(boxX, boxY, boxW, boxH);
	ctx.strokeRect(boxX, boxY, boxW, boxH);

	ctx.font = "bold 16px Pretendard, sans-serif";
	ctx.fillStyle = "#ffeb3b";
	ctx.textAlign = "left";
	ctx.fillText(script.title, textX, boxY + 26);

	if (hasCaption) {
		ctx.font = "13px Pretendard, sans-serif";
		ctx.fillStyle = "#cfd8dc";
		ctx.fillText(script.caption, textX, boxY + 48);
	}

	ctx.font = "14px 'Courier New', monospace";
	ctx.fillStyle = "#00ffcc";
	for (let i = 0; i < script.code.length; i++) {
		ctx.fillText(script.code[i], textX, boxY + codeStart + i * lineH);
	}
	ctx.restore();
}

function showStartModal() {
	modalTitle.innerText = "픽셀 이터";
	modalTitle.style.color = "#ffc107";
	modalDesc.innerHTML =
		`방향키로 직접 움직이며 촬영하세요.<br><br>` +
		`<span style='color:#00e5ff; font-weight:bold;'>[디렉터 치트키]</span><br>` +
		`플레이 중 <strong style='color:#ffeb3b;'>숫자키 1 ~ 5</strong>를 누르면<br>` +
		`상단 코드창과 슬로우 모션이 켜집니다. 같은 키를 다시 누르면 꺼집니다.`;
	rankInputArea.style.display = "none";
	restartBtn.style.display = "none";
	startBtn.style.display = "";
	startBtn.innerText = "게임 시작";
	startBtn.disabled = false;
	startBtn.onclick = () => {
		modal.style.display = "none";
		initGame(false);
	};
	modal.style.display = "flex";
}

function showStageClearModal() {
	modalTitle.innerText = `STAGE ${stage - 1} CLEAR!`;
	modalTitle.style.color = "#00e5ff";
	modalDesc.innerText = "성공적으로 먹어치웠습니다!\n다음 단계로 도전하세요.";
	rankInputArea.style.display = "none";
	restartBtn.style.display = "none";
	startBtn.innerText = "다음 단계";
	startBtn.disabled = false;
	startBtn.onclick = () => {
		modal.style.display = "none";
		initGame(true);
	};
	modal.style.display = "flex";
}

function showGameOverModal(finalScore, isAllClear = false) {
	modalTitle.innerText = isAllClear ? "ALL CLEAR!" : "GAME OVER";
	modalTitle.style.color = isAllClear ? "#ffc107" : "#ff2e63";
	modalDesc.innerHTML = isAllClear
		? `모든 픽셀을 먹어치웠습니다!<br>최종 스코어: <strong style="color:#ffeb3b">${finalScore}</strong>점`
		: `픽셀 괴물과 마주쳤습니다.<br>최종 스코어: <strong style="color:#ffeb3b">${finalScore}</strong>점`;

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
		startBtn.innerText = "등록 중...";
		const result = await saveGameScore("pixeleater", nickname, finalScore);
		alert(result.msg);
		if (result.status !== "error") showStartModal();
		else {
			startBtn.disabled = false;
			startBtn.innerText = "랭킹 등록";
		}
	};
	restartBtn.onclick = () => {
		modal.style.display = "none";
		initGame(false);
	};
	modal.style.display = "flex";
}

function gameWin() {
	gameActive = false;
	cancelAnimationFrame(animationId);
	if (stage >= 10) {
		showGameOverModal(score, true);
	} else {
		stage++;
		showStageClearModal();
	}
}

function gameOver() {
	gameActive = false;
	activeDirectorKey = null;
	cancelAnimationFrame(animationId);
	showGameOverModal(score, false);
}

function setDir(x, y) {
	if (gameActive) player.nextDir = { x, y };
}

function directorDigit(e) {
	if (["1", "2", "3", "4", "5"].includes(e.key)) return e.key;
	if (/^Digit[1-5]$/.test(e.code)) return e.code.slice(-1);
	if (/^Numpad[1-5]$/.test(e.code)) return e.code.slice(-1);
	return null;
}

window.addEventListener(
	"keydown",
	(e) => {
		if (!gameActive) return;
		if (e.repeat) return;
		if (e.code === "ArrowUp" || e.code === "KeyW" || e.key === "ArrowUp")
			setDir(0, -1);
		if (e.code === "ArrowDown" || e.code === "KeyS" || e.key === "ArrowDown")
			setDir(0, 1);
		if (e.code === "ArrowLeft" || e.code === "KeyA" || e.key === "ArrowLeft")
			setDir(-1, 0);
		if (e.code === "ArrowRight" || e.code === "KeyD" || e.key === "ArrowRight")
			setDir(1, 0);
		if (
			["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.key) ||
			[
				"ArrowUp",
				"ArrowDown",
				"ArrowLeft",
				"ArrowRight",
				"KeyW",
				"KeyA",
				"KeyS",
				"KeyD",
			].includes(e.code)
		) {
			e.preventDefault();
		}
		const digit = directorDigit(e);
		if (digit) {
			activeDirectorKey = activeDirectorKey === digit ? null : digit;
			e.preventDefault();
		}
	},
	true,
);

showStartModal();
resizeCanvas();
