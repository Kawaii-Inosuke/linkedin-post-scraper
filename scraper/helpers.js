/**
 * Helper functions for LinkedIn post data extraction and transformation
 */

/**
 * Parse LinkedIn relative time strings to ISO date format
 * Examples: "2h", "3d", "1w", "2mo", "1y"
 * @param {string} relativeTime - LinkedIn's relative time string
 * @returns {string} ISO date string
 */
function parseLinkedInDate(relativeTime) {
  const now = new Date();
  
  if (!relativeTime) {
    return now.toISOString();
  }

  // Remove whitespace and convert to lowercase
  const timeStr = relativeTime.trim().toLowerCase();
  
  // Extract number and unit
  const match = timeStr.match(/(\d+)\s*(h|m|d|w|mo|y|hour|minute|day|week|month|year)/);
  
  if (!match) {
    // If we can't parse it, return current time
    return now.toISOString();
  }
  
  const value = parseInt(match[1]);
  const unit = match[2];
  
  // Calculate the date based on the unit
  switch (unit) {
    case 'h':
    case 'hour':
      now.setHours(now.getHours() - value);
      break;
    case 'm':
    case 'minute':
      now.setMinutes(now.getMinutes() - value);
      break;
    case 'd':
    case 'day':
      now.setDate(now.getDate() - value);
      break;
    case 'w':
    case 'week':
      now.setDate(now.getDate() - (value * 7));
      break;
    case 'mo':
    case 'month':
      now.setMonth(now.getMonth() - value);
      break;
    case 'y':
    case 'year':
      now.setFullYear(now.getFullYear() - value);
      break;
  }
  
  return now.toISOString();
}

/**
 * Convert ISO date string to formatted date string matching Apify format
 * @param {string} isoDate - ISO date string
 * @returns {string} Formatted date string (YYYY-MM-DD HH:mm:ss)
 */
function formatDateForApify(isoDate) {
  const date = new Date(isoDate);
  
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');
  
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

/**
 * Convert date to Unix timestamp in milliseconds
 * @param {string} isoDate - ISO date string
 * @returns {number} Unix timestamp in milliseconds
 */
function dateToTimestamp(isoDate) {
  return new Date(isoDate).getTime();
}

/**
 * Detect post type based on post content and structure
 * @param {object} postElement - Playwright element handle
 * @returns {Promise<string>} Post type: 'regular', 'repost', 'article', 'video', 'image'
 */
async function detectPostType(postElement) {
  try {
    // Check for repost indicators
    const repostIndicator = await postElement.$('[class*="update-components-actor__description"]');
    if (repostIndicator) {
      const text = await repostIndicator.textContent();
      if (text && text.toLowerCase().includes('reposted')) {
        return 'repost';
      }
    }
    
    // Check for article
    const articleIndicator = await postElement.$('[class*="article"]');
    if (articleIndicator) {
      return 'article';
    }
    
    // Check for video
    const videoIndicator = await postElement.$('video');
    if (videoIndicator) {
      return 'video';
    }
    
    // Check for image
    const imageIndicator = await postElement.$('[class*="update-components-image"]');
    if (imageIndicator) {
      return 'image';
    }
    
    return 'regular';
  } catch (error) {
    return 'regular';
  }
}

/**
 * Clean and extract post text content
 * @param {string} rawText - Raw text content from post
 * @returns {string} Cleaned post text
 */
function cleanPostText(rawText) {
  if (!rawText) return '';
  
  // Remove excessive whitespace
  let cleaned = rawText.replace(/\s+/g, ' ').trim();
  
  // Remove "see more" and similar UI text
  cleaned = cleaned.replace(/\.\.\.\s*see more/gi, '');
  cleaned = cleaned.replace(/see translation/gi, '');
  
  return cleaned;
}

/**
 * Extract post URL from various LinkedIn URL formats
 * @param {string} url - Raw URL from post
 * @returns {string} Cleaned post URL
 */
function cleanPostUrl(url) {
  if (!url) return '';
  
  // Remove tracking parameters
  try {
    const urlObj = new URL(url);
    // Keep only the pathname and host
    return `${urlObj.protocol}//${urlObj.host}${urlObj.pathname}`;
  } catch (error) {
    return url;
  }
}

module.exports = {
  parseLinkedInDate,
  formatDateForApify,
  dateToTimestamp,
  detectPostType,
  cleanPostText,
  cleanPostUrl
};
