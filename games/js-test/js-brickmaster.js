// ✅ 랭킹 저장 함수 임포트 (확장자 주의)
import { saveGameScore } from "../../common/firebase-config.js";

const canvas = document.getElementById("brickGame");
const ctx = canvas.getContext("2d");
const codeOverlay = document.getElementById("codeOverlay"); // 디렉터 모드 DOM

// 게임 상태 관리
let score = 0;
let currentStage = 0;
let isGameRunning = false;
let animationId = null;

// 🔥 디렉터 모드 슬로우 모션 변수
let timeScale = 1.0;

// 패들 및 공 설정
const paddleHeight = 10;
let paddleWidth = 90;
let paddleX = (canvas.width - paddleWidth) / 2;
let balls = [];

const stages = [
	{ rows: 3, cols: 6, color: "#00e5ff" },
	{ rows: 4, cols: 7, color: "#bb86fc" },
	{ rows: 5, cols: 8, color: "#ff007b" },
];

let bricks = [];
let rightPressed = false;
let leftPressed = false;

// 모달 제어 변수
const modal = document.getElementById("gameModal");
const startBtn = document.getElementById("startBtn");
const restartBtn = document.getElementById("restartBtn");
const rankInputArea = document.getElementById("rankInputArea");
const nicknameInput = document.getElementById("nicknameInput");

// --- 🎬 디렉터 모드 코드 템플릿 ---
const overlayCodes = {
	1: `<span class="kd-comment">// 1. 다차원 배열을 이용한 스테이지 생성</span>\n<span class="kd-keyword">const</span> stages = [\n  { rows: 3, cols: 6, color: <span class="kd-string">"#00e5ff"</span> },\n  { rows: 4, cols: 7, color: <span class="kd-string">"#bb86fc"</span> }\n];\n<span class="kd-comment">// 스테이지가 오를수록 배열의 크기가 늘어납니다.</span>`,
	2: `<span class="kd-comment">// 2. AABB 충돌 감지 로직</span>\n<span class="kd-keyword">if</span> (ball.x > b.x && ball.x < b.x + bW &&\n    ball.y > b.y && ball.y < b.y + bH) {\n  ball.dy = -ball.dy;\n  b.status = 0;\n}\n<span class="kd-comment">// 공의 좌표가 벽돌의 면적 내에 들어왔는지 판별합니다.</span>`,
	3: `<span class="kd-comment">// 3. 다중 공(Multi-ball) 증식 로직</span>\n<span class="kd-keyword">if</span> (Math.random() < 0.1 && balls.length < 3) {\n  <span class="kd-func">duplicateBall</span>(ball);\n}\n<span class="kd-comment">// 패들에 튕길 때 10% 확률로 배열에 공 객체를 추가합니다.</span>`,
};

// 게임 초기화 (완전히 처음부터)
function initGame() {
	score = 0;
	currentStage = 0;
	updateUI();
	resetStageData();
}

// UI 텍스트 업데이트
function updateUI() {
	document.getElementById("score").innerText = score;
	document.getElementById("stage").innerText = currentStage + 1;
}

// 스테이지 데이터만 리셋
function resetStageData() {
	paddleX = (canvas.width - paddleWidth) / 2;
	balls = [
		{ x: canvas.width / 2, y: canvas.height - 30, dx: 3, dy: -3, radius: 7 },
	];

	const s = stages[currentStage];
	bricks = [];
	for (let c = 0; c < s.cols; c++) {
		bricks[c] = [];
		for (let r = 0; r < s.rows; r++) {
			bricks[c][r] = { x: 0, y: 0, status: 1 };
		}
	}
}

// --- 모달 제어 로직 (3가지 상태) ---

// 1. 게임 시작 모달
function showStartModal() {
	isGameRunning = false;
	document.getElementById("modalTitle").innerText = "BRICK MASTER";
	document.getElementById("modalDesc").innerText =
		"좌우 방향키를 이용해 모든 벽돌을 제거하세요!";
	rankInputArea.style.display = "none";
	restartBtn.style.display = "none";

	startBtn.innerText = "게임 시작";
	startBtn.disabled = false;
	startBtn.onclick = () => {
		modal.style.display = "none";
		initGame();
		isGameRunning = true;
		if (animationId) cancelAnimationFrame(animationId);
		draw();
	};
	modal.style.display = "flex";
}

// 2. 스테이지 클리어 모달
function showStageClearModal() {
	isGameRunning = false;
	document.getElementById("modalTitle").innerText = "STAGE CLEAR!";
	document.getElementById("modalDesc").innerText =
		`다음은 STAGE ${currentStage + 1}입니다.`;
	rankInputArea.style.display = "none";
	restartBtn.style.display = "none";

	startBtn.innerText = "다음 단계로";
	startBtn.disabled = false;
	startBtn.onclick = () => {
		modal.style.display = "none";
		resetStageData();
		isGameRunning = true;
		if (animationId) cancelAnimationFrame(animationId);
		draw();
	};
	modal.style.display = "flex";
}

