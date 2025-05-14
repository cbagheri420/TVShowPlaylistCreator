import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import PlaylistGenerator from './playlist-generator.js';

// Load environment variables from .env file
dotenv.config();

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public')); // Serve static files from 'public' directory

// Initialize the playlist generator
const playlistGenerator = new PlaylistGenerator();

// API route for playlist generation
app.post('/api/generate-playlist', async (req, res) => {
    try {
        const { show, mood } = req.body;
        
        if (!show) {
            return res.status(400).json({ error: 'Show name is required' });
        }
        
        // Generate playlist using the PlaylistGenerator
        const playlist = await playlistGenerator.generatePlaylist(show);
        
        // Return the playlist data
        res.json({
            ...playlist,
            mood: mood || 'mixed'
        });
        
    } catch (error) {
        console.error('Error generating playlist:', error);
        res.status(500).json({ 
            error: 'Failed to generate playlist',
            details: error.message
        });
    }
});

// Start the server
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});