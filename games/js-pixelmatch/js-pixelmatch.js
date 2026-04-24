import { saveGameScore } from "../../common/firebase-config.js";

const canvas = document.getElementById("matchCanvas");
const ctx = canvas.getContext("2d");
const scoreDisplay = document.getElementById("scoreDisplay");
const stageDisplay = document.getElementById("stageDisplay");
const timeDisplay = document.getElementById("timeDisplay");

const modal = document.getElementById("gameModal");
const modalTitle = document.getElementById("modalTitle");
const modalDesc = document.getElementById("modalDesc");
const rankInputArea = document.getElementById("rankInputArea");
const nicknameInput = document.getElementById("nicknameInput");
const startBtn = document.getElementById("startBtn");
const restartBtn = document.getElementById("restartBtn");

let tiles = [];
let stack = [];
const MAX_STACK = 7;
let score = 0;
let stage = 1;

// 🔥 타이머 변수
const TIME_LIMIT = 90; // 모든 스테이지 동일 시간
let timeLeft = TIME_LIMIT;
let timerId = null;

let gameActive = false;
let animationId = null;

const TILE_TYPES = ["🥦", "🍦", "🔔", "🌸", "🍼", "⭐", "💎", "🍎"];
let TILE_SIZE = 0;
let stackY = 0;
let stackAreaH = 0;

function initGame(isNextStage = false) {
	if (!isNextStage) {
		score = 0;
		stage = 1;
	} else {
		stage++;
	}

	// 타이머 및 정보창 초기화
	timeLeft = TIME_LIMIT;
	scoreDisplay.innerText = score;
	stageDisplay.innerText = stage;
	timeDisplay.innerText = timeLeft;

	clearInterval(timerId);
	timerId = setInterval(() => {
		if (!gameActive) return;
		timeLeft--;
		timeDisplay.innerText = timeLeft;
		if (timeLeft <= 0) {
			gameOver("시간 초과!");
		}
	}, 1000);

	const container = document.getElementById("gameArea");
	canvas.width = container.clientWidth || 360;
	canvas.height = container.clientHeight || 480;

	if (canvas.height <= 0) canvas.height = canvas.width * (4 / 3);

	const gap = 5;
	const stackPadding = 20;
	TILE_SIZE = Math.floor((canvas.width - stackPadding - gap * 6) / 7);
	TILE_SIZE = Math.min(TILE_SIZE, 65);

	stackAreaH = TILE_SIZE + 20;
	stackY = canvas.height - stackAreaH - 10;

	tiles = [];
	stack = [];

	const margin = 15;
	const safeW = Math.max(10, canvas.width - TILE_SIZE - margin * 2);
	const safeH = Math.max(10, stackY - TILE_SIZE - margin);

	// 🔥 스테이지가 오를수록 그림 개수(세트) 증가 (1단계: 2세트, 2단계: 3세트...)
	const setsPerType = stage + 1;

	TILE_TYPES.forEach((type) => {
		for (let j = 0; j < setsPerType * 3; j++) {
			tiles.push({
				type: type,
				x: margin + Math.random() * safeW,
				y: margin + Math.random() * safeH,
				status: "board",
				layer: Math.random(),
			});
		}
	});

	tiles.sort((a, b) => a.layer - b.layer);
	gameActive = true;
	modal.style.display = "none";
	if (animationId) cancelAnimationFrame(animationId);
	draw();
}

function draw() {
	if (!gameActive) return;
	ctx.clearRect(0, 0, canvas.width, canvas.height);

	ctx.fillStyle = "#1e1e1e";
	ctx.beginPath();
	ctx.roundRect(10, stackY, canvas.width - 20, stackAreaH, 10);
	ctx.fill();
	ctx.strokeStyle = "#444";
	ctx.stroke();

	tiles.forEach((tile) => {
		if (tile.status !== "board") return;
		ctx.save();
		ctx.shadowBlur = 8;
		ctx.shadowColor = "rgba(0,0,0,0.6)";
		ctx.shadowOffsetY = 4;

		ctx.fillStyle = "#2c2c2c";
		ctx.beginPath();
		ctx.roundRect(tile.x, tile.y, TILE_SIZE, TILE_SIZE, 8);
		ctx.fill();
		ctx.strokeStyle = "#555";
		ctx.lineWidth = 2;
		ctx.stroke();

		ctx.shadowBlur = 0;
		ctx.fillStyle = "white";
		ctx.font = `${TILE_SIZE * 0.55}px Arial`;
		ctx.textAlign = "center";
		ctx.textBaseline = "middle";
		ctx.fillText(tile.type, tile.x + TILE_SIZE / 2, tile.y + TILE_SIZE / 2 + 2);
		ctx.restore();
	});

	stack.forEach((tile, i) => {
		const gap = 5;
		const totalW = (TILE_SIZE + gap) * stack.length - gap;
		const startX = (canvas.width - totalW) / 2;
		const sx = startX + i * (TILE_SIZE + gap);
		const sy = stackY + (stackAreaH - TILE_SIZE) / 2;

		ctx.fillStyle = "#333";
		ctx.beginPath();
		ctx.roundRect(sx, sy, TILE_SIZE, TILE_SIZE, 6);
		ctx.fill();
		ctx.strokeStyle = "#00e5ff";
		ctx.stroke();

		ctx.fillStyle = "white";
		ctx.font = `${TILE_SIZE * 0.55}px Arial`;
		ctx.textAlign = "center";
		ctx.textBaseline = "middle";
		ctx.fillText(tile.type, sx + TILE_SIZE / 2, sy + TILE_SIZE / 2 + 2);
	});

	animationId = requestAnimationFrame(draw);
}

