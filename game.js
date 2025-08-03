const DEBUG = true;

// Debug logging functions
function dblog(...args) {
    if (DEBUG) console.log(...args);
}

function dberror(...args) {
    if (DEBUG) console.error(...args);
}

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

const POLYGON_RADIUS = 300;
const BALL_RADIUS = 15;
const GRAVITY = 0.3;
const BOUNCE_DAMPING = 0.95;
const BOUNCE_SPEED_MULTIPLIER = 1.5;
const ROTATION_ACCELERATION = 0.001;
const ROTATION_DAMPING = 0.92;

class Particle {
    constructor(x, y, color) {
        this.x = x;
        this.y = y;
        this.vx = (Math.random() - 0.5) * 8;
        this.vy = (Math.random() - 0.5) * 8;
        this.life = 1.0;
        this.decay = 0.02;
        this.color = color;
        this.size = Math.random() * 5 + 2;
    }

    update() {
        this.x += this.vx;
        this.y += this.vy;
        this.vy += 0.1;
        this.life -= this.decay;
        this.size *= 0.98;
    }

    draw() {
        ctx.save();
        ctx.globalAlpha = this.life;
        ctx.fillStyle = this.color;
        const pixelSize = Math.max(2, (this.size | 0));
        ctx.fillRect(this.x - pixelSize / 2, this.y - pixelSize / 2, pixelSize, pixelSize);
        ctx.restore();
    }
}

class Game {
    constructor() {
        this.centerX = canvas.width / 2;
        this.centerY = canvas.height / 2;
        this.rotation = 0;
        this.rotationSpeed = 0;

        this.ball = {
            x: this.centerX,
            y: this.centerY - 100,
            vx: 0,
            vy: 0,
            color: '#ff00ff',
            previousColor: '#ff00ff',
            trail: [],
            lastCollisionTime: 0
        };

        this.ballColors = ['#ff00ff', '#00ff00', '#ffff00', '#00ffff', '#ff6600', '#ff0066', '#6600ff'];

        this.particles = [];
        this.explosionParticles = [];

        this.level = 1;
        this.lives = 3;
        this.maxLives = 3;
        this.score = 0;
        this.polygonSides = 4;
        this.explosiveSides = new Set();
        this.graySides = new Set();
        this.explosiveTimer = 0;
        this.explosiveChangeInterval = 180;
        this.nextExplosiveSides = new Set();  // Sides that will become explosive next
        this.warningStartTime = 120;  // Start warning at 2 seconds (180 - 60)
        this.playerName = '';
        this.leaderboardVisible = false;
        this.gameEnded = false;  // Add flag to track if game has ended
        this.scoreSubmitted = false;  // Add flag to prevent multiple submissions

        this.levelColors = [
            { bg: '#001122', polygon: '#00ffff', ball: '#ff00ff', explosive: '#ff0000' },
            { bg: '#110022', polygon: '#ff00ff', ball: '#00ff00', explosive: '#ff0000' },
            { bg: '#002211', polygon: '#00ff00', ball: '#ffff00', explosive: '#ff0000' },
            { bg: '#221100', polygon: '#ff8800', ball: '#00ffff', explosive: '#ff0000' },
            { bg: '#220011', polygon: '#ffff00', ball: '#00ff00', explosive: '#ff0000' },
            { bg: '#112200', polygon: '#ff0066', ball: '#ffff00', explosive: '#ff0000' },
            { bg: '#001221', polygon: '#00ff00', ball: '#ff8800', explosive: '#ff0000' },
            { bg: '#210012', polygon: '#ff00ff', ball: '#00ffff', explosive: '#ff0000' },
            { bg: '#122100', polygon: '#ffff00', ball: '#ff0066', explosive: '#ff0000' },
            { bg: '#012210', polygon: '#00ffff', ball: '#ff00ff', explosive: '#ff0000' },
            { bg: '#102201', polygon: '#ff8800', ball: '#00ff00', explosive: '#ff0000' },
            { bg: '#220110', polygon: '#ff0066', ball: '#ffff00', explosive: '#ff0000' },
            { bg: '#011220', polygon: '#00ff00', ball: '#ff00ff', explosive: '#ff0000' },
            { bg: '#201122', polygon: '#ff00ff', ball: '#00ffff', explosive: '#ff0000' },
            { bg: '#120211', polygon: '#ffff00', ball: '#ff8800', explosive: '#ff0000' },
            { bg: '#021120', polygon: '#00ffff', ball: '#ff0066', explosive: '#ff0000' },
            { bg: '#211021', polygon: '#ff8800', ball: '#00ff00', explosive: '#ff0000' },
            { bg: '#112021', polygon: '#ff0066', ball: '#ff00ff', explosive: '#ff0000' },
            { bg: '#021211', polygon: '#00ff00', ball: '#ffff00', explosive: '#ff0000' },
            { bg: '#121102', polygon: '#ff00ff', ball: '#00ffff', explosive: '#ff0000' }
        ];

        this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        this.musicGainNode = this.audioContext.createGain();
        this.musicGainNode.gain.value = 0.15;
        this.musicGainNode.connect(this.audioContext.destination);

        this.keys = {};
        this.setupEventListeners();
        this.updateUI();
        this.randomizeExplosiveSides();
        this.startBackgroundMusic();

        this.gameLoop();
    }

    setupEventListeners() {
        window.addEventListener('keydown', (e) => {
            this.keys[e.key.toLowerCase()] = true;

            if (e.key.toLowerCase() === 'l') {
                this.toggleLeaderboard();
            }
        });

        window.addEventListener('keyup', (e) => {
            this.keys[e.key.toLowerCase()] = false;
        });
    }

