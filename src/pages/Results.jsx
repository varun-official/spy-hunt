import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, onSnapshot } from "firebase/firestore";
import { db, auth } from "../firebase";
import { resetToLobby } from "../services/gameService";
import { leaveRoom } from "../services/roomService";
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, Home, AlertTriangle, CheckCircle, HelpCircle, ChevronDown } from 'lucide-react';

function Results() {
    const { roomId } = useParams();
    const navigate = useNavigate();
    const [room, setRoom] = useState(null);
    const [currentUser, setCurrentUser] = useState(auth.currentUser);
    const [activeTab, setActiveTab] = useState('report');
    const [showVotes, setShowVotes] = useState(false); // 'report' or 'leaderboard'

    // Auth Subscription
    useEffect(() => {
        const unsubAuth = auth.onAuthStateChanged(user => {
            if (user) setCurrentUser(user);
            else navigate('/');
        });
        return () => unsubAuth();
    }, [navigate]);

    // Room Subscription (Real-time)
    useEffect(() => {
        if (!roomId) return;
        const roomRef = doc(db, "rooms", roomId);
        const unsubscribe = onSnapshot(roomRef, (docSnap) => {
            if (docSnap.exists()) {
                const data = docSnap.data();
                setRoom(data);

                // Redirect if game restarts
                if (data.status === 'reveal') {
                    navigate(`/game/${roomId}`);
                } else if (data.status === 'lobby') {
                    navigate(`/lobby/${roomId}`);
                }
            } else {
                navigate('/');
            }
        });
        return () => unsubscribe();
    }, [roomId, navigate]);

    if (!room || !room.result) return (
        <div className="min-h-screen bg-slate-900 flex items-center justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500"></div>
        </div>
    );

    const { winner, exiledId, maskedManId, secretWord } = room.result;
    const maskedManName = room.players[maskedManId]?.displayName || "Unknown";
    const exiledName = room.players[exiledId]?.displayName || "None";
    const agentsWon = winner === 'AGENTS';
    const isHost = room.hostId === currentUser?.uid;
    const playerCount = Object.keys(room.players || {}).length;
    const spyWinPoints = (playerCount - 1) * 10;



    const handlePlayAgain = async () => {
        try {
            await resetToLobby(roomId, maskedManId); // Pass current spy ID
        } catch (error) {
            alert(error.message);
        }
    };

    const handleLeave = async () => {
        if (room && currentUser) {
            await leaveRoom(roomId, currentUser.uid);
        }
        navigate('/');
    };

    return (
        <div className="min-h-screen bg-slate-900 p-4 flex flex-col items-center justify-center overflow-hidden relative">
            {/* Background Gradients */}
            <div className={`absolute top-0 w-full h-full opacity-20 ${agentsWon ? 'bg-gradient-to-b from-green-500/30 to-slate-900' : 'bg-gradient-to-b from-red-500/30 to-slate-900'
                }`} />

            <motion.div
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: "spring", stiffness: 200, damping: 15 }}
                className="relative z-10 text-center mb-8"
            >
                <div className={`inline-flex p-6 rounded-full mb-6 shadow-2xl ${agentsWon ? 'bg-green-500 shadow-green-500/40' : 'bg-red-500 shadow-red-500/40'
                    }`}>
                    <Trophy size={64} className="text-white" />
                </div>
                <h1 className="text-5xl font-black text-white uppercase tracking-tighter mb-2 drop-shadow-lg">
                    {agentsWon ? "Agents Win!" : "Spy Wins!"}
                </h1>
                <p className="text-slate-400 font-medium">Mission Status: {agentsWon ? "Success" : "Failed"}</p>
            </motion.div>

            <motion.div
                initial={{ y: 50, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="w-full max-w-md space-y-4 relative z-10"
            >
                {/* Tab Switcher */}
                <div className="flex bg-slate-800/50 p-1 rounded-xl mb-6 border border-white/5">
                    <button
                        onClick={() => setActiveTab('report')}
                        className={`flex-1 py-3 rounded-lg text-sm font-bold uppercase tracking-wider transition-all ${activeTab === 'report'
                            ? 'bg-indigo-600 text-white shadow-lg'
                            : 'text-slate-400 hover:text-white'
                            }`}
                    >
                        Mission Report
                    </button>
                    <button
                        onClick={() => setActiveTab('leaderboard')}
                        className={`flex-1 py-3 rounded-lg text-sm font-bold uppercase tracking-wider transition-all ${activeTab === 'leaderboard'
                            ? 'bg-indigo-600 text-white shadow-lg'
                            : 'text-slate-400 hover:text-white'
                            }`}
                    >
                        Leaderboard
                    </button>
                </div>

                {/* Content Area */}
                <div className="min-h-[300px]">
                    {activeTab === 'report' ? (
                        <motion.div
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 20 }}
                            className="bg-slate-800/80 backdrop-blur border border-white/10 rounded-2xl p-6 shadow-xl"
                        >
                            <div className="flex items-center justify-between border-b border-white/5 pb-4 mb-4">
                                <div className="flex items-center">
                                    <div className="w-10 h-10 bg-red-500/20 rounded-lg flex items-center justify-center mr-3">
                                        <AlertTriangle className="text-red-500" />
                                    </div>
                                    <div className="text-left">
                                        <p className="text-xs text-slate-400 uppercase font-bold">The Spy</p>
                                        <p className="text-white font-bold text-lg">{maskedManName}</p>
                                    </div>
                                </div>
                            </div>

                            <div className="border-b border-white/5 pb-4 mb-4">
                                <div className="flex items-center mb-3">
                                    <div className="w-8 h-8 bg-slate-700 rounded-lg flex items-center justify-center mr-3">
                                        <HelpCircle className="text-slate-400" size={16} />
                                    </div>
                                    <p className="text-xs text-slate-400 uppercase font-bold">Voting Results</p>
                                </div>

                                <div className="bg-slate-900/50 rounded-lg p-2 space-y-2 max-h-40 overflow-y-auto custom-scrollbar">
                                    {Object.entries(
                                        Object.entries(room.votes || {}).reduce((acc, [voterId, targetId]) => {
                                            if (!acc[targetId]) acc[targetId] = [];
                                            acc[targetId].push(voterId);
                                            return acc;
                                        }, {})
                                    )
                                        .sort(([, a], [, b]) => b.length - a.length)
                                        .map(([targetId, voters]) => (
                                            <div key={targetId} className="flex flex-col bg-white/5 rounded-lg p-2">
                                                <div className="flex justify-between items-center mb-1">
                                                    <span className={`font-bold text-sm ${targetId === exiledId ? 'text-red-400' : 'text-slate-200'}`}>
                                                        {room.players[targetId]?.displayName || 'Unknown'}
                                                        {targetId === exiledId && " (Exiled)"}
                                                    </span>
                                                    <span className="font-mono font-bold text-xs text-slate-400 bg-black/20 px-2 py-0.5 rounded">
                                                        {voters.length}
                                                    </span>
                                                </div>
                                                <div className="flex flex-wrap gap-1">
                                                    {voters.map(voterId => (
                                                        <span key={voterId} className="text-[10px] bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 px-1.5 py-0.5 rounded">
                                                            {room.players[voterId]?.displayName || 'Unknown'}
                                                        </span>
                                                    ))}
                                                </div>
                                            </div>
                                        ))}
                                    {Object.keys(room.votes || {}).length === 0 && (
                                        <p className="text-center text-slate-500 text-xs py-2">No votes were cast</p>
                                    )}
                                </div>
                            </div>

                            <div className="bg-indigo-900/30 rounded-xl p-4 text-center border border-indigo-500/30">
                                <p className="text-indigo-300 text-sm uppercase tracking-widest font-bold mb-1">Secret Word</p>
                                <p className="text-3xl font-black text-white">{secretWord}</p>
                            </div>
                        </motion.div>
                    ) : (
                        <motion.div
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            className="bg-slate-800/80 backdrop-blur border border-white/10 rounded-2xl p-6 shadow-xl"
                        >
                            <h3 className="text-indigo-300 text-sm uppercase tracking-widest font-bold mb-4 text-center flex items-center justify-center">
                                <Trophy size={16} className="mr-2" /> Leaderboard
                            </h3>
                            <div className="space-y-3">
                                {Object.values(room.players || {})
                                    .sort((a, b) => (b.score || 0) - (a.score || 0))
                                    .map((player, index) => (
                                        <div key={player.uid} className="flex items-center justify-between bg-white/5 p-3 rounded-lg border border-white/5">
                                            <div className="flex items-center">
                                                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm mr-3 ${index === 0 ? 'bg-yellow-500 text-slate-900' :
                                                    index === 1 ? 'bg-slate-300 text-slate-900' :
                                                        index === 2 ? 'bg-amber-600 text-slate-100' :
                                                            'bg-slate-700 text-slate-300'
                                                    }`}>
                                                    {index + 1}
                                                </div>
                                                <div>
                                                    <p className="font-bold text-white text-sm">{player.displayName}</p>
                                                    {((agentsWon && player.uid !== maskedManId) || (!agentsWon && player.uid === maskedManId)) && (
                                                        <p className="text-[10px] text-green-400 font-mono uppercase">+ {agentsWon ? 10 : spyWinPoints} pts</p>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="font-mono font-bold text-indigo-300">
                                                {player.score || 0}
                                            </div>
                                        </div>
                                    ))}
                            </div>
                        </motion.div>
                    )}
                </div>

                <div className="grid grid-cols-1 gap-3">
                    <button
                        onClick={handlePlayAgain}
                        className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-4 rounded-xl shadow-lg shadow-indigo-600/30 transition-all active:scale-95 flex items-center justify-center mb-2"
                    >
                        <span className="flex items-center">
                            Play Again (Return to Lobby)
                        </span>
                    </button>

                    <button
                        onClick={handleLeave}
                        className="w-full bg-slate-700 hover:bg-slate-600 text-white font-bold py-4 rounded-xl transition-all flex items-center justify-center"
                    >
                        <Home className="mr-2" size={20} /> Back to Home
                    </button>
                </div>
            </motion.div>
        </div>
    );
}

export default Results;
