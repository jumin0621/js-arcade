// ✅ 랭킹 저장 함수 임포트
import { saveGameScore } from "../../common/firebase-config.js";

const canvas = document.getElementById("puzzleCanvas");
const ctx = canvas.getContext("2d");
const spinner = document.getElementById("loadingSpinner");
const modal = document.getElementById("gameModal");
const progressDisplay = document.getElementById("progressDisplay");
const pieceDisplay = document.getElementById("pieceDisplay");

// --- 모달 제어 변수 ---
const modalTitle = document.getElementById("modalTitle");
const modalMessage = document.getElementById("modalMessage");
const difficultyOptions = document.getElementById("difficultyOptions");
const resultOptions = document.getElementById("resultOptions");
const rankInputArea = document.getElementById("rankInputArea");
const nicknameInput = document.getElementById("nicknameInput");
const startBtn = document.getElementById("startBtn");
const restartBtn = document.getElementById("restartBtn");

const PUZZLE_IMAGES = [
	"https://i.ibb.co/SDXWtZnn/image.webp",
	"https://i.ibb.co/KjmBXsL0/image.webp",
	"https://i.ibb.co/JFmsKVc3/image.webp",
	"https://i.ibb.co/tTF8Wn51/image.webp",
	"https://i.ibb.co/m5TnXj8C/image.webp",
	"https://i.ibb.co/CKd3Jvwm/dejavufina21.webp",
];

let img = new Image();
let pieces = [];
let gridSize = 3;
let selectedPiece = null;
let offset = { x: 0, y: 0 };
let solvedCount = 0;
let timeElapsed = 0;
let timerInterval;

// 1. 초기 시작 모달
function showStartModal() {
	modalTitle.innerText = "JIGSAW PUZZLE";
	modalMessage.innerText = "난이도를 선택해 이미지를 복구하세요!";
	difficultyOptions.style.display = "flex";
	resultOptions.style.display = "none";
	rankInputArea.style.display = "none";
	modal.style.display = "flex";
}

// 난이도 클릭 및 스피너 로직
document.querySelectorAll(".diff-btn").forEach((btn) => {
	btn.onclick = () => {
		gridSize = parseInt(btn.dataset.grid);
		const randomImg =
			PUZZLE_IMAGES[Math.floor(Math.random() * PUZZLE_IMAGES.length)];

		modal.style.display = "none";
		canvas.style.display = "none";
		spinner.style.display = "block"; // 로딩 시작

		img.src = randomImg;
		img.onload = () => {
			spinner.style.display = "none"; // 로딩 끝
			canvas.style.display = "block";
			document.getElementById("hintThumb").style.backgroundImage =
				`url(${img.src})`;
			document.getElementById("hintPreview").style.backgroundImage =
				`url(${img.src})`;
			initGame();
		};
	};
});

function initGame() {
	const container = document.getElementById("gameArea");
	canvas.width = container.clientWidth;
	canvas.height = container.clientHeight;
	progressDisplay.innerText = "0%";

	createPieces();
	shufflePieces();
	draw();

	// 점수 계산을 위한 타이머 시작
	timeElapsed = 0;
	clearInterval(timerInterval);
	timerInterval = setInterval(() => {
		timeElapsed++;
	}, 1000);
}

function createPieces() {
	pieces = [];
	solvedCount = 0;
	const pWidth = (canvas.width * 0.8) / gridSize;
	const pHeight = (canvas.height * 0.6) / gridSize;
	const startX = (canvas.width - pWidth * gridSize) / 2;
	const startY = (canvas.height - pHeight * gridSize) / 2;

	for (let r = 0; r < gridSize; r++) {
		for (let c = 0; c < gridSize; c++) {
			pieces.push({
				sx: (img.width / gridSize) * c,
				sy: (img.height / gridSize) * r,
				sw: img.width / gridSize,
				sh: img.height / gridSize,
				destX: startX + c * pWidth,
				destY: startY + r * pHeight,
				x: 0,
				y: 0,
				width: pWidth,
				height: pHeight,
				isSolved: false,
			});
		}
	}
	pieceDisplay.innerText = `${gridSize}x${gridSize}`;
}

function shufflePieces() {
	pieces.forEach((p) => {
		p.x = Math.random() * (canvas.width - p.width);
		p.y = Math.random() * (canvas.height - p.height);
	});
}

