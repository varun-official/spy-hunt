import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Users, Plus, LogIn, Gamepad2 } from 'lucide-react';
import { signInUser } from '../services/authService';
import { createRoom, joinRoom } from '../services/roomService';

function Home() {
    const [name, setName] = useState('');
    const [joinCode, setJoinCode] = useState('');
    const [isJoining, setIsJoining] = useState(false);
    const [error, setError] = useState('');
    const navigate = useNavigate();

    const handleCreate = async () => {
        if (!name.trim()) return setError('Please enter your name');
        try {
            const user = await signInUser(name);
            const roomId = await createRoom(user);
            navigate(`/lobby/${roomId}`);
        } catch (err) {
            setError('Failed to create room');
            console.error(err);
        }
    };

    const handleJoin = async () => {
        if (!name.trim()) return setError('Please enter your name');
        if (!joinCode.trim()) return setError('Please enter room code');
        try {
            const user = await signInUser(name);
            await joinRoom(joinCode.toUpperCase(), user);
            navigate(`/lobby/${joinCode.toUpperCase()}`);
        } catch (err) {
            setError(err.message);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 overflow-hidden relative">
            {/* Background Blobs */}
            <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-indigo-600/30 rounded-full blur-3xl" />
            <div className="absolute bottom-[-10%] right-[-10%] w-96 h-96 bg-pink-600/20 rounded-full blur-3xl" />

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="w-full max-w-md"
            >
                <div className="text-center mb-8">
                    <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ type: "spring", stiffness: 260, damping: 20 }}
                        className="inline-block p-4 rounded-2xl bg-gradient-to-r from-indigo-500 to-purple-500 mb-4 shadow-xl shadow-indigo-500/20"
                    >
                        <Gamepad2 size={48} className="text-white" />
                    </motion.div>
                    <h1 className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-white to-indigo-200 mb-2">Suspect</h1>
                    <p className="text-slate-400">Find the imposter among your friends</p>
                </div>

                <div className="card backdrop-blur-xl bg-slate-900/60 border-slate-700/50">
                    {error && (
                        <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            className="bg-red-500/10 border border-red-500/20 text-red-200 px-4 py-2 rounded-lg mb-4 text-sm text-center"
                        >
                            {error}
                        </motion.div>
                    )}

                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-1.5 ml-1">Your Name</label>
                            <div className="relative">
                                <Users className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                                <input
                                    type="text"
                                    placeholder="Enter your name"
                                    className="input-field pl-10"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                />
                            </div>
                        </div>

                        {!isJoining ? (
                            <div className="grid gap-3">
                                <button
                                    onClick={handleCreate}
                                    className="btn btn-primary w-full flex items-center justify-center gap-2 py-3.5 group"
                                >
                                    <Plus size={20} className="group-hover:rotate-90 transition-transform" />
                                    Create New Room
                                </button>
                                <button
                                    onClick={() => setIsJoining(true)}
                                    className="btn btn-secondary w-full py-3.5"
                                >
                                    Join Existing Room
                                </button>
                            </div>
                        ) : (
                            <motion.div
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                className="space-y-4"
                            >
                                <div>
                                    <label className="block text-sm font-medium text-slate-300 mb-1.5 ml-1">Room Code</label>
                                    <input
                                        type="text"
                                        placeholder="ABCD"
                                        className="input-field text-center tracking-widest uppercase font-mono text-xl"
                                        maxLength={4}
                                        value={joinCode}
                                        onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <button
                                        onClick={() => setIsJoining(false)}
                                        className="btn btn-secondary w-full"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={handleJoin}
                                        className="btn btn-primary w-full flex items-center justify-center gap-2"
                                    >
                                        <LogIn size={18} />
                                        Join Room
                                    </button>
                                </div>
                            </motion.div>
                        )}
                    </div>
                </div>
            </motion.div>
        </div>
    );
}

export default Home;
