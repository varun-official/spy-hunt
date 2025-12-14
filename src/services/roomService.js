import { db } from "../firebase";
import { doc, getDoc, setDoc, updateDoc, deleteField, increment } from "firebase/firestore";

// Generate a random 4-letter code
const generateRoomCode = () => {
    return Math.random().toString(36).substring(2, 6).toUpperCase();
};

export const createRoom = async (host, hostName) => {
    const code = generateRoomCode();
    const roomRef = doc(db, "rooms", code);

    await setDoc(roomRef, {
        code,
        hostId: host.uid,
        status: 'lobby',
        players: {
            [host.uid]: {
                uid: host.uid,
                displayName: hostName,
                isReady: false,
                avatar: null
            }
        },
        createdAt: new Date()
    });

    return code;
};

export const joinRoom = async (code, user, userName) => {
    const roomRef = doc(db, "rooms", code);
    const roomSnap = await getDoc(roomRef);

    if (!roomSnap.exists()) {
        throw new Error("Room not found");
    }

    const roomData = roomSnap.data();

    // Check if player is already in room or if we should add them
    if (roomData.players && roomData.players[user.uid]) {
        // Rejoining / Updating name
        await updateDoc(roomRef, {
            [`players.${user.uid}.displayName`]: userName
        });
    } else {
        await updateDoc(roomRef, {
            [`players.${user.uid}`]: {
                uid: user.uid,
                displayName: userName,
                isReady: false,
                avatar: null
            }
        });
    }

    return code;
};

export const leaveRoom = async (roomId, userId) => {
    const roomRef = doc(db, "rooms", roomId);

    // Transaction is safer, but standard read-write for MVP
    const roomSnap = await getDoc(roomRef);
    if (!roomSnap.exists()) return;

    const roomData = roomSnap.data();
    const players = roomData.players || {};
    const isHost = roomData.hostId === userId;
    const turnOrder = roomData.turnOrder || [];
    const currentTurnIndex = roomData.currentTurnIndex || 0;

    const remainingPlayers = Object.keys(players).filter(pid => pid !== userId);

    const updates = {
        [`players.${userId}`]: deleteField()
    };

    if (isHost && remainingPlayers.length > 0) {
        updates.hostId = remainingPlayers[0];
    }

    // Cleanup Turn Order if game is active
    if (turnOrder.length > 0) {
        const leaverIndex = turnOrder.indexOf(userId);
        if (leaverIndex !== -1) {
            const newTurnOrder = turnOrder.filter(id => id !== userId);
            updates.turnOrder = newTurnOrder;

            // If the leaver was BEFORE the current turn, we must shift index back one
            // to keep the pointer on the correct *relative* player.
            // If leaver was current (index == leaver), the pointer stays same 
            // but now points to the *next* person (who slid into this slot). Correct.
            if (leaverIndex < currentTurnIndex) {
                updates.currentTurnIndex = increment(-1);
            }

            // Note: If leaver was the LAST person and it was their turn?
            // Index would be at end. Array shrinks. Index now out of bounds?
            // Game.jsx uses modulo: index % length.
            // So if Length 4, Index 3 (User D). D leaves.
            // Length 3. Index 3.
            // 3 % 3 = 0. User A.
            // This is arguably correct (loop over).
        }
    }

    await updateDoc(roomRef, updates);
};
