const canvas = document.getElementById("brickGame");
const ctx = canvas.getContext("2d");

// 게임 상태 관리
let score = 0;
let currentStage = 0;
let isGameRunning = false;
let animationId = null;

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

// 게임 초기화 (완전히 처음부터)
function initGame() {
	score = 0;
	currentStage = 0;
	updateUI(); // UI 업데이트
	resetStageData();
}

// UI 텍스트 업데이트 함수
function updateUI() {
	document.getElementById("score").innerText = score;
	document.getElementById("stage").innerText = currentStage + 1; // 여기서 화면 갱신
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

// 모달 제어
const modal = document.getElementById("gameModal");
const startBtn = document.getElementById("startBtn");

startBtn.onclick = function () {
	modal.style.display = "none";
	if (animationId) cancelAnimationFrame(animationId);
	isGameRunning = true;
	draw();
};

function showModal(title, desc, btnText) {
	isGameRunning = false;
	document.getElementById("modalTitle").innerText = title;
	document.getElementById("modalDesc").innerText = desc;
	startBtn.innerText = btnText;
	modal.style.display = "flex";
}

// 조작 로직 (생략 없이 유지)
document.addEventListener("keydown", (e) => {
	if (e.key == "Right" || e.key == "ArrowRight") rightPressed = true;
	else if (e.key == "Left" || e.key == "ArrowLeft") leftPressed = true;
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
	balls.forEach((ball, index) => {
		ctx.beginPath();
		ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
		ctx.fillStyle = "#fff";
		ctx.fill();
		ctx.closePath();

		ball.x += ball.dx;
		ball.y += ball.dy;

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
				if (balls.length === 0) {
					isGameRunning = false;
					showModal("GAME OVER", "다시 도전하시겠습니까?", "재시작");
					initGame();
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
	});

	// 패들 로직
	ctx.fillStyle = "#00e5ff";
	ctx.fillRect(
		paddleX,
		canvas.height - paddleHeight,
		paddleWidth,
		paddleHeight,
	);
	if (rightPressed && paddleX < canvas.width - paddleWidth) paddleX += 7;
	else if (leftPressed && paddleX > 0) paddleX -= 7;

	animationId = requestAnimationFrame(draw);
}

function duplicateBall(p) {
	balls.push({ x: p.x, y: p.y, dx: -p.dx, dy: p.dy, radius: p.radius });
}

function checkStageClear() {
	if (bricks.every((col) => col.every((b) => b.status === 0))) {
		currentStage++;
		if (currentStage < stages.length) {
			updateUI(); // 클리어 즉시 스테이지 번호 갱신
			showModal(
				"STAGE CLEAR!",
				`다음은 STAGE ${currentStage + 1}입니다.`,
				"다음 단계로",
			);
			resetStageData();
		} else {
			showModal("BRICK MASTER!", "전체 클리어 성공!", "다시 하기");
			initGame();
		}
	}
}

initGame();
