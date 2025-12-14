import { db } from "../firebase";
import { doc, updateDoc, serverTimestamp } from "firebase/firestore";

const WORDS = [
    "Apple", "Guitar", "Sunshine", "Ocean", "Book", "Pizza",
    "Robot", "Monkey", "Helicopter", "Doctor", "Diamond", "Vampire",
    "Fireworks", "Telescope", "Mosquito", "Rainbow", "Coffee", "Pyramid"
];

export const startGame = async (roomId, players) => {
    const playerIds = Object.keys(players);
    if (playerIds.length < 3) throw new Error("Need at least 3 players");

    // Select Masked Man
    const maskedManId = playerIds[Math.floor(Math.random() * playerIds.length)];

    // Select Word
    const secretWord = WORDS[Math.floor(Math.random() * WORDS.length)];

    // Randomize turn order
    const turnOrder = [...playerIds].sort(() => Math.random() - 0.5);

    const roomRef = doc(db, "rooms", roomId);
    await updateDoc(roomRef, {
        status: 'reveal',
        maskedManId: maskedManId, // Note: In a real secure app, this would be in a private subcollection or cloud function would send role to individuals.
        secretWord: secretWord,
        turnOrder: turnOrder,
        currentTurnIndex: 0,
        phaseEndTime: null,
        currentTurnIndex: 0,
        phaseEndTime: null,
        votes: {},
        readyToVote: {}, // New field to track readiness
    });
};

export const nextTurn = async (roomId, roomState) => {
    const { turnOrder, currentTurnIndex, status } = roomState;
    const roomRef = doc(db, "rooms", roomId);

    // If starting from reveal phase
    if (status === 'reveal') {
        const nextTime = new Date();
        nextTime.setSeconds(nextTime.getSeconds() + 30);

        await updateDoc(roomRef, {
            status: 'clue',
            phaseEndTime: nextTime,
            currentTurnIndex: 0
        });
        return;
    }

    // Determine next turn
    const nextIndex = currentTurnIndex + 1;

    // Endless rounds until players vote to stop
    const nextTime = new Date();
    nextTime.setSeconds(nextTime.getSeconds() + 30); // 30s per turn

    await updateDoc(roomRef, {
        currentTurnIndex: nextIndex,
        phaseEndTime: nextTime
    });
};

export const toggleVoteReadiness = async (roomId, uid, currentReadyState, roomState) => {
    const roomRef = doc(db, "rooms", roomId);
    const newState = !currentReadyState;

    // Optimistic check for threshold
    // We need to read the latest state ideally, but we have `roomState` passed from UI.
    // However, concurrent writes might be an issue. For MVP, we trust `roomState` + local change.

    const readyMap = { ...roomState.readyToVote, [uid]: newState };
    const readyCount = Object.values(readyMap).filter(v => v).length;
    const totalPlayers = Object.keys(roomState.players).length;

    const updates = {
        [`readyToVote.${uid}`]: newState
    };

    // Check threshold (2/3)
    if (readyCount >= Math.ceil(totalPlayers * 2 / 3)) {
        updates.status = 'voting';
        updates.phaseEndTime = null;
    }

    await updateDoc(roomRef, updates);
};
export const castVote = async (roomId, voterId, targetId) => {
    const roomRef = doc(db, "rooms", roomId);
    // Use dot notation to update nested map
    await updateDoc(roomRef, {
        [`votes.${voterId}`]: targetId
    });

    // Check if everyone voted via Cloud Function trgger usually?
    // Here we can check client side or let the LAST voter trigger 'results'.
    // Or Host triggers. "Voting Phase... Silent voting".
    // Better: Transaction or just allow Host/Any client to check.
    // I'll leave it to the UI (Host) or a periodic check to transition if votes.length == players.length

    // Actually, I can check inside this function:
    // But I don't have the current room state here easily without reading it.
    // I will read it to check (costly?) or just trigger "finalize" if sufficient.
};

export const checkVoteCompletion = async (roomId, roomState) => {
    // Helper to be called by Host's effect
    const totalPlayers = Object.keys(roomState.players).length;
    const totalVotes = Object.keys(roomState.votes || {}).length;

    if (totalVotes >= totalPlayers) {
        await calculateResults(roomId, roomState);
    }
};

export const calculateResults = async (roomId, roomState) => {
    const votes = roomState.votes;
    const voteCounts = {};

    Object.values(votes).forEach(targetId => {
        voteCounts[targetId] = (voteCounts[targetId] || 0) + 1;
    });

    // Find max
    let maxVotes = 0;
    let exiledId = null;
    // Handle Ties? First one found or random? For MVP, simple max.

    for (const [uid, count] of Object.entries(voteCounts)) {
        if (count > maxVotes) {
            maxVotes = count;
            exiledId = uid;
        }
    }

    // Tie breaker? If tie, maybe no one exiled? Or random?
    // Prompt is simple. I'll just pick the first one with max votes.

    const isMaskedManFound = exiledId === roomState.maskedManId;
    const winner = isMaskedManFound ? 'CITIZENS' : 'SUSPECT';

    await updateDoc(doc(db, "rooms", roomId), {
        status: 'results',
        result: {
            winner,
            exiledId,
            maskedManId: roomState.maskedManId,
            secretWord: roomState.secretWord
        }
    });
};

export const resetToLobby = async (roomId) => {
    const roomRef = doc(db, "rooms", roomId);
    await updateDoc(roomRef, {
        status: 'lobby',
        maskedManId: null,
        secretWord: null,
        votes: {},
        readyToVote: {},
        phaseEndTime: null,
        currentTurnIndex: 0
        // We keep players
    });
};
