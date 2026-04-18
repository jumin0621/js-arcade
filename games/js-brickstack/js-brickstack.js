window.addEventListener(
	"keydown",
	function (e) {
		if ([32, 37, 38, 39, 40].indexOf(e.keyCode) > -1) {
			e.preventDefault();
		}
	},
	false,
);

const canvas = document.getElementById("tetris");
const context = canvas.getContext("2d");
const nextCanvas = document.getElementById("next");
const nextContext = nextCanvas.getContext("2d");
const ghostToggle = document.getElementById("ghostToggle");

context.scale(20, 20);
nextContext.scale(20, 20);

// [1. 변수 선언]
let isGameRunning = false;
let animationId;
let dropCounter = 0;
let dropInterval = 1000;
let lastTime = 0;
let score = 0;
let arena = createMatrix(12, 20);
let nextPiece = null;
let touchTimer = null;

const player = {
	pos: { x: 0, y: 0 },
	matrix: null,
};

// [2. 블록 색상 팔레트 (Muted Neon)]
const colors = [
	null,
	"#4dd0e1", // I
	"#ffb74d", // L
	"#64b5f6", // J
	"#fff176", // O
	"#ff8a65", // Z
	"#81c784", // S
	"#ba68c8", // T
];

// [3. 블록 데이터 생성]
function createPiece(type) {
	if (type === "I")
		return [
			[0, 1, 0, 0],
			[0, 1, 0, 0],
			[0, 1, 0, 0],
			[0, 1, 0, 0],
		];
	else if (type === "L")
		return [
			[0, 2, 0],
			[0, 2, 0],
			[0, 2, 2],
		];
	else if (type === "J")
		return [
			[0, 3, 0],
			[0, 3, 0],
			[3, 3, 0],
		];
	else if (type === "O")
		return [
			[4, 4],
			[4, 4],
		];
	else if (type === "Z")
		return [
			[5, 5, 0],
			[0, 5, 5],
			[0, 0, 0],
		];
	else if (type === "S")
		return [
			[0, 6, 6],
			[6, 6, 0],
			[0, 0, 0],
		];
	else if (type === "T")
		return [
			[0, 7, 0],
			[7, 7, 7],
			[0, 0, 0],
		];
}

function createMatrix(w, h) {
	const matrix = [];
	while (h--) matrix.push(new Array(w).fill(0));
	return matrix;
}

// [4. 로직 함수들]
function collide(arena, player) {
	const [m, o] = [player.matrix, player.pos];
	for (let y = 0; y < m.length; ++y) {
		for (let x = 0; x < m[y].length; ++x) {
			if (m[y][x] !== 0 && (arena[y + o.y] && arena[y + o.y][x + o.x]) !== 0)
				return true;
		}
	}
	return false;
}

function merge(arena, player) {
	player.matrix.forEach((row, y) => {
		row.forEach((value, x) => {
			if (value !== 0) arena[y + player.pos.y][x + player.pos.x] = value;
		});
	});
}

function rotate(matrix, dir) {
	for (let y = 0; y < matrix.length; ++y) {
		for (let x = 0; x < y; ++x) {
			[matrix[x][y], matrix[y][x]] = [matrix[y][x], matrix[x][y]];
		}
	}
	if (dir > 0) matrix.forEach((row) => row.reverse());
	else matrix.reverse();
}

function playerRotate(dir) {
	const pos = player.pos.x;
	let offset = 1;
	rotate(player.matrix, dir);
	while (collide(arena, player)) {
		player.pos.x += offset;
		offset = -(offset + (offset > 0 ? 1 : -1));
		if (offset > player.matrix[0].length) {
			rotate(player.matrix, -dir);
			player.pos.x = pos;
			return;
		}
	}
}

function playerDrop() {
	player.pos.y++;
	if (collide(arena, player)) {
		player.pos.y--;
		merge(arena, player);
		playerReset();
		arenaSweep();
	}
	dropCounter = 0;
}

function playerHardDrop() {
	while (!collide(arena, player)) {
		player.pos.y++;
	}
	player.pos.y--;
	playerDrop();
}

function playerMove(dir) {
	player.pos.x += dir;
	if (collide(arena, player)) player.pos.x -= dir;
}

function playerReset() {
	const pieces = "ILJOTSZ";
	if (!nextPiece)
		nextPiece = createPiece(pieces[(pieces.length * Math.random()) | 0]);
	player.matrix = nextPiece;
	nextPiece = createPiece(pieces[(pieces.length * Math.random()) | 0]);
	player.pos.y = 0;
	player.pos.x =
		((arena[0].length / 2) | 0) - ((player.matrix[0].length / 2) | 0);
	drawNext();
	if (collide(arena, player)) {
		arena.forEach((row) => row.fill(0));
		score = 0;
		updateScore();
	}
}

function arenaSweep() {
	let rowCount = 1;
	outer: for (let y = arena.length - 1; y > 0; --y) {
		for (let x = 0; x < arena[y].length; ++x) {
			if (arena[y][x] === 0) continue outer;
		}
		const row = arena.splice(y, 1)[0].fill(0);
		arena.unshift(row);
		++y;
		score += rowCount * 10;
		rowCount *= 2;
		updateScore();
	}
}

