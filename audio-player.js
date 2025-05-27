// webpage/audio-player.js

// --- Audio Player Logic ---

document.addEventListener('DOMContentLoaded', () => {
    const audioFile = 'space.mp3';
    let audioPlayer = null;
    let muteButton = null;
    let userInteracted = false; // Flag to track user interaction for autoplay

    function initAudioPlayer() {
        // Create audio element
        audioPlayer = new Audio(audioFile);
        audioPlayer.loop = true; // Play once as requested

        // Create mute button
        muteButton = document.createElement('button');
        muteButton.id = 'muteToggleBtn';
        muteButton.textContent = '🔇 Mute'; // Initial state: playing, so button shows Mute
        muteButton.setAttribute('aria-label', 'Mute background audio');
        // Basic styling - can be enhanced in CSS
        muteButton.style.position = 'fixed';
        muteButton.style.bottom = '20px';
        muteButton.style.left = '20px';
        muteButton.style.padding = '10px 15px';
        muteButton.style.backgroundColor = 'var(--accent-primary)';
        muteButton.style.color = 'var(--bg-primary)';
        muteButton.style.border = 'none';
        muteButton.style.borderRadius = '5px';
        muteButton.style.cursor = 'pointer';
        muteButton.style.zIndex = '1001'; // Above most elements
        muteButton.style.boxShadow = '0 2px 5px rgba(0,0,0,0.3)';
        muteButton.style.fontFamily = '\'Inter\', sans-serif'; // Corrected font family quoting
        muteButton.style.fontWeight = '600';

        muteButton.addEventListener('click', toggleMute);
        document.body.appendChild(muteButton);

        const playPromise = audioPlayer.play();

    if (playPromise !== undefined) {
        playPromise.then(_ => {
                console.log('Background audio autoplay started.');
                audioPlayer.muted = false;
                updateMuteButton();
        }).catch(error => {
                console.warn('Background audio autoplay was prevented:', error);
                const playAfterInteraction = () => {
                    if (!userInteracted) {
                        userInteracted = true;
                        audioPlayer.play().then(() => {
                            console.log('Background audio started after user interaction.');
                            audioPlayer.muted = false;
                            updateMuteButton();
                        }).catch(err => {
                            console.error('Error playing audio after interaction:', err);
                        });
                        document.removeEventListener('click', playAfterInteraction, { once: true });
                        document.removeEventListener('keydown', playAfterInteraction, { once: true });
                    }
                };
                document.addEventListener('click', playAfterInteraction, { once: true });
                document.addEventListener('keydown', playAfterInteraction, { once: true });
                audioPlayer.muted = true;
                updateMuteButton();
        });
    }

        audioPlayer.onended = () => {
            console.log('Background audio finished playing.');
        };
    }

    function toggleMute() {
        if (!audioPlayer) return;
        audioPlayer.muted = !audioPlayer.muted;
        updateMuteButton();
    }

    function updateMuteButton() {
        if (!muteButton || !audioPlayer) return;
        if (audioPlayer.muted) {
            muteButton.textContent = '🔊 Unmute';
            muteButton.setAttribute('aria-label', 'Unmute background audio');
        } else {
            muteButton.textContent = '🔇 Mute';
            muteButton.setAttribute('aria-label', 'Mute background audio');
        }
    }

    if (document.readyState === 'complete' || document.readyState === 'interactive') {
        initAudioPlayer();
    } else {
        document.addEventListener('DOMContentLoaded', initAudioPlayer, { once: true });
    }
});
