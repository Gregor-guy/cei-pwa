CEI Pro v2 - News & Intelligence Feed Module (Safe Upload Filenames)

These filenames are intentionally unique so you can upload them to your existing GitHub repo without overwriting your current Home Dashboard files.

Files included:
- news-feed.html
- news-feed.css
- news-feed.js
- news-feed-manifest.json
- news-feed-sw.js
- news-feed-icon-192.svg
- news-feed-icon-512.svg
- NEWS-FEED-README.txt

How to upload to GitHub:
1. Unzip this package.
2. Open your GitHub repo: cei-pwa.
3. Click Add file > Upload files.
4. Drag these files into the repo.
5. Commit changes.
6. Netlify will redeploy automatically.

After deployment:
- Your Home Dashboard remains at / or /index.html
- Your News Feed opens at /news-feed.html

Example:
https://bejewelled-fox-0fe6a6.netlify.app/news-feed.html

Features included:
- Signal Inbox summary
- Add News Signal form
- Bullish / Neutral / Bearish / Noise classification
- High / Medium / Low priority
- Confidence level
- Chilliwack relevance score, 1 to 5 stars
- Source and optional URL tracking
- Save to Top Signals
- Save to Leadership Talking Points
- Save to Prediction
- Save to Brief
- Weekly Signal Digest generator
- Saved Signals section
- Leadership Items section
- JSON export/import backup
- PWA manifest and offline service worker

Integration note:
This module writes saved Top Signals and Talking Points to localStorage key: cei.home.dashboard.v2. That lets the Home Dashboard pick up saved signals if both modules are on the same Netlify site.
