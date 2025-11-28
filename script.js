// --- Global State ---
let currentDate = new Date();
let selectedDateKey = null;
let currentUser = null; // Store logged-in username
let tasksData = {};     // Holds current user's data
let copiedTasks = null;

// --- DOM Elements ---
const authContainer = document.getElementById('auth-container');
const appContainer = document.getElementById('app-container');
const calendarGrid = document.getElementById('calendar-grid');
const monthYearLabel = document.getElementById('month-year');
const taskModal = document.getElementById('task-modal');
const overlay = document.getElementById('overlay');
const taskList = document.getElementById('task-list');
const newTaskInput = document.getElementById('new-task-input');
const modalDateTitle = document.getElementById('modal-date-title');
const progressBar = document.getElementById('daily-progress-bar');
const progressText = document.getElementById('daily-stats-text');

// --- Initialization ---
document.addEventListener('DOMContentLoaded', () => {
    checkSession();
});

// --- Authentication Logic ---

// Toggle between Login and Register forms
document.getElementById('show-register').addEventListener('click', () => {
    document.getElementById('login-form').classList.add('hidden');
    document.getElementById('register-form').classList.remove('hidden');
    document.getElementById('auth-msg').innerText = "";
});

document.getElementById('show-login').addEventListener('click', () => {
    document.getElementById('register-form').classList.add('hidden');
    document.getElementById('login-form').classList.remove('hidden');
    document.getElementById('auth-msg').innerText = "";
});

// Register
document.getElementById('reg-btn').addEventListener('click', () => {
    const user = document.getElementById('reg-user').value.trim();
    const pass = document.getElementById('reg-pass').value.trim();
    const msg = document.getElementById('auth-msg');

    if(!user || !pass) { msg.innerText = "Please fill all fields."; return; }

    let usersDB = JSON.parse(localStorage.getItem('studyUsers')) || {};

    if(usersDB[user]) {
        msg.innerText = "Username already taken!";
    } else {
        usersDB[user] = { password: pass }; // Simple storage
        localStorage.setItem('studyUsers', JSON.stringify(usersDB));
        alert("Account created! Please log in.");
        document.getElementById('show-login').click();
    }
});

// Login
document.getElementById('login-btn').addEventListener('click', () => {
    const user = document.getElementById('login-user').value.trim();
    const pass = document.getElementById('login-pass').value.trim();
    const msg = document.getElementById('auth-msg');

    let usersDB = JSON.parse(localStorage.getItem('studyUsers')) || {};

    if(usersDB[user] && usersDB[user].password === pass) {
        loginUser(user);
    } else {
        msg.innerText = "Invalid username or password.";
    }
});

function loginUser(username) {
    currentUser = username;
    // Load User Specific Data
    tasksData = JSON.parse(localStorage.getItem(`tasks_${currentUser}`)) || {};
    
    // UI Transitions
    authContainer.classList.add('hidden');
    appContainer.classList.remove('hidden');
    document.getElementById('user-welcome').innerText = `👋 Hi, ${username}`;
    
    // Init App
    renderCalendar();
    updateOverallStats();
}

document.getElementById('logout-btn').addEventListener('click', () => {
    currentUser = null;
    tasksData = {};
    appContainer.classList.add('hidden');
    authContainer.classList.remove('hidden');
    document.getElementById('login-user').value = '';
    document.getElementById('login-pass').value = '';
});

function checkSession() {
    // Optional: Keep user logged in on refresh (Currently disabled for security demo)
    // To enable, save currentUser to localStorage on login and check here.
}

// --- App Logic (Same as before but uses currentUser keys) ---

function saveData() {
    if(!currentUser) return;
    localStorage.setItem(`tasks_${currentUser}`, JSON.stringify(tasksData));
}

