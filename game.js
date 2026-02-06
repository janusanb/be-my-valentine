// Game state
let canvas, ctx;
let mouseX = 0, mouseY = 0;
let cursorSize = 30; // Starting size of YES dot
let gameRunning = false;
let noDots = [];
let animationId;
let canvasClickHandler = null; // Reference to click handler for cleanup

// Constants
const MIN_DOT_SIZE = 15;
const MAX_DOT_SIZE = 80;
const INITIAL_DOT_COUNT = 20;
const GROWTH_RATE = 0.3; // How much cursor grows per eaten dot (as fraction of eaten dot size)

// Initialize game
function init() {
    canvas = document.getElementById('gameCanvas');
    ctx = canvas.getContext('2d');
    
    // Set canvas size
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    
    // Mouse tracking
    canvas.addEventListener('mousemove', (e) => {
        const rect = canvas.getBoundingClientRect();
        mouseX = e.clientX - rect.left;
        mouseY = e.clientY - rect.top;
    });
    
    // Canvas click handler for click-to-win feature
    canvasClickHandler = (e) => {
        if (!gameRunning) return; // Only handle clicks during gameplay
        
        const rect = canvas.getBoundingClientRect();
        const clickX = e.clientX - rect.left;
        const clickY = e.clientY - rect.top;
        
        // Check if click is in empty space (not over a NO dot)
        if (!isClickOverNoDot(clickX, clickY)) {
            // Click is in empty space - show celebration directly
            showCelebration();
        }
        // If click is over a NO dot, do nothing (let game continue)
    };
    
    // Add click listener (will be active during gameplay)
    canvas.addEventListener('click', canvasClickHandler);
    
    // Start button
    document.getElementById('startButton').addEventListener('click', startGame);
    document.getElementById('restartButton').addEventListener('click', startGame);
    
    // Initial render
    render();
}

function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}

function startGame() {
    // Reset game state
    cursorSize = 30;
    gameRunning = true;
    noDots = [];
    
    // Hide overlays
    document.getElementById('startScreen').classList.add('hidden');
    document.getElementById('gameOverScreen').classList.add('hidden');
    document.getElementById('valentineScreen').classList.add('hidden');
    
    // Hide cursor on canvas when game is running
    canvas.classList.add('game-running');
    
    // Re-add click handler for gameplay (in case it was removed)
    if (canvasClickHandler) {
        canvas.addEventListener('click', canvasClickHandler);
    }
    
    // Generate initial NO dots, excluding center area where buttons appear
    generateDots(true);
    
    // Start player in the center of the screen
    mouseX = canvas.width / 2;
    mouseY = canvas.height / 2;
    
    // Start game loop
    if (animationId) {
        cancelAnimationFrame(animationId);
    }
    gameLoop();
}

function generateDots(excludeCenter = false) {
    noDots = [];
    for (let i = 0; i < INITIAL_DOT_COUNT; i++) {
        noDots.push(createNoDot(excludeCenter));
    }
}

function isPositionSafe(x, y, size) {
    // Check if position overlaps with any NO dots
    for (const dot of noDots) {
        const distance = Math.sqrt(
            Math.pow(x - dot.x, 2) + Math.pow(y - dot.y, 2)
        );
        const minDistance = size + dot.size;
        if (distance < minDistance) {
            return false;
        }
    }
    return true;
}

function isClickOverNoDot(x, y) {
    // Check if click position overlaps with any NO dots
    // Use a small radius (like 5px) to check if click is directly on a dot
    const clickRadius = 5;
    for (const dot of noDots) {
        const distance = Math.sqrt(
            Math.pow(x - dot.x, 2) + Math.pow(y - dot.y, 2)
        );
        const minDistance = clickRadius + dot.size;
        if (distance < minDistance) {
            return true; // Click is over a NO dot
        }
    }
    return false; // Click is in empty space
}

function isInCenterExclusionZone(x, y) {
    // Check if position is in the center exclusion zone where buttons appear
    // Overlay content is max-width: 400px + padding: 40px on each side = ~480px
    // Add extra margin for safety = ~500px width, ~400px height
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const exclusionWidth = 500;
    const exclusionHeight = 400;
    
    const distanceX = Math.abs(x - centerX);
    const distanceY = Math.abs(y - centerY);
    
    return distanceX < exclusionWidth / 2 && distanceY < exclusionHeight / 2;
}

function findSafeStartPosition() {
    const startSize = 30; // Initial cursor size
    const padding = 50; // Extra padding from edges
    const maxAttempts = 100;
    
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
        // Try random position
        const x = padding + Math.random() * (canvas.width - 2 * padding);
        const y = padding + Math.random() * (canvas.height - 2 * padding);
        
        if (isPositionSafe(x, y, startSize)) {
            return { x, y };
        }
    }
    
    // If we can't find a safe random position, try grid search
    const gridSize = 50;
    for (let x = padding; x < canvas.width - padding; x += gridSize) {
        for (let y = padding; y < canvas.height - padding; y += gridSize) {
            if (isPositionSafe(x, y, startSize)) {
                return { x, y };
            }
        }
    }
    
    // Fallback to center if nothing else works
    return { x: canvas.width / 2, y: canvas.height / 2 };
}