    playSound(frequency, duration, type = 'sine') {
        const now = this.audioContext.currentTime;

        // For soothing bounce sounds
        if (type === 'bounce') {
            // Create multiple soft sine waves for a bell-like sound
            const fundamentalGain = this.audioContext.createGain();
            const overtoneGain = this.audioContext.createGain();

            // Fundamental frequency
            const osc1 = this.audioContext.createOscillator();
            osc1.type = 'sine';
            osc1.frequency.setValueAtTime(frequency, now);

            // Soft overtone
            const osc2 = this.audioContext.createOscillator();
            osc2.type = 'sine';
            osc2.frequency.setValueAtTime(frequency * 2, now);

            // Connect with lower volumes
            osc1.connect(fundamentalGain);
            osc2.connect(overtoneGain);
            fundamentalGain.connect(this.audioContext.destination);
            overtoneGain.connect(this.audioContext.destination);

            // Gentle envelope
            fundamentalGain.gain.setValueAtTime(0, now);
            fundamentalGain.gain.linearRampToValueAtTime(0.15, now + 0.01);
            fundamentalGain.gain.exponentialRampToValueAtTime(0.01, now + duration);

            overtoneGain.gain.setValueAtTime(0, now);
            overtoneGain.gain.linearRampToValueAtTime(0.05, now + 0.01);
            overtoneGain.gain.exponentialRampToValueAtTime(0.01, now + duration * 0.7);

            osc1.start(now);
            osc2.start(now);
            osc1.stop(now + duration);
            osc2.stop(now + duration);

            // For explosion/loss of life sounds
        } else if (type === 'explosion') {
            // Create a soft "whoosh" sound using filtered noise
            const noiseBuffer = this.audioContext.createBuffer(1, this.audioContext.sampleRate * duration, this.audioContext.sampleRate);
            const noiseData = noiseBuffer.getChannelData(0);

            // Fill with white noise
            for (let i = 0; i < noiseData.length; i++) {
                noiseData[i] = Math.random() * 2 - 1;
            }

            const noiseSource = this.audioContext.createBufferSource();
            noiseSource.buffer = noiseBuffer;

            // Low-pass filter for soft sound
            const filter = this.audioContext.createBiquadFilter();
            filter.type = 'lowpass';
            filter.frequency.setValueAtTime(frequency, now);
            filter.frequency.exponentialRampToValueAtTime(50, now + duration);
            filter.Q.value = 1;

            const gainNode = this.audioContext.createGain();

            noiseSource.connect(filter);
            filter.connect(gainNode);
            gainNode.connect(this.audioContext.destination);

            // Soft fade in and out
            gainNode.gain.setValueAtTime(0, now);
            gainNode.gain.linearRampToValueAtTime(0.2, now + 0.05);
            gainNode.gain.exponentialRampToValueAtTime(0.01, now + duration);

            noiseSource.start(now);
            noiseSource.stop(now + duration);

            // Default sine wave for other sounds
        } else {
            const oscillator = this.audioContext.createOscillator();
            const gainNode = this.audioContext.createGain();

            oscillator.connect(gainNode);
            gainNode.connect(this.audioContext.destination);

            oscillator.type = type;
            oscillator.frequency.setValueAtTime(frequency, now);

            gainNode.gain.setValueAtTime(0.3, now);
            gainNode.gain.exponentialRampToValueAtTime(0.01, now + duration);

            oscillator.start(now);
            oscillator.stop(now + duration);
        }
    }

    startBackgroundMusic() {
        // Reduce overall volume for ambient feel
        this.musicGainNode.gain.value = 0.08;

        // Create reverb effect
        const createReverb = () => {
            const convolver = this.audioContext.createConvolver();
            const length = this.audioContext.sampleRate * 2;
            const impulse = this.audioContext.createBuffer(2, length, this.audioContext.sampleRate);

            for (let channel = 0; channel < 2; channel++) {
                const channelData = impulse.getChannelData(channel);
                for (let i = 0; i < length; i++) {
                    channelData[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, 2);
                }
            }

            convolver.buffer = impulse;
            return convolver;
        };

        const reverb = createReverb();
        const reverbGain = this.audioContext.createGain();
        reverbGain.gain.value = 0.3;

        reverb.connect(reverbGain);
        reverbGain.connect(this.audioContext.destination);

        // Play soft piano-like notes with envelope
        const playPianoNote = (frequency, startTime, duration = 2, volume = 0.1) => {
            const osc = this.audioContext.createOscillator();
            const osc2 = this.audioContext.createOscillator(); // Slight detune for warmth
            const env = this.audioContext.createGain();
            const filter = this.audioContext.createBiquadFilter();

            // Soft sine waves for piano-like sound
            osc.type = 'sine';
            osc2.type = 'sine';
            osc.frequency.value = frequency;
            osc2.frequency.value = frequency * 1.01; // Slight detune

            // Low-pass filter for softer sound
            filter.type = 'lowpass';
            filter.frequency.value = frequency * 3;
            filter.Q.value = 1;

            osc.connect(filter);
            osc2.connect(filter);
            filter.connect(env);
            env.connect(this.musicGainNode);
            env.connect(reverb); // Send to reverb

            // Gentle envelope
            env.gain.setValueAtTime(0, startTime);
            env.gain.linearRampToValueAtTime(volume, startTime + 0.1);
            env.gain.exponentialRampToValueAtTime(volume * 0.3, startTime + duration * 0.7);
            env.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

            osc.start(startTime);
            osc2.start(startTime);
            osc.stop(startTime + duration);
            osc2.stop(startTime + duration);
        };

        // Play soft bass notes
        const playBassNote = (frequency, startTime, duration = 4) => {
            const osc = this.audioContext.createOscillator();
            const env = this.audioContext.createGain();
            const filter = this.audioContext.createBiquadFilter();

            osc.type = 'triangle';
            osc.frequency.value = frequency;

            filter.type = 'lowpass';
            filter.frequency.value = 200;

            osc.connect(filter);
            filter.connect(env);
            env.connect(this.musicGainNode);

            env.gain.setValueAtTime(0, startTime);
            env.gain.linearRampToValueAtTime(0.05, startTime + 0.2);
            env.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

            osc.start(startTime);
            osc.stop(startTime + duration);
        };

        // Relaxing chord progressions - Cmaj7, Am7, Fmaj7, G7
        const chords = [
            [261.63, 329.63, 392.00, 493.88], // Cmaj7
            [220.00, 329.63, 392.00, 440.00], // Am7
            [174.61, 261.63, 329.63, 440.00], // Fmaj7
            [196.00, 293.66, 392.00, 440.00]  // G7
        ];

        const bassNotes = [130.81, 110.00, 87.31, 98.00]; // C, A, F, G

        const scheduleMusicLoop = () => {
            const now = this.audioContext.currentTime;
            const barDuration = 4; // 4 seconds per chord

            // Play chord progression
            chords.forEach((chord, chordIndex) => {
                const chordStartTime = now + chordIndex * barDuration;

                // Play bass note
                playBassNote(bassNotes[chordIndex], chordStartTime, barDuration);

                // Play chord notes with slight timing variations for human feel
                chord.forEach((note, noteIndex) => {
                    const noteTime = chordStartTime + (Math.random() * 0.05); // Slight human timing
                    const velocity = 0.05 + Math.random() * 0.03; // Varying velocity
                    playPianoNote(note, noteTime, 3, velocity);
                });

                // Add some melodic notes
                if (Math.random() > 0.5) {
                    const melodyNote = chord[Math.floor(Math.random() * chord.length)] * 2;
                    const melodyTime = chordStartTime + 1 + Math.random() * 2;
                    playPianoNote(melodyNote, melodyTime, 1.5, 0.04);
                }
            });

            // Loop after all chords play
            setTimeout(scheduleMusicLoop, barDuration * chords.length * 1000);
        };

        // Start with a slight delay for smoothness
        setTimeout(scheduleMusicLoop, 100);
    }

