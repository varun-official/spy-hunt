class SoundService {
    constructor() {
        this.context = null;
        this.masterGain = null;
        this.initialized = false;
        this.muted = localStorage.getItem('spyHunt_muted') === 'true';
    }

    init() {
        if (this.initialized) return;
        try {
            this.context = new (window.AudioContext || window.webkitAudioContext)();
            this.masterGain = this.context.createGain();
            this.setVolume(); // Set initial volume based on mute state
            this.masterGain.connect(this.context.destination);
            this.initialized = true;
        } catch (e) {
            console.error('Web Audio API not supported', e);
        }
    }

    toggleMute() {
        this.muted = !this.muted;
        localStorage.setItem('spyHunt_muted', this.muted);
        if (this.initialized) {
            this.setVolume();
        }
        return this.muted;
    }

    setVolume() {
        if (this.masterGain) {
            this.masterGain.gain.setValueAtTime(this.muted ? 0 : 0.5, this.context.currentTime);
        }
    }

    playTone(freq, type, duration, startTime = 0, vol = 1) {
        if (!this.initialized) this.init();
        if (!this.context) return;

        const osc = this.context.createOscillator();
        const gain = this.context.createGain();

        osc.type = type;
        osc.frequency.setValueAtTime(freq, this.context.currentTime + startTime);

        gain.gain.setValueAtTime(0, this.context.currentTime + startTime);
        gain.gain.linearRampToValueAtTime(vol, this.context.currentTime + startTime + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.001, this.context.currentTime + startTime + duration);

        osc.connect(gain);
        gain.connect(this.masterGain);

        osc.start(this.context.currentTime + startTime);
        osc.stop(this.context.currentTime + startTime + duration + 0.1);
    }

    // High pitch "tick" for UI clicks
    playClick() {
        this.playTone(800, 'sine', 0.1, 0, 0.3);
    }

    // Woodblock style tick for timer
    playTick() {
        this.playTone(600, 'sine', 0.05, 0, 0.5);
    }

    // Urgent low-frequency alert pulse
    playAlert() {
        this.playTone(200, 'sawtooth', 0.2, 0, 0.4);
        this.playTone(200, 'sawtooth', 0.2, 0.25, 0.4);
    }

    // Ascending major triad (C-E-G)
    playGameStart() {
        const now = 0;
        this.playTone(261.63, 'sine', 0.3, now, 0.4);       // C4
        this.playTone(329.63, 'sine', 0.3, now + 0.1, 0.4); // E4
        this.playTone(392.00, 'sine', 0.6, now + 0.2, 0.4); // G4
    }

    // Descending triad for "bad" events
    playFailure() {
        const now = 0;
        this.playTone(392.00, 'triangle', 0.3, now, 0.4);
        this.playTone(311.13, 'triangle', 0.3, now + 0.1, 0.4); // Eb
        this.playTone(261.63, 'triangle', 0.6, now + 0.2, 0.4);
    }
}

export const soundService = new SoundService();
