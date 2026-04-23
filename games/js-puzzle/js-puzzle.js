// ✅ 랭킹 저장 함수 임포트
import { saveGameScore } from "../../common/firebase-config.js";

const board = document.getElementById("puzzleBoard");
const spinner = document.getElementById("loadingSpinner");
const modal = document.getElementById("gameModal");
const moveDisplay = document.getElementById("moveDisplay");
const diffDisplay = document.getElementById("diffDisplay");
const hintThumb = document.getElementById("hintThumb");
const hintPreview = document.getElementById("hintPreview");
const hintContainer = document.getElementById("hintContainer");

// --- 모달 제어 변수 ---
const modalTitle = document.getElementById("modalTitle");
const modalDesc = document.getElementById("modalDesc");
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

let gridSize = 3;
let pieces = [];
let moves = 0;
let emptyPos = 0;
let currentImg = "";

// 1. 시작 모달 띄우기
function showStartModal() {
	modalTitle.innerText = "SLIDE PUZZLE";
	modalDesc.innerHTML = "난이도를 선택해 이미지를 복구하세요!";
	difficultyOptions.style.display = "flex";
	resultOptions.style.display = "none";
	rankInputArea.style.display = "none";
	modal.style.display = "flex";
}

// 난이도 버튼 클릭 이벤트
document.querySelectorAll(".diff-btn").forEach((btn) => {
	btn.onclick = () => {
		gridSize = parseInt(btn.dataset.grid);
		initGame();
	};
});

function setupHint() {
	hintThumb.style.backgroundImage = `url(${currentImg})`;
	hintPreview.style.backgroundImage = `url(${currentImg})`;
}

hintContainer.addEventListener("click", (e) => {
	if (window.matchMedia("(hover: none)").matches) {
		hintPreview.classList.toggle("active");
		e.stopPropagation();
	}
});

document.addEventListener("click", () => {
	hintPreview.classList.remove("active");
});

// 🔥 2. 게임 초기화 & 로딩 스피너 로직
function initGame() {
	moves = 0;
	moveDisplay.innerText = moves;
	diffDisplay.innerText = `${gridSize}x${gridSize}`;
	modal.style.display = "none";

	// 보드 숨기고 스피너 표시
	board.style.display = "none";
	spinner.style.display = "block";

	const randomIndex = Math.floor(Math.random() * PUZZLE_IMAGES.length);
	currentImg = PUZZLE_IMAGES[randomIndex];

	// 이미지 프리로딩 (완료되면 퍼즐 생성)
	const imgObj = new Image();
	imgObj.onload = () => {
		spinner.style.display = "none";
		board.style.display = "grid";
		setupHint();
		createPuzzle();
		shufflePieces();
	};
	imgObj.src = currentImg;
}

function createPuzzle() {
	board.innerHTML = "";
	board.style.gridTemplateColumns = `repeat(${gridSize}, 1fr)`;
	board.style.gridTemplateRows = `repeat(${gridSize}, 1fr)`;
	pieces = [];

	const totalPieces = gridSize * gridSize;

	for (let i = 0; i < totalPieces; i++) {
		const piece = document.createElement("div");
		piece.classList.add("puzzle-piece");

		const row = Math.floor(i / gridSize);
		const col = i % gridSize;

		if (i === totalPieces - 1) {
			piece.classList.add("empty");
			emptyPos = i;
		} else {
			piece.style.backgroundImage = `url(${currentImg})`;
			piece.style.backgroundSize = `${gridSize * 100}% ${gridSize * 100}%`;
			const bgPosX = (col / (gridSize - 1)) * 100;
			const bgPosY = (row / (gridSize - 1)) * 100;
			piece.style.backgroundPosition = `${bgPosX}% ${bgPosY}%`;
		}

		piece.setAttribute("data-orig-pos", i);
		piece.setAttribute("data-curr-pos", i);
		piece.onclick = () => trySlide(piece);

		pieces.push(piece);
		board.appendChild(piece);
	}
}

