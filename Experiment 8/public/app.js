const form = document.querySelector("#book-form");
const list = document.querySelector("#book-list");
const message = document.querySelector("#message");
const idInput = document.querySelector("#book-id");
const saveButton = document.querySelector("#save-button");
const cancelButton = document.querySelector("#cancel-button");
form.elements.year.max = new Date().getFullYear();

function showMessage(text, isError = false) {
    message.textContent = text;
    message.classList.toggle("error", isError);
}

async function request(path, options = {}) {
    const response = await fetch(path, {
        ...options,
        headers: { "Content-Type": "application/json", ...options.headers }
    });
    if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error || "The request could not be completed.");
    }
    return response.status === 204 ? null : response.json();
}

function renderBooks(books) {
    list.replaceChildren();
    document.querySelector("#book-count").textContent = `${books.length} ${books.length === 1 ? "book" : "books"}`;

    if (!books.length) {
        const empty = document.createElement("li");
        empty.className = "empty-state";
        empty.textContent = "No books yet. Add one above to get started.";
        list.append(empty);
        return;
    }

    for (const book of books) {
        const item = document.createElement("li");
        item.className = "book-card";
        const details = document.createElement("div");
        const title = document.createElement("h3");
        const author = document.createElement("p");
        const actions = document.createElement("div");
        const edit = document.createElement("button");
        const remove = document.createElement("button");

        title.textContent = book.title;
        author.textContent = `${book.author}${book.year ? ` · ${book.year}` : ""}`;
        edit.type = "button";
        edit.className = "secondary";
        edit.textContent = "Edit";
        edit.dataset.action = "edit";
        edit.dataset.id = book.id;
        remove.type = "button";
        remove.className = "danger";
        remove.textContent = "Delete";
        remove.dataset.action = "delete";
        remove.dataset.id = book.id;
        details.append(title, author);
        actions.append(edit, remove);
        item.append(details, actions);
        list.append(item);
    }
}

async function loadBooks() {
    try {
        const books = await request("/api/books");
        renderBooks(books);
    } catch (error) {
        showMessage(error.message, true);
    }
}

function resetForm() {
    form.reset();
    idInput.value = "";
    saveButton.textContent = "Add book";
    cancelButton.hidden = true;
    document.querySelector("#form-title").textContent = "Add a book";
}

form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const values = Object.fromEntries(new FormData(form));
    const id = idInput.value;
    try {
        await request(id ? `/api/books/${encodeURIComponent(id)}` : "/api/books", {
            method: id ? "PUT" : "POST",
            body: JSON.stringify({ title: values.title, author: values.author, year: values.year })
        });
        resetForm();
        showMessage(id ? "Book updated." : "Book added.");
        await loadBooks();
    } catch (error) {
        showMessage(error.message, true);
    }
});

cancelButton.addEventListener("click", resetForm);

list.addEventListener("click", async (event) => {
    const button = event.target.closest("button[data-action]");
    if (!button) return;

    try {
        const id = button.dataset.id;
        if (button.dataset.action === "edit") {
            const book = await request(`/api/books/${encodeURIComponent(id)}`);
            idInput.value = book.id;
            form.elements.title.value = book.title;
            form.elements.author.value = book.author;
            form.elements.year.value = book.year || "";
            saveButton.textContent = "Save changes";
            cancelButton.hidden = false;
            document.querySelector("#form-title").textContent = "Edit book";
            form.elements.title.focus();
        } else {
            await request(`/api/books/${encodeURIComponent(id)}`, { method: "DELETE" });
            showMessage("Book deleted.");
            await loadBooks();
        }
    } catch (error) {
        showMessage(error.message, true);
    }
});

loadBooks();