// 3. 게임 오버 / 올 클리어 모달 (랭킹 등록)
function showGameOverModal(finalScore, isAllClear = false) {
	isGameRunning = false;
	document.getElementById("modalTitle").innerText = isAllClear
		? "ALL CLEAR!"
		: "GAME OVER";
	document.getElementById("modalDesc").innerText = isAllClear
		? `축하합니다! 벽돌을 모두 부쉈습니다!\n최종 점수: ${finalScore}점`
		: `아쉽네요! 최종 점수: ${finalScore}점`;

	rankInputArea.style.display = "block";
	restartBtn.style.display = "block";
	nicknameInput.value = "";

	startBtn.innerText = "랭킹 등록";
	startBtn.disabled = false;

	// 랭킹 등록 클릭
	startBtn.onclick = async () => {
		const nickname = nicknameInput.value.trim();
		if (!nickname || nickname.length < 2)
			return alert("닉네임을 2자 이상 입력해주세요!");

		startBtn.disabled = true;
		startBtn.innerText = "데이터 확인 중...";

		const result = await saveGameScore("brickmaster", nickname, finalScore);
		alert(result.msg);

		if (result.status !== "error") {
			showStartModal();
		} else {
			startBtn.disabled = false;
			startBtn.innerText = "랭킹 등록";
		}
	};

	// 다시 시작 클릭
	restartBtn.onclick = () => {
		modal.style.display = "none";
		initGame();
		isGameRunning = true;
		if (animationId) cancelAnimationFrame(animationId);
		draw();
	};

	modal.style.display = "flex";
}

// --- 조작 및 그리기 로직 ---

document.addEventListener("keydown", (e) => {
	if (e.key == "Right" || e.key == "ArrowRight") rightPressed = true;
	else if (e.key == "Left" || e.key == "ArrowLeft") leftPressed = true;

	// 🎬 단축키 이벤트 (디렉터 모드)
	if (["1", "2", "3"].includes(e.key)) {
		if (codeOverlay) {
			timeScale = 0.2; // 0.2배속 슬로우 모션
			codeOverlay.innerHTML = overlayCodes[e.key];
			codeOverlay.style.display = "block";
		}
	} else if (e.key === "0") {
		if (codeOverlay) {
			timeScale = 1.0; // 정상 속도 복귀
			codeOverlay.style.display = "none";
		}
	}
});
document.addEventListener("keyup", (e) => {
	if (e.key == "Right" || e.key == "ArrowRight") rightPressed = false;
	else if (e.key == "Left" || e.key == "ArrowLeft") leftPressed = false;
});

const leftBtn = document.getElementById("leftBtn");
const rightBtn = document.getElementById("rightBtn");
leftBtn.onpointerdown = () => (leftPressed = true);
leftBtn.onpointerup = () => (leftPressed = false);
leftBtn.onpointerleave = () => (leftPressed = false);
rightBtn.onpointerdown = () => (rightPressed = true);
rightBtn.onpointerup = () => (rightPressed = false);
rightBtn.onpointerleave = () => (rightPressed = false);

function draw() {
	if (!isGameRunning) return;

	ctx.clearRect(0, 0, canvas.width, canvas.height);

	const s = stages[currentStage];
	const bW = canvas.width / s.cols - 10;
	const bH = 20;

	// 벽돌 그리기
	bricks.forEach((col, c) => {
		col.forEach((b, r) => {
			if (b.status === 1) {
				let bX = c * (bW + 10) + 5;
				let bY = r * (bH + 10) + 30;
				b.x = bX;
				b.y = bY;
				ctx.fillStyle = s.color;
				ctx.beginPath();
				ctx.roundRect(bX, bY, bW, bH, 5);
				ctx.fill();
			}
		});
	});

	// 공 로직
	for (let index = balls.length - 1; index >= 0; index--) {
		let ball = balls[index];

		ctx.beginPath();
		ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
		ctx.fillStyle = "#fff";
		ctx.fill();
		ctx.closePath();

		// 🔥 디렉터 모드 속도 제어 적용
		ball.x += ball.dx * timeScale;
		ball.y += ball.dy * timeScale;

		if (
			ball.x + ball.dx > canvas.width - ball.radius ||
			ball.x + ball.dx < ball.radius
		)
			ball.dx = -ball.dx;
		if (ball.y + ball.dy < ball.radius) ball.dy = -ball.dy;

		if (ball.y + ball.dy > canvas.height - ball.radius - paddleHeight) {
			if (ball.x > paddleX && ball.x < paddleX + paddleWidth) {
				ball.dy = -ball.dy;
				if (Math.random() < 0.1 && balls.length < 3) duplicateBall(ball);
			} else if (ball.y + ball.dy > canvas.height - ball.radius) {
				balls.splice(index, 1);

				// 공이 모두 떨어지면 게임 오버 모달 호출
				if (balls.length === 0) {
					showGameOverModal(score, false);
					return; // draw 루프 종료
				}
			}
		}

		bricks.forEach((col) =>
			col.forEach((b) => {
				if (
					b.status === 1 &&
					ball.x > b.x &&
					ball.x < b.x + bW &&
					ball.y > b.y &&
					ball.y < b.y + bH
				) {
					ball.dy = -ball.dy;
					b.status = 0;
					score += 10;
					document.getElementById("score").innerText = score;
					checkStageClear();
				}
			}),
		);
	}

	// 패들 로직
	ctx.fillStyle = "#00e5ff";
	ctx.fillRect(
		paddleX,
		canvas.height - paddleHeight,
		paddleWidth,
		paddleHeight,
	);

	// 🔥 패들 이동 속도에도 timeScale 적용
	if (rightPressed && paddleX < canvas.width - paddleWidth)
		paddleX += 7 * timeScale;
	else if (leftPressed && paddleX > 0) paddleX -= 7 * timeScale;

	animationId = requestAnimationFrame(draw);
}

function duplicateBall(p) {
	balls.push({ x: p.x, y: p.y, dx: -p.dx, dy: p.dy, radius: p.radius });
}

function checkStageClear() {
	if (bricks.every((col) => col.every((b) => b.status === 0))) {
		currentStage++;
		if (currentStage < stages.length) {
			updateUI();
			showStageClearModal(); // 다음 스테이지 안내 모달
		} else {
			showGameOverModal(score, true); // 올 클리어 성공 모달 (랭킹 등록 포함)
		}
	}
}

// 최초 화면 로드 시 시작 모달 띄우기
initGame();
showStartModal();
