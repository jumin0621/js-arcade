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
const codeOverlay = document.getElementById("codeOverlay");
const box = 20;

let snake = [];
let food = {};
let d;
let score = 0;
let gameInterval;

const BASE_TICK_MS = 100;
let timeScale = 1;

const modal = document.getElementById("gameModal");
const startBtn = document.getElementById("startBtn");
const rankInputArea = document.getElementById("rankInputArea");
const nicknameInput = document.getElementById("nicknameInput");
const restartBtn = document.getElementById("restartBtn");

const overlayCodes = {
	1: `<span class="kd-comment">// 1. Grid unit: box + canvas</span>\n<span class="kd-keyword">const</span> box = <span class="kd-string">20</span>;\n<span class="kd-keyword">const</span> canvas = document.getElementById(<span class="kd-string">"snakeGame"</span>);\n<span class="kd-comment">// 400 / 20 = 20 x 20 cells; moves snap to grid.</span>`,
	2: `<span class="kd-comment">// 2. initGame - head cell, food, score reset</span>\n<span class="kd-func">snake</span> = [{ x: <span class="kd-string">9</span> * box, y: <span class="kd-string">10</span> * box }];\n<span class="kd-func">food</span> = {\n  x: Math.floor(Math.random() * <span class="kd-string">19</span> + <span class="kd-string">1</span>) * box,\n  y: Math.floor(Math.random() * <span class="kd-string">19</span> + <span class="kd-string">1</span>) * box,\n};\n<span class="kd-func">d</span> = undefined; <span class="kd-comment">// no direction until first key</span>`,
	3: `<span class="kd-comment">// 3. Keyboard: block instant 180 deg turns</span>\n<span class="kd-keyword">if</span> (event.keyCode == <span class="kd-string">37</span> &amp;&amp; d != <span class="kd-string">"RIGHT"</span>) d = <span class="kd-string">"LEFT"</span>;\n<span class="kd-keyword">else if</span> (event.keyCode == <span class="kd-string">38</span> &amp;&amp; d != <span class="kd-string">"DOWN"</span>) d = <span class="kd-string">"UP"</span>;\n<span class="kd-comment">// RIGHT / DOWN use the same pattern.</span>`,
	4: `<span class="kd-comment">// 4. Mobile setDir - same opposite-dir guard</span>\nwindow.setDir = <span class="kd-keyword">function</span> (newDir) {\n  <span class="kd-keyword">if</span> (newDir == <span class="kd-string">"LEFT"</span> &amp;&amp; d != <span class="kd-string">"RIGHT"</span>) d = <span class="kd-string">"LEFT"</span>;\n  <span class="kd-keyword">else if</span> (newDir == <span class="kd-string">"UP"</span> &amp;&amp; d != <span class="kd-string">"DOWN"</span>) d = <span class="kd-string">"UP"</span>;\n  <span class="kd-comment">// RIGHT / DOWN: mirror keyboard rules</span>\n};`,
	5: `<span class="kd-comment">// 5. draw - clear frame, iterate segments</span>\nctx.fillStyle = <span class="kd-string">"#1e1e1e"</span>;\nctx.fillRect(<span class="kd-string">0</span>, <span class="kd-string">0</span>, canvas.width, canvas.height);\n<span class="kd-keyword">for</span> (<span class="kd-keyword">let</span> i = <span class="kd-string">0</span>; i &lt; snake.length; i++) {\n  ctx.fillStyle = i == <span class="kd-string">0</span> ? <span class="kd-string">"#00e5ff"</span> : <span class="kd-string">"#00bcd4"</span>;\n  ctx.fillRect(snake[i].x, snake[i].y, box, box);\n}`,
	6: `<span class="kd-comment">// 6. Draw food (one cell)</span>\nctx.fillStyle = <span class="kd-string">"#ff007b"</span>;\nctx.fillRect(food.x, food.y, box, box);\n<span class="kd-comment">// Food x/y are multiples of box.</span>`,
	7: `<span class="kd-comment">// 7. Next head cell - move by box per axis</span>\n<span class="kd-keyword">let</span> snakeX = snake[<span class="kd-string">0</span>].x, snakeY = snake[<span class="kd-string">0</span>].y;\n<span class="kd-keyword">if</span> (d == <span class="kd-string">"LEFT"</span>) snakeX -= box;\n<span class="kd-keyword">if</span> (d == <span class="kd-string">"UP"</span>) snakeY -= box;\n<span class="kd-keyword">if</span> (d == <span class="kd-string">"RIGHT"</span>) snakeX += box;\n<span class="kd-keyword">if</span> (d == <span class="kd-string">"DOWN"</span>) snakeY += box;`,
	8: `<span class="kd-comment">// 8. Eat = grow (skip pop); miss = remove tail</span>\n<span class="kd-keyword">if</span> (snakeX == food.x &amp;&amp; snakeY == food.y) {\n  score++;\n  food = { <span class="kd-comment">/* new random grid cell */</span> };\n} <span class="kd-keyword">else</span> {\n  snake.pop(); <span class="kd-comment">// keep length when not eating</span>\n}`,
	9: `<span class="kd-comment">// 9. Wall / self hit - game over; else unshift head</span>\n<span class="kd-keyword">if</span> (snakeX &lt; 0 || snakeX &gt;= canvas.width ||\n    snakeY &lt; 0 || snakeY &gt;= canvas.height ||\n    collision(newHead, snake)) {\n  showGameOverModal(score); <span class="kd-keyword">return</span>;\n}\nsnake.unshift(newHead);\n\n<span class="kd-keyword">function</span> collision(head, array) {\n  <span class="kd-keyword">for</span> (<span class="kd-keyword">let</span> i = <span class="kd-string">0</span>; i &lt; array.length; i++)\n    <span class="kd-keyword">if</span> (head.x == array[i].x &amp;&amp; head.y == array[i].y) <span class="kd-keyword">return</span> <span class="kd-keyword">true</span>;\n}`,
};

