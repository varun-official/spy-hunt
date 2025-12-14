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

// ... (other functions)

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
