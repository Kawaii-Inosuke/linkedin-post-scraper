/**
 * LinkedIn Profile Scraper using Playwright
 * Extracts the latest 3 posts from a LinkedIn profile
 */

const { chromium } = require('playwright');
const {
    parseLinkedInDate,
    formatDateForApify,
    dateToTimestamp,
    detectPostType,
    cleanPostText,
    cleanPostUrl
} = require('./helpers');

/**
 * Scrape a single LinkedIn profile for posts
 * @param {string} profileName - Name of the profile owner
 * @param {string} profileUrl - LinkedIn profile URL
 * @param {number} maxRetries - Maximum number of retry attempts
 * @returns {Promise<Array>} Array of post objects
 */
async function scrapeProfile(profileName, profileUrl, maxRetries = 3) {
    let attempt = 0;
    let lastError = null;

    while (attempt < maxRetries) {
        try {
            console.log(`[Attempt ${attempt + 1}/${maxRetries}] Scraping profile: ${profileName}`);

            const posts = await scrapeProfileAttempt(profileName, profileUrl);

            console.log(`✓ Successfully scraped ${posts.length} posts from ${profileName}`);
            return posts;

        } catch (error) {
            lastError = error;
            attempt++;
            console.error(`✗ Attempt ${attempt} failed for ${profileName}:`, error.message);

            if (attempt < maxRetries) {
                // Exponential backoff: wait 2^attempt seconds
                const waitTime = Math.pow(2, attempt) * 1000;
                console.log(`  Retrying in ${waitTime / 1000} seconds...`);
                await new Promise(resolve => setTimeout(resolve, waitTime));
            }
        }
    }

    // All retries failed
    console.error(`✗ All ${maxRetries} attempts failed for ${profileName}`);
    throw new Error(`Failed to scrape ${profileName} after ${maxRetries} attempts: ${lastError.message}`);
}

/**
 * Single attempt to scrape a profile
 * @param {string} profileName - Name of the profile owner
 * @param {string} profileUrl - LinkedIn profile URL
 * @returns {Promise<Array>} Array of post objects
 */
async function scrapeProfileAttempt(profileName, profileUrl) {
    let browser = null;

    try {
        // Launch browser with anti-bot configuration
        browser = await chromium.launch({
            headless: true,
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-accelerated-2d-canvas',
                '--disable-gpu',
                '--window-size=1920x1080'
            ]
        });

        const context = await browser.newContext({
            userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            viewport: { width: 1920, height: 1080 },
            locale: 'en-US',
            timezoneId: 'America/New_York',
            extraHTTPHeaders: {
                'Accept-Language': 'en-US,en;q=0.9',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                'Accept-Encoding': 'gzip, deflate, br',
                'Connection': 'keep-alive',
                'Upgrade-Insecure-Requests': '1'
            }
        });

        const page = await context.newPage();

        // Navigate to profile with extended timeout
        console.log(`  Navigating to: ${profileUrl}`);
        await page.goto(profileUrl, {
            waitUntil: 'networkidle',
            timeout: 30000
        });

        // Wait for posts to load
        await page.waitForTimeout(3000);

        // Scroll to load more posts
        await autoScroll(page);

        // Extract posts
        const posts = await extractPosts(page, profileName, profileUrl);

        await browser.close();

        return posts;

    } catch (error) {
        if (browser) {
            await browser.close();
        }
        throw error;
    }
}

/**
 * Auto-scroll the page to load dynamic content
 * @param {object} page - Playwright page object
 */
async function autoScroll(page) {
    await page.evaluate(async () => {
        await new Promise((resolve) => {
            let totalHeight = 0;
            const distance = 300;
            const maxScrolls = 5;
            let scrolls = 0;

            const timer = setInterval(() => {
                const scrollHeight = document.body.scrollHeight;
                window.scrollBy(0, distance);
                totalHeight += distance;
                scrolls++;

                if (totalHeight >= scrollHeight || scrolls >= maxScrolls) {
                    clearInterval(timer);
                    resolve();
                }
            }, 500);
        });
    });

    // Wait for content to load after scrolling
    await page.waitForTimeout(2000);
}