function tickIntervalMs() {
	return Math.max(16, Math.round(BASE_TICK_MS / timeScale));
}

function restartGameLoop() {
	if (gameInterval) clearInterval(gameInterval);
	gameInterval = setInterval(draw, tickIntervalMs());
}

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

function showStartModal() {
	clearInterval(gameInterval);
	gameInterval = null;
	document.getElementById("modalTitle").innerText = "VANILLA SNAKE";
	document.getElementById("modalDesc").innerText =
		"Use arrow keys. Keys 1-9: director overlay + slow; 0: normal speed.";
	rankInputArea.style.display = "none";
	restartBtn.style.display = "none";
	startBtn.innerText = "Start";
	startBtn.disabled = false;

	startBtn.onclick = function () {
		modal.style.display = "none";
		initGame();
		restartGameLoop();
	};
	modal.style.display = "flex";
}

function showGameOverModal(finalScore) {
	clearInterval(gameInterval);
	gameInterval = null;
	document.getElementById("modalTitle").innerText = "GAME OVER";
	document.getElementById("modalDesc").innerText = `Score: ${finalScore}`;

	rankInputArea.style.display = "block";
	restartBtn.style.display = "block";
	nicknameInput.value = "";
	startBtn.innerText = "Submit score";
	startBtn.disabled = false;

	startBtn.onclick = async function () {
		const nickname = nicknameInput.value.trim();
		if (!nickname || nickname.length < 2) {
			alert("Nickname: at least 2 characters.");
			return;
		}

		startBtn.disabled = true;
		startBtn.innerText = "Saving...";

		const result = await saveGameScore("snake", nickname, finalScore);

		alert(result.msg);

		if (result.status !== "error") {
			showStartModal();
		} else {
			startBtn.disabled = false;
			startBtn.innerText = "Submit score";
		}
	};

	restartBtn.onclick = function () {
		modal.style.display = "none";
		initGame();
		restartGameLoop();
	};

	modal.style.display = "flex";
}

document.addEventListener("keydown", direction);
function direction(event) {
	if (event.keyCode == 37 && d != "RIGHT") d = "LEFT";
	else if (event.keyCode == 38 && d != "DOWN") d = "UP";
	else if (event.keyCode == 39 && d != "LEFT") d = "RIGHT";
	else if (event.keyCode == 40 && d != "UP") d = "DOWN";

	const k = event.key;
	if (k >= "1" && k <= "9" && codeOverlay) {
		timeScale = 0.2;
		codeOverlay.innerHTML = overlayCodes[k];
		codeOverlay.style.display = "block";
		if (gameInterval) restartGameLoop();
	} else if (k === "0" && codeOverlay) {
		timeScale = 1;
		codeOverlay.style.display = "none";
		if (gameInterval) restartGameLoop();
	}
}

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

	if (
		snakeX < 0 ||
		snakeX >= canvas.width ||
		snakeY < 0 ||
		snakeY >= canvas.height ||
		collision(newHead, snake)
	) {
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

showStartModal();
