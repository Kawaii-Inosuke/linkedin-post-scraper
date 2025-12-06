# LinkedIn Profile Scraper

A production-ready Node.js service that scrapes LinkedIn profile posts using Playwright. Designed to replace Apify in n8n workflows with exact API compatibility.

## Features

✅ **Public Scraping** - No LinkedIn login required  
✅ **Playwright Browser** - Real Chromium browser for reliable scraping  
✅ **Anti-Bot Headers** - User-agent and headers to avoid detection  
✅ **Retry Logic** - 3 automatic retries per profile with exponential backoff  
✅ **Rate Limiting** - Built-in delays between profiles  
✅ **Apify Compatible** - Exact JSON schema match for n8n workflows  
✅ **Railway Ready** - Dockerfile optimized for Railway deployment  

## Tech Stack

- **Node.js** (v18 LTS)
- **Express** - HTTP API server
- **Playwright** - Chromium browser automation
- **CORS** - Cross-origin support
- **Body Parser** - JSON request handling

## Installation

### Local Setup

1. **Clone or download this repository**

```bash
cd scrapper
```

2. **Install dependencies**

```bash
npm install
```

3. **Install Playwright browsers**

```bash
npx playwright install chromium
```

## Running Locally

Start the server:

```bash
npm start
```

The server will start on `http://localhost:3000`

You should see:

```
🚀 LinkedIn Profile Scraper API
Server running on port 3000
Health check: http://localhost:3000/
Scrape endpoint: POST http://localhost:3000/scrape
```

## API Usage

### Health Check

```bash
curl http://localhost:3000/
```

**Response:**
```json
{
  "status": "ok",
  "service": "LinkedIn Profile Scraper",
  "version": "1.0.0",
  "endpoints": {
    "scrape": "POST /scrape"
  }
}
```

### Scrape Profiles

**Endpoint:** `POST /scrape`

**Request Body:**
```json
{
  "profiles": [
    {
      "profileName": "Mahmoud Adi",
      "profileUrl": "https://www.linkedin.com/in/m-adi/"
    }
  ]
}
```

**Example cURL:**
```bash
curl -X POST http://localhost:3000/scrape \
  -H "Content-Type: application/json" \
  -d '{
    "profiles": [
      {
        "profileName": "Mahmoud Adi",
        "profileUrl": "https://www.linkedin.com/in/m-adi/"
      }
    ]
  }'
```

**Response Format (Apify Compatible):**
```json
[
  {
    "profileName": "Mahmoud Adi",
    "profileUrl": "https://www.linkedin.com/in/m-adi/",
    "postUrl": "https://www.linkedin.com/posts/m-adi_...",
    "postText": "Post content here...",
    "postDate": "2025-02-12 17:21:40",
    "postTimestamp": 1764925009110,
    "postType": "regular"
  }
]
```

### Response Fields

| Field | Type | Description |
|-------|------|-------------|
| `profileName` | string | Name of the profile owner |
| `profileUrl` | string | LinkedIn profile URL |
| `postUrl` | string | Direct link to the post |
| `postText` | string | Text content of the post |
| `postDate` | string | Formatted date (YYYY-MM-DD HH:mm:ss) |
| `postTimestamp` | number | Unix timestamp in milliseconds |
| `postType` | string | Type: `regular`, `repost`, `article`, `video`, `image` |

## Deployment on Railway

### Method 1: Railway CLI

1. **Install Railway CLI**

```bash
npm install -g @railway/cli
```

2. **Login to Railway**

```bash
railway login
```

3. **Initialize project**

```bash
railway init
```

4. **Deploy**

```bash
railway up
```

5. **Get your deployment URL**

```bash
railway domain
```

### Method 2: GitHub Integration

1. Push this code to a GitHub repository
2. Go to [Railway](https://railway.app)
3. Click "New Project"
4. Select "Deploy from GitHub repo"
5. Choose your repository
6. Railway will automatically detect the Dockerfile and deploy

### Method 3: Railway Dashboard

1. Go to [Railway](https://railway.app)
2. Click "New Project" → "Empty Project"
3. Click "Deploy from GitHub repo" or upload files directly
4. Railway will build using the Dockerfile

### Environment Variables (Optional)

You can set these in Railway dashboard:

- `PORT` - Server port (default: 3000, Railway sets this automatically)

## Configuration

### Timeouts

- **Per Profile:** 45 seconds
- **Global Request:** 120 seconds
- **Retry Attempts:** 3 per profile
- **Delay Between Profiles:** 2 seconds

### Scraping Limits

- **Posts per Profile:** 3 latest posts
- **Scroll Depth:** 5 scrolls maximum
- **Page Load Timeout:** 30 seconds

## Project Structure

```
/scrapper
  ├── package.json          # Dependencies and scripts
  ├── server.js             # Express API server
  ├── scraper/
  │   ├── scrapeProfile.js  # Main scraping logic
  │   └── helpers.js        # Utility functions
  ├── Dockerfile            # Railway deployment config
  └── README.md             # This file
```

## Troubleshooting

### Issue: "Browser not found"

**Solution:** Install Playwright browsers:
```bash
npx playwright install chromium
```

### Issue: "Timeout errors"

**Possible causes:**
- LinkedIn is blocking requests
- Profile has no posts
- Network is slow

**Solutions:**
- Increase timeout values in `server.js`
- Add delays between requests
- Check if profile URL is correct and public

### Issue: "No posts found"

**Possible causes:**
- Profile is private
- LinkedIn changed their HTML structure
- Posts are behind login wall

**Solutions:**
- Ensure profile is public
- Check if profile URL is correct
- Update selectors in `scrapeProfile.js` if LinkedIn changed their DOM

### Issue: Railway deployment fails

**Solution:** Ensure Dockerfile includes all Playwright dependencies:
```dockerfile
RUN npx playwright install chromium
RUN npx playwright install-deps chromium
```

## Notes

- **No Login Required:** This scraper works with public profiles only
- **Rate Limiting:** LinkedIn may block excessive requests. Use delays between profiles.
- **Selectors:** LinkedIn frequently changes their HTML structure. Selectors may need updates.
- **CAPTCHA:** If LinkedIn shows CAPTCHA, requests will fail. Consider using proxies or reducing request frequency.

## n8n Integration

In your n8n workflow:

1. Replace Apify node with **HTTP Request** node
2. Set method to `POST`
3. Set URL to your Railway deployment URL + `/scrape`
4. Set body to:
```json
{
  "profiles": {{ $json.profiles }}
}
```
5. The response will be in the exact same format as Apify

## License

MIT

## Support

For issues or questions, please check:
- LinkedIn profile is public
- URL format is correct: `https://www.linkedin.com/in/username/`
- Server logs for detailed error messages
