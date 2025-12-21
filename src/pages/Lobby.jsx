import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, onSnapshot } from "firebase/firestore";
import { db, auth } from "../firebase";
import { startGame } from "../services/gameService";
import { leaveRoom } from "../services/roomService";
import { motion, AnimatePresence } from 'framer-motion';
import { Users, Play, Copy, ArrowLeft, Crown, AlertCircle } from 'lucide-react';
import { soundService } from '../services/soundService';

function Lobby() {
    const { roomId } = useParams();
    const navigate = useNavigate();
    const [room, setRoom] = useState(null);
    const [currentUser, setCurrentUser] = useState(auth.currentUser);
    const [copied, setCopied] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        const unsubAuth = auth.onAuthStateChanged(user => {
            if (user) setCurrentUser(user);
            else navigate('/');
        });
        return () => unsubAuth();
    }, [navigate]);

    useEffect(() => {
        if (!roomId) return;
        const roomRef = doc(db, "rooms", roomId);
        const unsubscribe = onSnapshot(roomRef, (doc) => {
            if (doc.exists()) {
                const data = doc.data();
                setRoom(data);

                // Navigation Logic
                if (data.status === 'reveal') {
                    navigate('/game/' + roomId);
                }

                // If I was kicked (player list update), redirect home
                if (currentUser && data.players && !data.players[currentUser.uid]) {
                    navigate('/');
                }

            } else {
                navigate('/');
            }
        });
        return () => unsubscribe();
    }, [roomId, navigate, currentUser]);

    const handleCopy = () => {
        navigator.clipboard.writeText(roomId);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleStartGame = async () => {
        if (!isHost) return;
        try {
            setLoading(true);
            soundService.playGameStart();
            await startGame(roomId, room.players, room.lastMaskedManId); // Pass last spy ID
        } catch (err) {
            setError(err.message);
            setLoading(false);
        }
    };

    const handleLeave = async () => {
        if (room && currentUser) {
            await leaveRoom(roomId, currentUser.uid);
        }
        navigate('/');
    };

    if (!room) return (
        <div className="min-h-screen flex items-center justify-center bg-slate-900 text-white">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500"></div>
        </div>
    );

    const players = Object.values(room.players || {});
    const isHost = room.hostId === currentUser?.uid;

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 p-4 relative overflow-hidden">
            {/* Background elements */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-purple-500/10 rounded-full blur-3xl" />
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl" />

            {/* Header */}
            <header className="flex items-center justify-between mb-8">
                <button
                    onClick={handleLeave}
                    className="p-2 rounded-full bg-slate-800 text-slate-400 hover:text-white transition-colors"
                >
                    <ArrowLeft size={24} />
                </button>
                <div className="bg-indigo-600/20 px-4 py-1 rounded-full border border-indigo-500/30">
                    <span className="text-indigo-300 text-sm font-bold uppercase tracking-wider">Lobby</span>
                </div>
                <div className="w-10"></div> {/* Spacer */}
            </header>

            <div className="max-w-2xl mx-auto relative z-10">
                {error && (
                    <div className="bg-red-500/10 border border-red-500/50 text-red-200 p-4 rounded-xl mb-6 text-center">
                        {error}
                    </div>
                )}
                <div className="text-center mb-8">
                    <p className="text-slate-400 uppercase tracking-wider text-xs font-bold mb-2">Room Code</p>
                    <div
                        onClick={handleCopy}
                        className="inline-flex items-center justify-center bg-white/5 border border-white/10 rounded-2xl px-8 py-4 cursor-pointer hover:bg-white/10 transition-all group"
                    >
                        <span className="text-5xl font-mono font-bold tracking-[0.2em] text-white mr-4">{roomId}</span>
                        <Copy size={24} className={`text-slate-400 group-hover:text-white transition-colors ${copied ? 'text-green-400' : ''}`} />
                    </div>
                    {copied && <p className="text-green-400 text-sm mt-2">Copied to clipboard!</p>}
                </div>

                <div className="card backdrop-blur-xl bg-slate-800/50 border-white/5 p-6 mb-6">
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-xl font-bold flex items-center">
                            <Users className="mr-2 text-indigo-400" />
                            Players <span className="bg-indigo-500/20 text-indigo-300 px-2 py-0.5 rounded-full text-sm ml-2">{players.length}</span>
                        </h2>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        <AnimatePresence>
                            {players.map((p) => (
                                <motion.div
                                    key={p.uid}
                                    initial={{ opacity: 0, scale: 0.8 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.8 }}
                                    layout
                                    className="bg-slate-700/50 rounded-xl p-3 flex items-center space-x-3 border border-slate-600/50 relative overflow-hidden"
                                >
                                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white font-bold text-lg shadow-lg">
                                        {p.displayName.charAt(0).toUpperCase()}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="font-medium truncate text-slate-100">{p.displayName}</p>
                                        {p.uid === room.hostId && (
                                            <p className="text-xs text-amber-400 flex items-center font-bold">
                                                <Crown size={10} className="mr-1" /> HOST
                                            </p>
                                        )}
                                    </div>
                                </motion.div>
                            ))}
                        </AnimatePresence>
                    </div>
                </div>

                {isHost ? (
                    <div className="sticky bottom-4">
                        <button
                            onClick={handleStartGame}
                            disabled={players.length < 3}
                            className={`w-full py-4 rounded-xl font-bold text-lg shadow-xl shadow-indigo-900/50 flex items-center justify-center transition-all ${players.length >= 3
                                ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white hover:scale-[1.02] active:scale-[0.98]'
                                : 'bg-slate-700 text-slate-400 cursor-not-allowed'
                                }`}
                        >
                            {players.length >= 3 ? (
                                <>
                                    <Play size={24} className="mr-2 fill-current" />
                                    Start Game
                                </>
                            ) : (
                                <>
                                    <AlertCircle size={24} className="mr-2" />
                                    Waiting for Players ({players.length}/3)
                                </>
                            )}
                        </button>
                    </div>
                ) : (
                    <div className="text-center p-4 bg-white/5 rounded-xl border border-white/5 animate-pulse">
                        <p className="text-indigo-300 font-medium">Waiting for host to start...</p>
                    </div>
                )}
            </div>
        </div>
    );
}

export default Lobby;
