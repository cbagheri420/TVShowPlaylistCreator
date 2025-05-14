// TV Show Playlist Generator - Main Application JavaScript
import PlaylistGenerator from './playlist-generator.js';
import SpotifyAPI from './spotify-api.js';

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
    const loginBtn = document.getElementById('spotify-login-btn');
    const userProfileElement = document.getElementById('user-profile');
    
    // Store the current generated playlist
    let currentPlaylist = null;
    
    // Initialize API clients
    // Note: For front-end use, we're initializing PlaylistGenerator without API key
    // as it will be handled through environment variables on the server side
    const playlistGenerator = new PlaylistGenerator();
    const spotifyApi = new SpotifyAPI();
    
    // Add event listeners
    generateBtn.addEventListener('click', handleGeneratePlaylist);
    showInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            handleGeneratePlaylist();
        }
    });
    
    // Add Spotify login/logout button event listener
    loginBtn.addEventListener('click', handleSpotifyAuth);
    
    // Add Spotify save playlist button event listener
    spotifyBtn.addEventListener('click', handleSaveToSpotify);
    
    // Handle Spotify authentication
    function handleSpotifyAuth() {
        if (spotifyApi.isLoggedIn()) {
            spotifyApi.logout();
            updateSpotifyLoginState(false);
        } else {
            spotifyApi.login();
        }
    }
    
    // Handle saving playlist to Spotify
    async function handleSaveToSpotify() {
        if (!currentPlaylist || !currentPlaylist.playlist || currentPlaylist.playlist.length === 0) {
            showError('Please generate a playlist first before saving to Spotify.');
            return;
        }
        
        if (!spotifyApi.isLoggedIn()) {
            showError('Please log in to Spotify first.');
            return;
        }
        
        try {
            // Show loader
            loader.classList.add('visible');
            
            // Extract song names/artists from the current playlist
            const songQueries = currentPlaylist.playlist.map(songString => {
                const [title, artist] = parseSongString(songString);
                return artist ? `${title} ${artist}` : title;
            });
            
            // Create playlist name based on show and mood
            const selectedMood = moodSelect.value;
            const playlistName = `${currentPlaylist.show} ${capitalizeWords(selectedMood)} Playlist`;
            const description = `AI-generated ${selectedMood} playlist inspired by ${currentPlaylist.show}. Created with TV Show Playlist Generator.`;
            
            // Create the playlist on Spotify
            const result = await spotifyApi.createPlaylistFromSongs(
                playlistName,
                description,
                songQueries
            );
            
            // Show success message
            showSuccess(`
                Playlist saved to Spotify! Found ${result.tracksFound} out of ${result.totalTracks} songs.
                <br><a href="${result.playlistUrl}" target="_blank" class="spotify-link">
                    Open in Spotify
                </a>
            `);
            
        } catch (error) {
            console.error('Error saving to Spotify:', error);
            showError(`Failed to save playlist to Spotify: ${error.message}`);
        } finally {
            // Hide loader
            loader.classList.remove('visible');
        }
    }
    
    // AI playlist generation
    async function handleGeneratePlaylist() {
        const showTitle = showInput.value.trim();
        const selectedMood = moodSelect.value;
        
        // Validate input
        if (!showTitle) {
            showError('Please enter a TV show name');
            return;
        }
        
        // Hide error message if visible
        hideError();
        
        // Show loader
        results.classList.remove('visible');
        loader.classList.add('visible');
        
        try {
            // Backend API call to generate playlist
            // For front-end demo or API key protection, we might need to proxy this request
            // through a server endpoint instead of calling PlaylistGenerator directly
            const apiEndpoint = '/api/generate-playlist';
            
            // Make request to our backend endpoint
            const response = await fetch(apiEndpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    show: showTitle,
                    mood: selectedMood
                }),
            });
            
            if (!response.ok) {
                throw new Error(`API request failed with status ${response.status}`);
            }
            
            const playlistResult = await response.json();
            
            // Fallback for development - direct client-side generation
            // In production, you'd want to remove this and use only the server endpoint
            /* 
            // Direct playlistGenerator call (remove in production)
            const playlistResult = await playlistGenerator.generatePlaylist(showTitle);
            */
            
            // Update UI with show info
            showName.textContent = playlistResult.show;
            showDescription.textContent = `Generated ${selectedMood} playlist for ${playlistResult.show} (${playlistResult.genre} genre)`;
            
            // Clear previous playlist
            playlist.innerHTML = '';
            
            // Populate playlist with AI-generated songs
            playlistResult.playlist.forEach((songName, index) => {
                const songItem = document.createElement('li');
                songItem.className = 'song-item';
                
                // Parse song and artist
                const [title, artist] = parseSongString(songName);
                
                songItem.innerHTML = `
                    <div class="song-number">${index + 1}</div>
                    <div class="song-info">
                        <div class="song-title">${title}</div>
                        <div class="song-artist">${artist || 'Unknown Artist'}</div>
                        <div class="song-actions">
                            <button class="preview-btn" data-query="${encodeURIComponent(title + ' ' + artist)}">
                                <span class="icon">🔍</span> Find on Spotify
                            </button>
                        </div>
                    </div>
                `;
                playlist.appendChild(songItem);
            });
            
            // Enable Spotify button if logged in
            spotifyBtn.disabled = !spotifyApi.isLoggedIn();
            
            // Add event listeners to preview buttons
            addPreviewButtonListeners();
            
            // Store current playlist
            currentPlaylist = playlistResult;
            
            // Show results
            results.classList.add('visible');
            
        } catch (error) {
            console.error('Playlist Generation Error:', error);
            showError('Failed to generate playlist. Please try again.');
        } finally {
            // Hide loader
            loader.classList.remove('visible');
        }
    }
    
    // Add event listeners to preview buttons
    function addPreviewButtonListeners() {
        const previewButtons = document.querySelectorAll('.preview-btn');
        previewButtons.forEach(button => {
            button.addEventListener('click', async function() {
                const query = decodeURIComponent(this.dataset.query);
                
                if (!spotifyApi.isLoggedIn()) {
                    showError('Please log in to Spotify first to search for songs.');
                    return;
                }
                
                try {
                    this.innerHTML = '<span class="icon">⏳</span> Searching...';
                    const tracks = await spotifyApi.searchTracks(query, 1);
                    
                    if (tracks && tracks.length > 0) {
                        const track = tracks[0];
                        // Create a preview element
                        const previewEl = document.createElement('div');
                        previewEl.className = 'song-preview';
                        previewEl.innerHTML = `
                            <div class="song-preview-header">
                                <img src="${track.album.images[2]?.url || ''}" alt="Album art">
                                <div>
                                    <div class="preview-title">${track.name}</div>
                                    <div class="preview-artist">${track.artists[0].name}</div>
                                </div>
                            </div>
                            <audio controls src="${track.preview_url || ''}"></audio>
                            <a href="${track.external_urls.spotify}" target="_blank" class="preview-link">
                                Open in Spotify
                            </a>
                        `;
                        
                        // Find the parent song item
                        const songItem = this.closest('.song-item');
                        
                        // Check if preview already exists
                        const existingPreview = songItem.querySelector('.song-preview');
                        if (existingPreview) {
                            existingPreview.remove();
                        } else {
                            songItem.appendChild(previewEl);
                        }
                        
                        this.innerHTML = '<span class="icon">✓</span> Found on Spotify';
                    } else {
                        this.innerHTML = '<span class="icon">❌</span> Not found';
                        setTimeout(() => {
                            this.innerHTML = '<span class="icon">🔍</span> Find on Spotify';
                        }, 2000);
                    }
                } catch (error) {
                    console.error('Error searching tracks:', error);
                    this.innerHTML = '<span class="icon">❌</span> Error';
                    setTimeout(() => {
                        this.innerHTML = '<span class="icon">🔍</span> Find on Spotify';
                    }, 2000);
                }
            });
        });
    }
    
    // Helper function to parse song string
    function parseSongString(songString) {
        // Common delimiters for splitting song and artist
        const delimiters = [' - ', ' by ', ' – ', ' -- ', ': '];
        
        for (const delimiter of delimiters) {
            const parts = songString.split(delimiter);
            if (parts.length > 1) {
                return [parts[0].trim(), parts.slice(1).join(delimiter).trim()];
            }
        }
        
        // If no delimiter found, try to detect artist mentions
        const artistPrefixes = [' by ', ' performed by ', ' from '];
        for (const prefix of artistPrefixes) {
            const index = songString.toLowerCase().indexOf(prefix);
            if (index !== -1) {
                return [
                    songString.substring(0, index).trim(),
                    songString.substring(index + prefix.length).trim()
                ];
            }
        }
        
        // If everything fails, return the full string as title
        return [songString, ''];
    }
    
    // Update Spotify login state UI
    async function updateSpotifyLoginState(initial = true) {
        const isLoggedIn = spotifyApi.isLoggedIn();

        // Update login button text
        loginBtn.textContent = isLoggedIn ? 'Logout from Spotify' : 'Login with Spotify';
        loginBtn.classList.toggle('logged-in', isLoggedIn);
        
        // Enable/disable save button
        spotifyBtn.disabled = !isLoggedIn || !currentPlaylist;
        
        // Update user profile information if logged in
        if (isLoggedIn) {
            try {
                // Only fetch profile if this is the initial state update
                // or we don't have profile data yet
                if (initial) {
                    const profile = await spotifyApi.getUserProfile();
                    
                    userProfileElement.innerHTML = `
                        <div class="spotify-profile">
                            <img src="${profile.images?.[0]?.url || ''}" alt="Profile" class="profile-image">
                            <span>
                                ${profile.display_name || 'Spotify User'}
                            </span>
                        </div>
                    `;
                }
                userProfileElement.style.display = 'block';
            } catch (error) {
                console.error('Failed to load user profile:', error);
                userProfileElement.innerHTML = '';
                userProfileElement.style.display = 'none';
            }
        } else {
            userProfileElement.innerHTML = '';
            userProfileElement.style.display = 'none';
        }
    }
    
    // Helper functions for displaying messages
    function showError(message) {
        errorMessage.innerHTML = message;
        errorMessage.classList.add('visible');
        errorMessage.classList.add('error');
        errorMessage.classList.remove('success');
    }
    
    function showSuccess(message) {
        errorMessage.innerHTML = message;
        errorMessage.classList.add('visible');
        errorMessage.classList.add('success');
        errorMessage.classList.remove('error');
    }
    
    function hideError() {
        errorMessage.classList.remove('visible');
    }
    
    // Helper function to capitalize words
    function capitalizeWords(str) {
        return str.replace(/\b\w/g, l => l.toUpperCase());
    }
    
    // Create Spotify icon
    function createSpotifyIcon() {
        const spotifyIconSvg = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAxNjggMTY4Ij48cGF0aCBmaWxsPSIjZmZmIiBkPSJNODMuOTk2LjI3N0MzNy43NDcuMjc3LjI1MyAzNy43Ny4yNTMgODQuMDE5YzAgNDYuMjUxIDM3LjQ5NCA4My43NDEgODMuNzQzIDgzLjc0MSA0Ni4yNTQgMCA4My43NDQtMzcuNDkgODMuNzQ0LTgzLjc0MSAwLTQ2LjI0Ni0zNy40OS04My43MzgtODMuNzQyLTgzLjczOGwuMDAxLS4wMDR6bTM4LjQwNCAxMjAuNzhhNS4yMTcgNS4yMTcgMCAwMS03LjE3NyAxLjczN2MtMTkuNjYxLTEyLjAxLTQ0LjQxNS0xNC43MzQtNzMuNTUtOC4wNzFhNS4yMjIgNS4yMjIgMCAwMS02LjI0OS0zLjkyNSA1LjIxMyA1LjIxMyAwIDAxMy45MjYtNi4yNDljMzEuOS03LjI4OCA1OS4yNjMtNC4xNSA4MS4zMzcgOS4zMzQgMi40NiAxLjUxIDMuMjQgNC43MiAxLjczIDcuMTc0em0xMC4yNS0yMi43OTljLTEuODk0IDMuMDczLTUuOTEyIDQuMDM3LTguOTgxIDIuMTUtMjIuNTA1LTEzLjgzNC01Ni44MjItMTcuODQxLTgzLjQ0Ny05Ljc1OS0zLjQ1MyAxLjA0My03LjEtLjkwMy04LjE0OC00LjM1YTYuNTM4IDYuNTM4IDAgMDE0LjM1NC04LjE0M2MzMC40MTMtOS4yMjggNjguMjIxLTQuNzU4IDk0LjA3MSAxMS4xMjcgMy4wNyAxLjg5IDQuMDQgNS45MTIgMi4xNSA4Ljk3NnYtLjAwMXptLjg4LTIzLjc0NGMtMjYuOTk5LTE2LjAzMS03MS41Mi0xNy41MDUtOTcuMjg5LTkuNjg0LTQuMTM4IDEuMjU1LTguNTE0LTEuMDgxLTkuNzY4LTUuMjE5YTcuODM1IDcuODM1IDAgMDE1LjIyMS05Ljc3MWMyOS41ODEtOC45OCA3OC43NTYtNy4yNDUgMTA5LjgzIDExLjIwMmE3LjgyMyA3LjgyMyAwIDAxMi43NCAxMC43MzNjLTIuMiAzLjcyMi03LjAyIDQuOTQ5LTEwLjczIDIuNzR6Ii8+PC9zdmc+';
        
        const icons = document.querySelectorAll('.spotify-icon');
        icons.forEach(icon => {
            icon.src = spotifyIconSvg;
        });
    }
    
    // Initialize the application
    function init() {
        createSpotifyIcon();
        updateSpotifyLoginState();
        
        // Check if we're returning from Spotify auth
        if (window.location.hash.includes('access_token')) {
            showSuccess('Successfully connected to Spotify!');
            updateSpotifyLoginState();
        }
    }
    
    // Run initialization
    init();
});