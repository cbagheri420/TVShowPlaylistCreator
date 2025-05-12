// playlist-generator.js
// OpenAI-powered TV Show Playlist Generator
// Updated to use environment variables for API key

import OpenAI from 'openai';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

class PlaylistGenerator {
    constructor() {
        // Validate API key from environment variables
        const apiKey = process.env.OPENAI_API_KEY;
        
        if (!apiKey) {
            throw new Error('OpenAI API key is missing. Please set OPENAI_API_KEY in your .env file.');
        }

        // Initialize OpenAI client with rate limiting considerations
        this.openai = new OpenAI({
            apiKey: apiKey,
            maxRetries: 2 // Prevent excessive API calls on failures
        });

        // Configuration for cost-effective and concise playlist generation
        this.generationConfig = {
            model: 'gpt-3.5-turbo', // Most cost-effective model
            temperature: 0.7, // Balanced creativity
            max_tokens: 150, // Limit token usage
        };

        // Predefined prompt templates for different show genres
        this.promptTemplates = {
            drama: "Create a playlist that captures the emotional depth and narrative tone of {show}. Focus on songs that reflect the show's core themes and character journeys.",
            comedy: "Generate a playlist with upbeat, witty tracks that match the comedic spirit of {show}. Include songs that feel energetic and lighthearted.",
            scifi: "Compile a playlist with futuristic, atmospheric, or electronic tracks that complement the sci-fi world of {show}.",
            fantasy: "Create a mystical and epic playlist that captures the magical essence and adventurous spirit of {show}.",
            thriller: "Develop a tense, atmospheric playlist that mirrors the suspense and psychological complexity of {show}.",
            historical: "Curate a playlist that reflects the historical period and emotional landscape of {show}.",
            default: "Generate a playlist that captures the unique mood and essence of {show}, selecting songs that resonate with its overall tone and themes."
        };
    }

    // Detect show genre based on user input or predefined categories
    _detectGenre(show) {
        const genreKeywords = {
            drama: ['drama', 'emotional', 'serious', 'character study'],
            comedy: ['comedy', 'sitcom', 'humor', 'funny'],
            scifi: ['sci-fi', 'science fiction', 'futuristic', 'space', 'technology'],
            fantasy: ['fantasy', 'magic', 'mythical', 'supernatural'],
            thriller: ['thriller', 'suspense', 'crime', 'mystery'],
            historical: ['historical', 'period', 'era', 'past']
        };

        for (const [genre, keywords] of Object.entries(genreKeywords)) {
            if (keywords.some(keyword => show.toLowerCase().includes(keyword))) {
                return genre;
            }
        }
        return 'default';
    }

    // Generate playlist recommendations
    async generatePlaylist(show) {
        try {
            // Validate input
            if (!show || typeof show !== 'string') {
                throw new Error('Invalid show name provided');
            }

            // Detect appropriate genre template
            const genre = this._detectGenre(show);
            const prompt = this.promptTemplates[genre].replace('{show}', show);

            // Call OpenAI to generate playlist recommendations
            const response = await this.openai.chat.completions.create({
                ...this.generationConfig,
                messages: [
                    {
                        role: 'system', 
                        content: 'You are a music curator specializing in creating thematic playlists inspired by TV shows.'
                    },
                    {
                        role: 'user', 
                        content: prompt
                    }
                ]
            });

            // Extract and parse playlist recommendations
            const playlistSuggestions = response.choices[0].message.content.trim();
            
            return {
                show: show,
                genre: genre,
                playlist: this._parsePlaylistSuggestions(playlistSuggestions)
            };

        } catch (error) {
            console.error('Playlist Generation Error:', error);
            
            // Provide more detailed error handling
            if (error.response) {
                // The request was made and the server responded with a status code
                // that falls out of the range of 2xx
                console.error('OpenAI API Error Details:', {
                    status: error.response.status,
                    data: error.response.data
                });
                
                throw new Error(`OpenAI API Error: ${error.response.data.error.message || 'Unknown error'}`);
            } else if (error.request) {
                // The request was made but no response was received
                throw new Error('No response received from OpenAI API. Check your network connection.');
            } else {
                // Something happened in setting up the request that triggered an Error
                throw new Error(`Playlist generation failed: ${error.message}`);
            }
        }
    }

    // Parse AI-generated playlist into a structured format
    _parsePlaylistSuggestions(suggestions) {
        // Basic parsing to extract song-like recommendations
        const songs = suggestions.split('\n')
            .filter(line => line.trim().length > 0)
            .map(line => {
                // Remove numbering and clean up
                const cleanedLine = line.replace(/^\d+[\).]?\s*/, '').trim();
                return cleanedLine;
            })
            .slice(0, 10); // Limit to 10 songs

        return songs;
    }

    // Estimate token usage and potential cost
    estimateTokenUsage(show) {
        const avgTokensPerRequest = 200; // Approximate based on configuration
        const costPerThousandTokens = 0.002; // GPT-3.5-turbo pricing as of 2024

        return {
            estimatedTokens: avgTokensPerRequest,
            estimatedCost: (avgTokensPerRequest / 1000) * costPerThousandTokens
        };
    }
}

// Export for use in main application
export default PlaylistGenerator;