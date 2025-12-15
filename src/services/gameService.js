import { db } from "../firebase";
import { doc, updateDoc, serverTimestamp } from "firebase/firestore";

const WORDS = [
    // Sports Legends
    "Messi", "Ronaldo", "Virat Kohli", "Rohit Sharma", "Serena Williams", "Usain Bolt", "Federer", "Dhoni", "Ricky Ponting", "Sunil Chhetri",
    // Leaders & History
    "Gandhi", "Narendra Modi", "Obama", "Rahul Gandhi", "Nirmala Sitharaman", "Abdul Kalam",
    // Film Stars (India)
    "Shah Rukh Khan", "Amitabh Bachchan", "Rajinikanth", "Salman Khan", "Deepika Padukone", "Priyanka Chopra", "Aamir Khan", "Allu Arjun", "Ranbir Kapoor",
    // Famous Icons
    "Donald Trump", "Shakespeare", "Elon Musk", "Bill Gates", "Steve Jobs",
    // Global Companies
    "Google", "Apple", "Tesla", "Nike", "Amazon", "Microsoft", "Coca-Cola", "McDonald's", "Disney", "Facebook",
    // Pop Culture
    "Harry Potter", "Batman", "Spiderman", "James Bond", "Pikachu",
    // Places
    "Nepal", "London", "New York", "China", "Dubai", "India", "Mars", "The Moon", "Antarctica", "Mount Everest",
    // Foods
    "Pizza", "Burger", "Sushi", "Chocolate", "Ice Cream", "Coffee", "Taco", "Pasta", "Popcorn", "Donut",
    // Animals
    "Lion", "Shark", "Eagle", "T-Rex", "Panda", "Elephant", "Blue Whale", "Cobra", "Spider", "Wolf",
    // Objects
    "iPhone", "Ferrari", "Guitar", "Camera", "Diamond", "Telescope", "Robot", "Rocket", "Crown",
    // Concepts & Sci-Fi
    "Internet", "Bitcoin", "Artificial Intelligence", "Time Travel", "Magic", "Ghost", "Alien", "Zombie", "Vampire", "Ninja"
];

export const startGame = async (roomId, players, lastMaskedManId = null) => {
    const playerIds = Object.keys(players);
    if (playerIds.length < 3) throw new Error("Need at least 3 players");

    // Select Masked Man (Spy) with rotation logic
    let candidates = playerIds;
    if (lastMaskedManId && playerIds.length > 2) {
        // Exclude the last spy if we have enough players to rotate
        candidates = playerIds.filter(id => id !== lastMaskedManId);
    }

    // Fallback if filtering failed somehow (shouldn't happen with >2 check)
    if (candidates.length === 0) candidates = playerIds;

    const maskedManId = candidates[Math.floor(Math.random() * candidates.length)];

    // Select Word
    const secretWord = WORDS[Math.floor(Math.random() * WORDS.length)];

    // Randomize turn order
    const turnOrder = [...playerIds].sort(() => Math.random() - 0.5);

    const roomRef = doc(db, "rooms", roomId);
    await updateDoc(roomRef, {
        status: 'reveal',
        maskedManId: maskedManId,
        secretWord: secretWord,
        turnOrder: turnOrder,
        currentTurnIndex: 0,
        phaseEndTime: null,
        votes: {},
        readyToVote: {},
        // clear lastMaskedManId now that we've started, or keep it? 
        // Better to keep it until next reset, or doesn't matter. 
        // We actually want to KEEP it in case game crashes/restarts? 
        // No, we just used it. It's fine to leave it or overwrite it later.
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
    // Find max with Draw handling
    let maxVotes = 0;
    let possibleExiles = [];

    for (const [uid, count] of Object.entries(voteCounts)) {
        if (count > maxVotes) {
            maxVotes = count;
            possibleExiles = [uid];
        } else if (count === maxVotes) {
            possibleExiles.push(uid);
        }
    }

    // "Draw (tie for highest votes) | Spy wins"
    // If multiple people have maxVotes -> Draw -> No one exiled -> Spy Wins
    let exiledId = null;
    if (possibleExiles.length === 1) {
        exiledId = possibleExiles[0];
    } else {
        // DRAW occured
        exiledId = null;
    }

    const isMaskedManFound = exiledId === roomState.maskedManId;
    const winner = isMaskedManFound ? 'AGENTS' : 'SPY';

    const updates = {
        status: 'results',
        result: {
            winner,
            exiledId,
            maskedManId: roomState.maskedManId,
            secretWord: roomState.secretWord
        }
    };

    // Calculate Scores
    const players = roomState.players;
    const totalPlayers = Object.keys(players).length;
    const agentCount = totalPlayers - 1; // Assuming 1 Spy
    const spyWinPoints = agentCount * 10;

    Object.keys(players).forEach(uid => {
        const isSpy = uid === roomState.maskedManId;
        const currentScore = players[uid].score || 0;
        let pointsToAdd = 0;

        if (winner === 'AGENTS') {
            if (!isSpy) pointsToAdd = 10;
        } else {
            // SPY wins
            if (isSpy) pointsToAdd = spyWinPoints;
        }

        if (pointsToAdd > 0) {
            updates[`players.${uid}.score`] = currentScore + pointsToAdd;
        } else {
            // Ensure score field exists if it wasn't there
            if (players[uid].score === undefined) {
                updates[`players.${uid}.score`] = currentScore;
            }
        }
    });

    await updateDoc(doc(db, "rooms", roomId), updates);
};

export const resetToLobby = async (roomId, lastMaskedManId) => {
    const roomRef = doc(db, "rooms", roomId);
    await updateDoc(roomRef, {
        status: 'lobby',
        maskedManId: null,
        lastMaskedManId: lastMaskedManId || null, // Store who was the spy
        secretWord: null,
        votes: {},
        readyToVote: {},
        phaseEndTime: null,
        currentTurnIndex: 0
    });
};
