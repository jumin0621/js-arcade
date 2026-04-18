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

// 사용자 요청 수치 적용
const gravity = 0.08; // 중력 (낮게)
const jumpForce = -2.2; // 점프 힘 (낮게)
const moveSpeed = 1.4; // 이동 속도 (느리게)

// [1. 좌우 반동 dx 개념 도입]
let ball = {
	x: 0,
	y: 0,
	r: 3, // 공 크기 (작게 유지)
	dx: 0, // 좌우 반동 속도
	dy: 0,
	trail: [],
};

// [4. 10단계 스테이지 데이터: 좌우 벽 강화]
// 0:빈공간, 1:벽돌, 2:가시, 4:출구, 5:시작점
const maps = [
	[
		// Stage 1: 기초 (좌우 막음)
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
	[
		// Stage 2: 벽 타기 입문 (1 0 1 구조)
		[1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
		[1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
		[1, 5, 0, 0, 0, 1, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1], // 1 0 1 구조
		[1, 1, 1, 1, 0, 1, 0, 1, 0, 0, 1, 1, 1, 1, 0, 0, 0, 0, 0, 1],
		[1, 0, 0, 0, 0, 1, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 0, 4],
		[1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
	],
	[
		// Stage 3: 가시 피하기 (좌우 막음)
		[1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
		[1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
		[1, 5, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 1],
		[1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
		[1, 0, 0, 0, 0, 1, 1, 0, 0, 2, 2, 0, 0, 1, 1, 1, 0, 0, 0, 4],
		[1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
	],
	[
		// Stage 4: 정밀 점프 (좌우 막음)
		[1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
		[1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
		[1, 5, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
		[1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 1],
		[1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 4],
		[1, 1, 1, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 1, 1, 1, 1, 1],
	],
	[
		// Stage 5: 지그재그 하강 (좌우 막음)
		[1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
		[1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
		[1, 5, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
		[1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 4],
		[1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 1],
		[1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 2, 2, 2, 1, 1, 1, 1, 1, 1, 1],
	],
	[
		// Stage 6: 가시 기둥 (좌우 막음)
		[1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
		[1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
		[1, 5, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1],
		[1, 0, 0, 2, 0, 2, 0, 2, 0, 2, 0, 2, 0, 2, 0, 2, 0, 2, 0, 1],
		[1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 4],
		[1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
	],
	[
		// Stage 7: 타이밍 (좌우 막음)
		[1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
		[1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
		[1, 5, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
		[1, 0, 1, 1, 2, 2, 1, 1, 2, 2, 1, 1, 2, 2, 1, 1, 2, 2, 0, 1],
		[1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 4],
		[1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
	],
	[
		// Stage 8: 좁은 길 (좌우 막음)
		[1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
		[1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
		[1, 5, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
		[1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
		[1, 0, 0, 0, 0, 1, 1, 1, 2, 2, 2, 2, 1, 1, 1, 0, 0, 0, 0, 4],
		[1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
	],
	[
		// Stage 9: 최종 미로 (좌우 막음)
		[1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
		[1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
		[1, 5, 0, 1, 1, 1, 1, 0, 0, 1, 1, 1, 0, 0, 1, 1, 1, 0, 0, 1],
		[1, 0, 0, 2, 2, 0, 0, 0, 0, 2, 2, 0, 0, 0, 0, 0, 0, 0, 0, 1],
		[1, 1, 0, 0, 0, 0, 1, 1, 0, 0, 0, 0, 1, 1, 0, 0, 0, 0, 0, 4],
		[1, 1, 1, 1, 2, 2, 1, 1, 1, 1, 2, 2, 1, 1, 1, 1, 2, 2, 1, 1],
	],
	[
		// Stage 10: 라스트 런 (좌우 막음)
		[1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
		[1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
		[1, 5, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
		[1, 1, 1, 2, 2, 2, 2, 1, 1, 2, 2, 2, 2, 1, 1, 2, 2, 2, 0, 1],
		[1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 4],
		[1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
	],
];

const modal = document.getElementById("gameModal");
const startBtn = document.getElementById("startBtn");

// [초기화 로직]
function initStage(stageIdx) {
	const map = maps[stageIdx];
	const yOffset = canvas.height - map.length * box;
	ball.dy = 0;
	ball.trail = []; // 잔상 초기화
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

startBtn.onclick = function () {
	modal.style.display = "none";
	currentStage = 0;
	cameraX = 0;
	targetCameraX = 0;
	initStage(currentStage);
	document.getElementById("stage").innerText = currentStage + 1;
	if (!isGameRunning) {
		isGameRunning = true;
		update();
	}
};

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

		// 유저의 입력 속도
		let inputDx = rightPressed ? moveSpeed : leftPressed ? -moveSpeed : 0;

		// 현재 공의 속도는 유저 입력 + 외부 반동(ball.dx)
		let nextX = ball.x + inputDx + ball.dx;
		let nextY = ball.y + ball.dy;
		const map = maps[currentStage];

		// 1. X축 충돌 검사 (벽 튕기기 핵심)
		if (!checkWall(nextX, ball.y, map)) {
			ball.x = nextX;
			// 공중에 있을 때 반동(ball.dx)을 서서히 줄여서 조작감을 회복시킴
			ball.dx *= 0.95;
		} else {
			// [강력 반동 로직] 벽에 닿는 순간 반대 방향으로 튕겨냄
			// 단순히 멈추는 게 아니라 반대쪽으로 강한 힘(dx)을 부여
			if (nextX > ball.x) {
				// 오른쪽 벽 충돌
				ball.dx = -moveSpeed * 2.3; // 왼쪽으로 튕김
			} else {
				// 왼쪽 벽 충돌
				ball.dx = moveSpeed * 2.3; // 오른쪽으로 튕김
			}

			// [벽 점프] 튕길 때만 살짝 위로 힘을 줌
			ball.dy = jumpForce * 0.8;

			// 한쪽 벽만 타는 것을 방지하기 위해 튕겨 나간 후에는 반대 키를 눌러야 함
			ball.x += ball.dx;
		}

		// 2. Y축 충돌 검사 (바닥/천장)
		if (!checkWall(ball.x, nextY, map)) {
			ball.y = nextY;
		} else {
			if (ball.dy > 0) {
				// 바닥 충돌
				ball.dy = jumpForce;
				ball.dx = 0; // 바닥에 닿으면 좌우 반동 초기화 (안정적 착지)
			} else {
				// 천장 충돌
				ball.dy = 0;
			}
		}

		// 잔상 및 타일 체크
		ball.trail.push({ x: ball.x, y: ball.y });
		if (ball.trail.length > 12) ball.trail.shift(); // 잔상을 더 길게 (12개)
		checkTiles(map);
	} else {
		// 카메라 전환 로직 동일
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
	// 정밀 충돌 판정을 위해 사방 4점 체크
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
	// [4. 좌우 낙사 방지 처리로 인해 Y축 낙사만 체크]
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
					ball.dx = 0; // 전환 시 dx 초기화
					break;
				}
			}
		}
		document.getElementById("stage").innerText = currentStage + 1;
	} else {
		isGameRunning = false;
		showModal("BOUNCE MASTER!", "전설의 공튀기기 정복!", "다시 하기");
	}
}

function gameOver() {
	isGameRunning = false;
	ball.dx = 0; // dx 초기화
	cancelAnimationFrame(animationId);
	showModal("GAME OVER", "다시 도전하시겠습니까?", "재시작");
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

	// [3. 잔상 그리기 - 더 진하고 길게]
	ball.trail.forEach((p, i) => {
		ctx.beginPath();
		ctx.arc(p.x, p.y, ball.r, 0, Math.PI * 2);
		// 알파값을 i / trail.length로 조절하여 끝으로 갈수록 흐려짐
		ctx.fillStyle = `rgba(142, 36, 170, ${i / ball.trail.length})`;
		ctx.fill();
	});

	// 공 그리기 (작아진 공)
	ctx.fillStyle = "#8e24aa";
	ctx.beginPath();
	ctx.arc(ball.x, ball.y, ball.r, 0, Math.PI * 2);
	ctx.fill();
	ctx.strokeStyle = "#fff";
	ctx.lineWidth = 1;
	ctx.stroke();
	ctx.restore();
}

function showModal(title, desc, btnText) {
	document.getElementById("modalTitle").innerText = title;
	document.getElementById("modalDesc").innerText = desc;
	startBtn.innerText = btnText;
	modal.style.display = "flex";
}

initStage(0);
