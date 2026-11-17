import React from "react";
import { createRoot } from "react-dom/client";
import "./style.css";

function App() {
    const [tasks, setTasks] = React.useState([]);
    const [message, setMessage] = React.useState("");
    const [loading, setLoading] = React.useState(true);

    async function request(url, options = {}) {
        const response = await fetch(url, {
            ...options,
            headers: { "Content-Type": "application/json", ...options.headers }
        });
        if (response.status === 204) return null;
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || "The request could not be completed.");
        return result;
    }

    async function loadTasks() {
        setLoading(true);
        try {
            setTasks(await request("/api/tasks"));
            setMessage("");
        } catch (error) {
            setMessage(error.message);
        } finally {
            setLoading(false);
        }
    }

    React.useEffect(() => {
        loadTasks();
    }, []);

    async function addTask(event) {
        event.preventDefault();
        const form = event.currentTarget;
        const input = new FormData(form).get("text").trim();
        if (!input) return;
        try {
            const task = await request("/api/tasks", { method: "POST", body: JSON.stringify({ text: input }) });
            setTasks((current) => [task, ...current]);
            form.reset();
            setMessage("");
        } catch (error) {
            setMessage(error.message);
        }
    }

    async function toggleTask(task) {
        try {
            const updated = await request(`/api/tasks/${task._id}`, {
                method: "PATCH",
                body: JSON.stringify({ completed: !task.completed })
            });
            setTasks((current) => current.map((item) => item._id === updated._id ? updated : item));
            setMessage("");
        } catch (error) {
            setMessage(error.message);
        }
    }

    async function deleteTask(id) {
        try {
            await request(`/api/tasks/${id}`, { method: "DELETE" });
            setTasks((current) => current.filter((task) => task._id !== id));
            setMessage("");
        } catch (error) {
            setMessage(error.message);
        }
    }

    const completedCount = tasks.filter((task) => task.completed).length;

    return (
        <main className="app-shell">
            <header>
                <p className="eyebrow">Experiment 12 · MERN</p>
                <h1>One thing<br />at a time.</h1>
                <p className="intro">A tiny task board backed by MongoDB and served as one full-stack app.</p>
            </header>
            <section className="board" aria-labelledby="board-title">
                <div className="board-heading">
                    <div><p className="eyebrow">Your board</p><h2 id="board-title">Tasks</h2></div>
                    <span>{completedCount} of {tasks.length} done</span>
                </div>
                <form onSubmit={addTask} className="add-form">
                    <label className="visually-hidden" htmlFor="task-text">New task</label>
                    <input id="task-text" name="text" maxLength="160" placeholder="What needs doing?" required />
                    <button type="submit">Add task</button>
                </form>
                {message && <p className="message" role="alert">{message}</p>}
                {loading ? <p className="empty">Loading your tasks…</p> : (
                    <ul className="task-list">
                        {tasks.length === 0 && <li className="empty">Nothing on the list yet. Add a task to begin.</li>}
                        {tasks.map((task) => (
                            <li className={task.completed ? "task completed" : "task"} key={task._id}>
                                <label>
                                    <input type="checkbox" checked={task.completed} onChange={() => toggleTask(task)} />
                                    <span>{task.text}</span>
                                </label>
                                <button type="button" className="delete" onClick={() => deleteTask(task._id)} aria-label={`Delete ${task.text}`}>×</button>
                            </li>
                        ))}
                    </ul>
                )}
            </section>
            <footer>React · Express · Node.js · MongoDB</footer>
        </main>
    );
}

createRoot(document.getElementById("root")).render(<App />);
