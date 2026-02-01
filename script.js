const taskInput = document.getElementById('taskInput');
const addBtn = document.getElementById('addBtn');
const messageDiv = document.getElementById('message');
const settingsBtn = document.getElementById('settingsBtn');
const settingsModal = document.getElementById('settingsModal');
const modalBackdrop = document.getElementById('modalBackdrop');
const closeModalBtn = document.getElementById('closeModalBtn');
const bgFileInput = document.getElementById('bgFileInput');
const resetBgBtn = document.getElementById('resetBgBtn');
const backdropEl = document.querySelector('.app-backdrop');

const TAB_IDS = ['todo', 'progress', 'completed'];
const TAB_BUTTONS = document.querySelectorAll('.tab');
const TAB_PANELS = document.querySelectorAll('.tab-panel');
const TASK_LISTS = {
    todo: document.getElementById('taskList-todo'),
    progress: document.getElementById('taskList-progress'),
    completed: document.getElementById('taskList-completed')
};

let tasks = [];

const STORAGE_KEYS = {
    TASKS: 'todoTasks',
    BACKGROUND: 'todoBackground'
};

/* load or clear custom background from localStorage */
function loadBackground() {
    const saved = localStorage.getItem(STORAGE_KEYS.BACKGROUND);
    if (saved) {
        try {
            const data = JSON.parse(saved);
            if (data.type === 'url' && data.value) {
                backdropEl.style.backgroundImage = `url(${data.value})`;
                backdropEl.classList.add('custom-bg');
                return;
            }
            if (data.type === 'base64' && data.value) {
                backdropEl.style.backgroundImage = `url(${data.value})`;
                backdropEl.classList.add('custom-bg');
                return;
            }
        } catch (_) {}
    }
    backdropEl.style.backgroundImage = '';
    backdropEl.classList.remove('custom-bg');
}

function saveBackground(type, value) {
    localStorage.setItem(STORAGE_KEYS.BACKGROUND, JSON.stringify({ type, value }));
    loadBackground();
}

function openSettings() {
    settingsModal.hidden = false;
    settingsModal.removeAttribute('aria-hidden');
    closeModalBtn.focus();
}

function closeSettings() {
    settingsModal.hidden = true;
    settingsModal.setAttribute('aria-hidden', 'true');
}

function onBgFileChange(e) {
    const file = e.target.files?.[0];
    if (!file || !file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = function () {
        const dataUrl = reader.result;
        saveBackground('base64', dataUrl);
        showMessage('Background updated!', 'success');
        closeSettings();
    };
    reader.readAsDataURL(file);
    e.target.value = '';
}

function resetBackground() {
    localStorage.removeItem(STORAGE_KEYS.BACKGROUND);
    loadBackground();
    showMessage('Default background restored.', 'success');
    closeSettings();
}

settingsBtn.addEventListener('click', openSettings);
closeModalBtn.addEventListener('click', closeSettings);
modalBackdrop.addEventListener('click', closeSettings);
bgFileInput.addEventListener('change', onBgFileChange);
resetBgBtn.addEventListener('click', resetBackground);

document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !settingsModal.hidden) closeSettings();
});

/* convert old task format (completed true/false) to new one with status and dates */
function migrateTask(oldTask) {
    if (oldTask.status !== undefined && oldTask.createdAt !== undefined) {
        return oldTask;
    }
    return {
        id: oldTask.id || 'id_' + Date.now() + '_' + Math.random().toString(36).slice(2),
        text: oldTask.text,
        status: oldTask.completed === true ? 'completed' : 'todo',
        createdAt: oldTask.createdAt || new Date().toISOString(),
        completedAt: oldTask.completed === true ? (oldTask.completedAt || new Date().toISOString()) : null
    };
}

function loadTasks() {
    const raw = localStorage.getItem(STORAGE_KEYS.TASKS);
    if (raw) {
        try {
            const parsed = JSON.parse(raw);
            tasks = Array.isArray(parsed) ? parsed.map(migrateTask) : [];
        } catch (_) {
            tasks = [];
        }
    } else {
        tasks = [];
    }
    renderAllPanels();
}

function saveTasks() {
    localStorage.setItem(STORAGE_KEYS.TASKS, JSON.stringify(tasks));
}

function generateId() {
    return 'id_' + Date.now() + '_' + Math.random().toString(36).slice(2);
}

/* show date like Jan 30, 10:00 AM */
function formatTimestamp(isoString) {
    if (!isoString) return '';
    const d = new Date(isoString);
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const month = months[d.getMonth()];
    const date = d.getDate();
    let hours = d.getHours();
    const minutes = d.getMinutes();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12 || 12;
    const minStr = minutes < 10 ? '0' + minutes : String(minutes);
    return `${month} ${date}, ${hours}:${minStr} ${ampm}`;
}