    randomizeExplosiveSides() {
        // Move next explosive sides to current explosive sides
        this.explosiveSides = new Set(this.nextExplosiveSides);
        this.nextExplosiveSides.clear();

        // Calculate new next explosive sides
        const numExplosive = Math.ceil(this.polygonSides * 0.25);
        const availableSides = [];
        for (let i = 0; i < this.polygonSides; i++) {
            if (!this.graySides.has(i)) {
                availableSides.push(i);
            }
        }

        if (availableSides.length > 0) {
            while (this.nextExplosiveSides.size < numExplosive && this.nextExplosiveSides.size < availableSides.length) {
                const randomIndex = Math.floor(Math.random() * availableSides.length);
                this.nextExplosiveSides.add(availableSides[randomIndex]);
                availableSides.splice(randomIndex, 1);
            }
        }

        // On first call, immediately set explosive sides
        if (this.explosiveSides.size === 0) {
            this.explosiveSides = new Set(this.nextExplosiveSides);
            this.randomizeExplosiveSides();  // Generate next set
        }
    }

    updateRotation() {
        if (this.keys['arrowleft'] || this.keys['a']) {
            this.rotationSpeed -= ROTATION_ACCELERATION;
        } else if (this.keys['arrowright'] || this.keys['d']) {
            this.rotationSpeed += ROTATION_ACCELERATION;
        } else {
            this.rotationSpeed *= ROTATION_DAMPING;
        }

        this.rotationSpeed = Math.max(-0.1, Math.min(0.1, this.rotationSpeed));
        this.rotation += this.rotationSpeed;
    }

    updateBall() {
        this.ball.vy += GRAVITY;
        this.ball.x += this.ball.vx;
        this.ball.y += this.ball.vy;

        this.ball.trail.push({ x: this.ball.x, y: this.ball.y });
        if (this.ball.trail.length > 20) {
            this.ball.trail.shift();
        }

        if (Math.random() < 0.3) {
            const color1 = this.ball.color;
            const color2 = this.ball.previousColor;
            const mixedColor = Math.random() < 0.5 ? color1 : color2;
            this.particles.push(new Particle(this.ball.x, this.ball.y, mixedColor));
        }
    }

    getPolygonVertices() {
        const vertices = [];
        for (let i = 0; i < this.polygonSides; i++) {
            const angle = (i * 2 * Math.PI / this.polygonSides) - Math.PI / 2 + this.rotation;
            vertices.push({
                x: this.centerX + POLYGON_RADIUS * Math.cos(angle),
                y: this.centerY + POLYGON_RADIUS * Math.sin(angle)
            });
        }
        return vertices;
    }

    // Helper method to calculate edge projection
    calculateEdgeProjection(v1, v2, point) {
        const edge = { x: v2.x - v1.x, y: v2.y - v1.y };
        const edgeLength = Math.sqrt(edge.x * edge.x + edge.y * edge.y);
        edge.x /= edgeLength;
        edge.y /= edgeLength;

        const toPoint = { x: point.x - v1.x, y: point.y - v1.y };
        const projLength = toPoint.x * edge.x + toPoint.y * edge.y;

        return {
            edge,
            edgeLength,
            projLength,
            projPoint: { x: v1.x + edge.x * projLength, y: v1.y + edge.y * projLength }
        };
    }

    checkCollision() {
        // First, check if ball is inside the polygon using ray casting
        const vertices = this.getPolygonVertices();
        let inside = false;
        for (let i = 0, j = this.polygonSides - 1; i < this.polygonSides; j = i++) {
            const xi = vertices[i].x, yi = vertices[i].y;
            const xj = vertices[j].x, yj = vertices[j].y;

            const intersect = ((yi > this.ball.y) != (yj > this.ball.y))
                && (this.ball.x < (xj - xi) * (this.ball.y - yi) / (yj - yi) + xi);
            if (intersect) inside = !inside;
        }

        // If ball is outside polygon, push it back inside
        if (!inside) {
            // Find the closest edge and push ball inside
            let minDist = Infinity;
            let closestPoint = null;
            let closestNormal = null;

            for (let i = 0; i < this.polygonSides; i++) {
                const v1 = vertices[i];
                const v2 = vertices[(i + 1) % this.polygonSides];

                const { edge, edgeLength, projLength, projPoint } = this.calculateEdgeProjection(v1, v2, this.ball);
                const clampedProjLength = Math.max(0, Math.min(edgeLength, projLength));
                const clampedProjPoint = { x: v1.x + edge.x * clampedProjLength, y: v1.y + edge.y * clampedProjLength };

                const dist = Math.sqrt(
                    (this.ball.x - clampedProjPoint.x) ** 2 +
                    (this.ball.y - clampedProjPoint.y) ** 2
                );

                if (dist < minDist) {
                    minDist = dist;
                    closestPoint = clampedProjPoint;
                    // Normal points inward
                    const normal = { x: this.ball.x - clampedProjPoint.x, y: this.ball.y - clampedProjPoint.y };
                    const normalLength = Math.sqrt(normal.x * normal.x + normal.y * normal.y);
                    if (normalLength > 0) {
                        normal.x /= normalLength;
                        normal.y /= normalLength;
                    }
                    closestNormal = normal;
                }
            }

            if (closestPoint && closestNormal) {
                // Push ball back inside by a safe margin
                this.ball.x = closestPoint.x - closestNormal.x * (BALL_RADIUS + 5);
                this.ball.y = closestPoint.y - closestNormal.y * (BALL_RADIUS + 5);

                // Reflect velocity
                const dotProduct = this.ball.vx * closestNormal.x + this.ball.vy * closestNormal.y;
                if (dotProduct > 0) {
                    this.ball.vx = -this.ball.vx * 0.5;
                    this.ball.vy = -this.ball.vy * 0.5;
                }
            }
        }

        // Now check for edge collisions as before
        let collisionHandled = false;

        for (let i = 0; i < this.polygonSides; i++) {
            if (collisionHandled) break;
            const v1 = vertices[i];
            const v2 = vertices[(i + 1) % this.polygonSides];

            const { edge, edgeLength, projLength, projPoint } = this.calculateEdgeProjection(v1, v2, this.ball);

            if (projLength >= 0 && projLength <= edgeLength) {
                const dist = Math.sqrt(
                    (this.ball.x - projPoint.x) ** 2 +
                    (this.ball.y - projPoint.y) ** 2
                );

                if (dist <= BALL_RADIUS) {
                    const currentTime = Date.now();
                    if (currentTime - this.ball.lastCollisionTime < 50) {
                        continue;
                    }
                    this.ball.lastCollisionTime = currentTime;

                    const normal = {
                        x: (this.ball.x - projPoint.x) / dist,
                        y: (this.ball.y - projPoint.y) / dist
                    };

                    this.ball.x = projPoint.x + normal.x * (BALL_RADIUS + 1);
                    this.ball.y = projPoint.y + normal.y * (BALL_RADIUS + 1);

                    const dotProduct = this.ball.vx * normal.x + this.ball.vy * normal.y;
                    this.ball.vx = (this.ball.vx - 2 * dotProduct * normal.x) * BOUNCE_DAMPING * BOUNCE_SPEED_MULTIPLIER;
                    this.ball.vy = (this.ball.vy - 2 * dotProduct * normal.y) * BOUNCE_DAMPING * BOUNCE_SPEED_MULTIPLIER;

                    // Add tiny jitter to bounce angle
                    const currentAngle = Math.atan2(this.ball.vy, this.ball.vx);
                    const jitterAmount = (Math.random() - 0.5) * 0.1; // Small random angle between -0.05 and 0.05 radians
                    const newAngle = currentAngle + jitterAmount;
                    const speed = Math.sqrt(this.ball.vx * this.ball.vx + this.ball.vy * this.ball.vy);
                    this.ball.vx = speed * Math.cos(newAngle);
                    this.ball.vy = speed * Math.sin(newAngle);

                    // Cap maximum speed
                    if (speed > 15) {
                        this.ball.vx = (this.ball.vx / speed) * 15;
                        this.ball.vy = (this.ball.vy / speed) * 15;
                    }

                    if (this.explosiveSides.has(i)) {
                        this.explodeBall();
                        collisionHandled = true;
                        return;
                    } else if (!this.graySides.has(i)) {
                        this.graySides.add(i);
                        this.ball.previousColor = this.ball.color;
                        this.ball.color = this.ballColors[Math.floor(Math.random() * this.ballColors.length)];
                        this.playSound(440 + Math.random() * 200, 0.2, 'bounce');
                        this.createImpactEffect(projPoint.x, projPoint.y);

                        // Add score for hitting a new side
                        this.score += 10 * this.level;
                        this.updateUI();

                        // Check if all non-explosive sides are gray
                        this.checkLevelCompletion();
                        collisionHandled = true;
                    } else {
                        this.playSound(300, 0.15, 'bounce');
                        collisionHandled = true;
                    }
                }
            }
        }
    }

