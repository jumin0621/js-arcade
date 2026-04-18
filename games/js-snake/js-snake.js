window.addEventListener(
	"keydown",
	function (e) {
		if ([32, 37, 38, 39, 40].indexOf(e.keyCode) > -1) {
			e.preventDefault();
		}
	},
	false,
);

const canvas = document.getElementById("snakeGame");
const ctx = canvas.getContext("2d");
const box = 20;

let snake = [];
let food = {};
let d;
let score = 0;
let gameInterval; // 인터벌 관리를 위한 변수
let isGameRunning = false;

const modal = document.getElementById("gameModal");
const startBtn = document.getElementById("startBtn");

// 초기 세팅
function initGame() {
	snake = [{ x: 9 * box, y: 10 * box }];
	food = {
		x: Math.floor(Math.random() * 19 + 1) * box,
		y: Math.floor(Math.random() * 19 + 1) * box,
	};
	d = undefined;
	score = 0;
	document.getElementById("score").innerText = score;
}

// 시작 버튼 클릭
startBtn.onclick = function () {
	modal.style.display = "none";
	initGame();
	if (gameInterval) clearInterval(gameInterval);
	gameInterval = setInterval(draw, 100); // 0.1초마다 실행
};

function showModal(title, desc, btnText) {
	clearInterval(gameInterval);
	document.getElementById("modalTitle").innerText = title;
	document.getElementById("modalDesc").innerText = desc;
	startBtn.innerText = btnText;
	modal.style.display = "flex";
}

// 방향 제어
document.addEventListener("keydown", direction);
function direction(event) {
	if (event.keyCode == 37 && d != "RIGHT") d = "LEFT";
	else if (event.keyCode == 38 && d != "DOWN") d = "UP";
	else if (event.keyCode == 39 && d != "LEFT") d = "RIGHT";
	else if (event.keyCode == 40 && d != "UP") d = "DOWN";
}

function setDir(newDir) {
	if (newDir == "LEFT" && d != "RIGHT") d = "LEFT";
	else if (newDir == "UP" && d != "DOWN") d = "UP";
	else if (newDir == "RIGHT" && d != "LEFT") d = "RIGHT";
	else if (newDir == "DOWN" && d != "UP") d = "DOWN";
}

function draw() {
	ctx.fillStyle = "#1e1e1e";
	ctx.fillRect(0, 0, canvas.width, canvas.height);

	for (let i = 0; i < snake.length; i++) {
		ctx.fillStyle = i == 0 ? "#00e5ff" : "#00bcd4"; // 머리와 몸통 색상 차이
		ctx.fillRect(snake[i].x, snake[i].y, box, box);
		ctx.strokeStyle = "#1e1e1e";
		ctx.strokeRect(snake[i].x, snake[i].y, box, box);
	}

	ctx.fillStyle = "#ff007b"; // 먹이 색상
	ctx.fillRect(food.x, food.y, box, box);

	let snakeX = snake[0].x;
	let snakeY = snake[0].y;

	if (d == "LEFT") snakeX -= box;
	if (d == "UP") snakeY -= box;
	if (d == "RIGHT") snakeX += box;
	if (d == "DOWN") snakeY += box;

	// 먹이를 먹었을 때
	if (snakeX == food.x && snakeY == food.y) {
		score++;
		document.getElementById("score").innerText = score;
		food = {
			x: Math.floor(Math.random() * 19 + 1) * box,
			y: Math.floor(Math.random() * 19 + 1) * box,
		};
	} else {
		snake.pop();
	}

	let newHead = { x: snakeX, y: snakeY };

	// 게임 오버 조건
	if (
		snakeX < 0 ||
		snakeX >= canvas.width ||
		snakeY < 0 ||
		snakeY >= canvas.height ||
		collision(newHead, snake)
	) {
		showModal("GAME OVER", `최종 점수: ${score}점`, "다시 도전");
		return;
	}

	snake.unshift(newHead);
}

function collision(head, array) {
	for (let i = 0; i < array.length; i++) {
		if (head.x == array[i].x && head.y == array[i].y) return true;
	}
	return false;
}
