# Experiment 12: Cloud-Ready MERN Task Board

A full-stack task board built with MongoDB, Express, React, and Node.js. The Express server provides a CRUD API, serves the built React app, and connects to MongoDB. The single-service layout is suitable for AWS Elastic Beanstalk with MongoDB Atlas.

## Run locally

1. Install Node.js 18 or newer.
2. From this folder, run `npm install`, then run `npm --prefix client install`.
3. Copy `.env.example` to `.env` and set `MONGODB_URI` to a local MongoDB or Atlas connection string.
4. Open two terminals in this folder. Run `npm run dev:server` in one and `npm run dev:client` in the other.
5. Open `http://localhost:5173`.

## Deploy to AWS Elastic Beanstalk

1. Create a MongoDB Atlas database and allow your Elastic Beanstalk environment to connect to it.
2. Set `MONGODB_URI`, `NODE_ENV=production`, and (if needed) `PORT` as Elastic Beanstalk environment properties. Keep credentials out of the source tree.
3. Run `npm run build` in this folder to create `client/dist`.
4. Build an application bundle containing the root `package.json`, `server` directory, and `client/dist` directory. Do not include `.env` or `node_modules`.
5. Create a Node.js Elastic Beanstalk environment, upload the bundle, and verify the site and `/api/tasks` endpoint.

The cloud deployment requires your own AWS and MongoDB Atlas accounts. The default MongoDB URL in `.env.example` is for local development only.