/**
 * Extract post data from the page
 * @param {object} page - Playwright page object
 * @param {string} profileName - Name of the profile owner
 * @param {string} profileUrl - LinkedIn profile URL
 * @returns {Promise<Array>} Array of post objects
 */
async function extractPosts(page, profileName, profileUrl) {
    const posts = [];

    try {
        // Try multiple selectors for posts (LinkedIn changes these frequently)
        const postSelectors = [
            '.feed-shared-update-v2',
            '[data-id^="urn:li:activity"]',
            '.profile-creator-shared-feed-update__container',
            'div[class*="feed-shared-update"]'
        ];

        let postElements = [];

        for (const selector of postSelectors) {
            postElements = await page.$$(selector);
            if (postElements.length > 0) {
                console.log(`  Found ${postElements.length} posts using selector: ${selector}`);
                break;
            }
        }

        if (postElements.length === 0) {
            console.warn(`  No posts found for ${profileName}`);
            return [];
        }

        // Limit to 3 latest posts
        const postsToProcess = postElements.slice(0, 3);

        for (let i = 0; i < postsToProcess.length; i++) {
            try {
                const postElement = postsToProcess[i];
                const postData = await extractPostData(postElement, profileName, profileUrl);

                if (postData) {
                    posts.push(postData);
                }
            } catch (error) {
                console.error(`  Error extracting post ${i + 1}:`, error.message);
                // Continue with next post
            }
        }

    } catch (error) {
        console.error(`  Error in extractPosts:`, error.message);
    }

    return posts;
}

/**
 * Extract data from a single post element
 * @param {object} postElement - Playwright element handle
 * @param {string} profileName - Name of the profile owner
 * @param {string} profileUrl - LinkedIn profile URL
 * @returns {Promise<object|null>} Post data object or null
 */
async function extractPostData(postElement, profileName, profileUrl) {
    try {
        // Extract post URL
        let postUrl = '';
        const postLinkSelectors = [
            'a[href*="/posts/"]',
            'a[href*="/activity-"]',
            '[data-control-name="public_post_feed-card"] a'
        ];

        for (const selector of postLinkSelectors) {
            const linkElement = await postElement.$(selector);
            if (linkElement) {
                const href = await linkElement.getAttribute('href');
                if (href) {
                    postUrl = href.startsWith('http') ? href : `https://www.linkedin.com${href}`;
                    postUrl = cleanPostUrl(postUrl);
                    break;
                }
            }
        }

        // Extract post text
        let postText = '';
        const textSelectors = [
            '.feed-shared-update-v2__description',
            '[class*="update-components-text"]',
            '.feed-shared-text',
            '[dir="ltr"]'
        ];

        for (const selector of textSelectors) {
            const textElement = await postElement.$(selector);
            if (textElement) {
                const text = await textElement.textContent();
                if (text && text.trim()) {
                    postText = cleanPostText(text);
                    break;
                }
            }
        }

        // Extract post date
        let postDate = '';
        let relativeTime = '';
        const dateSelectors = [
            '.feed-shared-actor__sub-description',
            '[class*="update-components-actor__sub-description"]',
            'time',
            '.feed-shared-text--meta'
        ];

        for (const selector of dateSelectors) {
            const dateElement = await postElement.$(selector);
            if (dateElement) {
                const text = await dateElement.textContent();
                if (text) {
                    relativeTime = text.trim();
                    break;
                }
            }
        }

        // Parse date
        const isoDate = parseLinkedInDate(relativeTime);
        postDate = formatDateForApify(isoDate);
        const postTimestamp = dateToTimestamp(isoDate);

        // Detect post type
        const postType = await detectPostType(postElement);

        // Only return post if we have at least a URL or text
        if (!postUrl && !postText) {
            return null;
        }

        return {
            profileName,
            profileUrl,
            postUrl: postUrl || '',
            postText: postText || '',
            postDate,
            postTimestamp,
            postType
        };

    } catch (error) {
        console.error(`  Error extracting post data:`, error.message);
        return null;
    }
}

module.exports = {
    scrapeProfile
};