    createImpactEffect(x, y) {
        for (let i = 0; i < 20; i++) {
            const color = ['#ffff00', '#ff8800', '#ffffff'][Math.floor(Math.random() * 3)];
            this.particles.push(new Particle(x, y, color));
        }
    }

    explodeBall() {
        this.playSound(400, 0.8, 'explosion');

        for (let i = 0; i < 50; i++) {
            const color = ['#ff0000', '#ff6600', '#ffaa00', '#ffffff'][Math.floor(Math.random() * 4)];
            this.explosionParticles.push(new Particle(this.ball.x, this.ball.y, color));
        }

        this.lives--;
        this.updateUI();

        if (this.lives <= 0) {
            this.gameOver();
        } else {
            this.ball.x = this.centerX;
            this.ball.y = this.centerY - 100;
            this.ball.vx = 0;
            this.ball.vy = 0;
            this.ball.trail = [];
        }
    }

    updateExplosiveSides() {
        this.explosiveTimer++;
        if (this.explosiveTimer >= this.explosiveChangeInterval) {
            this.explosiveTimer = 0;
            this.randomizeExplosiveSides();
            // Check for level completion after explosive sides change
            this.checkLevelCompletion();
        }
    }

    checkLevelCompletion() {
        // Count non-explosive sides that aren't gray yet
        let nonGrayNonExplosive = 0;
        for (let i = 0; i < this.polygonSides; i++) {
            if (!this.explosiveSides.has(i) && !this.graySides.has(i)) {
                nonGrayNonExplosive++;
            }
        }

        // If all non-explosive sides are gray, advance to next level
        if (nonGrayNonExplosive === 0) {
            this.nextLevel();
        }
    }

    nextLevel() {
        if (this.level < 20) {
            this.level++;
            this.polygonSides += 1;
            this.graySides.clear();
            this.lives++;
            this.maxLives++;
            this.score += 100 * this.level;
            this.playSound(600, 0.5, 'bounce');  // Soothing level complete sound
            this.randomizeExplosiveSides();
            this.updateUI();
        } else {
            this.win();
        }
    }

    updateUI() {
        document.getElementById('level').textContent = this.level;
        document.getElementById('score').textContent = this.score;
        document.getElementById('playerName').textContent = this.playerName || 'Anonymous';

        // Update progress display
        let grayCount = 0;
        let totalNonExplosive = 0;
        for (let i = 0; i < this.polygonSides; i++) {
            if (!this.explosiveSides.has(i)) {
                totalNonExplosive++;
                if (this.graySides.has(i)) {
                    grayCount++;
                }
            }
        }
        document.getElementById('avoided').textContent = `${grayCount}/${totalNonExplosive} sides hit`;

        const livesContainer = document.getElementById('lives');
        livesContainer.innerHTML = '';
        for (let i = 0; i < this.maxLives; i++) {
            const life = document.createElement('span');
            life.className = 'life';
            if (i < this.lives) {
                life.textContent = '❤️';
            } else {
                life.textContent = '🩶';
            }
            livesContainer.appendChild(life);
        }
    }



    toggleLeaderboard() {
        // Allow toggling leaderboard even after game has ended (for viewing only)
        if (this.leaderboardVisible) {
            closeLeaderboard();
            this.leaderboardVisible = false;
        } else {
            showLeaderboard();
            this.leaderboardVisible = true;
        }
    }

    gameOver() {
        if (this.gameEnded) return;  // Prevent multiple calls
        this.gameEnded = true;
        document.getElementById('gameOverText').textContent = 'Game Over!';
        document.getElementById('gameOver').style.display = 'block';
        this.submitFinalScore();
    }

    win() {
        if (this.gameEnded) return;  // Prevent multiple calls
        this.gameEnded = true;
        document.getElementById('gameOverText').textContent = 'You Win! 🎉';
        document.getElementById('gameOver').style.display = 'block';
        this.submitFinalScore();
    }

    async submitFinalScore() {
        if (this.scoreSubmitted) return;  // Prevent multiple submissions
        this.scoreSubmitted = true;

        // Submit the score
        await updateScore();

        // Force refresh leaderboard to show the new score
        dblog('Refreshing leaderboard after score submission...');
        await updateLeaderboardDisplay(true); // Force refresh to show new score
    }

