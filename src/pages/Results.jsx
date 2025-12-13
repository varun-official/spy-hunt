import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc } from "firebase/firestore";
import { db } from "../firebase";
import { motion } from 'framer-motion';
import { Trophy, Home, AlertTriangle, CheckCircle, HelpCircle } from 'lucide-react';

function Results() {
    const { roomId } = useParams();
    const navigate = useNavigate();
    const [room, setRoom] = useState(null);

    useEffect(() => {
        const fetchRoom = async () => {
            const snap = await getDoc(doc(db, "rooms", roomId));
            if (snap.exists()) setRoom(snap.data());
        };
        fetchRoom();
    }, [roomId]);

    if (!room || !room.result) return (
        <div className="min-h-screen bg-slate-900 flex items-center justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500"></div>
        </div>
    );

    const { winner, exiledId, maskedManId, secretWord } = room.result;
    const maskedManName = room.players[maskedManId]?.displayName || "Unknown";
    const exiledName = room.players[exiledId]?.displayName || "None";
    const citizensWon = winner === 'CITIZENS';

    return (
        <div className="min-h-screen bg-slate-900 p-4 flex flex-col items-center justify-center overflow-hidden relative">
            {/* Background Gradients */}
            <div className={`absolute top-0 w-full h-full opacity-20 ${citizensWon ? 'bg-gradient-to-b from-green-500/30 to-slate-900' : 'bg-gradient-to-b from-red-500/30 to-slate-900'
                }`} />

            <motion.div
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: "spring", stiffness: 200, damping: 15 }}
                className="relative z-10 text-center mb-8"
            >
                <div className={`inline-flex p-6 rounded-full mb-6 shadow-2xl ${citizensWon ? 'bg-green-500 shadow-green-500/40' : 'bg-red-500 shadow-red-500/40'
                    }`}>
                    <Trophy size={64} className="text-white" />
                </div>
                <h1 className="text-5xl font-black text-white uppercase tracking-tighter mb-2 drop-shadow-lg">
                    {citizensWon ? "Citizens Win!" : "Suspect Wins!"}
                </h1>
                <p className="text-slate-400 font-medium">Mission Status: {citizensWon ? "Success" : "Failed"}</p>
            </motion.div>

            <motion.div
                initial={{ y: 50, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="w-full max-w-md space-y-4 relative z-10"
            >
                {/* Reveal Cards */}
                <div className="bg-slate-800/80 backdrop-blur border border-white/10 rounded-2xl p-6 shadow-xl">
                    <div className="flex items-center justify-between border-b border-white/5 pb-4 mb-4">
                        <div className="flex items-center">
                            <div className="w-10 h-10 bg-red-500/20 rounded-lg flex items-center justify-center mr-3">
                                <AlertTriangle className="text-red-500" />
                            </div>
                            <div className="text-left">
                                <p className="text-xs text-slate-400 uppercase font-bold">The Suspect</p>
                                <p className="text-white font-bold text-lg">{maskedManName}</p>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center justify-between border-b border-white/5 pb-4 mb-4">
                        <div className="flex items-center">
                            <div className="w-10 h-10 bg-slate-700 rounded-lg flex items-center justify-center mr-3">
                                <HelpCircle className="text-slate-400" />
                            </div>
                            <div className="text-left">
                                <p className="text-xs text-slate-400 uppercase font-bold">Voted Out</p>
                                <p className="text-white font-bold text-lg">{exiledName}</p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-indigo-900/30 rounded-xl p-4 text-center border border-indigo-500/30">
                        <p className="text-indigo-300 text-sm uppercase tracking-widest font-bold mb-1">Secret Word</p>
                        <p className="text-3xl font-black text-white">{secretWord}</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 gap-3">
                    <button
                        onClick={() => navigate('/')}
                        className="w-full bg-slate-700 hover:bg-slate-600 text-white font-bold py-4 rounded-xl transition-all flex items-center justify-center"
                    >
                        <Home className="mr-2" size={20} /> Back to Home
                    </button>
                    {/* Could add Play Again button here if RoomService supported reset */}
                </div>
            </motion.div>
        </div>
    );
}

export default Results;
