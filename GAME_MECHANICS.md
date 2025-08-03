# Game Mechanics Documentation

## Overview
This is a polygon-based ball bouncing game where players control a rotating polygon and must strategically bounce a ball to hit all safe sides while avoiding explosive ones. The game features 20 levels with increasing difficulty, starting with a 4-sided square and progressing to a 23-sided polygon, with physics-based ball movement and dynamic explosive sides that change over time.

## Core Gameplay

### Objective
- Hit all non-explosive sides of the polygon to turn them gray
- Avoid hitting explosive (red) sides which cause the ball to explode
- Complete all 20 levels to win the game
- Achieve the highest score possible

### Controls
- **Arrow Keys / A & D**: Rotate the polygon left and right
- **L Key**: Toggle leaderboard display
- **Enter**: Start game (on splash screen)

### Game Flow
1. Enter player name on splash screen
2. Ball spawns in center and falls due to gravity
3. Player rotates polygon to control ball bounces
4. Hit non-explosive sides to turn them gray
5. Avoid explosive sides (marked in red)
6. Complete level when all non-explosive sides are gray
7. Progress through 20 levels with increasing difficulty

## Physics System

### Ball Physics
- **Gravity**: Constant downward force (0.3 units/frame)
- **Ball Radius**: 15 pixels
- **Bounce Mechanics**:
  - Velocity reflects off polygon edges with normal calculation
  - Bounce damping: 0.95 (energy loss on bounce)
  - Bounce speed multiplier: 1.5 (speed boost on impact)
  - Maximum speed cap: 15 units to prevent runaway velocity
  - Small random jitter added to bounce angle (±0.05 radians) to prevent repetitive patterns

### Polygon Mechanics
- **Rotation**:
  - Acceleration: 0.001 units/frame²
  - Maximum rotation speed: ±0.1 units/frame
  - Damping when no input: 0.92 (gradual slowdown)
- **Collision Detection**:
  - Point-to-line segment distance calculation
  - Collision debouncing: 50ms minimum between collisions
  - Ball repositioning on collision to prevent clipping

## Level Progression

### Level Structure
| Level | Polygon Sides | Explosive Sides | Safe Sides | Lives | Color Scheme |
|-------|---------------|-----------------|------------|-------|--------------|
| 1     | 4             | 1 (25%)         | 3          | 3     | Blue/Cyan |
| 2     | 5             | 2 (40%)         | 3          | 4     | Purple/Magenta |
| 3     | 6             | 2 (33%)         | 4          | 5     | Green |
| 4     | 7             | 2 (29%)         | 5          | 6     | Orange/Yellow |
| 5     | 8             | 2 (25%)         | 6          | 7     | Red/Yellow |
| 6     | 9             | 3 (33%)         | 6          | 8     | Pink/Yellow |
| 7     | 10            | 3 (30%)         | 7          | 9     | Green/Orange |
| 8     | 11            | 3 (27%)         | 8          | 10    | Purple/Cyan |
| 9     | 12            | 3 (25%)         | 9          | 11    | Yellow/Pink |
| 10    | 13            | 4 (31%)         | 9          | 12    | Cyan/Purple |
| 11    | 14            | 4 (29%)         | 10         | 13    | Orange/Green |
| 12    | 15            | 4 (27%)         | 11         | 14    | Pink/Cyan |
| 13    | 16            | 4 (25%)         | 12         | 15    | Green/Purple |
| 14    | 17            | 5 (29%)         | 12         | 16    | Purple/Cyan |
| 15    | 18            | 5 (28%)         | 13         | 17    | Yellow/Orange |
| 16    | 19            | 5 (26%)         | 14         | 18    | Cyan/Pink |
| 17    | 20            | 5 (25%)         | 15         | 19    | Orange/Green |
| 18    | 21            | 6 (29%)         | 15         | 20    | Pink/Purple |
| 19    | 22            | 6 (27%)         | 16         | 21    | Green/Yellow |
| 20    | 23            | 6 (26%)         | 17         | 22    | Purple/Cyan |

