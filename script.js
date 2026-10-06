
const STORAGE_KEY_TODOS = 'todoflow_tasks_v1';
const STORAGE_KEY_THEME = 'todoflow_theme';

let todos = JSON.parse(localStorage.getItem(STORAGE_KEY_TODOS)) || [];
let currentFilter = 'all';
let searchQuery = '';
let currentEditingId = null;

const taskInput = document.getElementById('taskInput');
const prioritySelect = document.getElementById('prioritySelect');
const dueDateInput = document.getElementById('dueDateInput');
const addTaskBtn = document.getElementById('addTaskBtn');
const taskList = document.getElementById('taskList');
const emptyState = document.getElementById('emptyState');
const searchInput = document.getElementById('searchInput');
const filterTabs = document.querySelectorAll('.filter-tab');
const clearCompletedBtn = document.getElementById('clearCompletedBtn');
const themeToggle = document.getElementById('themeToggle');
const themeIcon = document.getElementById('themeIcon');

const statTotal = document.getElementById('statTotal');
const statCompleted = document.getElementById('statCompleted');
const statRemaining = document.getElementById('statRemaining');

const confirmModal = document.getElementById('confirmModal');
const cancelModalBtn = document.getElementById('cancelModalBtn');
const confirmClearBtn = document.getElementById('confirmClearBtn');
const toastContainer = document.getElementById('toastContainer');

function initTheme() {
    const savedTheme = localStorage.getItem(STORAGE_KEY_THEME) || 'dark';
    document.documentElement.setAttribute('data-theme', savedTheme);
    updateThemeIcon(savedTheme);
}

function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem(STORAGE_KEY_THEME, newTheme);
    updateThemeIcon(newTheme);
    showToast(`Switched to ${newTheme} mode`, 'info');
}

function updateThemeIcon(theme) {
    if (theme === 'dark') {
        themeIcon.innerHTML = `<circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/>`;
    } else {
        themeIcon.innerHTML = `<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>`;
    }
}

function saveToStorage() {
    localStorage.setItem(STORAGE_KEY_TODOS, JSON.stringify(todos));
}

function addTask() {
    const title = taskInput.value.trim();
    if (!title) {
        taskInput.focus();
        showToast('Please enter a task title', 'danger');
        return;
    }

    const newTask = {
        id: 'task_' + Date.now(),
        title: title,
        completed: false,
        priority: prioritySelect.value,
        dueDate: dueDateInput.value || null,
        createdAt: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    };

    todos.unshift(newTask);
    saveToStorage();
    render();

    taskInput.value = '';
    dueDateInput.value = '';
    prioritySelect.value = 'medium';

    showToast('Task created successfully', 'success');
}

function toggleTaskCompletion(id) {
    todos = todos.map(todo => {
        if (todo.id === id) {
            const nextState = !todo.completed;
            showToast(nextState ? 'Task marked as completed' : 'Task marked as active', 'info');
            return { ...todo, completed: nextState };
        }
        return todo;
    });
    saveToStorage();
    render();
}

function deleteTask(id) {
    todos = todos.filter(todo => todo.id !== id);
    saveToStorage();
    render();
    showToast('Task deleted', 'danger');
}

function startEditing(id, titleElement) {
    if (currentEditingId) return;
    currentEditingId = id;

    const currentTodo = todos.find(t => t.id === id);
    if (!currentTodo) return;

    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'inline-edit-input';
    input.value = currentTodo.title;

    titleElement.replaceWith(input);
    input.focus();

    function finishEditing() {
        const newTitle = input.value.trim();
        if (newTitle && newTitle !== currentTodo.title) {
            currentTodo.title = newTitle;
            saveToStorage();
            showToast('Task updated', 'success');
        }
        currentEditingId = null;
        render();
    }

    input.addEventListener('blur', finishEditing);
    input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') finishEditing();
        if (e.key === 'Escape') {
            currentEditingId = null;
            render();
        }
    });
}