function draw() {
	ctx.clearRect(0, 0, canvas.width, canvas.height);

	ctx.strokeStyle = "rgba(187, 134, 252, 0.1)";
	pieces.forEach((p) => ctx.strokeRect(p.destX, p.destY, p.width, p.height));

	const sortedPieces = [...pieces].sort((a, b) => a.isSolved - b.isSolved);

	sortedPieces.forEach((p) => {
		ctx.save();
		if (p.isSolved) {
			ctx.drawImage(
				img,
				p.sx,
				p.sy,
				p.sw,
				p.sh,
				p.destX,
				p.destY,
				p.width,
				p.height,
			);
			ctx.strokeStyle = "rgba(255, 255, 255, 0.1)";
			ctx.strokeRect(p.destX, p.destY, p.width, p.height);
		} else {
			ctx.shadowBlur = 10;
			ctx.shadowColor = "black";
			ctx.drawImage(img, p.sx, p.sy, p.sw, p.sh, p.x, p.y, p.width, p.height);
			ctx.strokeStyle = "#bb86fc";
			ctx.lineWidth = 2;
			ctx.strokeRect(p.x, p.y, p.width, p.height);
		}
		ctx.restore();
	});
}

canvas.onmousedown = (e) => handleStart(e.offsetX, e.offsetY);
canvas.ontouchstart = (e) => {
	const rect = canvas.getBoundingClientRect();
	handleStart(
		e.touches[0].clientX - rect.left,
		e.touches[0].clientY - rect.top,
	);
};

function handleStart(mx, my) {
	for (let i = pieces.length - 1; i >= 0; i--) {
		const p = pieces[i];
		if (
			!p.isSolved &&
			mx > p.x &&
			mx < p.x + p.width &&
			my > p.y &&
			my < p.y + p.height
		) {
			selectedPiece = p;
			offset.x = mx - p.x;
			offset.y = my - p.y;
			pieces.push(pieces.splice(i, 1)[0]);
			break;
		}
	}
}

window.onmousemove = window.ontouchmove = (e) => {
	if (!selectedPiece) return;
	const rect = canvas.getBoundingClientRect();
	const mx = (e.clientX || (e.touches && e.touches[0].clientX)) - rect.left;
	const my = (e.clientY || (e.touches && e.touches[0].clientY)) - rect.top;

	let nX = mx - offset.x;
	let nY = my - offset.y;

	const mW = selectedPiece.width * 0.7;
	const mH = selectedPiece.height * 0.7;
	selectedPiece.x = Math.max(
		-mW,
		Math.min(canvas.width - (selectedPiece.width - mW), nX),
	);
	selectedPiece.y = Math.max(
		-mH,
		Math.min(canvas.height - (selectedPiece.height - mH), nY),
	);
	draw();
};

window.onmouseup = window.ontouchend = () => {
	if (!selectedPiece) return;

	if (
		Math.abs(selectedPiece.x - selectedPiece.destX) < 30 &&
		Math.abs(selectedPiece.y - selectedPiece.destY) < 30
	) {
		selectedPiece.x = selectedPiece.destX;
		selectedPiece.y = selectedPiece.destY;
		selectedPiece.isSolved = true;
		solvedCount++;
	}

	selectedPiece = null;
	draw();

	const progress = Math.round((solvedCount / (gridSize * gridSize)) * 100);
	progressDisplay.innerText = `${progress}%`;

	if (solvedCount === gridSize * gridSize) {
		clearInterval(timerInterval);

		// 점수 계산: (그리드수^2 * 1000) - (걸린 시간 * 20). 최소 10점
		const finalScore = Math.max(
			10,
			gridSize * gridSize * 1000 - timeElapsed * 20,
		);

		setTimeout(() => {
			modalTitle.innerText = "COMPLETED!";
			modalMessage.innerHTML = `모든 퍼즐을 맞췄습니다!<br>소요 시간: ${timeElapsed}초<br>최종 점수: ${finalScore}점`;
			difficultyOptions.style.display = "none";
			resultOptions.style.display = "flex";
			rankInputArea.style.display = "block";
			nicknameInput.value = "";
			modal.style.display = "flex";

			startBtn.innerText = "랭킹 등록";
			startBtn.disabled = false;

			// 랭킹 등록
			startBtn.onclick = async () => {
				const nickname = nicknameInput.value.trim();
				if (!nickname || nickname.length < 2)
					return alert("닉네임을 2자 이상 입력해주세요!");

				startBtn.disabled = true;
				startBtn.innerText = "데이터 확인 중...";

				// gameId는 jigsawpuzzle!
				const result = await saveGameScore("jigsaw", nickname, finalScore);
				alert(result.msg);

				if (result.status !== "error") {
					showStartModal();
				} else {
					startBtn.disabled = false;
					startBtn.innerText = "랭킹 등록";
				}
			};

			// 처음으로
			restartBtn.onclick = () => {
				showStartModal();
			};
		}, 500);
	}
};

// 최초 진입
showStartModal();