/* switch which tab is visible and update the buttons */
let activeTab = 'todo';

function setActiveTab(tabId) {
    if (!TAB_IDS.includes(tabId)) return;
    activeTab = tabId;
    TAB_BUTTONS.forEach(btn => {
        const isActive = btn.getAttribute('data-tab') === tabId;
        btn.classList.toggle('active', isActive);
        btn.setAttribute('aria-selected', isActive);
    });
    TAB_PANELS.forEach(panel => {
        const panelId = panel.id;
        const isActive = panelId === 'panel-' + tabId;
        panel.classList.toggle('active', isActive);
        panel.hidden = !isActive;
    });
}

TAB_BUTTONS.forEach(btn => {
    btn.addEventListener('click', () => setActiveTab(btn.getAttribute('data-tab')));
});

/* get tasks for this tab then loop and build card html for each */
function getTasksByStatus(status) {
    return tasks.filter(t => t.status === status);
}

function renderList(listEl, status) {
    const items = getTasksByStatus(status);
    listEl.innerHTML = '';
    items.forEach(task => {
        const card = document.createElement('li');
        card.className = 'task-card';
        card.setAttribute('data-status', status);
        card.setAttribute('data-id', task.id);

        const metaParts = [];
        metaParts.push('<span>Assigned: ' + formatTimestamp(task.createdAt) + '</span>');
        if (task.completedAt) {
            metaParts.push('<span>Completed: ' + formatTimestamp(task.completedAt) + '</span>');
        }

        let actionsHtml = '';
        if (status === 'todo') {
            actionsHtml = '<button type="button" class="btn btn-start" data-action="start">Start</button>';
        } else if (status === 'progress') {
            actionsHtml = '<button type="button" class="btn btn-complete" data-action="complete">Complete</button><button type="button" class="btn btn-back" data-action="back">Back to To Do</button>';
        } else {
            actionsHtml = '<button type="button" class="btn btn-back" data-action="reopen">Back to In Progress</button>';
        }
        actionsHtml += '<button type="button" class="btn delete-btn" data-action="delete">Delete</button>';

        card.innerHTML =
            '<div class="task-card-content">' +
            '<span class="task-card-text">' + escapeHtml(task.text) + '</span>' +
            '</div>' +
            '<div class="task-card-meta">' + metaParts.join('') + '</div>' +
            '<div class="task-card-actions">' + actionsHtml + '</div>';

        const actionButtons = card.querySelectorAll('[data-action]');
        actionButtons.forEach(btnEl => {
            btnEl.addEventListener('click', () => handleTaskAction(task.id, btnEl.getAttribute('data-action')));
        });

        listEl.appendChild(card);
    });
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function renderAllPanels() {
    renderList(TASK_LISTS.todo, 'todo');
    renderList(TASK_LISTS.progress, 'progress');
    renderList(TASK_LISTS.completed, 'completed');
}

function findTaskIndex(id) {
    return tasks.findIndex(t => t.id === id);
}

/* handle start, complete, back, delete - update task and re-render */
function handleTaskAction(id, action) {
    const idx = findTaskIndex(id);
    if (idx === -1) return;

    const task = tasks[idx];
    switch (action) {
        case 'start':
            task.status = 'progress';
            showMessage('Task moved to In Progress.', 'success');
            break;
        case 'complete':
            task.status = 'completed';
            task.completedAt = new Date().toISOString();
            showMessage('Task completed!', 'success');
            break;
        case 'back':
            task.status = 'todo';
            task.completedAt = null;
            showMessage('Task moved back to To Do.', 'success');
            break;
        case 'reopen':
            task.status = 'progress';
            task.completedAt = null;
            showMessage('Task moved to In Progress.', 'success');
            break;
        case 'delete':
            tasks.splice(idx, 1);
            showMessage('Task deleted.', 'success');
            break;
        default:
            return;
    }
    saveTasks();
    renderAllPanels();
}

function addTask() {
    const text = taskInput.value.trim();
    if (!text) {
        showMessage('Please enter a task.', 'error');
        return;
    }
    const newTask = {
        id: generateId(),
        text: text,
        status: 'todo',
        createdAt: new Date().toISOString(),
        completedAt: null
    };
    tasks.push(newTask);
    saveTasks();
    renderAllPanels();
    taskInput.value = '';
    setActiveTab('todo');
    showMessage('Task added!', 'success');
}

function showMessage(text, type) {
    messageDiv.textContent = text;
    messageDiv.className = 'message ' + type + ' show';
    setTimeout(() => {
        messageDiv.classList.remove('show');
    }, 2500);
}

addBtn.addEventListener('click', addTask);
taskInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') addTask();
});

/* run on page load */
loadBackground();
loadTasks();
setActiveTab('todo');
