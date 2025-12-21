import { useState, useEffect } from 'react';
import { Volume2, VolumeX } from 'lucide-react';
import { soundService } from '../services/soundService';

const SoundToggle = () => {
    const [muted, setMuted] = useState(soundService.muted);

    // We can't easily subscribe to changes since soundService isn't an observable,
    // but since this button is the ONLY way to change it, local state is valid.

    const toggle = () => {
        const isMuted = soundService.toggleMute();
        setMuted(isMuted);
    };

    return (
        <button
            onClick={toggle}
            className="fixed top-4 right-4 z-50 p-3 bg-slate-800/80 backdrop-blur-md rounded-full shadow-lg border border-white/10 text-white hover:bg-slate-700 transition-all hover:scale-110 active:scale-95 group"
            title={muted ? "Unmute Sound" : "Mute Sound"}
        >
            {muted ? (
                <VolumeX size={20} className="text-slate-400 group-hover:text-red-400 experiment-colors" />
            ) : (
                <Volume2 size={20} className="text-indigo-400 group-hover:text-green-400 experiment-colors" />
            )}
        </button>
    );
};

export default SoundToggle;