function clearCompletedTasks() {
    const completedCount = todos.filter(t => t.completed).length;
    if (completedCount === 0) {
        showToast('No completed tasks to clear', 'info');
        return;
    }
    confirmModal.classList.add('active');
}

function getFilteredTodos() {
    return todos.filter(todo => {
        const matchesFilter =
            currentFilter === 'all' ? true :
                currentFilter === 'active' ? !todo.completed :
                    todo.completed;

        const matchesSearch = todo.title.toLowerCase().includes(searchQuery.toLowerCase());

        return matchesFilter && matchesSearch;
    });
}

function updateStats() {
    const total = todos.length;
    const completed = todos.filter(t => t.completed).length;
    const remaining = total - completed;

    statTotal.textContent = total;
    statCompleted.textContent = completed;
    statRemaining.textContent = remaining;
}

function render() {
    updateStats();
    const filtered = getFilteredTodos();

    taskList.innerHTML = '';

    if (filtered.length === 0) {
        emptyState.style.display = 'flex';
        taskList.style.display = 'none';
        return;
    }

    emptyState.style.display = 'none';
    taskList.style.display = 'flex';

    filtered.forEach(todo => {
        const li = document.createElement('li');
        li.className = `task-item ${todo.completed ? 'completed' : ''}`;
        li.setAttribute('data-id', todo.id);

        li.innerHTML = `
                    <div class="checkbox-container" onclick="toggleTaskCompletion('${todo.id}')" role="checkbox" aria-checked="${todo.completed}">
                        <div class="checkbox-custom">
                            <svg viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>
                        </div>
                    </div>
                    <div class="task-content">
                        <span class="task-title">${escapeHtml(todo.title)}</span>
                        <div class="task-meta">
                            <span class="priority-badge ${todo.priority}">${todo.priority}</span>
                            <span class="meta-pill">
                                <svg viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                                ${todo.dueDate ? todo.dueDate : todo.createdAt}
                            </span>
                        </div>
                    </div>
                    <div class="task-actions">
                        <button class="btn-icon edit-btn" title="Edit task" onclick="handleEditClick('${todo.id}', event)">
                            <svg viewBox="0 0 24 24"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
                        </button>
                        <button class="btn-icon delete" title="Delete task" onclick="deleteTask('${todo.id}')">
                            <svg viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                        </button>
                    </div>
                `;

        taskList.appendChild(li);
    });
}

function handleEditClick(id, event) {
    event.stopPropagation();
    const taskCard = event.target.closest('.task-item');
    const titleEl = taskCard.querySelector('.task-title');
    startEditing(id, titleEl);
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;

    let iconMarkup = `<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>`;
    if (type === 'success') {
        iconMarkup = `<svg viewBox="0 0 24 24"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>`;
    } else if (type === 'danger') {
        iconMarkup = `<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>`;
    }

    toast.innerHTML = `
                <div class="toast-icon">${iconMarkup}</div>
                <span>${message}</span>
            `;

    toastContainer.appendChild(toast);

    setTimeout(() => {
        toast.classList.add('hide');
        setTimeout(() => toast.remove(), 300);
    }, 2500);
}

addTaskBtn.addEventListener('click', addTask);
taskInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') addTask();
});

searchInput.addEventListener('input', (e) => {
    searchQuery = e.target.value;
    render();
});

filterTabs.forEach(tab => {
    tab.addEventListener('click', () => {
        filterTabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        currentFilter = tab.getAttribute('data-filter');
        render();
    });
});

clearCompletedBtn.addEventListener('click', clearCompletedTasks);
themeToggle.addEventListener('click', toggleTheme);

cancelModalBtn.addEventListener('click', () => {
    confirmModal.classList.remove('active');
});

confirmClearBtn.addEventListener('click', () => {
    todos = todos.filter(t => !t.completed);
    saveToStorage();
    render();
    confirmModal.classList.remove('active');
    showToast('All completed tasks removed', 'danger');
});

window.addEventListener('DOMContentLoaded', () => {
    initTheme();
    render();
});