### Level Advancement
- Complete when all non-explosive sides are gray
- Gain +1 life and +1 max life per level
- Polygon gains +1 side per level
- Number of explosive sides equals 25% of total sides (rounded up)
- Score bonus: 100 × current level

### Explosive Side Mechanics
- Random sides become explosive at level start
- Change every 180 frames (3 seconds at 60fps)
- **Warning System**: Sides glow red for 1 second before becoming explosive
  - Glow starts at 2 seconds into the 3-second cycle
  - Intensity increases as the change approaches
  - Shadow blur effect grows from 10 to 30 pixels
  - Warning particles emit with increasing frequency
- Cannot select already gray sides as explosive
- Number of explosive sides equals 25% of polygon sides (rounded up)
- This ensures game remains playable even at higher levels
- Visual indicators: consistent red color (#ff0000) with flickering effect
- Particle effects emanate from explosive sides
- **Balance**: Maintains consistent difficulty scaling throughout all 20 levels

## Scoring System

### Point Values
- **Side Hit**: 10 × current level points
- **Level Completion**: 100 × current level points
- **Example Level 1**: 30 points for hitting all 3 safe sides + 100 bonus = 130 points
- **Example Level 20**: 340 points for hitting all 17 safe sides + 2000 bonus = 2340 points

### Maximum Possible Score
With 25% explosive sides (rounded up), the scoring potential increases significantly:
- **Level 1**: 3 safe sides × 10 × 1 + 100 = 130 points
- **Level 5**: 6 safe sides × 10 × 5 + 500 = 800 points
- **Level 10**: 9 safe sides × 10 × 10 + 1000 = 1900 points
- **Level 15**: 13 safe sides × 10 × 15 + 1500 = 3450 points
- **Level 20**: 17 safe sides × 10 × 20 + 2000 = 5400 points
- **Total Maximum Score**: Approximately 42,000 points across all 20 levels

## Lives System
- Start with 3 lives, gain 1 per level (max 22 at level 20)
- Lose 1 life when ball hits explosive side
- Game over when lives reach 0
- Ball respawns at center after explosion
- Lives displayed as heart emojis in UI

## Visual Effects

### Particle Systems
1. **Trail Particles**: Follow ball continuously with mixed colors
2. **Impact Particles**: Yellow/orange sparks on safe side hits (20 particles)
3. **Explosion Particles**: Red/orange burst on explosive hits (50 particles)
4. **Explosive Side Particles**: Continuous red particles from explosive edges

### Rendering Features
- **8-bit Pixel Art Style**: Crisp, blocky rendering with `imageSmoothingEnabled = false`
- **Ball Trail**: 20-frame history with alpha fadeout
- **Ball Rendering**: Pixel-perfect circle with black outline
- **Dynamic Colors**: Each level has unique color palette
- **Layered Backgrounds**: Multiple polygon outlines for depth

### Color Themes by Level
The game cycles through 20 unique color themes, with each level featuring:
- **Distinctive Background**: Dark themed colors for contrast
- **Polygon Colors**: Bright neon colors that stand out
- **Ball Colors**: High-contrast colors that change on impact
- **Explosive Colors**: Consistent red color (#ff0000) with flickering effects

Levels 1-4 use the original color scheme, with levels 5-20 featuring variations of:
- Blues, cyans, and teals
- Purples, magentas, and pinks  
- Greens and lime colors
- Oranges, yellows, and golds
- Mixed complementary color combinations

## Audio System

### Sound Effects
- **Safe Side Hit**: Bell-like sound with dual sine waves (440-640Hz fundamental + overtone), 0.2s duration
- **Gray Side Hit**: Soft bounce at 300Hz with gentle envelope, 0.15s duration
- **Explosion**: Soft "whoosh" created with filtered white noise, fades from 400Hz to 50Hz over 0.8s
- **Level Complete**: Harmonious bell tone at 600Hz, 0.5s duration

### Background Music
- **Ambient Piano Style**: Soft sine waves with reverb effects
- **Chord Progression**: Cmaj7, Am7, Fmaj7, G7 with inversions
- **Melody**: Gentle arpeggiated patterns with subtle detuning for warmth
- **Bass**: Deep, sustained notes with low-pass filtering
- **Volume**: 8% of full volume for ambient atmosphere
- **Style**: Lofi/lounge inspired, similar to Minecraft's calming soundtrack

## Technical Implementation

### Game Architecture
- **Main Game Class**: Handles all game state and logic
- **Particle Class**: Individual particle behavior and rendering
- **Space Background Class**: Animated starfield with planets and easter eggs
- **20-Level System**: Scalable progression with dynamic difficulty

### Performance Optimizations
- **Collision Debouncing**: Prevents multiple rapid collisions
- **Particle Cleanup**: Automatic removal when life reaches 0
- **Efficient Rendering**: Minimal draw calls with optimized pixel operations
- **Speed Limiting**: Prevents physics simulation breakdown
- **Color Cycling**: Efficient management of 20 level color themes
- **Polygon Scaling**: Handles polygons from 4 to 23 sides efficiently

### Online Features
- **JSONBin Integration**: Cloud-based leaderboard storage
- **Score Submission**: Automatic on game completion
- **Leaderboard Caching**: 1-minute cache to reduce API calls
- **High Score Detection**: Notifications for personal bests

## Easter Eggs & Polish

### Space Background
- **Animated Starfield**: 3-layer parallax with 300 total stars
- **Planets**: 3 randomly colored planets with rings and 3D shading
- **Galaxies**: 2 spiral galaxies with rotating arms
- **Space Giraffe**: Rare animated astronaut giraffe with jetpack (15-45 second intervals)

### Game Polish
- **Smooth Animations**: 60fps physics and rendering
- **Visual Feedback**: Immediate particle effects on all interactions
- **Progressive Difficulty**: Carefully balanced 20-level challenge curve
- **Responsive Controls**: Low-latency input handling
- **State Management**: Proper game over/restart functionality
- **Extended Gameplay**: 20 levels provide significant replay value
- **Difficulty Scaling**: Exponential challenge increase in later levels

## Configuration Constants

```javascript
POLYGON_RADIUS = 300          // Distance from center to polygon vertices
BALL_RADIUS = 15             // Ball collision radius
GRAVITY = 0.3                // Downward acceleration per frame
BOUNCE_DAMPING = 0.95        // Energy retention on bounce
BOUNCE_SPEED_MULTIPLIER = 1.5 // Speed boost on impact
ROTATION_SPEED = 0.02        // Base rotation increment
ROTATION_ACCELERATION = 0.001 // Rotation speed increase per frame
ROTATION_DAMPING = 0.92      // Rotation slowdown when no input
```

## Strategy Guide

### Optimal Play
1. **Early Rotation**: Start rotating before ball reaches polygon
2. **Predictive Positioning**: Aim ball toward safe sides
3. **Speed Management**: Use rotation to control bounce angles
4. **Pattern Recognition**: Learn explosive side timing (3-second cycles)
5. **Risk Assessment**: Sometimes wait for explosive sides to change
6. **Late Game Strategy**: With 15+ explosive sides, focus on survival and timing
7. **Patience**: Higher levels require waiting for favorable explosive patterns

### Common Mistakes
- Over-rotating and losing control
- Panic-rotating when ball approaches explosive side
- Not accounting for gravity in bounce predictions
- Forgetting that explosive sides change over time
- Trying to hit all sides quickly instead of strategically
- Underestimating difficulty scaling in levels 15-20
- Not utilizing the increased life count in higher levels

### Level-Specific Tips
- **Levels 1-5**: Learn basic mechanics and timing
- **Levels 6-10**: Master explosive side pattern recognition
- **Levels 11-15**: Develop patience and defensive play
- **Levels 16-20**: Extreme difficulty - focus on survival and precise timing