// TV Show Playlist Generator - Main Application JavaScript
import PlaylistGenerator from './playlist-generator.js';

document.addEventListener('DOMContentLoaded', function() {
    // DOM element references
    const generateBtn = document.getElementById('generate-btn');
    const showInput = document.getElementById('show-input');
    const moodSelect = document.getElementById('mood-select');
    const results = document.getElementById('results');
    const loader = document.getElementById('loader');
    const showName = document.getElementById('show-name');
    const showDescription = document.getElementById('show-description');
    const playlist = document.getElementById('playlist');
    const errorMessage = document.getElementById('error-message');
    const spotifyBtn = document.getElementById('spotify-save-btn');
    
    // Store the current generated playlist
    let currentPlaylist = null;
    
    // Initialize PlaylistGenerator using environment variable for API key
    const openaiApiKey = import.meta.env.VITE_OPENAI_API_KEY; // For Vite
    // Alternatively, for other build systems:
    // const openaiApiKey = process.env.REACT_APP_OPENAI_API_KEY; // For Create React App
    // const openaiApiKey = process.env.VUE_APP_OPENAI_API_KEY; // For Vue
    
    // Check if API key exists
    if (!openaiApiKey) {
        console.error('OpenAI API key is missing. Please set the environment variable.');
        errorMessage.textContent = 'API configuration error. Contact support.';
        errorMessage.classList.add('visible');
        generateBtn.disabled = true;
        return;
    }
    
    // Initialize PlaylistGenerator with API key from environment variable
    const playlistGenerator = new PlaylistGenerator(openaiApiKey);
    
    // Add event listeners
    generateBtn.addEventListener('click', handleGeneratePlaylist);
    showInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            handleGeneratePlaylist();
        }
    });
    
    async function handleGeneratePlaylist() {
        const showTitle = showInput.value.trim();
        const selectedMood = moodSelect.value;
        
        // Validate input
        if (!showTitle) {
            errorMessage.textContent = 'Please enter a TV show name';
            errorMessage.classList.add('visible');
            return;
        }
        
        // Hide error message if visible
        errorMessage.classList.remove('visible');
        
        // Show loader
        results.classList.remove('visible');
        loader.classList.add('visible');
        
        try {
            // Estimate potential cost before making the API call
            const costEstimate = playlistGenerator.estimateTokenUsage(showTitle);
            console.log(`Estimated Token Usage: ${costEstimate.estimatedTokens}`);
            console.log(`Estimated Cost: $${costEstimate.estimatedCost.toFixed(4)}`);
            
            // Generate playlist using AI
            const playlistResult = await playlistGenerator.generatePlaylist(showTitle);
            
            // Update UI with show info
            showName.textContent = playlistResult.show;
            showDescription.textContent = `Generated playlist for ${playlistResult.show} (${playlistResult.genre} genre)`;
            
            // Clear previous playlist
            playlist.innerHTML = '';
            
            // Populate playlist with AI-generated songs
            playlistResult.playlist.forEach((songName, index) => {
                const songItem = document.createElement('li');
                songItem.className = 'song-item';
                
                // Parse song and artist (basic parsing, may need refinement)
                const [title, artist] = parseSongString(songName);
                
                songItem.innerHTML = `
                    <div class="song-number">${index + 1}</div>
                    <div class="song-info">
                        <div class="song-title">${title}</div>
                        <div class="song-artist">${artist || 'Unknown Artist'}</div>
                        <div class="song-reason">Recommended by AI for ${playlistResult.show}</div>
                    </div>
                `;
                playlist.appendChild(songItem);
            });
            
            // Store current playlist
            currentPlaylist = playlistResult;
            
        } catch (error) {
            console.error('Playlist Generation Error:', error);
            errorMessage.textContent = 'Failed to generate playlist. Please try again.';
            errorMessage.classList.add('visible');
        } finally {
            // Hide loader
            loader.classList.remove('visible');
            results.classList.add('visible');
        }
    }
    
    // Helper function to parse song string into title and artist
    function parseSongString(songString) {
        // Common delimiters for splitting song and artist
        const delimiters = [' - ', ' by ', ','];
        
        for (const delimiter of delimiters) {
            const parts = songString.split(delimiter);
            if (parts.length > 1) {
                return [parts[0].trim(), parts[1].trim()];
            }
        }
        
        // If no delimiter found, return the full string as title
        return [songString, ''];
    }
    
    // Existing helper functions from previous implementation
    function capitalizeWords(str) {
        return str.replace(/\b\w/g, l => l.toUpperCase());
    }
    
    // Placeholder Spotify icon creation function
    function createSpotifyIcon() {
        const iconPlaceholder = new Image();
        iconPlaceholder.src = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAxNjggMTY4Ij48cGF0aCBmaWxsPSIjZmZmIiBkPSJNODMuOTk2LjI3N0MzNy43NDcuMjc3LjI1MyAzNy43Ny4yNTMgODQuMDE5YzAgNDYuMjUxIDM3LjQ5NCA4My43NDEgODMuNzQzIDgzLjc0MSA0Ni4yNTQgMCA4My43NDQtMzcuNDkgODMuNzQ0LTgzLjc0MSAwLTQ2LjI0Ni0zNy40OS04My43MzgtODMuNzQyLTgzLjczOGwuMDAxLS4wMDR6bTM4LjQwNCAxMjAuNzhhNS4yMTcgNS4yMTcgMCAwMS03LjE3NyAxLjczN2MtMTkuNjYxLTEyLjAxLTQ0LjQxNS0xNC43MzQtNzMuNTUtOC4wNzFhNS4yMjIgNS4yMjIgMCAwMS02LjI0OS0zLjkyNSA1LjIxMyA1LjIxMyAwIDAxMy45MjYtNi4yNDljMzEuOS03LjI4OCA1OS4yNjMtNC4xNSA4MS4zMzcgOS4zMzQgMi40NiAxLjUxIDMuMjQgNC43MiAxLjczIDcuMTc0em0xMC4yNS0yMi43OTljLTEuODk0IDMuMDczLTUuOTEyIDQuMDM3LTguOTgxIDIuMTUtMjIuNTA1LTEzLjgzNC01Ni44MjItMTcuODQxLTgzLjQ0Ny05Ljc1OS0zLjQ1MyAxLjA0My03LjEtLjkwMy04LjE0OC00LjM1YTYuNTM4IDYuNTM4IDAgMDE0LjM1NC04LjE0M2MzMC40MTMtOS4yMjggNjguMjIxLTQuNzU4IDk0LjA3MSAxMS4xMjcgMy4wNyAxLjg5IDQuMDQgNS45MTIgMi4xNSA4Ljk3NnYtLjAwMXptLjg4LTIzLjc0NGMtMjYuOTk5LTE2LjAzMS03MS41Mi0xNy41MDUtOTcuMjg5LTkuNjg0LTQuMTM4IDEuMjU1LTguNTE0LTEuMDgxLTkuNzY4LTUuMjE5YTcuODM1IDcuODM1IDAgMDE1LjIyMS05Ljc3MWMyOS41ODEtOC45OCA3OC43NTYtNy4yNDUgMTA5LjgzIDExLjIwMmE3LjgyMyA3LjgyMyAwIDAxMi43NCAxMC43MzNjLTIuMiAzLjcyMi03LjAyIDQuOTQ5LTEwLjczIDIuNzR6Ii8+PC9zdmc+';
        iconPlaceholder.alt = 'Spotify';
        iconPlaceholder.className = 'spotify-icon';
        
        const icons = document.querySelectorAll('.spotify-icon');
        icons.forEach(icon => {
            icon.src = iconPlaceholder.src;
        });
    }
    
    // Initialize the page
    function init() {
        createSpotifyIcon();
    }
    
    // Run initialization
    init();
});