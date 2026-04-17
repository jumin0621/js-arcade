const canvas = document.getElementById("snakeGame");
const ctx = canvas.getContext("2d");
const scoreElement = document.getElementById("score");

// 게임 설정
const box = 20; // 한 칸의 크기
let score = 0;
let gameSpeed = 100;

// 뱀 초기 위치 (배열)
let snake = [{ x: 9 * box, y: 10 * box }];

// 먹이 위치
let food = {
	x: Math.floor(Math.random() * 19 + 1) * box,
	y: Math.floor(Math.random() * 19 + 1) * box,
};

let d; // 방향

// 키보드 입력 감지
document.addEventListener("keydown", direction);

window.addEventListener(
	"keydown",
	function (e) {
		// 방향키 코드: 37(Left), 38(Up), 39(Right), 40(Down), 32(Space)
		if ([32, 37, 38, 39, 40].indexOf(e.keyCode) > -1) {
			e.preventDefault();
		}
	},
	false,
);

function direction(event) {
	if (event.keyCode == 37 && d != "RIGHT") d = "LEFT";
	else if (event.keyCode == 38 && d != "DOWN") d = "UP";
	else if (event.keyCode == 39 && d != "LEFT") d = "RIGHT";
	else if (event.keyCode == 40 && d != "UP") d = "DOWN";
}

// 충돌 체크 함수
function collision(head, array) {
	for (let i = 0; i < array.length; i++) {
		if (head.x == array[i].x && head.y == array[i].y) return true;
	}
	return false;
}

// 메인 그리기 함수
function draw() {
	// 배경 지우기
	ctx.fillStyle = "#1e1e1e";
	ctx.fillRect(0, 0, canvas.width, canvas.height);

	// 뱀 그리기
	for (let i = 0; i < snake.length; i++) {
		ctx.fillStyle = i == 0 ? "#00e5ff" : "#00b2cc"; // 머리는 밝은 청록, 몸통은 조금 진하게
		ctx.strokeStyle = "#1e1e1e";
		ctx.fillRect(snake[i].x, snake[i].y, box, box);
		ctx.strokeRect(snake[i].x, snake[i].y, box, box);
	}

	// 먹이 그리기
	ctx.fillStyle = "#ff007b"; // 먹이는 핑크색 네온
	ctx.fillRect(food.x, food.y, box, box);

	// 현재 머리 위치
	let snakeX = snake[0].x;
	let snakeY = snake[0].y;

	// 방향에 따른 이동
	if (d == "LEFT") snakeX -= box;
	if (d == "UP") snakeY -= box;
	if (d == "RIGHT") snakeX += box;
	if (d == "DOWN") snakeY += box;

	// 먹이를 먹었을 때
	if (snakeX == food.x && snakeY == food.y) {
		score++;
		scoreElement.innerText = score;
		food = {
			x: Math.floor(Math.random() * 19 + 1) * box,
			y: Math.floor(Math.random() * 19 + 1) * box,
		};
	} else {
		// 먹이를 안 먹었으면 꼬리 제거
		snake.pop();
	}

	// 새로운 머리 추가
	let newHead = { x: snakeX, y: snakeY };

	// 게임 오버 조건 (벽 충돌 또는 자기 몸 충돌)
	if (
		snakeX < 0 ||
		snakeX >= canvas.width ||
		snakeY < 0 ||
		snakeY >= canvas.height ||
		collision(newHead, snake)
	) {
		clearInterval(game);
		alert(`GAME OVER! 최종 점수: ${score}`);
		location.reload(); // 페이지 새로고침하여 게임 재시작
	}

	snake.unshift(newHead);
}

function setDir(newDir) {
	if (newDir == "LEFT" && d != "RIGHT") d = "LEFT";
	else if (newDir == "UP" && d != "DOWN") d = "UP";
	else if (newDir == "RIGHT" && d != "LEFT") d = "RIGHT";
	else if (newDir == "DOWN" && d != "UP") d = "DOWN";
}

// 게임 시작
let game = setInterval(draw, gameSpeed);
