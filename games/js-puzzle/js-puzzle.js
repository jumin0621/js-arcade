const board = document.getElementById("puzzleBoard");
const modal = document.getElementById("gameModal");
const moveDisplay = document.getElementById("moveDisplay");
const diffDisplay = document.getElementById("diffDisplay");
const hintThumb = document.getElementById("hintThumb");
const hintPreview = document.getElementById("hintPreview");
const hintContainer = document.getElementById("hintContainer");

// 퍼즐 이미지 URL (원하시는 애니메이션 이미지로 교체 가능)
const PUZZLE_IMAGES = [
	"https://i.ibb.co/DHN1JxbY/image.png",
	"https://i.ibb.co/r2Gm2XLs/Astonishia-Story-Wallpaper-B-1920x1080.png",
	"https://i.ibb.co/B25ZdxQP/Astonishia-Story-Wallpaper-A-1920x1080.png",
	"https://i.ibb.co/N6PTKf0F/u2337176951-httpss-mj-run-Uq5lap-HI-p-I-Please-transform-my-styl-b9cfab23-1ca6-4e3b-8b78-5311c8ba566.png",
	"https://i.ibb.co/BHCmCnSw/u2337176951-httpss-mj-run-Uq5lap-HI-p-I-Please-transform-my-styl-b9cfab23-1ca6-4e3b-8b78-5311c8ba566.png",
	"https://i.ibb.co/zV0MwJrH/u2337176951-httpss-mj-run-Uq5lap-HI-p-I-Please-transform-my-styl-b9cfab23-1ca6-4e3b-8b78-5311c8ba566.png",
];

let gridSize = 3;
let pieces = []; // 조각 객체들을 담을 배열
let moves = 0;
let emptyPos = 0; // 빈칸의 현재 위치 index
let currentImg = "";

// 난이도 선택
document.querySelectorAll(".diff-btn").forEach((btn) => {
	btn.onclick = () => {
		gridSize = parseInt(btn.dataset.grid);
		initGame();
	};
});

// 게임 시작 시 힌트 이미지 설정
function setupHint() {
	hintThumb.style.backgroundImage = `url(${currentImg})`;
	hintPreview.style.backgroundImage = `url(${currentImg})`;
}

// 모바일용 터치 클릭 이벤트
hintContainer.addEventListener("click", (e) => {
	// 마우스 오버가 불가능한 기기(터치 기기)에서만 토글
	if (window.matchMedia("(hover: none)").matches) {
		hintPreview.classList.toggle("active");
		e.stopPropagation();
	}
});

// 화면 아무데나 누르면 힌트 닫기 (모바일용)
document.addEventListener("click", () => {
	hintPreview.classList.remove("active");
});

function initGame() {
	moves = 0;
	moveDisplay.innerText = moves;
	diffDisplay.innerText = `${gridSize}x${gridSize}`;

	// 모달 초기 상태로 복구
	document.getElementById("difficulty-options").style.display = "flex";
	document.getElementById("resultOptions").style.display = "none";
	modal.style.display = "none";

	// 배열에서 랜덤으로 이미지 선택
	const randomIndex = Math.floor(Math.random() * PUZZLE_IMAGES.length);
	currentImg = PUZZLE_IMAGES[randomIndex];

	setupHint();
	createPuzzle();
	shufflePieces();
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

		// 마지막 조각을 빈칸으로 설정
		if (i === totalPieces - 1) {
			piece.classList.add("empty");
			emptyPos = i;
		} else {
			piece.style.backgroundImage = `url(${currentImg})`;
			piece.style.backgroundSize = `${gridSize * 100}% ${gridSize * 100}%`;

			// 이미지 조각 정렬 계산
			const bgPosX = (col / (gridSize - 1)) * 100;
			const bgPosY = (row / (gridSize - 1)) * 100;
			piece.style.backgroundPosition = `${bgPosX}% ${bgPosY}%`;
		}

		piece.setAttribute("data-orig-pos", i); // 정답 위치
		piece.setAttribute("data-curr-pos", i); // 현재 위치

		// 클릭 이벤트: 슬라이드 로직 실행
		piece.onclick = () => trySlide(piece);

		pieces.push(piece);
		board.appendChild(piece);
	}
}

