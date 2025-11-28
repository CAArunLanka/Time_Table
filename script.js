// --- Global State ---
let currentDate = new Date();
let selectedDateKey = null;
let tasksData = JSON.parse(localStorage.getItem('studyTasks')) || {};
let copiedTasks = null; // Clipboard for tasks

// --- Selectors ---
const calendarGrid = document.getElementById('calendar-grid');
const monthYearLabel = document.getElementById('month-year');
const taskModal = document.getElementById('task-modal');
const overlay = document.getElementById('overlay');
const taskList = document.getElementById('task-list');
const newTaskInput = document.getElementById('new-task-input');
const modalDateTitle = document.getElementById('modal-date-title');
const progressBar = document.getElementById('daily-progress-bar');
const progressText = document.getElementById('daily-stats-text');
const pasteBtn = document.getElementById('paste-tasks-btn');

// --- Initialization ---
document.addEventListener('DOMContentLoaded', () => {
    renderCalendar();
    updateOverallStats();
    checkWelcome();
    applyTheme();
});

// --- Calendar Logic ---
function renderCalendar() {
    calendarGrid.innerHTML = '';
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    
    // Set Month Header
    const months = ["January","February","March","April","May","June","July","August","September","October","November","December"];
    monthYearLabel.innerText = `${months[month]} ${year}`;

    // Get First Day & Total Days
    const firstDayIndex = new Date(year, month, 1).getDay();
    const lastDay = new Date(year, month + 1, 0).getDate();

    // Previous Month Fillers
    for (let i = 0; i < firstDayIndex; i++) {
        const div = document.createElement('div');
        div.classList.add('day', 'empty');
        calendarGrid.appendChild(div);
    }

    // Days Generation
    for (let i = 1; i <= lastDay; i++) {
        const dayDiv = document.createElement('div');
        dayDiv.innerText = i;
        dayDiv.classList.add('day');
        
        // Date Key: YYYY-MM-DD (Manual formatting to avoid timezone issues)
        const dateKey = `${year}-${String(month + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
        dayDiv.dataset.date = dateKey;

        // Check for Today
        const today = new Date();
        if (i === today.getDate() && month === today.getMonth() && year === today.getFullYear()) {
            dayDiv.classList.add('today');
        }

        // Status Colors
        if (tasksData[dateKey] && tasksData[dateKey].length > 0) {
            const tasks = tasksData[dateKey];
            const completed = tasks.filter(t => t.completed).length;
            
            if (completed === tasks.length) dayDiv.classList.add('status-done');
            else if (completed > 0) dayDiv.classList.add('status-partial');
            else dayDiv.classList.add('status-pending');
        }

        dayDiv.addEventListener('click', () => openTaskModal(dateKey));
        calendarGrid.appendChild(dayDiv);
    }
}

document.getElementById('prev-month').addEventListener('click', () => {
    currentDate.setMonth(currentDate.getMonth() - 1);
    renderCalendar();
});

document.getElementById('next-month').addEventListener('click', () => {
    currentDate.setMonth(currentDate.getMonth() + 1);
    renderCalendar();
});

// --- Task Manager Logic ---
function openTaskModal(dateKey) {
    selectedDateKey = dateKey;
    const dateObj = new Date(dateKey);
    modalDateTitle.innerText = dateObj.toDateString();
    
    renderTasks();
    
    // Show copy/paste logic
    pasteBtn.classList.toggle('hidden', !copiedTasks);

    taskModal.classList.remove('hidden');
    overlay.classList.remove('hidden');
}

function renderTasks() {
    taskList.innerHTML = '';
    const tasks = tasksData[selectedDateKey] || [];
    
    tasks.forEach((task, index) => {
        const li = document.createElement('li');
        li.classList.add('task-item');
        if (task.completed) li.classList.add('completed');

        li.innerHTML = `
            <input type="checkbox" ${task.completed ? 'checked' : ''} onchange="toggleTask(${index})">
            <span onclick="toggleTask(${index})">${task.text}</span>
            <button class="delete-btn" onclick="deleteTask(${index})">🗑️</button>
        `;
        taskList.appendChild(li);
    });

    updateDailyStats(tasks);
}

document.getElementById('add-task-btn').addEventListener('click', addTask);
newTaskInput.addEventListener('keypress', (e) => { if(e.key === 'Enter') addTask(); });

function addTask() {
    const text = newTaskInput.value.trim();
    if (!text) return;

    if (!tasksData[selectedDateKey]) tasksData[selectedDateKey] = [];
    tasksData[selectedDateKey].push({ text, completed: false });
    
    saveData();
    renderTasks();
    renderCalendar(); // Update grid colors
    updateOverallStats();
    newTaskInput.value = '';
}

function toggleTask(index) {
    tasksData[selectedDateKey][index].completed = !tasksData[selectedDateKey][index].completed;
    saveData();
    renderTasks();
    renderCalendar();
    updateOverallStats();
}

window.deleteTask = function(index) {
    tasksData[selectedDateKey].splice(index, 1);
    // Cleanup if empty
    if (tasksData[selectedDateKey].length === 0) delete tasksData[selectedDateKey];
    
    saveData();
    renderTasks();
    renderCalendar();
    updateOverallStats();
};

function updateDailyStats(tasks) {
    const total = tasks.length;
    const completed = tasks.filter(t => t.completed).length;
    const percent = total === 0 ? 0 : Math.round((completed / total) * 100);

    progressBar.style.width = `${percent}%`;
    progressText.innerText = `${completed}/${total} Completed (${percent}%)`;
}

// --- Copy / Paste Feature ---
document.getElementById('copy-tasks-btn').addEventListener('click', () => {
    if (tasksData[selectedDateKey]) {
        copiedTasks = JSON.parse(JSON.stringify(tasksData[selectedDateKey])); // Deep copy
        // Reset completion status for copied tasks
        copiedTasks.forEach(t => t.completed = false);
        alert('Tasks copied! Open another date to paste.');
        closeModal();
    } else {
        alert('No tasks to copy.');
    }
});

pasteBtn.addEventListener('click', () => {
    if (!copiedTasks) return;
    if (!tasksData[selectedDateKey]) tasksData[selectedDateKey] = [];
    
    // Merge tasks
    tasksData[selectedDateKey] = [...tasksData[selectedDateKey], ...copiedTasks];
    saveData();
    renderTasks();
    renderCalendar();
    updateOverallStats();
    alert('Tasks pasted successfully!');
});

// --- Modal Utilities ---
document.getElementById('close-modal').addEventListener('click', closeModal);
overlay.addEventListener('click', () => {
    closeModal();
    document.getElementById('welcome-modal').classList.add('hidden');
});

function closeModal() {
    taskModal.classList.add('hidden');
    overlay.classList.add('hidden');
}

// --- Persistence & Stats ---
function saveData() {
    localStorage.setItem('studyTasks', JSON.stringify(tasksData));
}

function updateOverallStats() {
    let totalTasks = 0;
    let totalCompleted = 0;

    Object.values(tasksData).forEach(dayTasks => {
        totalTasks += dayTasks.length;
        totalCompleted += dayTasks.filter(t => t.completed).length;
    });

    const percent = totalTasks === 0 ? 0 : Math.round((totalCompleted / totalTasks) * 100);

    document.getElementById('total-tasks').innerText = totalTasks;
    document.getElementById('total-completed').innerText = totalCompleted;
    document.getElementById('overall-percent').innerText = `${percent}%`;
}

document.getElementById('reset-all').addEventListener('click', () => {
    if(confirm('Are you sure you want to delete ALL data? This cannot be undone.')) {
        localStorage.removeItem('studyTasks');
        tasksData = {};
        renderCalendar();
        updateOverallStats();
    }
});

// --- Theme & Welcome ---
const themeToggle = document.getElementById('theme-toggle');
themeToggle.addEventListener('click', () => {
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    document.documentElement.setAttribute('data-theme', isDark ? 'light' : 'dark');
    localStorage.setItem('theme', isDark ? 'light' : 'dark');
});

function applyTheme() {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme) document.documentElement.setAttribute('data-theme', savedTheme);
}

function checkWelcome() {
    if (!localStorage.getItem('welcomeShown')) {
        document.getElementById('welcome-modal').classList.remove('hidden');
        overlay.classList.remove('hidden');
    }
}

document.getElementById('start-tracking-btn').addEventListener('click', () => {
    localStorage.setItem('welcomeShown', 'true');
    document.getElementById('welcome-modal').classList.add('hidden');
    overlay.classList.add('hidden');
});