const sounds = {
    eat: new Audio('assets/sounds/eat.mp3'),
    gameOver: new Audio('assets/sounds/gameOver.mp3'),
    background: new Audio('assets/sounds/background.mp3'),
};

sounds.background.loop = true;

function playSound(type) {
    let audio;
    switch(type) {
        case 'eat':
            audio = new Audio('https://cdn.pixabay.com/audio/2022/03/15/audio_115b9c6b3e.mp3');
            break;
        case 'powerup':
            audio = new Audio('https://cdn.pixabay.com/audio/2022/03/15/audio_115b9c6b3e.mp3');
            break;
        case 'gameover':
            audio = new Audio('https://cdn.pixabay.com/audio/2022/03/15/audio_115b9c6b3e.mp3');
            break;
        default:
            return;
    }
    audio.volume = 0.2;
    audio.play();
}

function stopBackgroundMusic() {
    sounds.background.pause();
}

function startBackgroundMusic() {
    sounds.background.play();
}
