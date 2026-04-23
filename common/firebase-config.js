// Import the functions you need from the SDKs you need
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.12.1/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/12.12.1/firebase-analytics.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/12.12.1/firebase-firestore.js";
import {
	addDoc,
	collection,
	serverTimestamp,
} from "https://www.gstatic.com/firebasejs/12.12.1/firebase-firestore.js";

// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional

const firebaseConfig = {
	apiKey: "AIzaSyBLtO8XI50TH39TuhwBAPG1volbquLvsAA",
	authDomain: "js-arcade.firebaseapp.com",
	projectId: "js-arcade",
	storageBucket: "js-arcade.firebasestorage.app",
	messagingSenderId: "258991520448",
	appId: "1:258991520448:web:8fa463a7a29d3a6ad90b25",
	measurementId: "G-EZJHX4SPWH",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);

export const db = getFirestore(app);

// 점수 저장 공통 함수
export const saveGameScore = async (gameId, nickname, score) => {
	try {
		await addDoc(collection(db, "leaderboards"), {
			gameId: gameId,
			nickname: nickname,
			score: Number(score),
			createdAt: serverTimestamp(), // 등록 시간 자동 저장
		});
		console.log("랭킹 등록 완료!");
		return true;
	} catch (e) {
		console.error("랭킹 등록 실패:", e);
		return false;
	}
};
