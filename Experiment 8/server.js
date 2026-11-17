const express = require("express");
const { randomUUID } = require("node:crypto");
const path = require("node:path");

const app = express();
const port = process.env.PORT || 3008;
const books = [
    { id: randomUUID(), title: "The Hobbit", author: "J. R. R. Tolkien", year: 1937 },
    { id: randomUUID(), title: "Kindred", author: "Octavia E. Butler", year: 1979 }
];

app.use(express.json({ limit: "20kb" }));
app.use(express.static(path.join(__dirname, "public")));

function validateBook(body) {
    if (!body || typeof body !== "object" || Array.isArray(body)) {
        return { error: "Request body must be a JSON object." };
    }
    const title = typeof body.title === "string" ? body.title.trim() : "";
    const author = typeof body.author === "string" ? body.author.trim() : "";
    const year = body.year === "" || body.year === undefined ? null : Number(body.year);

    if (!title || !author) {
        return { error: "Title and author are required." };
    }
    if (year !== null && (!Number.isInteger(year) || year < 1 || year > new Date().getFullYear())) {
        return { error: "Year must be a valid four-digit year." };
    }

    return { book: { title, author, year } };
}

app.get("/api/books", (request, response) => {
    response.json(books);
});

app.get("/api/books/:id", (request, response) => {
    const book = books.find((item) => item.id === request.params.id);
    if (!book) {
        return response.status(404).json({ error: "Book not found." });
    }
    return response.json(book);
});

app.post("/api/books", (request, response) => {
    const result = validateBook(request.body);
    if (result.error) {
        return response.status(400).json({ error: result.error });
    }

    const book = { id: randomUUID(), ...result.book };
    books.push(book);
    return response.status(201).json(book);
});

app.put("/api/books/:id", (request, response) => {
    const index = books.findIndex((item) => item.id === request.params.id);
    if (index === -1) {
        return response.status(404).json({ error: "Book not found." });
    }

    const result = validateBook(request.body);
    if (result.error) {
        return response.status(400).json({ error: result.error });
    }

    books[index] = { id: books[index].id, ...result.book };
    return response.json(books[index]);
});

app.delete("/api/books/:id", (request, response) => {
    const index = books.findIndex((item) => item.id === request.params.id);
    if (index === -1) {
        return response.status(404).json({ error: "Book not found." });
    }

    books.splice(index, 1);
    return response.status(204).end();
});

app.use((error, request, response, next) => {
    if (error instanceof SyntaxError && error.status === 400 && "body" in error) {
        return response.status(400).json({ error: "Request body must be valid JSON." });
    }
    console.error(error);
    return response.status(500).json({ error: "An unexpected server error occurred." });
});

app.listen(port, () => {
    console.log(`Experiment 8 is available at http://localhost:${port}`);
});
