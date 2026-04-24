import { db } from "../common/firebase-config.js";
import {
	collection,
	query,
	where,
	orderBy,
	limit,
	getDocs,
} from "https://www.gstatic.com/firebasejs/12.12.1/firebase-firestore.js";

const games = [
	{ id: "snake", title: "🐍 스네이크" },
	{ id: "brickmaster", title: "🧱 브릭마스터" },
	{ id: "bounce", title: "☄️ 바운스볼" },
	{ id: "brickstack", title: "🟦 브릭스택" },
	{ id: "bugsweeper", title: "👿 버그스위퍼" },
	{ id: "sudoku", title: "✏️ 스도쿠" },
	{ id: "invader", title: "👾 코드브레이커" },
	{ id: "pixelrunner", title: "🏃‍♂️ 픽셀러너" },
	{ id: "puzzle", title: "🖼️ 슬라이드퍼즐" },
	{ id: "jigsaw", title: "🧩 직소퍼즐" },
	{ id: "pixeleater", title: "👻 픽셀이터" },
	{ id: "pixelmatch", title: "🍎 픽셀매치" },
	// ... 나머지 게임들도 추가
];

let currentTab = "snake";

// 탭 생성 및 클릭 이벤트
function initTabs() {
	const tabContainer = document.getElementById("rank-tabs");
	tabContainer.innerHTML = games
		.map(
			(game) => `
        <button class="tab-btn ${game.id === currentTab ? "active" : ""}" 
                onclick="changeTab('${game.id}')">
            ${game.title}
        </button>
    `,
		)
		.join("");
}

// 데이터 불러오기 함수
async function loadRanking(gameId) {
	const listContainer = document.getElementById("rank-list");
	listContainer.innerHTML = `<tr><td colspan="3" style="text-align: center;">로딩 중...</td></tr>`;

	try {
		const q = query(
			collection(db, "leaderboards"),
			where("gameId", "==", gameId),
			orderBy("score", "desc"),
			limit(10),
		);

		const snapshot = await getDocs(q);
		if (snapshot.empty) {
			listContainer.innerHTML = `<tr><td colspan="3" style="text-align: center; padding: 40px;">아직 기록이 없습니다. 첫 번째 주인공이 되어보세요!</td></tr>`;
			return;
		}

		let html = "";
		let rank = 1;
		snapshot.forEach((doc) => {
			const data = doc.data();
			const rankClass = rank <= 3 ? `rank-${rank}` : "";
			let rankIcon =
				rank === 1 ? "🥇 " : rank === 2 ? "🥈 " : rank === 3 ? "🥉 " : "";
			html += `
                <tr>
                    <td class="rank-num ${rankClass}">${rankIcon}${rank}위</td>
                    <td class="nickname">${data.nickname}</td>
                    <td class="score">${data.score.toLocaleString()} PT</td>
                </tr>
            `;
			rank++;
		});
		listContainer.innerHTML = html;
	} catch (e) {
		console.error("랭킹 로드 실패:", e);
	}
}

// 전역 함수로 등록하여 HTML에서 접근 가능하게 함
window.changeTab = (id) => {
	currentTab = id;
	initTabs();
	loadRanking(id);
};

// 최초 실행
initTabs();
loadRanking(currentTab);
