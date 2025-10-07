const API_URL = 'http://localhost:3000/api';

// Auth
const registerUser = (email, username, password) => fetch(`${API_URL}/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, username, password })
});

const loginUser = (email, password) => fetch(`${API_URL}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
});

// Data Fetching
const getUserData = (email) => fetch(`${API_URL}/user/${email}`).then(res => res.json());
const getLessons = () => fetch(`${API_URL}/lessons`).then(res => res.json());
const getAchievements = () => fetch(`${API_URL}/achievements`).then(res => res.json());
const getProblems = (email) => fetch(`${API_URL}/problems/${email}`).then(res => res.json());
const getLeaderboard = () => fetch(`${API_URL}/leaderboard`).then(res => res.json());
const getAnalyticsData = (email) => fetch(`${API_URL}/user/${email}/analytics`).then(res => res.json());
const getRandomQuiz = (count = 10) => fetch(`${API_URL}/quiz/random?count=${count}`).then(res => res.json());

// Actions
const addProblem = (userEmail, title, equation, difficulty) => fetch(`${API_URL}/problems`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userEmail, title, equation, difficulty })
});

const deleteProblem = (id) => fetch(`${API_URL}/problems/${id}`, { method: 'DELETE' });

const solveProblemOnServer = (id, equation) => fetch(`${API_URL}/solve-problem/${id}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ equation })
});

const logQuizAttempt = (userEmail, lessonId, is_correct) => fetch(`${API_URL}/log-attempt`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userEmail, lessonId, is_correct })
});