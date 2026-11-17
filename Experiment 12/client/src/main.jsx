import React from "react";
import { createRoot } from "react-dom/client";
import "./style.css";

function App() {
    const [user, setUser] = React.useState(null);
    const [tasks, setTasks] = React.useState([]);
    const [message, setMessage] = React.useState("");
    const [loading, setLoading] = React.useState(true);
    const [authMode, setAuthMode] = React.useState("login");

    async function request(url, options = {}) {
        const response = await fetch(url, {
            ...options,
            credentials: "same-origin",
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
        request("/api/auth/me")
            .then((result) => {
                setUser(result.user);
                return loadTasks();
            })
            .catch((error) => {
                if (!error.message.includes("sign in")) setMessage(error.message);
                setLoading(false);
            });
    }, []);

    async function authenticate(event) {
        event.preventDefault();
        const form = event.currentTarget;
        const values = Object.fromEntries(new FormData(form));
        try {
            const result = await request(`/api/auth/${authMode}`, {
                method: "POST",
                body: JSON.stringify(values)
            });
            setUser(result.user);
            setMessage("");
            await loadTasks();
        } catch (error) {
            setMessage(error.message);
        }
    }

    async function logout() {
        try {
            await request("/api/auth/logout", { method: "POST" });
            setUser(null);
            setTasks([]);
            setMessage("You have signed out.");
        } catch (error) {
            setMessage(error.message);
        }
    }

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
            {!user ? (
                <section className="board auth-board" aria-labelledby="auth-title">
                    <div className="board-heading">
                        <div><p className="eyebrow">Private task lists</p><h2 id="auth-title">{authMode === "login" ? "Sign in" : "Create account"}</h2></div>
                        <span>Secure session</span>
                    </div>
                    <div className="auth-tabs">
                        <button type="button" className={authMode === "login" ? "active" : ""} onClick={() => { setAuthMode("login"); setMessage(""); }}>Sign in</button>
                        <button type="button" className={authMode === "register" ? "active" : ""} onClick={() => { setAuthMode("register"); setMessage(""); }}>Create account</button>
                    </div>
                    <form onSubmit={authenticate} className="auth-form">
                        <label>Email<input name="email" type="email" autoComplete="email" maxLength="254" required /></label>
                        <label>Password<input name="password" type="password" autoComplete={authMode === "login" ? "current-password" : "new-password"} minLength="8" maxLength="72" required /></label>
                        <button type="submit">{authMode === "login" ? "Sign in" : "Create account"}</button>
                    </form>
                    {message && <p className="message" role="alert">{message}</p>}
                </section>
            ) : (
            <section className="board" aria-labelledby="board-title">
                <div className="board-heading">
                    <div><p className="eyebrow">Your board</p><h2 id="board-title">Tasks</h2><p className="account-email">{user.email}</p></div>
                    <div className="account-actions"><span>{completedCount} of {tasks.length} done</span><button type="button" className="sign-out" onClick={logout}>Sign out</button></div>
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
            )}
            <footer>React · Express · Node.js · MongoDB</footer>
        </main>
    );
}

createRoot(document.getElementById("root")).render(<App />);
