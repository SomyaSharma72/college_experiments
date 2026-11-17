# Experiment 8: Book Collection REST API

A Node.js and Express CRUD API with a small browser interface. The API supports listing, reading, creating, updating, and deleting books. Data is held in memory and resets when the server restarts.

## Run locally

1. Install Node.js.
2. In this folder, run `npm install`.
3. Run `npm start` and open `http://localhost:3008`.

## API

| Method | Route | Action |
|---|---|---|
| GET | `/api/books` | List books |
| GET | `/api/books/:id` | Read one book |
| POST | `/api/books` | Add a book |
| PUT | `/api/books/:id` | Replace a book |
| DELETE | `/api/books/:id` | Delete a book |

Create and update requests accept JSON with `title`, `author`, and an optional `year`.