// 조각 이동(슬라이드) 핵심 로직
function trySlide(clickedPiece) {
	const currPos = parseInt(clickedPiece.getAttribute("data-curr-pos"));

	// 빈칸과의 거리 계산
	const row = Math.floor(currPos / gridSize);
	const col = currPos % gridSize;
	const emptyRow = Math.floor(emptyPos / gridSize);
	const emptyCol = emptyPos % gridSize;

	// 상하좌우 인접 여부 확인
	const isAdjacent = Math.abs(row - emptyRow) + Math.abs(col - emptyCol) === 1;

	if (isAdjacent) {
		swapWithEmpty(clickedPiece);
	}
}

function swapWithEmpty(piece) {
	const clickedPos = parseInt(piece.getAttribute("data-curr-pos"));
	const emptyPiece = pieces.find((p) => p.classList.contains("empty"));

	// 데이터 위치 교체
	piece.setAttribute("data-curr-pos", emptyPos);
	emptyPiece.setAttribute("data-curr-pos", clickedPos);

	// 실제 빈칸 인덱스 업데이트
	const temp = emptyPos;
	emptyPos = clickedPos;

	// 화면 재배치
	renderBoard();

	moves++;
	moveDisplay.innerText = moves;

	checkWin();
}

function renderBoard() {
	// 현재 위치(data-curr-pos) 기준으로 정렬하여 DOM에 다시 배치
	const sorted = [...pieces].sort(
		(a, b) =>
			parseInt(a.getAttribute("data-curr-pos")) -
			parseInt(b.getAttribute("data-curr-pos")),
	);
	sorted.forEach((p) => board.appendChild(p));
}

// 유효한 퍼즐을 만들기 위한 셔플 (빈칸을 실제로 움직임)
function shufflePieces() {
	let shuffleMoves = gridSize * gridSize * 15; // 난이도 비례 셔플 횟수

	for (let i = 0; i < shuffleMoves; i++) {
		const row = Math.floor(emptyPos / gridSize);
		const col = emptyPos % gridSize;

		const neighbors = [];
		if (col > 0) neighbors.push(emptyPos - 1); // 좌
		if (col < gridSize - 1) neighbors.push(emptyPos + 1); // 우
		if (row > 0) neighbors.push(emptyPos - gridSize); // 상
		if (row < gridSize - 1) neighbors.push(emptyPos + gridSize); // 하

		const nextPos = neighbors[Math.floor(Math.random() * neighbors.length)];
		const targetPiece = pieces.find(
			(p) => parseInt(p.getAttribute("data-curr-pos")) === nextPos,
		);

		// 데이터만 교체 (연산 속도를 위해 마지막에만 render)
		const currentEmpty = emptyPos;
		targetPiece.setAttribute("data-curr-pos", currentEmpty);
		emptyPos = nextPos;
		// 빈칸 역할을 하는 DOM 찾기
		const emptyDOM = pieces.find((p) => p.classList.contains("empty"));
		emptyDOM.setAttribute("data-curr-pos", nextPos);
	}
	renderBoard();
}

function checkWin() {
	// 모든 조각의 현재 위치가 원래 위치와 같은지 확인
	const isWin = pieces.every(
		(p) => p.getAttribute("data-orig-pos") === p.getAttribute("data-curr-pos"),
	);

	if (isWin && moves > 0) {
		setTimeout(() => {
			// 1. 모달 텍스트 변경
			document.getElementById("modalTitle").innerText = "DEBUGGING COMPLETE!";
			document.getElementById("modalMessage").innerHTML =
				`이미지 복구에 성공했습니다!<br><br><strong>총 이동 횟수: ${moves}회</strong>`;

			// 2. 난이도 선택창 숨기고 결과 버튼 보이기
			document.getElementById("difficultyOptions").style.display = "none";
			document.getElementById("resultOptions").style.display = "flex";

			// 3. 모달 띄우기
			modal.style.display = "flex";
		}, 300);
	}
}
