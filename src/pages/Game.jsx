
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, onSnapshot } from "firebase/firestore";
import { db, auth } from "../firebase";
import { nextTurn, castVote, calculateResults, checkVoteCompletion, toggleVoteReadiness } from '../services/gameService';
import { motion, AnimatePresence } from 'framer-motion';
import { Clock, Eye, EyeOff, Mic, Flag, CheckCircle, AlertTriangle, Fingerprint } from 'lucide-react';

function Game() {
    const { roomId } = useParams();
    const navigate = useNavigate();
    const [room, setRoom] = useState(null);
    const [currentUser, setCurrentUser] = useState(auth.currentUser);
    const [isRoleVisible, setIsRoleVisible] = useState(false);
    const [timeLeft, setTimeLeft] = useState(30);
    const [selectedVoteTarget, setSelectedVoteTarget] = useState(null);

    useEffect(() => {
        const unsubAuth = auth.onAuthStateChanged(user => {
            if (user) setCurrentUser(user);
            else navigate('/');
        });
        return () => unsubAuth();
    }, [navigate]);

    useEffect(() => {
        if (!currentUser) return;
        const roomRef = doc(db, "rooms", roomId);
        const unsubscribe = onSnapshot(roomRef, (doc) => {
            if (doc.exists()) {
                const data = doc.data();
                setRoom(data);
                if (data.status === 'results') {
                    navigate('/results/' + roomId);
                }
            }
        });
        return () => unsubscribe();
    }, [roomId, navigate, currentUser]);

    // Host Vote Check
    useEffect(() => {
        if (room && room.status === 'voting' && room.hostId === currentUser.uid) {
            checkVoteCompletion(roomId, room);
        }
    }, [room, currentUser, roomId]);

    // Timer Logic
    useEffect(() => {
        if (!room?.phaseEndTime) return;
        const interval = setInterval(() => {
            const now = Date.now();
            const end = room.phaseEndTime.toMillis();
            const diff = Math.ceil((end - now) / 1000);
            setTimeLeft(diff > 0 ? diff : 0);

            if (diff <= 0 && room.hostId === currentUser.uid && room.status === 'clue') {
                nextTurn(roomId, room);
            }
        }, 1000);
        return () => clearInterval(interval);
    }, [room?.phaseEndTime, room?.status, room?.hostId, currentUser.uid, roomId]);

    if (!room) return <div className="min-h-screen bg-slate-900 flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500"></div></div>;
    if (!currentUser) return null;

    const myPlayer = room.players[currentUser.uid];
    const isMaskedMan = room.maskedManId === currentUser.uid;
    const turnLength = room.turnOrder ? room.turnOrder.length : 1;
    const isMyTurn = room.turnOrder?.[room.currentTurnIndex % turnLength] === currentUser.uid;

    const renderReveal = () => (
        <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.1 }}
            className="flex flex-col items-center justify-center min-h-[80vh] w-full max-w-md mx-auto"
        >
            <h2 className="text-3xl font-bold mb-8 text-white tracking-tight">Mission Briefing</h2>

            <motion.div
                className={`relative w-72 h-96 cursor-pointer perspective-1000 group`}
                onClick={() => setIsRoleVisible(!isRoleVisible)}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
            >
                <motion.div
                    className={`w-full h-full rounded-2xl shadow-2xl transition-all duration-500 transform-style-3d relative ${isRoleVisible ? 'rotate-y-180' : ''}`}
                    initial={false}
                    animate={{ rotateY: isRoleVisible ? 180 : 0 }}
                    transition={{ duration: 0.6, type: "spring", stiffness: 260, damping: 20 }}
                    style={{ transformStyle: 'preserve-3d' }}
                >
                    {/* Front */}
                    <div className="absolute inset-0 bg-gradient-to-br from-indigo-600 to-purple-700 rounded-2xl p-6 flex flex-col items-center justify-center backface-hidden border border-white/10">
                        <Fingerprint size={80} className="text-white/20 mb-4" />
                        <h3 className="text-2xl font-bold text-white mb-2">Top Secret</h3>
                        <p className="text-indigo-200 text-center">Tap to reveal your identity</p>
                        <div className="absolute bottom-6 flex items-center text-white/50 text-sm">
                            <Eye className="mr-2" size={16} /> Secure Transmission
                        </div>
                    </div>

                    {/* Back */}
                    <div
                        className={`absolute inset-0 rounded-2xl p-6 flex flex-col items-center justify-center backface-hidden rotate-y-180 border-2 ${isMaskedMan ? 'bg-slate-900 border-red-500' : 'bg-slate-100 border-green-500'
                            }`}
                        style={{ transform: 'rotateY(180deg)' }}
                    >
                        {isMaskedMan ? (
                            <>
                                <div className="w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center mb-4">
                                    <AlertTriangle size={40} className="text-red-500" />
                                </div>
                                <h1 className="text-3xl font-black text-red-600 mb-2 text-center uppercase">Spy</h1>
                                <p className="text-slate-500 text-center text-sm font-medium">Blend in. Don't get caught.</p>
                            </>
                        ) : (
                            <>
                                <div className="w-20 h-20 bg-green-500/10 rounded-full flex items-center justify-center mb-4">
                                    <CheckCircle size={40} className="text-green-600" />
                                </div>
                                <h1 className="text-3xl font-black text-green-600 mb-2 text-center uppercase">Agent</h1>
                                <p className="text-slate-500 text-center text-sm font-medium mb-4">The Secret Word is:</p>
                                <div className="bg-slate-200 px-6 py-3 rounded-lg text-2xl font-bold text-slate-800 tracking-wider">
                                    {room.secretWord}
                                </div>
                            </>
                        )}
                        <p className="absolute bottom-6 text-xs text-slate-400 font-mono">(Tap to Hide)</p>
                    </div>
                </motion.div>
            </motion.div>

            {
                room.hostId === currentUser.uid ? (
                    <button
                        className="mt-8 bg-white text-indigo-900 px-8 py-4 rounded-xl font-bold text-lg shadow-lg hover:bg-indigo-50 transition-all flex items-center"
                        onClick={() => nextTurn(roomId, room)}
                    >
                        Start Mission
                    </button>
                ) : (
                    <div className="mt-8 flex items-center text-indigo-200 bg-white/5 px-6 py-3 rounded-full">
                        <div className="w-2 h-2 bg-indigo-400 rounded-full animate-pulse mr-3"></div>
                        Waiting for host...
                    </div>
                )
            }
        </motion.div >
    );

    const renderClue = () => {
        const turnLength = room.turnOrder.length;
        const currentUid = room.turnOrder[room.currentTurnIndex % turnLength];
        const currentPlayerName = room.players[currentUid]?.displayName;
        const isMyTurn = currentUid === currentUser.uid;
        const readyCount = Object.values(room.readyToVote || {}).filter(v => v).length;
        const totalPlayers = Object.keys(room.players).length;

        return (
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="w-full max-w-lg mx-auto pb-20"
            >
                {/* Info Bar */}
                <div className="bg-slate-800/80 backdrop-blur-md rounded-2xl p-4 mb-6 border border-white/5 shadow-lg flex items-center justify-between">
                    <div>
                        <p className="text-xs text-slate-400 uppercase tracking-widest font-bold mb-1">Your Identity</p>
                        <p className={`font-black uppercase ${isMaskedMan ? 'text-red-500' : 'text-green-500'}`}>
                            {isMaskedMan ? "Spy" : "Agent"}
                        </p>
                    </div>
                    <div className="text-gray-400 text-xs font-mono border-l border-r border-white/10 px-4 mx-2 text-center">
                        <p className="uppercase font-bold mb-1">Round</p>
                        <p className="text-xl text-white font-bold">{Math.floor(room.currentTurnIndex / turnLength) + 1}</p>
                    </div>
                    <div className="text-right">
                        <p className="text-xs text-slate-400 uppercase tracking-widest font-bold mb-1">
                            {isMaskedMan ? "Target" : "Secret Word"}
                        </p>
                        <p className="font-bold text-white bg-white/10 px-3 py-1 rounded-lg inline-block">
                            {isMaskedMan ? "???" : room.secretWord}
                        </p>
                    </div>
                </div>

                {/* Main Game Area */}
                <div className="card bg-gradient-to-b from-slate-800 to-slate-900 border-slate-700 p-8 text-center relative overflow-hidden mb-6">
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-indigo-500 to-transparent opacity-50"></div>

                    <div className={`relative w-32 h-32 mx-auto rounded-full flex items-center justify-center border-4 mb-6 transition-colors duration-500 ${timeLeft < 10 ? 'border-red-500 bg-red-500/10' : 'border-indigo-500 bg-indigo-500/10'
                        }`}>
                        <div className="text-4xl font-mono font-bold text-white">
                            {timeLeft}
                        </div>
                        <Clock size={20} className={`absolute -top-3 bg-slate-900 px-1 ${timeLeft < 10 ? 'text-red-500' : 'text-indigo-500'}`} />
                    </div>

                    <div className="mb-8">
                        {isMyTurn ? (
                            <motion.div
                                initial={{ scale: 0.9, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                            >
                                <h2 className="text-2xl font-bold text-white mb-2">It's YOUR Turn!</h2>
                                <p className="text-indigo-200 mb-6">Give a one-word clue.</p>
                                <button
                                    className="w-full bg-indigo-500/20 border border-indigo-500/50 hover:bg-indigo-500 text-indigo-300 hover:text-white font-bold py-4 rounded-full shadow-lg transition-all active:scale-95 group"
                                    onClick={() => nextTurn(roomId, room)}
                                >
                                    <span className="flex items-center justify-center uppercase tracking-wider text-sm">
                                        End Turn <Mic className="ml-2 group-hover:scale-110 transition-transform" />
                                    </span>
                                </button>
                            </motion.div>
                        ) : (
                            <div className="opacity-80">
                                <h3 className="text-xl font-bold text-slate-300 mb-2">{currentPlayerName} is speaking</h3>
                                <p className="text-slate-500 text-sm animate-pulse">Listen carefully...</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Voting Readiness */}
                <div className="bg-slate-800/50 rounded-xl p-4 border border-white/5">
                    <div className="flex justify-between items-center mb-4">
                        <p className="text-slate-400 text-sm font-medium">Ready to vote?</p>
                        <span className="bg-white/10 text-white text-xs px-2 py-1 rounded font-mono">
                            {readyCount}/{totalPlayers} Ready
                        </span>
                    </div>

                    <button
                        className={`w-full py-3 rounded-xl font-bold text-sm transition-all border-2 ${room.readyToVote?.[currentUser.uid]
                            ? 'bg-transparent border-indigo-500 text-indigo-400'
                            : 'bg-white/5 border-transparent text-slate-300 hover:bg-white/10'
                            }`}
                        onClick={() => toggleVoteReadiness(roomId, currentUser.uid, room.readyToVote?.[currentUser.uid], room)}
                    >
                        {room.readyToVote?.[currentUser.uid] ? (
                            <span className="flex items-center justify-center"><CheckCircle size={16} className="mr-2" /> You are ready</span>
                        ) : (
                            <span className="flex items-center justify-center"><Flag size={16} className="mr-2" /> I'm ready to identify</span>
                        )}
                    </button>
                    {room.readyToVote?.[currentUser.uid] && (
                        <p className="text-center text-xs text-slate-500 mt-2">Waiting for others ({Math.ceil(totalPlayers * 2 / 3)} needed)...</p>
                    )}
                </div>
            </motion.div>
        );
    };

    const renderVoting = () => {
        const hasVoted = !!room.votes?.[currentUser.uid];

        const handleVote = () => {
            if (selectedVoteTarget) {
                castVote(roomId, currentUser.uid, selectedVoteTarget);
                setSelectedVoteTarget(null);
            }
        };

        return (
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="w-full max-w-lg mx-auto pb-32"
            >
                <div className="text-center mb-8">
                    <h2 className="text-3xl font-bold text-white mb-2">Voting Phase</h2>
                    <p className="text-indigo-200 font-medium">Identify the Subject</p>
                </div>

                {hasVoted ? (
                    <div className="bg-slate-800/50 rounded-2xl p-8 text-center border dashed border-2 border-slate-700">
                        <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                            <CheckCircle size={32} className="text-green-500" />
                        </div>
                        <h3 className="text-xl font-bold text-white mb-2">Vote Cast</h3>
                        <p className="text-slate-400">Waiting for other players...</p>
                    </div>
                ) : (
                    <>
                        <div className="grid grid-cols-1 gap-3 mb-24">
                            {Object.values(room.players).map(p => {
                                if (p.uid === currentUser.uid) return null;
                                const isSelected = selectedVoteTarget === p.uid;
                                return (
                                    <button
                                        key={p.uid}
                                        onClick={() => setSelectedVoteTarget(isSelected ? null : p.uid)}
                                        className={`p-4 rounded-xl flex items-center justify-between group transition-all duration-200 border-2 ${isSelected
                                            ? 'bg-red-500/20 border-red-500 shadow-[0_0_20px_rgba(239,68,68,0.3)]'
                                            : 'bg-slate-800 border-slate-700 hover:border-slate-500'}`}
                                    >
                                        <div className="flex items-center">
                                            <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg mr-4 ${isSelected
                                                ? 'bg-red-500 text-white'
                                                : 'bg-slate-700 text-slate-300'}`}>
                                                {p.displayName.charAt(0)}
                                            </div>
                                            <span className={`font-bold text-lg ${isSelected ? 'text-white' : 'text-slate-200'}`}>
                                                {p.displayName}
                                            </span>
                                        </div>
                                        {isSelected && (
                                            <div className="text-red-400">
                                                <CheckCircle size={24} className="fill-current" />
                                            </div>
                                        )}
                                    </button>
                                );
                            })}
                        </div>

                        {/* Sticky Bottom Confirmation */}
                        <AnimatePresence>
                            {selectedVoteTarget && (
                                <motion.div
                                    initial={{ y: 100 }}
                                    animate={{ y: 0 }}
                                    exit={{ y: 100 }}
                                    className="fixed bottom-0 left-0 w-full p-6 bg-slate-900/90 backdrop-blur-lg border-t border-white/10 z-50 flex justify-center"
                                >
                                    <button
                                        onClick={handleVote}
                                        className="w-full max-w-md bg-red-600 hover:bg-red-500 text-white font-bold py-4 rounded-xl shadow-xl shadow-red-600/30 flex items-center justify-center text-lg uppercase tracking-wider"
                                    >
                                        Confirm Vote
                                        <AlertTriangle className="ml-2" size={20} />
                                    </button>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </>
                )}
            </motion.div>
        );
    };

    return (
        <div className="min-h-screen bg-slate-900 p-4 flex flex-col items-center">
            <AnimatePresence mode="wait">
                {room.status === 'reveal' && (
                    <motion.div key="reveal" className="w-full">{renderReveal()}</motion.div>
                )}
                {room.status === 'clue' && (
                    <motion.div key="clue" className="w-full">{renderClue()}</motion.div>
                )}
                {room.status === 'voting' && (
                    <motion.div key="voting" className="w-full">{renderVoting()}</motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

export default Game;

