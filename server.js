/**
 * LinkedIn Profile Scraper API Server
 * Replaces Apify in n8n workflows
 */

const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const { scrapeProfile } = require('./scraper/scraper');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Request logging middleware
app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
    next();
});

/**
 * Health check endpoint
 */
app.get('/', (req, res) => {
    res.json({
        status: 'ok',
        service: 'LinkedIn Profile Scraper',
        version: '1.0.0',
        endpoints: {
            scrape: 'POST /scrape'
        }
    });
});

/**
 * Main scraping endpoint
 * POST /scrape
 * 
 * Request body:
 * {
 *   "profiles": [
 *     {
 *       "profileName": "Mahmoud Adi",
 *       "profileUrl": "https://www.linkedin.com/in/m-adi/"
 *     }
 *   ]
 * }
 * 
 * Response: Array of post objects matching Apify schema
 */
app.post('/scrape', async (req, res) => {
    const startTime = Date.now();

    try {
        // Validate request body
        if (!req.body || !req.body.profiles || !Array.isArray(req.body.profiles)) {
            return res.status(400).json({
                error: 'Invalid request body',
                message: 'Request must include a "profiles" array',
                example: {
                    profiles: [
                        {
                            profileName: 'John Doe',
                            profileUrl: 'https://www.linkedin.com/in/johndoe/'
                        }
                    ]
                }
            });
        }

        const { profiles } = req.body;

        if (profiles.length === 0) {
            return res.status(400).json({
                error: 'Empty profiles array',
                message: 'At least one profile must be provided'
            });
        }

        console.log(`\n${'='.repeat(60)}`);
        console.log(`Starting scrape job for ${profiles.length} profile(s)`);
        console.log(`${'='.repeat(60)}\n`);

        // Array to collect all results
        const allResults = [];
        const errors = [];

        // Process each profile with timeout
        const PROFILE_TIMEOUT = 45000; // 45 seconds per profile

        for (let i = 0; i < profiles.length; i++) {
            const profile = profiles[i];

            // Validate profile object
            if (!profile.profileName || !profile.profileUrl) {
                console.error(`✗ Invalid profile at index ${i}:`, profile);
                errors.push({
                    profile: profile,
                    error: 'Missing profileName or profileUrl'
                });
                continue;
            }

            try {
                console.log(`\n[${i + 1}/${profiles.length}] Processing: ${profile.profileName}`);

                // Scrape with timeout
                const profileResults = await Promise.race([
                    scrapeProfile(profile.profileName, profile.profileUrl, 3),
                    new Promise((_, reject) =>
                        setTimeout(() => reject(new Error('Profile timeout')), PROFILE_TIMEOUT)
                    )
                ]);

                // Add results to collection
                allResults.push(...profileResults);

                console.log(`✓ Completed: ${profile.profileName} (${profileResults.length} posts)`);

            } catch (error) {
                console.error(`✗ Failed: ${profile.profileName} - ${error.message}`);
                errors.push({
                    profile: profile,
                    error: error.message
                });
            }

            // Add delay between profiles to avoid rate limiting
            if (i < profiles.length - 1) {
                const delay = 2000; // 2 seconds between profiles
                console.log(`  Waiting ${delay / 1000}s before next profile...`);
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }

        const duration = ((Date.now() - startTime) / 1000).toFixed(2);

        console.log(`\n${'='.repeat(60)}`);
        console.log(`Scrape job completed in ${duration}s`);
        console.log(`Total posts extracted: ${allResults.length}`);
        console.log(`Profiles processed: ${profiles.length - errors.length}/${profiles.length}`);
        if (errors.length > 0) {
            console.log(`Errors: ${errors.length}`);
        }
        console.log(`${'='.repeat(60)}\n`);

        // Return results in Apify format
        res.json(allResults);

    } catch (error) {
        console.error('\n✗ Server error:', error);

        res.status(500).json({
            error: 'Internal server error',
            message: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

/**
 * 404 handler
 */
app.use((req, res) => {
    res.status(404).json({
        error: 'Not found',
        message: `Endpoint ${req.method} ${req.path} does not exist`,
        availableEndpoints: {
            health: 'GET /',
            scrape: 'POST /scrape'
        }
    });
});

/**
 * Global error handler
 */
app.use((error, req, res, next) => {
    console.error('Unhandled error:', error);
    res.status(500).json({
        error: 'Internal server error',
        message: error.message
    });
});

/**
 * Start server
 */
app.listen(PORT, () => {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`🚀 LinkedIn Profile Scraper API`);
    console.log(`${'='.repeat(60)}`);
    console.log(`Server running on port ${PORT}`);
    console.log(`Health check: http://localhost:${PORT}/`);
    console.log(`Scrape endpoint: POST http://localhost:${PORT}/scrape`);
    console.log(`${'='.repeat(60)}\n`);
});

// Global request timeout (120 seconds)
app.use((req, res, next) => {
    req.setTimeout(120000);
    res.setTimeout(120000);
    next();
});
