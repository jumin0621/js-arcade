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

function nearGrid(v, speed) {
	const m = ((v % TILE_SIZE) + TILE_SIZE) % TILE_SIZE;
	return m < speed + 0.001 || TILE_SIZE - m < speed + 0.001;
}

function snapGrid(v) {
	return Math.round(v / TILE_SIZE) * TILE_SIZE;
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

// 🎬 자동 촬영 시퀀스 — 페이지를 연 순간부터 자막 타임라인과 동기화
const DEMO_FAST = new URLSearchParams(location.search).has("fast");
const DEMO_CLOCK = DEMO_FAST ? 10 : 1;
const DEMO = {
	t0: performance.now(),
	started: false,
	ended: false,
	segments: [
		{ at: 0, until: 12000, key: null },
		{ at: 12000, until: 28000, key: null },
		{ at: 28000, until: 55000, key: "1" },
		{ at: 55000, until: 82000, key: "2" },
		{ at: 82000, until: 115000, key: "3" },
		{ at: 115000, until: 160000, key: "4" },
		{ at: 160000, until: 192000, key: "5" },
		{ at: 192000, until: 220000, key: null },
	],
};

function demoElapsed() {
	return (performance.now() - DEMO.t0) * DEMO_CLOCK;
}

function demoKeyAt(t) {
	for (const seg of DEMO.segments) {
		if (t >= seg.at && t < seg.until) return seg.key;
	}
	return null;
}

function walkableTile(r, c) {
	return r >= 0 && r < ROWS && c >= 0 && c < COLS && MAP[r]?.[c] !== 1;
}

function firstStepToward(sr, sc, pred) {
	const q = [[sr, sc]];
	const prev = { [`${sr},${sc}`]: null };
	const dirs = [
		[0, 1],
		[0, -1],
		[1, 0],
		[-1, 0],
	];
	let head = 0;
	while (head < q.length) {
		const [r, c] = q[head++];
		if ((r !== sr || c !== sc) && pred(r, c)) {
			let cr = r,
				cc = c;
			while (prev[`${cr},${cc}`]) {
				const [pr, pc] = prev[`${cr},${cc}`];
				if (pr === sr && pc === sc) return { x: cc - sc, y: cr - sr };
				cr = pr;
				cc = pc;
			}
		}
		for (const [dr, dc] of dirs) {
			const nr = r + dr,
				nc = c + dc;
			const k = `${nr},${nc}`;
			if (walkableTile(nr, nc) && !(k in prev)) {
				prev[k] = [r, c];
				q.push([nr, nc]);
			}
		}
	}
	return null;
}

function refillPixels() {
	let added = 0;
	for (let r = 1; r < ROWS - 1; r++) {
		for (let c = 1; c < COLS - 1; c++) {
			if (MAP[r][c] !== 1 && MAP[r][c] !== 2 && Math.random() > 0.72) {
				MAP[r][c] = 2;
				added++;
			}
		}
	}
	if (added === 0) {
		for (let r = 1; r < ROWS - 1 && added === 0; r++) {
			for (let c = 1; c < COLS - 1 && added === 0; c++) {
				if (MAP[r][c] !== 1) {
					MAP[r][c] = 2;
					added++;
				}
			}
		}
	}
}

function autoPilot(seekBug) {
	const sr = snapGrid(player.y) / TILE_SIZE;
	const sc = snapGrid(player.x) / TILE_SIZE;
	let step = null;
	if (seekBug && bugs.length) {
		const b = bugs[0];
		const br = Math.round(b.y / TILE_SIZE);
		const bc = Math.round(b.x / TILE_SIZE);
		step = firstStepToward(sr, sc, (r, c) => r === br && c === bc);
	}
	if (!step) step = firstStepToward(sr, sc, (r, c) => MAP[r][c] === 2);
	if (!seekBug) {
		let closest = null,
			cd = Infinity;
		for (const b of bugs) {
			const d = Math.hypot(player.x - b.x, player.y - b.y);
			if (d < cd) {
				cd = d;
				closest = b;
			}
		}
		if (closest && cd < TILE_SIZE * 3.2) {
			const dirs = [
				{ x: 1, y: 0 },
				{ x: -1, y: 0 },
				{ x: 0, y: 1 },
				{ x: 0, y: -1 },
			].filter(
				(d) =>
					!isWall(player.x + d.x * TILE_SIZE, player.y + d.y * TILE_SIZE),
			);
			dirs.sort((a, b) => {
				const da = Math.hypot(
					player.x + a.x * TILE_SIZE - closest.x,
					player.y + a.y * TILE_SIZE - closest.y,
				);
				const db = Math.hypot(
					player.x + b.x * TILE_SIZE - closest.x,
					player.y + b.y * TILE_SIZE - closest.y,
				);
				return db - da;
			});
			if (dirs[0]) step = dirs[0];
		}
	}
	if (step) player.nextDir = step;
}

function showDemoCta() {
	gameActive = false;
	activeDirectorKey = null;
	if (animationId) cancelAnimationFrame(animationId);
	drawWorld();
	modalTitle.innerText = "픽셀 이터";
	modalTitle.style.color = "#ffc107";
	modalDesc.innerHTML =
		`다운로드 없이 바로 즐기는 추억의 픽셀 이터.<br>` +
		`고정 댓글 링크에서 지금 바로 리마스터된 게임을 즐겨 보세요.`;
	rankInputArea.style.display = "none";
	restartBtn.style.display = "none";
	startBtn.style.display = "none";
	modal.style.display = "flex";
}

function restartDemoLoop() {
	DEMO.t0 = performance.now();
	DEMO.started = false;
	DEMO.ended = false;
	if (animationId) cancelAnimationFrame(animationId);
	gameActive = false;
	activeDirectorKey = null;
	showStartModal();
}

function syncDirectorTimeline() {
	const t = demoElapsed();
	if (t >= 220000) {
		restartDemoLoop();
		return;
	}
	if (t >= 12000 && !DEMO.started) {
		DEMO.started = true;
		modal.style.display = "none";
		startBtn.style.display = "";
		initGame(false);
	}
	if (t >= 192000 && DEMO.started && !DEMO.ended) {
		DEMO.ended = true;
		showDemoCta();
		return;
	}
	if (DEMO.started && !DEMO.ended) {
		activeDirectorKey = demoKeyAt(t);
	}
}

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
		const onGrid = nearGrid(this.x, step) && nearGrid(this.y, step);
		if (onGrid) {
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
		if (!isWall(this.x + this.dir.x * step, this.y + this.dir.y * step)) {
			this.x += this.dir.x * step;
			this.y += this.dir.y * step;
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

	if (animationId) cancelAnimationFrame(animationId);
	update();
}

function update() {
	if (!gameActive) return;
	syncDirectorTimeline();
	if (!gameActive) return;
	frameCount++;
	player.isOpen = Math.floor(frameCount / 10) % 2 === 0;

	const t = demoElapsed();
	const timeScale = activeDirectorKey ? 0.15 : 1.0;
	const step = player.speed * timeScale;
	const seekBug = t >= 184000 && t < 192000;

	if (nearGrid(player.x, step) && nearGrid(player.y, step)) {
		player.x = snapGrid(player.x);
		player.y = snapGrid(player.y);
		autoPilot(seekBug);
		const r = player.y / TILE_SIZE;
		const c = player.x / TILE_SIZE;
		if (MAP[r] && MAP[r][c] === 2) {
			MAP[r][c] = 3;
			score += 10;
			if (!MAP.flat().includes(2)) refillPixels();
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
	player.x += player.dir.x * step;
	player.y += player.dir.y * step;

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

	const captionH = script.caption ? 20 : 0;
	const boxH = 40 + captionH + script.code.length * 22;
	const boxW = Math.min(canvas.width - 48, 760);
	const boxX = (canvas.width - boxW) / 2;
	const boxY = 14;

	ctx.fillStyle = "rgba(20, 22, 30, 0.92)";
	ctx.strokeStyle = "#00e5ff";
	ctx.lineWidth = 2;
	ctx.fillRect(boxX, boxY, boxW, boxH);
	ctx.strokeRect(boxX, boxY, boxW, boxH);

	ctx.font = "bold 16px Pretendard, sans-serif";
	ctx.fillStyle = "#ffeb3b";
	ctx.textAlign = "left";
	ctx.fillText(script.title, boxX + 16, boxY + 24);

	if (script.caption) {
		ctx.font = "13px Pretendard, sans-serif";
		ctx.fillStyle = "#cfd8dc";
		ctx.fillText(script.caption, boxX + 16, boxY + 46);
	}

	ctx.font = "14px 'Courier New', monospace";
	ctx.fillStyle = "#00ffcc";
	const codeTop = boxY + 46 + captionH;
	for (let i = 0; i < script.code.length; i++) {
		ctx.fillText(script.code[i], boxX + 16, codeTop + 20 + i * 22);
	}
	ctx.restore();
}

function showStartModal() {
	modalTitle.innerText = "픽셀 이터";
	modalTitle.style.color = "#ffc107";
	modalDesc.innerHTML =
		`페이지를 연 순간부터 자동 촬영이 시작됩니다.<br>` +
		`<span style='color:#00e5ff; font-weight:bold;'>지금 화면 녹화를 켜 주세요.</span><br>` +
		`키를 누르지 않아도 플레이 · 슬로우 · 코드창이 자막 타이밍에 맞춰 돌아갑니다.`;
	rankInputArea.style.display = "none";
	restartBtn.style.display = "none";
	startBtn.style.display = "none";
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

window.addEventListener("keydown", (e) => {
	if (!gameActive) return;
	if (e.key === "ArrowUp") setDir(0, -1);
	if (e.key === "ArrowDown") setDir(0, 1);
	if (e.key === "ArrowLeft") setDir(-1, 0);
	if (e.key === "ArrowRight") setDir(1, 0);
	if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.key))
		e.preventDefault();
	if (["1", "2", "3", "4", "5"].includes(e.key)) {
		activeDirectorKey = e.key;
	}
});

window.addEventListener("keyup", (e) => {
	if (
		["1", "2", "3", "4", "5"].includes(e.key) &&
		activeDirectorKey === e.key
	) {
		activeDirectorKey = null;
	}
});

showStartModal();
resizeCanvas();

function demoClockLoop() {
	syncDirectorTimeline();
	if (!DEMO.started) {
		const remain = Math.max(0, 12 - demoElapsed() / 1000);
		if (modal.style.display !== "none") {
			const sec = Math.ceil(remain);
			modalDesc.innerHTML =
				`페이지를 연 순간부터 자동 촬영이 시작됩니다.<br>` +
				`<span style='color:#00e5ff; font-weight:bold;'>지금 화면 녹화를 켜 주세요.</span><br>` +
				(sec > 0
					? `<strong style='color:#ffeb3b;'>${sec}초 후 자동 시작</strong>`
					: `시작합니다.`);
		}
	}
	requestAnimationFrame(demoClockLoop);
}
demoClockLoop();
