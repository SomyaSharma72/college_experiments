# Experiment 9: User Authentication

A Node.js and Express web app using MongoDB, bcrypt password hashing, and JWT sessions. The JWT is held in an HTTP-only, same-site cookie; session IDs are stored in MongoDB so logout revokes the active token.

## Run locally

1. Install Node.js and MongoDB (or use a MongoDB Atlas connection string).
2. Run `npm install` in this folder.
3. Copy `.env.example` to `.env`; set a private random `JWT_SECRET` of at least 32 characters and configure `MONGODB_URI`.
4. Run `npm start` and open `http://localhost:3009`.

Never commit `.env` or use the example secret in a deployed application. In production, set `NODE_ENV=production` and serve the app over HTTPS.
