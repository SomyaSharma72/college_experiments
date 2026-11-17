# Experiment 10: Static and Dynamic Deployment

This experiment contains two deployable sites and a landing page that links to them.

## Static site → Netlify

Deploy the `static-site` directory as the site/publish directory in Netlify. No build command is required. `netlify.toml` configures cache headers for the HTML and stylesheet.

## Dynamic site → AWS Elastic Beanstalk

1. In `dynamic-site`, run `npm install` and `npm start`; check `http://localhost:3010` and `http://localhost:3010/health`.
2. Create an AWS Elastic Beanstalk Node.js environment.
3. Create an application bundle containing `server.js`, `package.json`, and the generated `package-lock.json`, then upload it to the environment.
4. Confirm the health check at `/health`. Elastic Beanstalk supplies the listening `PORT`.

The deployments themselves require your own Netlify and AWS accounts. Do not commit account credentials to this repository.
