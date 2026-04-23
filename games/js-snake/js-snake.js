// ✅ 중요: 파이어베이스 임포트 시 확장자(.js) 필수
import { saveGameScore } from "../../common/firebase-config.js";

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
let gameInterval;

const modal = document.getElementById("gameModal");
const startBtn = document.getElementById("startBtn");
const rankInputArea = document.getElementById("rankInputArea");
const nicknameInput = document.getElementById("nicknameInput");
const restartBtn = document.getElementById("restartBtn");

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

// [상태 1] 게임 시작 모달 설정
function showStartModal() {
	clearInterval(gameInterval); // 모달이 뜰 때는 무조건 게임 정지
	document.getElementById("modalTitle").innerText = "VANILLA SNAKE";
	document.getElementById("modalDesc").innerText =
		"방향키를 이용해 길게 살아남으세요!";
	rankInputArea.style.display = "none"; // 닉네임 입력칸 숨김
	restartBtn.style.display = "none";
	startBtn.innerText = "게임 시작";
	startBtn.disabled = false;

	startBtn.onclick = function () {
		modal.style.display = "none";
		initGame();
		if (gameInterval) clearInterval(gameInterval);
		gameInterval = setInterval(draw, 100);
	};
	modal.style.display = "flex";
}

// [상태 2] 게임 오버 모달 설정
function showGameOverModal(finalScore) {
	clearInterval(gameInterval); // 뱀 움직임 정지
	document.getElementById("modalTitle").innerText = "GAME OVER";
	document.getElementById("modalDesc").innerText = `최종 점수: ${finalScore}점`;

	rankInputArea.style.display = "block"; // 닉네임 입력칸 보이기
	restartBtn.style.display = "block";
	nicknameInput.value = ""; // 입력된 글자 초기화
	startBtn.innerText = "랭킹 등록";
	startBtn.disabled = false;

	// 랭킹 등록
	startBtn.onclick = async function () {
		const nickname = nicknameInput.value.trim();
		// 간단한 유효성 검사
		if (!nickname || nickname.length < 2) {
			alert("랭킹에 등록할 닉네임(최소 2자)을 입력해주세요!");
			return;
		}

		startBtn.disabled = true;
		startBtn.innerText = "등록 중...";

		// 파이어베이스 DB 전송
		const success = await saveGameScore("snake", nickname, finalScore);

		if (success) {
			alert("명예의 전당에 등록되었습니다! 🏆");
			showStartModal(); // 등록 성공 시 '게임 시작' 모달로 돌아감
		} else {
			alert("등록 실패! 다시 시도해주세요.");
			startBtn.disabled = false;
			startBtn.innerText = "랭킹 등록";
		}
	};
	// 랭킹등록 없이 다시 시작
	restartBtn.onclick = function () {
		modal.style.display = "none";
		initGame();
		if (gameInterval) clearInterval(gameInterval);
		gameInterval = setInterval(draw, 100); // 랭킹 없이 바로 게임 재개
	};

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

// HTML onclick에서 실행되도록 전역 객체(window)에 할당
window.setDir = function (newDir) {
	if (newDir == "LEFT" && d != "RIGHT") d = "LEFT";
	else if (newDir == "UP" && d != "DOWN") d = "UP";
	else if (newDir == "RIGHT" && d != "LEFT") d = "RIGHT";
	else if (newDir == "DOWN" && d != "UP") d = "DOWN";
};

function draw() {
	ctx.fillStyle = "#1e1e1e";
	ctx.fillRect(0, 0, canvas.width, canvas.height);

	for (let i = 0; i < snake.length; i++) {
		ctx.fillStyle = i == 0 ? "#00e5ff" : "#00bcd4";
		ctx.fillRect(snake[i].x, snake[i].y, box, box);
		ctx.strokeStyle = "#1e1e1e";
		ctx.strokeRect(snake[i].x, snake[i].y, box, box);
	}

	ctx.fillStyle = "#ff007b";
	ctx.fillRect(food.x, food.y, box, box);

	let snakeX = snake[0].x;
	let snakeY = snake[0].y;

	if (d == "LEFT") snakeX -= box;
	if (d == "UP") snakeY -= box;
	if (d == "RIGHT") snakeX += box;
	if (d == "DOWN") snakeY += box;

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
		// 죽었을 때 게임 오버 모달 호출!
		showGameOverModal(score);
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

// 최초 화면 진입 시 모달 띄우기
showStartModal();
