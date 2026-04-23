// ✅ 랭킹 저장 함수 임포트
import { saveGameScore } from "../../common/firebase-config.js";

const canvas = document.getElementById("bounceGame");
const ctx = canvas.getContext("2d");

// [1. 변수 선언부]
let leftPressed = false;
let rightPressed = false;
let currentStage = 0;
let isGameRunning = false;
let animationId;
let cameraX = 0;
let targetCameraX = 0;
let isTransitioning = false;

// [2. 사용자 지정 물리 설정 적용]
const boxCount = 20;
const box = canvas.width / boxCount; // 20px
const gravity = 0.08;
const jumpForce = -2.2;
const moveSpeed = 1.4;

let ball = { x: 0, y: 0, r: 3, dx: 0, dy: 0, trail: [] };

// [3. 10단계 스테이지 데이터 (생략 없이 원본 유지)]
const maps = [
	// Stage 1
	[
		[1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
		[1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
		[1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
		[1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
		[1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
		[1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
		[1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
		[1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
		[1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
		[1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
		[1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
		[1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
		[1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
		[1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
		[1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 0, 0, 1, 1, 1],
		[1, 5, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 1],
		[1, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 4],
		[1, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 4],
		[1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
		[1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
	],
	// Stage 2
	[
		[1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
		[1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
		[1, 5, 0, 0, 0, 1, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
		[1, 1, 1, 1, 0, 1, 0, 1, 0, 0, 1, 1, 1, 1, 0, 0, 0, 0, 0, 1],
		[1, 0, 0, 0, 0, 1, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 0, 4],
		[1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
	],
	// Stage 3
	[
		[1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
		[1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
		[1, 5, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 1],
		[1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
		[1, 0, 0, 0, 0, 1, 1, 0, 0, 2, 2, 0, 0, 1, 1, 1, 0, 0, 0, 4],
		[1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
	],
	// Stage 4
	[
		[1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
		[1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
		[1, 5, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
		[1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 1],
		[1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 4],
		[1, 1, 1, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 1, 1, 1, 1, 1],
	],
	// Stage 5
	[
		[1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
		[1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
		[1, 5, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
		[1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 4],
		[1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 1],
		[1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 2, 2, 2, 1, 1, 1, 1, 1, 1, 1],
	],
	// Stage 6
	[
		[1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
		[1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
		[1, 5, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1],
		[1, 0, 0, 2, 0, 2, 0, 2, 0, 2, 0, 2, 0, 2, 0, 2, 0, 2, 0, 1],
		[1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 4],
		[1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
	],
	// Stage 7
	[
		[1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
		[1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
		[1, 5, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
		[1, 0, 1, 1, 2, 2, 1, 1, 2, 2, 1, 1, 2, 2, 1, 1, 2, 2, 0, 1],
		[1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 4],
		[1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
	],
	// Stage 8
	[
		[1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
		[1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
		[1, 5, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
		[1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
		[1, 0, 0, 0, 0, 1, 1, 1, 2, 2, 2, 2, 1, 1, 1, 0, 0, 0, 0, 4],
		[1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
	],
	// Stage 9
	[
		[1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
		[1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
		[1, 5, 0, 1, 1, 1, 1, 0, 0, 1, 1, 1, 0, 0, 1, 1, 1, 0, 0, 1],
		[1, 0, 0, 2, 2, 0, 0, 0, 0, 2, 2, 0, 0, 0, 0, 0, 0, 0, 0, 1],
		[1, 1, 0, 0, 0, 0, 1, 1, 0, 0, 0, 0, 1, 1, 0, 0, 0, 0, 0, 4],
		[1, 1, 1, 1, 2, 2, 1, 1, 1, 1, 2, 2, 1, 1, 1, 1, 2, 2, 1, 1],
	],
	// Stage 10
	[
		[1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
		[1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
		[1, 5, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
		[1, 1, 1, 2, 2, 2, 2, 1, 1, 2, 2, 2, 2, 1, 1, 2, 2, 2, 0, 1],
		[1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 4],
		[1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
	],
];

// --- 모달 및 UI 제어 ---
const modal = document.getElementById("gameModal");
const startBtn = document.getElementById("startBtn");
const restartBtn = document.getElementById("restartBtn");
const rankInputArea = document.getElementById("rankInputArea");
const nicknameInput = document.getElementById("nicknameInput");

// [초기화 로직]
function initStage(stageIdx) {
	const map = maps[stageIdx];
	const yOffset = canvas.height - map.length * box;
	ball.dy = 0;
	ball.trail = [];
	isTransitioning = false;

	for (let r = 0; r < map.length; r++) {
		for (let c = 0; c < map[r].length; c++) {
			if (map[r][c] === 5) {
				ball.x = c * box + box / 2 + stageIdx * canvas.width;
				ball.y = r * box + box / 2 + yOffset;
				return;
			}
		}
	}
}

// 1. 게임 시작 모달
function showStartModal() {
	isGameRunning = false;
	document.getElementById("modalTitle").innerText = "BOUNCE BALL";
	document.getElementById("modalDesc").innerText =
		"좌우 방향키로 다음 세상으로 나아가세요!";
	rankInputArea.style.display = "none";
	restartBtn.style.display = "none";

	startBtn.innerText = "게임 시작";
	startBtn.disabled = false;

	startBtn.onclick = function () {
		modal.style.display = "none";
		currentStage = 0;
		cameraX = 0;
		targetCameraX = 0;
		initStage(currentStage);
		document.getElementById("stage").innerText = currentStage + 1;
		isGameRunning = true;
		update();
	};
	modal.style.display = "flex";
}

// 2. 게임 오버 & 랭킹 모달 (바운스볼은 점수 대신 도달한 스테이지 번호를 보냅니다!)
function showGameOverModal(stageScore, isAllClear = false) {
	isGameRunning = false;
	ball.dx = 0;
	cancelAnimationFrame(animationId);

	document.getElementById("modalTitle").innerText = isAllClear
		? "ALL CLEAR!"
		: "GAME OVER";
	document.getElementById("modalDesc").innerText = isAllClear
		? "축하합니다! 모든 스테이지를 정복했습니다!"
		: `아쉽네요! 최고 도달: STAGE ${stageScore}`;

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

		// gameId는 bounceball, 점수는 도달한 스테이지 수!
		const result = await saveGameScore("bounce", nickname, stageScore);
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
		currentStage = 0;
		cameraX = 0;
		targetCameraX = 0;
		initStage(currentStage);
		document.getElementById("stage").innerText = currentStage + 1;
		isGameRunning = true;
		update();
	};

	modal.style.display = "flex";
}

// [이벤트 리스너]
window.addEventListener("keydown", (e) => {
	if (e.key === "ArrowLeft") leftPressed = true;
	if (e.key === "ArrowRight") rightPressed = true;
	if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", " "].includes(e.key))
		e.preventDefault();
});
window.addEventListener("keyup", (e) => {
	if (e.key === "ArrowLeft") leftPressed = false;
	if (e.key === "ArrowRight") rightPressed = false;
});

// 모바일 컨트롤
const lBtn = document.getElementById("leftBtn");
const rBtn = document.getElementById("rightBtn");
if (lBtn && rBtn) {
	lBtn.onpointerdown = () => (leftPressed = true);
	lBtn.onpointerup = () => (leftPressed = false);
	rBtn.onpointerdown = () => (rightPressed = true);
	rBtn.onpointerup = () => (rightPressed = false);
}

// [메인 업데이트 루프]
function update() {
	if (!isGameRunning) return;

	if (!isTransitioning) {
		ball.dy += gravity;
		let inputDx = rightPressed ? moveSpeed : leftPressed ? -moveSpeed : 0;
		let nextX = ball.x + inputDx + ball.dx;
		let nextY = ball.y + ball.dy;
		const map = maps[currentStage];

		if (!checkWall(nextX, ball.y, map)) {
			ball.x = nextX;
			ball.dx *= 0.95;
		} else {
			if (nextX > ball.x) ball.dx = -moveSpeed * 2.3;
			else ball.dx = moveSpeed * 2.3;
			ball.dy = jumpForce * 0.8;
			ball.x += ball.dx;
		}

		if (!checkWall(ball.x, nextY, map)) {
			ball.y = nextY;
		} else {
			if (ball.dy > 0) {
				ball.dy = jumpForce;
				ball.dx = 0;
			} else {
				ball.dy = 0;
			}
		}

		ball.trail.push({ x: ball.x, y: ball.y });
		if (ball.trail.length > 12) ball.trail.shift();
		checkTiles(map);
	} else {
		cameraX += (targetCameraX - cameraX) * 0.08;
		if (Math.abs(cameraX - targetCameraX) < 1) {
			cameraX = targetCameraX;
			isTransitioning = false;
		}
	}
	draw();
	animationId = requestAnimationFrame(update);
}

function checkWall(x, y, map) {
	const yOffset = canvas.height - map.length * box;
	const xOff = currentStage * canvas.width;
	const pts = [
		{ x: x - ball.r, y: y - ball.r },
		{ x: x + ball.r, y: y - ball.r },
		{ x: x - ball.r, y: y + ball.r },
		{ x: x + ball.r, y: y + ball.r },
	];
	for (let p of pts) {
		let gx = Math.floor((p.x - xOff) / box);
		let gy = Math.floor((p.y - yOffset) / box);
		if (gy >= 0 && gy < map.length && gx >= 0 && gx < map[gy].length) {
			if (map[gy][gx] === 1) return true;
		}
	}
	return false;
}

function checkTiles(map) {
	const yOffset = canvas.height - map.length * box;
	const xOff = currentStage * canvas.width;
	let gx = Math.floor((ball.x - xOff) / box);
	let gy = Math.floor((ball.y - yOffset) / box);

	if (gy >= 0 && gy < map.length && gx >= 0 && gx < map[gy].length) {
		let tile = map[gy][gx];
		if (tile === 2) gameOver();
		if (tile === 4 && !isTransitioning) startTransition();
	}
	if (ball.y > canvas.height + 100) gameOver();
}

function startTransition() {
	if (currentStage < maps.length - 1) {
		currentStage++;
		isTransitioning = true;
		targetCameraX += canvas.width;

		const nextMap = maps[currentStage];
		const yOff = canvas.height - nextMap.length * box;
		for (let r = 0; r < nextMap.length; r++) {
			for (let c = 0; c < nextMap[r].length; c++) {
				if (nextMap[r][c] === 5) {
					ball.x = c * box + box / 2 + currentStage * canvas.width;
					ball.y = r * box + box / 2 + yOff;
					ball.dx = 0;
					break;
				}
			}
		}
		document.getElementById("stage").innerText = currentStage + 1;
	} else {
		// [10단계 올 클리어 시 10점 만점 등록]
		showGameOverModal(10, true);
	}
}

function gameOver() {
	// [죽었을 때는 현재 도달한 스테이지 번호를 점수로 취급]
	showGameOverModal(currentStage + 1, false);
}

function draw() {
	ctx.clearRect(0, 0, canvas.width, canvas.height);
	ctx.save();
	ctx.translate(-cameraX, 0);

	for (let s = 0; s < maps.length; s++) {
		const m = maps[s],
			xOff = s * canvas.width,
			yOff = canvas.height - m.length * box;
		for (let r = 0; r < m.length; r++) {
			for (let c = 0; c < m[r].length; c++) {
				let t = m[r][c],
					tx = c * box + xOff,
					ty = r * box + yOff;
				if (t === 1) {
					ctx.fillStyle = "#a82020";
					ctx.fillRect(tx, ty, box, box);
					ctx.fillStyle = "#444";
					ctx.fillRect(tx + 1, ty + 1, box - 2, box - 2);
				} else if (t === 2) {
					ctx.fillStyle = "#ff4444";
					ctx.beginPath();
					ctx.moveTo(tx, ty + box);
					ctx.lineTo(tx + box / 2, ty);
					ctx.lineTo(tx + box, ty + box);
					ctx.fill();
				}
			}
		}
	}

	ball.trail.forEach((p, i) => {
		ctx.beginPath();
		ctx.arc(p.x, p.y, ball.r, 0, Math.PI * 2);
		ctx.fillStyle = `rgba(142, 36, 170, ${i / ball.trail.length})`;
		ctx.fill();
	});

	ctx.fillStyle = "#8e24aa";
	ctx.beginPath();
	ctx.arc(ball.x, ball.y, ball.r, 0, Math.PI * 2);
	ctx.fill();
	ctx.strokeStyle = "#fff";
	ctx.lineWidth = 1;
	ctx.stroke();
	ctx.restore();
}

// 게임 최초 진입 시
initStage(0);
showStartModal();