    draw() {
        const colors = this.levelColors[(this.level - 1) % this.levelColors.length];

        ctx.imageSmoothingEnabled = false;

        ctx.fillStyle = colors.bg;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        ctx.save();
        ctx.globalAlpha = 0.3;
        for (let i = 0; i < 3; i++) {
            ctx.strokeStyle = colors.polygon;
            ctx.lineWidth = 4;
            ctx.beginPath();
            const vertices = this.getPolygonVertices();
            ctx.moveTo(vertices[0].x, vertices[0].y);
            for (let j = 1; j <= this.polygonSides; j++) {
                ctx.lineTo(vertices[j % this.polygonSides].x, vertices[j % this.polygonSides].y);
            }
            ctx.stroke();
            ctx.scale(0.9, 0.9);
            ctx.translate(this.centerX * 0.1, this.centerY * 0.1);
        }
        ctx.restore();

        const vertices = this.getPolygonVertices();
        for (let i = 0; i < this.polygonSides; i++) {
            const v1 = vertices[i];
            const v2 = vertices[(i + 1) % this.polygonSides];

            if (this.graySides.has(i)) {
                ctx.strokeStyle = '#666666';
                ctx.lineWidth = 6;
            } else if (this.explosiveSides.has(i)) {
                ctx.strokeStyle = colors.explosive;
                ctx.lineWidth = 8;
                if (Math.random() < 0.5) {
                    ctx.strokeStyle = Math.random() < 0.5 ? colors.explosive : '#ff0000';
                }
            } else if (this.nextExplosiveSides.has(i) && this.explosiveTimer >= this.warningStartTime) {
                // Warning glow for sides about to become explosive
                const warningIntensity = (this.explosiveTimer - this.warningStartTime) / (this.explosiveChangeInterval - this.warningStartTime);
                const glowAlpha = 0.3 + (0.7 * warningIntensity * Math.sin(Date.now() * 0.01));
                ctx.strokeStyle = `rgba(255, 0, 0, ${glowAlpha})`;
                ctx.lineWidth = 6 + (2 * warningIntensity);
            } else {
                ctx.strokeStyle = colors.polygon;
                ctx.lineWidth = 6;
            }

            // Draw glow effect for warning sides
            if (this.nextExplosiveSides.has(i) && this.explosiveTimer >= this.warningStartTime) {
                const warningIntensity = (this.explosiveTimer - this.warningStartTime) / (this.explosiveChangeInterval - this.warningStartTime);
                ctx.save();
                ctx.shadowColor = '#ff0000';
                ctx.shadowBlur = 10 + (20 * warningIntensity);
                ctx.beginPath();
                ctx.moveTo(v1.x, v1.y);
                ctx.lineTo(v2.x, v2.y);
                ctx.stroke();
                ctx.restore();
            } else {
                ctx.beginPath();
                ctx.moveTo(v1.x, v1.y);
                ctx.lineTo(v2.x, v2.y);
                ctx.stroke();
            }

            if (this.explosiveSides.has(i) && Math.random() < 0.3) {
                const midX = (v1.x + v2.x) / 2;
                const midY = (v1.y + v2.y) / 2;
                this.particles.push(new Particle(midX, midY, colors.explosive));
            }

            // Add warning particles for sides about to become explosive
            if (this.nextExplosiveSides.has(i) && this.explosiveTimer >= this.warningStartTime && Math.random() < 0.2) {
                const midX = (v1.x + v2.x) / 2;
                const midY = (v1.y + v2.y) / 2;
                const warningIntensity = (this.explosiveTimer - this.warningStartTime) / (this.explosiveChangeInterval - this.warningStartTime);
                const particleColor = `rgba(255, ${Math.floor(100 * (1 - warningIntensity))}, 0, ${0.5 + 0.5 * warningIntensity})`;
                this.particles.push(new Particle(midX, midY, particleColor));
            }
        }

        for (let i = 0; i < this.ball.trail.length; i++) {
            const point = this.ball.trail[i];
            const alpha = i / this.ball.trail.length;
            ctx.fillStyle = this.ball.color;
            ctx.globalAlpha = alpha * 0.3;
            const size = (BALL_RADIUS * (i / this.ball.trail.length)) | 0;
            if (size > 0) {
                ctx.fillRect(point.x - size, point.y - size, size * 2, size * 2);
            }
        }
        ctx.globalAlpha = 1;

        ctx.save();
        ctx.fillStyle = this.ball.color;
        // Draw 8-bit style circle
        const r = BALL_RADIUS;
        for (let y = -r; y <= r; y++) {
            for (let x = -r; x <= r; x++) {
                if (x * x + y * y <= r * r) {
                    ctx.fillRect(this.ball.x + x, this.ball.y + y, 1, 1);
                }
            }
        }
        // Draw black outline
        ctx.fillStyle = '#000';
        for (let angle = 0; angle < Math.PI * 2; angle += 0.1) {
            const x = Math.round(Math.cos(angle) * r);
            const y = Math.round(Math.sin(angle) * r);
            ctx.fillRect(this.ball.x + x, this.ball.y + y, 1, 1);
        }
        ctx.restore();

        this.particles = this.particles.filter(p => {
            p.update();
            p.draw();
            return p.life > 0;
        });

        this.explosionParticles = this.explosionParticles.filter(p => {
            p.update();
            p.draw();
            return p.life > 0;
        });
    }

    gameLoop() {
        // Stop the game loop if the game has ended
        if (this.gameEnded) return;

        this.updateRotation();
        this.updateBall();
        this.checkCollision();
        this.updateExplosiveSides();
        this.draw();

        requestAnimationFrame(() => this.gameLoop());
    }
}

let game;
let playerName = '';
let leaderboardCache = null;
let lastLeaderboardFetch = 0;

// JSONBin.io configuration for leaderboard storage
const JSONBIN_BIN_ID = 'YOUR_BIN_ID_HERE'; // Will be replaced by GitHub Actions
const JSONBIN_API_KEY = 'YOUR_API_KEY_HERE'; // Will be replaced by GitHub Actions
const JSONBIN_BASE_URL = 'https://api.jsonbin.io/v3';

// Helper function to check if JSONBin is configured
function isJSONBinConfigured() {
    return true;
    //return JSONBIN_BIN_ID && JSONBIN_BIN_ID !== 'YOUR_BIN_ID_HERE' &&
    //       JSONBIN_API_KEY && JSONBIN_API_KEY !== 'YOUR_API_KEY_HERE';
}

async function startGame() {
    const username = document.getElementById('username').value.trim();

    // Allow empty names but mark as anonymous
    if (!username) {
        playerName = '';
        dblog('Anonymous player - no leaderboard submission');
    } else {
        playerName = username.toUpperCase();
    }

    document.getElementById('splashScreen').style.display = 'none';
    game = new Game();
    game.playerName = playerName;
    game.updateUI();

    // Fetch leaderboard data at game start
    dblog('Fetching initial leaderboard data...');
    await updateLeaderboardDisplay();
}

