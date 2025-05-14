// spotify-api.js
// Spotify API Integration Module
// Day 3: Implementation of Spotify API for song search and playlist creation

class SpotifyAPI {
    constructor() {
        // Spotify API credentials - to be configured from environment variables
        this.clientId = 'YOUR_SPOTIFY_CLIENT_ID';
        this.redirectUri = window.location.origin;
        
        // Spotify API endpoints
        this.authEndpoint = 'https://accounts.spotify.com/authorize';
        this.apiBaseUrl = 'https://api.spotify.com/v1';
        
        // Required Spotify API scopes for playlist management
        this.scopes = [
            'playlist-read-private',
            'playlist-modify-private',
            'playlist-modify-public',
            'user-read-private'
        ];
        
        // Authentication state
        this.accessToken = this.getTokenFromUrl() || localStorage.getItem('spotify_access_token');
        this.tokenExpiry = localStorage.getItem('spotify_token_expiry') || 0;
        
        // Initialize - check if returning from auth
        this.init();
    }
    
    // Initialize the API connection
    init() {
        // Clear the URL parameters if we just got redirected with a token
        if (this.getTokenFromUrl()) {
            // Remove the access token from the URL
            window.history.replaceState({}, document.title, '/');
        }
        
        // Check if token is expired
        if (this.isTokenExpired()) {
            this.accessToken = null;
            localStorage.removeItem('spotify_access_token');
        }
    }
    
    // Check if the user is logged in with Spotify
    isLoggedIn() {
        return !!this.accessToken && !this.isTokenExpired();
    }
    
    // Check if token is expired
    isTokenExpired() {
        return Date.now() > this.tokenExpiry;
    }
    
    // Extract token from URL after redirect
    getTokenFromUrl() {
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        if (hashParams.has('access_token')) {
            // Store the token and set expiry (3600 seconds is standard Spotify expiry)
            const token = hashParams.get('access_token');
            const expiresIn = hashParams.get('expires_in') || 3600;
            
            localStorage.setItem('spotify_access_token', token);
            localStorage.setItem('spotify_token_expiry', Date.now() + (expiresIn * 1000));
            
            return token;
        }
        return null;
    }
    
    // Initiate Spotify login process
    login() {
        const authUrl = new URL(this.authEndpoint);
        
        // Set up auth parameters
        authUrl.searchParams.append('client_id', this.clientId);
        authUrl.searchParams.append('redirect_uri', this.redirectUri);
        authUrl.searchParams.append('scope', this.scopes.join(' '));
        authUrl.searchParams.append('response_type', 'token');
        
        // Add a random string for state verification (security measure)
        const state = this.generateRandomString(16);
        localStorage.setItem('spotify_auth_state', state);
        authUrl.searchParams.append('state', state);
        
        // Redirect to Spotify auth
        window.location.href = authUrl.toString();
    }
    
    // Logout from Spotify
    logout() {
        this.accessToken = null;
        localStorage.removeItem('spotify_access_token');
        localStorage.removeItem('spotify_token_expiry');
    }
    
    // Generate random string for auth state
    generateRandomString(length) {
        const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        let text = '';
        
        for (let i = 0; i < length; i++) {
            text += possible.charAt(Math.floor(Math.random() * possible.length));
        }
        
        return text;
    }
    
    // Make authenticated API requests to Spotify
    async apiRequest(endpoint, method = 'GET', body = null) {
        if (!this.accessToken || this.isTokenExpired()) {
            throw new Error('Spotify access token is missing or expired. Please log in.');
        }
        
        const url = endpoint.startsWith('http') ? endpoint : `${this.apiBaseUrl}${endpoint}`;
        
        const options = {
            method,
            headers: {
                'Authorization': `Bearer ${this.accessToken}`,
                'Content-Type': 'application/json'
            }
        };
        
        if (body && (method === 'POST' || method === 'PUT')) {
            options.body = JSON.stringify(body);
        }
        
        try {
            const response = await fetch(url, options);
            
            // Handle rate limiting
            if (response.status === 429) {
                const retryAfter = response.headers.get('Retry-After') || 3;
                console.warn(`Rate limited by Spotify. Retry after ${retryAfter} seconds.`);
                // Could implement retry logic here
                throw new Error('Spotify API rate limit exceeded. Please try again later.');
            }
            
            // Handle unauthorized (token expired mid-session)
            if (response.status === 401) {
                this.logout(); // Clear invalid token
                throw new Error('Spotify session expired. Please log in again.');
            }
            
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(`Spotify API error: ${errorData.error?.message || response.statusText}`);
            }
            
            if (response.status === 204) {
                return { success: true }; // No content responses
            }
            
            return await response.json();
            
        } catch (error) {
            console.error('Spotify API request failed:', error);
            throw error;
        }
    }
    
    // Get current user profile
    async getUserProfile() {
        return await this.apiRequest('/me');
    }
    
    // Search for tracks on Spotify
    async searchTracks(query, limit = 10) {
        const endpoint = `/search?q=${encodeURIComponent(query)}&type=track&limit=${limit}`;
        const result = await this.apiRequest(endpoint);
        return result.tracks.items;
    }
    
    // Create a new playlist
    async createPlaylist(name, description = '') {
        // First, get user ID
        const user = await this.getUserProfile();
        
        // Create the playlist
        return await this.apiRequest(`/users/${user.id}/playlists`, 'POST', {
            name,
            description,
            public: false // Create private playlists by default
        });
    }
    
    // Add tracks to a playlist
    async addTracksToPlaylist(playlistId, trackUris) {
        return await this.apiRequest(`/playlists/${playlistId}/tracks`, 'POST', {
            uris: trackUris
        });
    }
    
    // Create a playlist from songs (combining multiple operations)
    async createPlaylistFromSongs(playlistName, description, songNames) {
        try {
            // Step 1: Create empty playlist
            const playlist = await this.createPlaylist(
                playlistName, 
                description
            );
            
            // Step 2: Search for each song and collect track URIs
            const trackPromises = songNames.map(async (songName) => {
                const searchResults = await this.searchTracks(songName, 1);
                return searchResults.length > 0 ? searchResults[0].uri : null;
            });
            
            const trackUris = (await Promise.all(trackPromises)).filter(uri => uri !== null);
            
            // Step 3: Add tracks to playlist (if any found)
            if (trackUris.length > 0) {
                await this.addTracksToPlaylist(playlist.id, trackUris);
            }
            
            // Return the created playlist with summary info
            return {
                playlistId: playlist.id,
                playlistUrl: playlist.external_urls.spotify,
                tracksFound: trackUris.length,
                totalTracks: songNames.length
            };
            
        } catch (error) {
            console.error('Error creating Spotify playlist:', error);
            throw error;
        }
    }
}

export default SpotifyAPI;