function renderCalendar() {
    calendarGrid.innerHTML = '';
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const months = ["January","February","March","April","May","June","July","August","September","October","November","December"];
    monthYearLabel.innerText = `${months[month]} ${year}`;

    const firstDayIndex = new Date(year, month, 1).getDay();
    const lastDay = new Date(year, month + 1, 0).getDate();

    for (let i = 0; i < firstDayIndex; i++) {
        calendarGrid.appendChild(document.createElement('div'));
    }

    const today = new Date();

    for (let i = 1; i <= lastDay; i++) {
        const dayDiv = document.createElement('div');
        dayDiv.innerText = i;
        dayDiv.classList.add('day');
        
        const dateKey = `${year}-${String(month + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
        
        if (i === today.getDate() && month === today.getMonth() && year === today.getFullYear()) {
            dayDiv.classList.add('today');
        }

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

// --- Modal & Tasks ---
function openTaskModal(dateKey) {
    selectedDateKey = dateKey;
    modalDateTitle.innerText = new Date(dateKey).toDateString();
    renderTasks();
    document.getElementById('paste-tasks-btn').classList.toggle('hidden', !copiedTasks);
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
            <span>${task.text}</span>
            <button class="delete-btn" onclick="deleteTask(${index})" style="background:none;border:none;cursor:pointer;">❌</button>
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
    renderCalendar();
    updateOverallStats();
    newTaskInput.value = '';
}

window.toggleTask = function(index) {
    tasksData[selectedDateKey][index].completed = !tasksData[selectedDateKey][index].completed;
    saveData();
    renderTasks();
    renderCalendar();
    updateOverallStats();
}

window.deleteTask = function(index) {
    tasksData[selectedDateKey].splice(index, 1);
    if (tasksData[selectedDateKey].length === 0) delete tasksData[selectedDateKey];
    saveData();
    renderTasks();
    renderCalendar();
    updateOverallStats();
}

function updateDailyStats(tasks) {
    const total = tasks.length;
    const completed = tasks.filter(t => t.completed).length;
    const percent = total === 0 ? 0 : Math.round((completed / total) * 100);
    progressBar.style.width = `${percent}%`;
    progressText.innerText = `${completed}/${total} Done`;
}

// --- Utils ---
document.getElementById('close-modal').addEventListener('click', closeModal);
overlay.addEventListener('click', closeModal);
function closeModal() {
    taskModal.classList.add('hidden');
    overlay.classList.add('hidden');
}

document.getElementById('copy-tasks-btn').addEventListener('click', () => {
    if (tasksData[selectedDateKey]) {
        copiedTasks = JSON.parse(JSON.stringify(tasksData[selectedDateKey]));
        copiedTasks.forEach(t => t.completed = false);
        alert('Copied!');
    }
});

document.getElementById('paste-tasks-btn').addEventListener('click', () => {
    if (!copiedTasks) return;
    if (!tasksData[selectedDateKey]) tasksData[selectedDateKey] = [];
    tasksData[selectedDateKey] = [...tasksData[selectedDateKey], ...copiedTasks];
    saveData();
    renderTasks();
    renderCalendar();
    updateOverallStats();
});

document.getElementById('reset-day-btn').addEventListener('click', () => {
    delete tasksData[selectedDateKey];
    saveData();
    renderTasks();
    renderCalendar();
    updateOverallStats();
});

function updateOverallStats() {
    let totalTasks = 0, totalCompleted = 0;
    Object.values(tasksData).forEach(dayTasks => {
        totalTasks += dayTasks.length;
        totalCompleted += dayTasks.filter(t => t.completed).length;
    });
    const percent = totalTasks === 0 ? 0 : Math.round((totalCompleted / totalTasks) * 100);
    document.getElementById('total-tasks').innerText = totalTasks;
    document.getElementById('total-completed').innerText = totalCompleted;
    document.getElementById('overall-percent').innerText = `${percent}%`;
}

// Theme Toggle
document.getElementById('theme-toggle').addEventListener('click', () => {
    const isLight = document.documentElement.getAttribute('data-theme') === 'light';
    document.documentElement.setAttribute('data-theme', isLight ? 'dark' : 'light');
});