// [5. 그리기 함수]
function drawMatrix(matrix, offset, ctx = context) {
	matrix.forEach((row, y) => {
		row.forEach((value, x) => {
			if (value !== 0) {
				ctx.fillStyle = colors[value];
				ctx.fillRect(x + offset.x, y + offset.y, 1, 1);
				ctx.lineWidth = 0.05;
				ctx.strokeStyle = "rgba(0,0,0,0.2)";
				ctx.strokeRect(x + offset.x, y + offset.y, 1, 1);
			}
		});
	});
}

function draw() {
	context.fillStyle = "#000";
	context.fillRect(0, 0, canvas.width, canvas.height);
	drawMatrix(arena, { x: 0, y: 0 });

	if (ghostToggle.checked) {
		drawGhost();
	}

	drawMatrix(player.matrix, player.pos);
}

// [고스트 그리기 로직 추가]
function drawGhost() {
	// 현재 플레이어 상태를 복사
	const ghost = {
		pos: { x: player.pos.x, y: player.pos.y },
		matrix: player.matrix,
	};

	// 충돌할 때까지 아래로 밀어넣기
	while (!collide(arena, ghost)) {
		ghost.pos.y++;
	}
	// 충돌 직전 위치로 복구
	ghost.pos.y--;

	// 반투명하게 고스트 블록 그리기
	ghost.matrix.forEach((row, y) => {
		row.forEach((value, x) => {
			if (value !== 0) {
				context.globalAlpha = 0.2; // 투명도 조절
				context.fillStyle = colors[value];
				context.fillRect(x + ghost.pos.x, y + ghost.pos.y, 1, 1);
				context.strokeStyle = colors[value];
				context.lineWidth = 0.05;
				context.strokeRect(x + ghost.pos.x, y + ghost.pos.y, 1, 1);
				context.globalAlpha = 1.0; // 복구
			}
		});
	});
}

function drawNext() {
	nextContext.fillStyle = "#000";
	nextContext.fillRect(0, 0, nextCanvas.width, nextCanvas.height);
	drawMatrix(nextPiece, { x: 1, y: 1 }, nextContext);
}

function updateScore() {
	document.getElementById("score").innerText = score;
}

function update(time = 0) {
	if (!isGameRunning) return;
	const deltaTime = time - lastTime;
	lastTime = time;
	dropCounter += deltaTime;
	if (dropCounter > dropInterval) playerDrop();
	draw();
	animationId = requestAnimationFrame(update);
}

// [6. 제어 및 시작]
const startBtn = document.getElementById("startBtn");
const modal = document.getElementById("gameModal");

startBtn.onclick = () => {
	modal.style.display = "none";
	if (!isGameRunning) {
		isGameRunning = true;
		playerReset();
		updateScore();
		update();
	}
};

window.addEventListener("keydown", (event) => {
	if (!isGameRunning) return;
	if (event.key === "ArrowLeft") playerMove(-1);
	else if (event.key === "ArrowRight") playerMove(1);
	else if (event.key === "ArrowDown") playerDrop();
	else if (event.key === "ArrowUp") playerRotate(1);
	else if (event.key === " ") {
		event.preventDefault();
		playerHardDrop();
	}
});

// 연속 동작을 실행할 함수
function startContinuousAction(actionFn) {
	if (touchTimer) return; // 이미 실행 중이면 중복 방지

	actionFn(); // 즉시 한 번 실행
	touchTimer = setInterval(actionFn, 120); // 120ms 간격으로 반복 (속도는 조절 가능)
}

function stopContinuousAction() {
	if (touchTimer) {
		clearInterval(touchTimer);
		touchTimer = null;
	}
}
// 모바일 버튼 바인딩
// 왼쪽 이동
const btnLeft = document.getElementById("btnLeft");
btnLeft.onpointerdown = (e) => {
	e.preventDefault();
	startContinuousAction(() => playerMove(-1));
};
btnLeft.onpointerup = stopContinuousAction;
btnLeft.onpointerleave = stopContinuousAction; // 손가락이 버튼 밖으로 나갔을 때도 정지

// 오른쪽 이동
const btnRight = document.getElementById("btnRight");
btnRight.onpointerdown = (e) => {
	e.preventDefault();
	startContinuousAction(() => playerMove(1));
};
btnRight.onpointerup = stopContinuousAction;
btnRight.onpointerleave = stopContinuousAction;

// 아래로 이동 (소프트 드롭)
const btnDown = document.getElementById("btnDown");
btnDown.onpointerdown = (e) => {
	e.preventDefault();
	startContinuousAction(() => playerDrop());
};
btnDown.onpointerup = stopContinuousAction;
btnDown.onpointerleave = stopContinuousAction;

// [주의] 회전과 하드드롭은 연속 실행되면 안 되므로 기존 방식 유지 (혹은 터치 다운 시 1회만 실행)
document.getElementById("btnRotate").onpointerdown = (e) => {
	e.preventDefault();
	playerRotate(1);
};
document.getElementById("btnSpace").onpointerdown = (e) => {
	e.preventDefault();
	playerHardDrop();
};