function createNoDot(excludeCenter = false) {
    const maxAttempts = 100;
    
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
        const x = Math.random() * canvas.width;
        const y = Math.random() * canvas.height;
        
        // If excludeCenter is true, skip positions in the center exclusion zone
        if (excludeCenter && isInCenterExclusionZone(x, y)) {
            continue; // Try again
        }
        
        // Found a valid position
        return {
            x: x,
            y: y,
            size: MIN_DOT_SIZE + Math.random() * (MAX_DOT_SIZE - MIN_DOT_SIZE),
            color: `hsl(${Math.random() * 60 + 320}, 70%, 60%)` // Pink/purple range
        };
    }
    
    // Fallback if we couldn't find a position outside exclusion zone
    // This should rarely happen, but generate normally if it does
    return {
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        size: MIN_DOT_SIZE + Math.random() * (MAX_DOT_SIZE - MIN_DOT_SIZE),
        color: `hsl(${Math.random() * 60 + 320}, 70%, 60%)` // Pink/purple range
    };
}

function drawYesDot() {
    ctx.save();
    
    // Draw circle
    ctx.beginPath();
    ctx.arc(mouseX, mouseY, cursorSize, 0, Math.PI * 2);
    ctx.fillStyle = '#ff6b9d';
    ctx.fill();
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 3;
    ctx.stroke();
    
    // Draw "YES" text
    ctx.fillStyle = '#fff';
    ctx.font = `bold ${cursorSize * 0.4}px Arial`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('YES', mouseX, mouseY);
    
    ctx.restore();
}

function drawNoDot(dot) {
    ctx.save();
    
    // Draw circle
    ctx.beginPath();
    ctx.arc(dot.x, dot.y, dot.size, 0, Math.PI * 2);
    ctx.fillStyle = dot.color;
    ctx.fill();
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;
    ctx.stroke();
    
    // Draw "NO" text
    ctx.fillStyle = '#fff';
    ctx.font = `bold ${dot.size * 0.4}px Arial`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('NO', dot.x, dot.y);
    
    ctx.restore();
}

function checkCollisions() {
    for (let i = noDots.length - 1; i >= 0; i--) {
        const dot = noDots[i];
        const distance = Math.sqrt(
            Math.pow(mouseX - dot.x, 2) + Math.pow(mouseY - dot.y, 2)
        );
        const minDistance = cursorSize + dot.size;
        
        if (distance < minDistance) {
            // Collision detected
            if (dot.size < cursorSize) {
                // Eat smaller dot
                cursorSize += dot.size * GROWTH_RATE;
                
                // Remove dot
                noDots.splice(i, 1);
                
                // Check if all dots are eaten (win condition)
                checkWinCondition();
                
                // Add new dot only if game is running, we need more dots, and YES is not bigger than largest
                if (gameRunning && noDots.length < INITIAL_DOT_COUNT && canGenerateNewDots()) {
                    noDots.push(createNoDot());
                }
            } else {
                // Hit larger dot - game over
                gameOver();
                return;
            }
        }
    }
}

function checkWinCondition() {
    // Check if all dots are eaten
    if (noDots.length === 0) {
        // All dots eaten, show celebration
        showCelebration();
        return;
    }
    
    // Don't show celebration immediately when YES becomes bigger than largest
    // Just let the game continue until all dots are eaten
}

function canGenerateNewDots() {
    // Only generate new dots if YES dot is NOT bigger than the largest NO dot
    if (noDots.length === 0) {
        return false; // No dots to compare, don't generate
    }
    
    const largestNoDot = Math.max(...noDots.map(dot => dot.size));
    return cursorSize <= largestNoDot; // Can generate if YES is still smaller or equal
}

function showCelebration() {
    gameRunning = false;
    cancelAnimationFrame(animationId);
    
    // Remove click handler since game is ending
    if (canvasClickHandler) {
        canvas.removeEventListener('click', canvasClickHandler);
    }
    
    // Show cursor again
    canvas.classList.remove('game-running');
    
    // Clear the canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Show valentine screen with celebration message
    const valentineScreen = document.getElementById('valentineScreen');
    valentineScreen.classList.remove('hidden');
    
    // Set celebration content directly
    const questionEl = valentineScreen.querySelector('.valentine-question');
    const buttonsEl = valentineScreen.querySelector('.valentine-buttons');
    questionEl.innerHTML = '💕 YAY! 💕 <br><br> Happy Valentine\'s Day! <br><br> ';
    buttonsEl.innerHTML = 
        '<button class="start-button" id="playAgainButton">Play Again</button>';
    
    // Add event listener for play again button
    document.getElementById('playAgainButton').addEventListener('click', () => {
        location.reload();
    });
}


function gameOver() {
    gameRunning = false;
    // Remove click handler since game is ending
    if (canvasClickHandler) {
        canvas.removeEventListener('click', canvasClickHandler);
    }
    // Show cursor again
    canvas.classList.remove('game-running');
    document.getElementById('gameOverScreen').classList.remove('hidden');
    cancelAnimationFrame(animationId);
}

function drawBackgroundText() {
    ctx.save();
    
    // Draw "Be Mine ❤️" text in the background
    ctx.fillStyle = 'rgba(255, 255, 255, 0.15)'; // Semi-transparent white
    ctx.font = 'bold 120px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('Be Mine ❤️', canvas.width / 2, canvas.height / 2);
    
    ctx.restore();
}

function gameLoop() {
    if (!gameRunning) return;
    
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw background text
    drawBackgroundText();
    
    // Draw all NO dots
    noDots.forEach(dot => drawNoDot(dot));
    
    // Draw YES dot (cursor)
    drawYesDot();
    
    // Check collisions
    checkCollisions();
    
    // Continue loop
    animationId = requestAnimationFrame(gameLoop);
}

function render() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    // Just clear canvas when game not running
}

// Start when page loads
window.addEventListener('load', init);