function trySlide(clickedPiece) {
	const currPos = parseInt(clickedPiece.getAttribute("data-curr-pos"));
	const row = Math.floor(currPos / gridSize);
	const col = currPos % gridSize;
	const emptyRow = Math.floor(emptyPos / gridSize);
	const emptyCol = emptyPos % gridSize;

	const isAdjacent = Math.abs(row - emptyRow) + Math.abs(col - emptyCol) === 1;
	if (isAdjacent) swapWithEmpty(clickedPiece);
}

function swapWithEmpty(piece) {
	const clickedPos = parseInt(piece.getAttribute("data-curr-pos"));
	const emptyPiece = pieces.find((p) => p.classList.contains("empty"));

	piece.setAttribute("data-curr-pos", emptyPos);
	emptyPiece.setAttribute("data-curr-pos", clickedPos);

	emptyPos = clickedPos;
	renderBoard();

	moves++;
	moveDisplay.innerText = moves;
	checkWin();
}

function renderBoard() {
	const sorted = [...pieces].sort(
		(a, b) =>
			parseInt(a.getAttribute("data-curr-pos")) -
			parseInt(b.getAttribute("data-curr-pos")),
	);
	sorted.forEach((p) => board.appendChild(p));
}

function shufflePieces() {
	let shuffleMoves = gridSize * gridSize * 15;
	for (let i = 0; i < shuffleMoves; i++) {
		const row = Math.floor(emptyPos / gridSize);
		const col = emptyPos % gridSize;

		const neighbors = [];
		if (col > 0) neighbors.push(emptyPos - 1);
		if (col < gridSize - 1) neighbors.push(emptyPos + 1);
		if (row > 0) neighbors.push(emptyPos - gridSize);
		if (row < gridSize - 1) neighbors.push(emptyPos + gridSize);

		const nextPos = neighbors[Math.floor(Math.random() * neighbors.length)];
		const targetPiece = pieces.find(
			(p) => parseInt(p.getAttribute("data-curr-pos")) === nextPos,
		);

		const currentEmpty = emptyPos;
		targetPiece.setAttribute("data-curr-pos", currentEmpty);
		emptyPos = nextPos;

		const emptyDOM = pieces.find((p) => p.classList.contains("empty"));
		emptyDOM.setAttribute("data-curr-pos", nextPos);
	}
	renderBoard();
}

// 🏆 3. 클리어 및 점수 계산 로직
function checkWin() {
	const isWin = pieces.every(
		(p) => p.getAttribute("data-orig-pos") === p.getAttribute("data-curr-pos"),
	);

	if (isWin && moves > 0) {
		// 점수 계산: (그리드수^2 * 1000) - (이동횟수 * 15). 최소 10점 보장
		const finalScore = Math.max(10, gridSize * gridSize * 1000 - moves * 15);

		setTimeout(() => {
			modalTitle.innerText = "COMPLETE!";
			modalDesc.innerHTML = `퍼즐을 완성했습니다!<br>이동 횟수: ${moves}회<br>최종 점수: ${finalScore}점`;

			difficultyOptions.style.display = "none";
			resultOptions.style.display = "flex";
			rankInputArea.style.display = "block";
			nicknameInput.value = "";

			startBtn.innerText = "랭킹 등록";
			startBtn.disabled = false;

			// 랭킹 등록 이벤트
			startBtn.onclick = async () => {
				const nickname = nicknameInput.value.trim();
				if (!nickname || nickname.length < 2)
					return alert("닉네임을 2자 이상 입력해주세요!");

				startBtn.disabled = true;
				startBtn.innerText = "데이터 확인 중...";

				// gameId는 slidepuzzle!
				const result = await saveGameScore("puzzle", nickname, finalScore);
				alert(result.msg);

				if (result.status !== "error") {
					showStartModal();
				} else {
					startBtn.disabled = false;
					startBtn.innerText = "랭킹 등록";
				}
			};

			// 처음으로 돌아가기 (다시 난이도 선택)
			restartBtn.onclick = () => {
				showStartModal();
			};

			modal.style.display = "flex";
		}, 300);
	}
}

// 최초 진입 시 모달
showStartModal();
