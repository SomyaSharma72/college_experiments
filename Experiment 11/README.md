# Experiment 11: Website Performance

This standalone static page demonstrates three optimization techniques without changing any of the earlier experiments:

- The page loads minified `style.min.css` and `app.min.js`; their readable source files are included alongside them.
- `netlify.toml` sets revalidation for HTML and one-day caching for the minified assets and images.
- Below-the-fold images use native `loading="lazy"` and `decoding="async"`.

Open `index.html` directly for a local preview, or deploy this folder to Netlify to test the cache headers.
