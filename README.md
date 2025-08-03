# Polygon Bounce Game

A retro-style arcade game where you bounce a ball inside a rotating polygon.

## Setup Instructions for GitHub Pages Deployment

### 1. Fork/Clone the Repository

### 2. Set up GitHub Secrets
Go to your repository's Settings → Secrets and variables → Actions, and add:
- `JSONBIN_BIN_ID`: Your JSONBin.io bin ID
- `JSONBIN_API_KEY`: Your JSONBin.io API key

### 3. Enable GitHub Pages
1. Go to Settings → Pages
2. Source: Deploy from a branch
3. Branch: Select `gh-pages` (will be created by the workflow)

### 4. Deploy
Push to the main branch. The GitHub Action will automatically:
- Replace the placeholder credentials with your secrets
- Build and deploy to GitHub Pages
- Your secrets remain secure and are never exposed

## Local Development

For local development with real credentials:
1. Create a copy of `game.js` as `local-game.js`
2. Replace the placeholder values with your actual JSONBin credentials in `local-game.js`
3. Update `index.html` to use `local-game.js` instead of `game.js`
4. Run a local server: `python -m http.server 8000`

**Important**: Never commit `local-game.js` - it's in `.gitignore`

## How to Play

- Use Arrow Keys or A/D to rotate the polygon
- Hit all non-explosive sides to advance levels
- Avoid red explosive sides
- Collect lives and score points!

## Game Features

- 20 progressively challenging levels
- Global leaderboard (requires JSONBin setup)
- Retro 8-bit graphics
- Soothing background music
- Particle effects
- Space-themed background with animated elements