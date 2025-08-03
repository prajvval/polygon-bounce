# JSONBin.io Leaderboard Setup

This game uses JSONBin.io for storing and retrieving leaderboard scores. Follow these steps to set it up:

## Step 1: Create a JSONBin Account

1. Go to [JSONBin.io](https://jsonbin.io/)
2. Click "Sign Up" (free tier includes 10,000 requests/month)
3. Verify your email

## Step 2: Get Your API Key

1. After logging in, go to [API Keys](https://jsonbin.io/api-keys)
2. Your Master Key will be displayed (looks like: `$2b$10$...`)
3. Copy this key - you'll need it for the game

## Step 3: Create a Bin for Scores

1. Go to [Create Bin](https://jsonbin.io/create-bin)
2. Name it "Polygon Bounce Leaderboard" (or any name you prefer)
3. Set the initial content to:
   ```json
   {
     "scores": []
   }
   ```
4. Click "Create Bin"
5. Copy the Bin ID from the URL (looks like: `6581f4d3acd3cb34a8...`)

## Step 4: Configure the Game

1. Open `game.js`
2. Find these lines near the top:
   ```javascript
   const JSONBIN_BIN_ID = 'YOUR_BIN_ID_HERE';
   const JSONBIN_API_KEY = 'YOUR_API_KEY_HERE';
   ```
3. Replace:
   - `'YOUR_BIN_ID_HERE'` with your Bin ID from Step 3
   - `'YOUR_API_KEY_HERE'` with your API Key from Step 2

## Step 5: Test It

1. Open the game in your browser
2. Play a game and get a score
3. When the game ends, your score should be submitted
4. Press 'L' to view the leaderboard - your score should appear

## How It Works

- **Score Submission**: When you complete a game, your score is automatically sent to JSONBin
- **Leaderboard Display**: Pressing 'L' fetches the top 20 scores from JSONBin
- **Local Fallback**: If JSONBin isn't configured or is unavailable, scores are stored locally in your browser
- **Data Limit**: The leaderboard keeps the top 100 scores to stay within free tier limits

## Troubleshooting

### Scores Not Saving
- Check browser console (F12) for error messages
- Verify your API key and Bin ID are correct
- Ensure you have internet connection

### "JSONBin not configured" Message
- Double-check that you've replaced both `YOUR_BIN_ID_HERE` and `YOUR_API_KEY_HERE`
- Make sure there are no extra quotes or spaces

### Rate Limiting
- Free tier allows 10,000 requests/month
- Each game submission = 2 requests (read + write)
- Each leaderboard view = 1 request

## Privacy Note

- Your JSONBin data is private by default
- Only people with your API key can write to your bin
- Consider the bin ID as semi-public (anyone with it can read scores)

## Optional: Share Your Leaderboard

To let others see your leaderboard (read-only):
1. Share your Bin ID (not your API key!)
2. Others can configure their game with:
   - Your Bin ID for reading
   - Their own API key (scores won't save to your bin)

This creates a view-only leaderboard experience. 