canvas.addEventListener("click", (e) => {
	if (!gameActive || stack.length >= MAX_STACK) return;
	const rect = canvas.getBoundingClientRect();
	const scaleX = canvas.width / rect.width;
	const scaleY = canvas.height / rect.height;
	const mouseX = (e.clientX - rect.left) * scaleX;
	const mouseY = (e.clientY - rect.top) * scaleY;

	for (let i = tiles.length - 1; i >= 0; i--) {
		const t = tiles[i];
		if (
			t.status === "board" &&
			mouseX > t.x &&
			mouseX < t.x + TILE_SIZE &&
			mouseY > t.y &&
			mouseY < t.y + TILE_SIZE
		) {
			moveToStack(t);
			break;
		}
	}
});

function moveToStack(tile) {
	tile.status = "stack";
	stack.push(tile);
	stack.sort((a, b) => a.type.localeCompare(b.type));

	const counts = {};
	stack.forEach((t) => (counts[t.type] = (counts[t.type] || 0) + 1));

	for (let type in counts) {
		if (counts[type] === 3) {
			setTimeout(() => {
				stack = stack.filter((t) => t.type !== type);
				score += 300;
				scoreDisplay.innerText = score;
				checkWin();
			}, 150);
		}
	}

	if (stack.length >= MAX_STACK) {
		setTimeout(() => gameOver("스택이 가득 찼습니다!"), 200);
	}
}

// 🔥 스테이지 클리어 로직
function checkWin() {
	if (tiles.every((t) => t.status !== "board") && stack.length === 0) {
		gameActive = false;
		clearInterval(timerId);

		// 걸린 시간만큼 페널티 점수 차감 (마이너스)
		const timeTaken = TIME_LIMIT - timeLeft;
		const penalty = timeTaken * 10;
		score = Math.max(0, score - penalty); // 점수가 마이너스가 되진 않게 방어
		scoreDisplay.innerText = score;

		showStageClearModal();
	}
}

function gameOver(reason) {
	gameActive = false;
	clearInterval(timerId);
	showGameOverModal(reason);
}

// 1. 스테이지 클리어 모달 (스도쿠 스타일 랭킹 유도)
function showStageClearModal() {
	modalTitle.innerText = `STAGE ${stage} CLEAR!`;
	modalDesc.innerText = `걸린 시간 페널티가 적용되었습니다.\n현재 누적 점수: ${score}점`;

	rankInputArea.style.display = "block";
	restartBtn.style.display = "block";
	nicknameInput.value = "";

	startBtn.innerText = "랭킹 등록(종료)";
	restartBtn.innerText = "다음 단계(계속)";

	// 랭킹 등록
	startBtn.onclick = async () => {
		const nickname = nicknameInput.value.trim();
		if (!nickname || nickname.length < 2)
			return alert("닉네임을 2자 이상 입력해주세요!");

		startBtn.disabled = true;
		startBtn.innerText = "저장 중...";

		const result = await saveGameScore("pixelmatch", nickname, score);
		alert(result.msg);
		showStartModal();
	};

	// 다음 단계 계속하기
	restartBtn.onclick = () => {
		initGame(true);
	};

	modal.style.display = "flex";
}

// 2. 게임 오버 모달
function showGameOverModal(reason) {
	modalTitle.innerText = "GAME OVER";
	modalDesc.innerText = `${reason}\n최종 점수: ${score}점`;

	rankInputArea.style.display = "block";
	restartBtn.style.display = "block";
	nicknameInput.value = "";

	startBtn.innerText = "랭킹 등록";
	restartBtn.innerText = "처음부터";

	startBtn.onclick = async () => {
		const nickname = nicknameInput.value.trim();
		if (!nickname || nickname.length < 2)
			return alert("닉네임을 2자 이상 입력해주세요!");
		startBtn.disabled = true;
		startBtn.innerText = "저장 중...";
		const result = await saveGameScore("pixelmatch", nickname, score);
		alert(result.msg);
		showStartModal();
	};

	restartBtn.onclick = () => initGame(false);
	modal.style.display = "flex";
}

// 3. 첫 시작 모달
function showStartModal() {
	gameActive = false;
	clearInterval(timerId);

	modalTitle.innerText = "PIXEL MATCH";
	modalDesc.innerText = "3개의 같은 픽셀을 모아 소거하세요!";
	rankInputArea.style.display = "none";
	restartBtn.style.display = "none";

	startBtn.innerText = "게임 시작";
	startBtn.disabled = false;
	startBtn.onclick = () => initGame(false);

	modal.style.display = "flex";
}

window.addEventListener("resize", () => {
	if (!gameActive) {
		const container = document.getElementById("gameArea");
		canvas.width = container.clientWidth;
		canvas.height = container.clientHeight;
	}
});

showStartModal();
