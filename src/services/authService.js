import { signInAnonymously, updateProfile, setPersistence, browserSessionPersistence } from "firebase/auth";
import { auth } from "../firebase";

export const signInUser = async (displayName) => {
    try {
        await setPersistence(auth, browserSessionPersistence);
        const result = await signInAnonymously(auth);
        // Only update display name if provided and different
        if (displayName && auth.currentUser.displayName !== displayName) {
            await updateProfile(auth.currentUser, { displayName });
        }
        return result.user;
    } catch (error) {
        console.error("Error signing in:", error);
        throw error;
    }
};

export const getCurrentUser = () => {
    return auth.currentUser;
};
