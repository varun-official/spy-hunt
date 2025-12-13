import { db } from "../firebase";
import { doc, setDoc, getDoc, updateDoc, arrayUnion, serverTimestamp } from "firebase/firestore";

// Generate a random 4-letter code
const generateRoomCode = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    let code = '';
    for (let i = 0; i < 4; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
};

export const createRoom = async (user) => {
    const code = generateRoomCode();
    const roomId = code; // Using code as ID for simplicity, or we can use auto-ID and store code field

    // Check if room exists (unlikely with random code but possible) - skip for simplicity in MVP
    // For production, we should check existence loop.

    const roomRef = doc(db, "rooms", roomId);

    const initialData = {
        code: roomId,
        status: 'lobby',
        hostId: user.uid,
        createdAt: serverTimestamp(),
        players: {
            [user.uid]: {
                uid: user.uid,
                displayName: user.displayName || "Player",
                isReady: false,
                score: 0
            }
        }
    };

    await setDoc(roomRef, initialData);
    return roomId;
};

export const joinRoom = async (roomId, user) => {
    const roomRef = doc(db, "rooms", roomId);
    const roomSnap = await getDoc(roomRef);

    if (!roomSnap.exists()) {
        throw new Error("Room not found");
    }

    const roomData = roomSnap.data();
    if (roomData.status !== 'lobby') {
        // Create allowance for reconnecting players? 
        // For now, restrict joining running games unless already in player list
        if (!roomData.players[user.uid]) {
            throw new Error("Game already started");
        }
    }

    await updateDoc(roomRef, {
        [`players.${user.uid}`]: {
            uid: user.uid,
            displayName: user.displayName || "Player",
            isReady: false, // Reset ready status on join? Or Keep?
            score: roomData.players[user.uid]?.score || 0
        }
    });

    return roomId;
};