async function updateScore() {
    if (!game) return;

    // Don't submit scores for anonymous players
    if (!game.playerName || game.playerName.trim() === '') {
        dblog('Anonymous player - score not submitted to leaderboard');
        return;
    }

    dblog('Score:', game.playerName, game.score, game.level);

    // Check if JSONBin is configured
    if (!isJSONBinConfigured()) {
        dberror('JSONBin not configured - score submission disabled');
        return;
    }

    try {
        dblog('Attempting to submit score to JSONBin...');
        dblog('Bin ID:', JSONBIN_BIN_ID);
        dblog('API URL:', `${JSONBIN_BASE_URL}/b/${JSONBIN_BIN_ID}/latest`);

        // Fetch current scores from JSONBin
        const response = await fetch(`${JSONBIN_BASE_URL}/b/${JSONBIN_BIN_ID}/latest`, {
            headers: {
                'X-Master-Key': JSONBIN_API_KEY
            }
        });

        let scores = [];
        if (response.ok) {
            const data = await response.json();
            scores = data.record.scores || [];
            dblog('Successfully fetched existing scores:', scores.length);
        } else if (response.status === 404) {
            // Bin might not exist or be empty, initialize with empty scores
            dblog('Bin not found or empty, initializing with empty scores');
            scores = [];
        } else {
            dberror('Failed to fetch scores from JSONBin:', response.status, response.statusText);
            const errorText = await response.text();
            dberror('Error details:', errorText);
            throw new Error(`Failed to fetch scores: ${response.status}`);
        }

        // Check if player already has a score (case-insensitive)
        const playerNameLower = game.playerName.toLowerCase();
        let existingScoreIndex = -1;
        let previousHighScore = 0;
        let isNewHighScore = false;

        for (let i = 0; i < scores.length; i++) {
            if (scores[i].username.toLowerCase() === playerNameLower) {
                existingScoreIndex = i;
                previousHighScore = scores[i].score;
                break;
            }
        }

        // Determine if this is a new high score
        if (existingScoreIndex >= 0) {
            if (game.score > previousHighScore) {
                // Replace old score with new high score
                isNewHighScore = true;
                scores[existingScoreIndex] = {
                    username: game.playerName,
                    score: game.score,
                    level: game.level,
                    timestamp: new Date().toISOString()
                };
                dblog(`New high score for ${game.playerName}! Previous: ${previousHighScore}, New: ${game.score}`);
            } else {
                // Current score is not higher than existing score
                dblog(`Score ${game.score} is not higher than existing high score ${previousHighScore}`);
                return; // Don't update the leaderboard
            }
        } else {
            // New player, add their score
            scores.push({
                username: game.playerName,
                score: game.score,
                level: game.level,
                timestamp: new Date().toISOString()
            });
        }

        // Sort and keep top 100
        scores.sort((a, b) => b.score - a.score);
        if (scores.length > 100) {
            scores.length = 100;
        }

        // Update the bin
        const updateResponse = await fetch(`${JSONBIN_BASE_URL}/b/${JSONBIN_BIN_ID}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'X-Master-Key': JSONBIN_API_KEY
            },
            body: JSON.stringify({ scores })
        });

        if (updateResponse.ok) {
            dblog('Score submitted successfully to JSONBin');
            if (isNewHighScore) {
                dblog(`🎉 NEW HIGH SCORE! 🎉 Score: ${game.score} points! Previous high score: ${previousHighScore} points`);
            }
        } else {
            dberror('Failed to update JSONBin:', updateResponse.status, updateResponse.statusText);
            const errorText = await updateResponse.text();
            dberror('Update error details:', errorText);
            throw new Error(`Failed to update JSONBin: ${updateResponse.status}`);
        }
    } catch (error) {
        dberror('Error submitting score to JSONBin:', error);
    }
}

async function fetchLeaderboard() {
    // Check if JSONBin is configured
    if (!isJSONBinConfigured()) {
        dberror('JSONBin not configured - leaderboard disabled');
        return [];
    }

    try {
        // Fetch scores from JSONBin
        const response = await fetch(`${JSONBIN_BASE_URL}/b/${JSONBIN_BIN_ID}/latest`, {
            headers: {
                'X-Master-Key': JSONBIN_API_KEY
            }
        });

        if (!response.ok) {
            dberror('Failed to fetch from JSONBin:', response.status);
            return [];
        }

        const data = await response.json();
        const scores = data.record.scores || [];

        dblog(`Successfully fetched ${scores.length} scores from JSONBin`);

        // Sort by score descending and take top 20
        return scores.sort((a, b) => b.score - a.score).slice(0, 20);
    } catch (error) {
        dberror('Error fetching leaderboard from JSONBin:', error);
        return [];
    }
}

function showLeaderboard() {
    document.getElementById('leaderboard').style.display = 'block';
    updateLeaderboardDisplay();
}

function closeLeaderboard() {
    document.getElementById('leaderboard').style.display = 'none';
}

async function updateLeaderboardDisplay(forceRefresh = false) {
    const tbody = document.getElementById('leaderboardBody');
    tbody.innerHTML = '<tr><td colspan="4">Loading...</td></tr>';

    // Use cache if available and not forcing refresh
    const now = Date.now();
    const cacheAge = now - lastLeaderboardFetch;
    const cacheValid = leaderboardCache && cacheAge < 60000 && !forceRefresh; // 1 minute cache

    let scores;
    if (cacheValid) {
        dblog('Using cached leaderboard data');
        scores = leaderboardCache;
    } else {
        dblog('Fetching fresh leaderboard data');
        scores = await fetchLeaderboard();
        leaderboardCache = scores;
        lastLeaderboardFetch = now;
    }

    tbody.innerHTML = '';
    scores.forEach((score, index) => {
        const row = tbody.insertRow();
        row.insertCell(0).textContent = index + 1;
        row.insertCell(1).textContent = score.username || score.name;
        row.insertCell(2).textContent = score.score;
        row.insertCell(3).textContent = score.level;
    });

    if (scores.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4">No scores yet!</td></tr>';
    }
}

// Add event listener for Enter key on username input
document.addEventListener('DOMContentLoaded', () => {
    const usernameInput = document.getElementById('username');
    if (usernameInput) {
        usernameInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                startGame();
            }
        });
        // Focus the input field when page loads
        usernameInput.focus();
    }
});

// Function to replay the game without reloading the page
function replayGame() {
    // Hide game over screen
    document.getElementById('gameOver').style.display = 'none';

    // Create a new game instance with the existing player name
    game = new Game();
    game.playerName = playerName;
    game.updateUI();
}

// Space Background Animation
class SpaceBackground {
    constructor() {
        this.canvas = document.getElementById('backgroundCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.ctx.imageSmoothingEnabled = false;

        this.resize();
        window.addEventListener('resize', () => this.resize());

        // Stars (3 layers for parallax)
        this.stars = [
            { layer: [], speed: 0.5, size: 1, count: 150 },
            { layer: [], speed: 1, size: 2, count: 100 },
            { layer: [], speed: 2, size: 3, count: 50 }
        ];

        // Planets
        this.planets = [];
        this.planetColors = ['#ff6b6b', '#4ecdc4', '#45b7d1', '#fdcb6e', '#6c5ce7'];

        // Galaxies
        this.galaxies = [];

        // Space Giraffe
        this.giraffe = {
            x: -200,
            y: 0,
            active: false,
            speed: 8,
            angle: 0,
            scale: 1,
            nextAppearance: Date.now() + 10000 + Math.random() * 20000
        };

        this.initializeSpace();
        this.animate();
    }

    resize() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
    }

    initializeSpace() {
        // Initialize stars with 3D positions
        this.stars.forEach(starLayer => {
            for (let i = 0; i < starLayer.count; i++) {
                starLayer.layer.push({
                    // Start from random positions but include z depth
                    x: (Math.random() - 0.5) * this.canvas.width * 3,
                    y: (Math.random() - 0.5) * this.canvas.height * 3,
                    z: Math.random() * 1000,
                    brightness: Math.random()
                });
            }
        });

        // Initialize planets in 3D space
        for (let i = 0; i < 3; i++) {
            this.planets.push({
                x: (Math.random() - 0.5) * this.canvas.width * 2,
                y: (Math.random() - 0.5) * this.canvas.height * 2,
                z: Math.random() * 1000 + 200,
                baseRadius: Math.random() * 30 + 20,
                color: this.planetColors[Math.floor(Math.random() * this.planetColors.length)],
                rings: Math.random() > 0.5
            });
        }

        // Initialize galaxies in 3D space
        for (let i = 0; i < 2; i++) {
            this.galaxies.push({
                x: (Math.random() - 0.5) * this.canvas.width * 2,
                y: (Math.random() - 0.5) * this.canvas.height * 2,
                z: Math.random() * 1000 + 500,
                rotation: Math.random() * Math.PI * 2,
                baseScale: Math.random() * 0.5 + 0.3
            });
        }
    }

    drawPixelCircle(x, y, radius, color) {
        this.ctx.fillStyle = color;
        const r = Math.floor(radius);
        for (let dy = -r; dy <= r; dy++) {
            for (let dx = -r; dx <= r; dx++) {
                if (dx * dx + dy * dy <= r * r) {
                    this.ctx.fillRect(Math.floor(x + dx), Math.floor(y + dy), 1, 1);
                }
            }
        }
    }

    drawGalaxy(x, y, scale, rotation) {
        this.ctx.save();
        this.ctx.translate(x, y);
        this.ctx.rotate(rotation);

        // Draw spiral arms with dots
        for (let arm = 0; arm < 3; arm++) {
            const armAngle = (arm * Math.PI * 2) / 3;
            for (let i = 0; i < 20; i++) {
                const angle = armAngle + i * 0.3;
                const radius = i * 2 * scale;
                const px = Math.cos(angle) * radius;
                const py = Math.sin(angle) * radius;

                this.ctx.fillStyle = `rgba(255, 255, 255, ${0.8 - i * 0.03})`;
                this.ctx.fillRect(Math.floor(px), Math.floor(py), 2, 2);

                // Add some scattered stars
                if (Math.random() > 0.5) {
                    const scatter = 10 * scale;
                    const sx = px + (Math.random() - 0.5) * scatter;
                    const sy = py + (Math.random() - 0.5) * scatter;
                    this.ctx.fillRect(Math.floor(sx), Math.floor(sy), 1, 1);
                }
            }
        }

        // Bright center
        this.ctx.fillStyle = '#ffffff';
        this.ctx.fillRect(-2, -2, 4, 4);
        this.ctx.fillStyle = '#ffff88';
        this.ctx.fillRect(-1, -1, 2, 2);

        this.ctx.restore();
    }

    drawPlanet(planet) {
        const x = planet.x;
        const y = planet.y;
        const r = planet.radius * planet.z;

        // Draw planet base
        this.drawPixelCircle(x, y, r, planet.color);

        // Add spherical shading
        const lightX = -0.7; // Light coming from upper left
        const lightY = -0.7;

        for (let dy = -r; dy <= r; dy++) {
            for (let dx = -r; dx <= r; dx++) {
                const distSq = dx * dx + dy * dy;
                if (distSq <= r * r) {
                    // Calculate distance from center (0 to 1)
                    const dist = Math.sqrt(distSq) / r;

                    // Calculate dot product with light direction for shading
                    const nx = dx / r;
                    const ny = dy / r;
                    const nz = Math.sqrt(Math.max(0, 1 - nx * nx - ny * ny));

                    const lightDot = nx * lightX + ny * lightY + nz * 0.7;

                    // Apply shading
                    if (lightDot < 0.3) {
                        // Dark side
                        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
                        this.ctx.fillRect(Math.floor(x + dx), Math.floor(y + dy), 1, 1);
                    } else if (lightDot > 0.8 && dist < 0.7) {
                        // Highlight
                        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
                        this.ctx.fillRect(Math.floor(x + dx), Math.floor(y + dy), 1, 1);
                    }
                }
            }
        }

        // Add edge darkening for more sphere effect
        for (let dy = -r; dy <= r; dy++) {
            for (let dx = -r; dx <= r; dx++) {
                const distSq = dx * dx + dy * dy;
                if (distSq <= r * r && distSq > (r - 3) * (r - 3)) {
                    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
                    this.ctx.fillRect(Math.floor(x + dx), Math.floor(y + dy), 1, 1);
                }
            }
        }

        // Draw rings if planet has them
        if (planet.rings) {
            this.ctx.strokeStyle = 'rgba(200, 200, 200, 0.6)';
            this.ctx.lineWidth = 2;
            this.ctx.beginPath();
            this.ctx.ellipse(x, y, r * 1.5, r * 0.5, 0, 0, Math.PI * 2);
            this.ctx.stroke();
        }
    }

    drawSpaceGiraffe() {
        if (!this.giraffe.active) return;

        const x = Math.floor(this.giraffe.x);
        const y = Math.floor(this.giraffe.y);
        const s = this.giraffe.scale;

        this.ctx.save();
        this.ctx.translate(x, y);
        this.ctx.rotate(this.giraffe.angle);

        // Giraffe body (8-bit style)
        // Body
        this.ctx.fillStyle = '#f4a460';
        this.ctx.fillRect(-20 * s, -10 * s, 30 * s, 20 * s);

        // Neck
        this.ctx.fillRect(10 * s, -30 * s, 15 * s, 25 * s);

        // Head
        this.ctx.fillRect(10 * s, -40 * s, 20 * s, 15 * s);

        // Legs (4 legs)
        this.ctx.fillRect(-18 * s, 10 * s, 5 * s, 15 * s);
        this.ctx.fillRect(-8 * s, 10 * s, 5 * s, 15 * s);
        this.ctx.fillRect(2 * s, 10 * s, 5 * s, 15 * s);
        this.ctx.fillRect(12 * s, 10 * s, 5 * s, 15 * s);

        // Spots
        this.ctx.fillStyle = '#8b4513';
        this.ctx.fillRect(-15 * s, -5 * s, 5 * s, 5 * s);
        this.ctx.fillRect(-5 * s, 0 * s, 4 * s, 4 * s);
        this.ctx.fillRect(5 * s, -5 * s, 4 * s, 4 * s);
        this.ctx.fillRect(15 * s, -20 * s, 4 * s, 4 * s);

        // Space helmet (glass dome)
        this.ctx.strokeStyle = '#ffffff';
        this.ctx.lineWidth = 2;
        this.ctx.beginPath();
        this.ctx.arc(20 * s, -32 * s, 15 * s, 0, Math.PI * 2);
        this.ctx.stroke();

        // Helmet shine
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
        this.ctx.beginPath();
        this.ctx.arc(15 * s, -35 * s, 5 * s, 0, Math.PI * 2);
        this.ctx.fill();

        // Jetpack
        this.ctx.fillStyle = '#c0c0c0';
        this.ctx.fillRect(-25 * s, -5 * s, 5 * s, 15 * s);

        // Jetpack flames
        this.ctx.fillStyle = '#ff6600';
        this.ctx.fillRect(-27 * s, 10 * s, 3 * s, 8 * s);
        this.ctx.fillRect(-25 * s, 10 * s, 3 * s, 6 * s);
        this.ctx.fillStyle = '#ffff00';
        this.ctx.fillRect(-26 * s, 10 * s, 2 * s, 4 * s);

        this.ctx.restore();
    }

    update() {
        const centerX = this.canvas.width / 2;
        const centerY = this.canvas.height / 2;
        const focalLength = 300; // Controls perspective strength
        const speed = 2; // Movement speed towards viewer

        // Update stars with 3D perspective
        this.stars.forEach((starLayer, layerIndex) => {
            starLayer.layer.forEach(star => {
                // Move star towards viewer
                star.z -= speed * starLayer.speed;

                // Reset star if it passes the viewer
                if (star.z <= 0) {
                    star.x = (Math.random() - 0.5) * this.canvas.width * 3;
                    star.y = (Math.random() - 0.5) * this.canvas.height * 3;
                    star.z = 1000;
                    star.brightness = Math.random();
                }
            });
        });

        // Update planets with 3D movement
        this.planets.forEach(planet => {
            // Move planet towards viewer
            planet.z -= speed * 0.5;

            // Reset planet if it passes the viewer
            if (planet.z <= 50) {
                planet.x = (Math.random() - 0.5) * this.canvas.width * 2;
                planet.y = (Math.random() - 0.5) * this.canvas.height * 2;
                planet.z = 1000 + Math.random() * 200;
                planet.color = this.planetColors[Math.floor(Math.random() * this.planetColors.length)];
            }
        });

        // Update galaxies with 3D movement
        this.galaxies.forEach(galaxy => {
            // Move galaxy towards viewer
            galaxy.z -= speed * 0.3;
            galaxy.rotation += 0.002;

            // Reset galaxy if it passes the viewer
            if (galaxy.z <= 100) {
                galaxy.x = (Math.random() - 0.5) * this.canvas.width * 2;
                galaxy.y = (Math.random() - 0.5) * this.canvas.height * 2;
                galaxy.z = 1000 + Math.random() * 500;
            }
        });

        // Update space giraffe (now flies across the view)
        if (Date.now() > this.giraffe.nextAppearance && !this.giraffe.active) {
            this.giraffe.active = true;
            this.giraffe.x = -400;
            this.giraffe.y = (Math.random() - 0.5) * this.canvas.height;
            this.giraffe.z = 200 + Math.random() * 300;
            this.giraffe.vx = 5 + Math.random() * 5;
            this.giraffe.vy = (Math.random() - 0.5) * 2;
            this.giraffe.scale = 1;
        }

        if (this.giraffe.active) {
            // Move giraffe across the screen
            this.giraffe.x += this.giraffe.vx;
            this.giraffe.y += this.giraffe.vy;
            this.giraffe.z -= speed * 0.5;

            // Deactivate if off screen or too close
            if (this.giraffe.x > this.canvas.width + 400 || this.giraffe.z <= 50) {
                this.giraffe.active = false;
                this.giraffe.nextAppearance = Date.now() + 15000 + Math.random() * 30000;
            }
        }
    }

    draw() {
        // Clear canvas with dark space color
        this.ctx.fillStyle = '#000814';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        const centerX = this.canvas.width / 2;
        const centerY = this.canvas.height / 2;
        const focalLength = 300;

        // Sort all objects by z-depth (far to near)
        const allObjects = [];

        // Add galaxies
        this.galaxies.forEach(galaxy => {
            allObjects.push({
                type: 'galaxy',
                obj: galaxy,
                z: galaxy.z
            });
        });

        // Add planets
        this.planets.forEach(planet => {
            allObjects.push({
                type: 'planet',
                obj: planet,
                z: planet.z
            });
        });

        // Add stars
        this.stars.forEach((starLayer, layerIndex) => {
            starLayer.layer.forEach(star => {
                allObjects.push({
                    type: 'star',
                    obj: star,
                    layerIndex: layerIndex,
                    z: star.z
                });
            });
        });

        // Sort by depth (far to near)
        allObjects.sort((a, b) => b.z - a.z);

        // Draw all objects with perspective
        allObjects.forEach(item => {
            if (item.type === 'star') {
                const star = item.obj;
                const scale = focalLength / (focalLength + star.z);
                const x2d = centerX + star.x * scale;
                const y2d = centerY + star.y * scale;

                // Skip if outside viewport
                if (x2d < -10 || x2d > this.canvas.width + 10 ||
                    y2d < -10 || y2d > this.canvas.height + 10) return;

                const size = Math.max(1, Math.floor(this.stars[item.layerIndex].size * scale * 2));
                const brightness = (0.3 + star.brightness * 0.7) * (1 - star.z / 1000);

                this.ctx.fillStyle = `rgba(255, 255, 255, ${brightness})`;
                this.ctx.fillRect(
                    Math.floor(x2d),
                    Math.floor(y2d),
                    size,
                    size
                );
            } else if (item.type === 'planet') {
                const planet = item.obj;
                const scale = focalLength / (focalLength + planet.z);
                const x2d = centerX + planet.x * scale;
                const y2d = centerY + planet.y * scale;
                const radius = planet.baseRadius * scale;

                // Skip if too small or outside viewport
                if (radius < 1 || x2d < -radius || x2d > this.canvas.width + radius ||
                    y2d < -radius || y2d > this.canvas.height + radius) return;

                // Create temporary planet object for drawing
                const drawPlanet = {
                    x: x2d,
                    y: y2d,
                    z: scale,
                    radius: planet.baseRadius,
                    color: planet.color,
                    rings: planet.rings
                };
                this.drawPlanet(drawPlanet);
            } else if (item.type === 'galaxy') {
                const galaxy = item.obj;
                const scale = focalLength / (focalLength + galaxy.z);
                const x2d = centerX + galaxy.x * scale;
                const y2d = centerY + galaxy.y * scale;

                // Skip if outside viewport
                if (x2d < -100 || x2d > this.canvas.width + 100 ||
                    y2d < -100 || y2d > this.canvas.height + 100) return;

                this.drawGalaxy(x2d, y2d, galaxy.baseScale * scale, galaxy.rotation);
            }
        });

        // Draw space giraffe with perspective if active
        if (this.giraffe.active) {
            const scale = focalLength / (focalLength + this.giraffe.z);
            const x2d = centerX + this.giraffe.x * scale;
            const y2d = centerY + this.giraffe.y * scale;

            if (x2d > -200 && x2d < this.canvas.width + 200 &&
                y2d > -200 && y2d < this.canvas.height + 200) {
                this.giraffe.scale = scale;
                const tempX = this.giraffe.x;
                const tempY = this.giraffe.y;
                this.giraffe.x = x2d;
                this.giraffe.y = y2d;
                this.drawSpaceGiraffe();
                this.giraffe.x = tempX;
                this.giraffe.y = tempY;
            }
        }
    }

    animate() {
        this.update();
        this.draw();
        requestAnimationFrame(() => this.animate());
    }
}

// Initialize space background when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new SpaceBackground();
});