const authSection = document.getElementById('authSection');
const appContent = document.getElementById('appContent');
const userStatus = document.getElementById('userStatus');
const loginForm = document.getElementById('loginForm');
const registerForm = document.getElementById('registerForm');
const navLinks = document.querySelectorAll('.nav-link');
const views = document.querySelectorAll('.view');
const toastContainer = document.getElementById('toastContainer');
let masteryChartInstance = null;

const showToast = (message, type = 'info') => {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    const icon = type === 'success' ? 'fa-check-circle' : type === 'error' ? 'fa-times-circle' : 'fa-info-circle';
    toast.innerHTML = `<i class="fa-solid ${icon}"></i> ${message}`;
    toastContainer.appendChild(toast);
    setTimeout(() => toast.remove(), 4000);
};

const navigateTo = (hash) => {
    const targetView = document.getElementById(hash.replace('#', ''));
    views.forEach(v => v.classList.remove('active'));
    navLinks.forEach(l => l.classList.remove('active'));
    if (targetView) {
        targetView.classList.add('active');
        const activeLink = document.querySelector(`.nav-link[href="${hash}"]`);
        if (activeLink) activeLink.classList.add('active');
    }
};

const renderProfile = (user, lessons, achievements) => {
    const profileView = document.getElementById('profile');
    const lessonsCompleted = user.completedLessons.length;
    const totalLessons = lessons.length;
    const lessonProgress = totalLessons > 0 ? (lessonsCompleted / totalLessons) * 100 : 0;
    profileView.innerHTML = `
    <h2 class="text-3xl font-bold mb-6 text-gray-800">Welcome, ${user.username}!</h2>
    <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div class="bg-gradient-to-br from-indigo-500 to-blue-500 text-white p-6 rounded-xl shadow-lg"><h3 class="text-xl font-bold flex items-center"><i class="fa-solid fa-star mr-2"></i>Total Points</h3><p class="text-5xl font-extrabold mt-2">${user.points}</p></div>
        <div class="bg-gradient-to-br from-amber-500 to-orange-500 text-white p-6 rounded-xl shadow-lg"><h3 class="text-xl font-bold flex items-center"><i class="fa-solid fa-fire mr-2"></i>Daily Streak</h3><p class="text-5xl font-extrabold mt-2">${user.dailyStreak} Day${user.dailyStreak !== 1 ? 's' : ''}</p></div>
    </div>
    <div class="mb-8">
        <h3 class="text-2xl font-bold mb-3 text-gray-700">Your Progress</h3>
        <div class="bg-gray-200 rounded-full h-4"><div class="bg-green-500 h-4 rounded-full" style="width: ${lessonProgress}%"></div></div>
        <p class="text-right text-sm font-medium text-gray-600 mt-1">${lessonsCompleted} of ${totalLessons} Lessons Completed</p>
    </div>
    <div>
        <h3 class="text-2xl font-bold mb-4 text-gray-700">Achievements</h3>
        <div id="achievementsList" class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">${renderAchievements(user, achievements)}</div>
    </div>`;
};

const renderAchievements = (user, allAchievements) => {
    return allAchievements.map(ach => {
        const isUnlocked = user.unlockedAchievements.includes(ach.id);
        return `<div class="text-center p-4 rounded-lg ${isUnlocked ? 'bg-amber-100' : 'bg-slate-100'}">
            <i class="${ach.icon} fa-3x ${isUnlocked ? 'text-amber-500' : 'text-slate-400'}"></i>
            <h4 class="font-bold mt-2 text-sm ${isUnlocked ? 'text-amber-800' : 'text-slate-600'}">${ach.name}</h4>
            <p class="text-xs ${isUnlocked ? 'text-amber-700' : 'text-slate-500'}">${ach.description}</p>
        </div>`;
    }).join('');
};

const renderDashboard = (analytics) => {
    const dashboardView = document.getElementById('dashboard');
    if (!analytics || analytics.totalAttempts === 0) {
        dashboardView.innerHTML = `
            <h2 class="text-3xl font-bold mb-6 text-gray-800">Your Dashboard</h2>
            <p class="text-gray-500 text-center">You haven't attempted any quizzes yet. Complete a lesson to see your progress!</p>
        `;
        return;
    }
    dashboardView.innerHTML = `
        <h2 class="text-3xl font-bold mb-6 text-gray-800">Your Dashboard</h2>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <div class="bg-slate-100 p-4 rounded-lg text-center">
                <h3 class="text-lg font-bold text-gray-600">Total Attempts</h3>
                <p class="text-4xl font-extrabold text-indigo-600 mt-2">${analytics.totalAttempts}</p>
            </div>
            <div class="bg-slate-100 p-4 rounded-lg text-center">
                <h3 class="text-lg font-bold text-gray-600">Overall Accuracy</h3>
                <p class="text-4xl font-extrabold text-green-600 mt-2">${analytics.overallAccuracy}%</p>
            </div>
        </div>
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div>
                <h3 class="text-2xl font-bold mb-4 text-gray-700">Topic Mastery</h3>
                <div class="bg-slate-50 p-4 rounded-lg">
                    <canvas id="masteryChart"></canvas>
                </div>
            </div>
            <div>
                <h3 class="text-2xl font-bold mb-4 text-gray-700">Progress Summary</h3>
                <div class="space-y-4">
                    <div>
                        <h4 class="font-semibold text-green-700">Mastered Topics (&ge;80%)</h4>
                        <p class="text-gray-600">${analytics.masteredTopics.length > 0 ? analytics.masteredTopics.join(', ') : 'None yet!'}</p>
                    </div>
                    <div>
                        <h4 class="font-semibold text-amber-700">Topics to Review (<50%)</h4>
                        <p class="text-gray-600">${analytics.struggleTopics.length > 0 ? analytics.struggleTopics.join(', ') : 'None, great job!'}</p>
                    </div>
                </div>
            </div>
        </div>
    `;
    const ctx = document.getElementById('masteryChart').getContext('2d');
    if (masteryChartInstance) {
        masteryChartInstance.destroy();
    }
    masteryChartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: Object.keys(analytics.accuracyByLesson),
            datasets: [{
                label: 'Accuracy (%)',
                data: Object.values(analytics.accuracyByLesson),
                backgroundColor: 'rgba(79, 70, 229, 0.6)',
                borderColor: 'rgba(79, 70, 229, 1)',
                borderWidth: 1
            }]
        },
        options: {
            indexAxis: 'y',
            scales: { x: { beginAtZero: true, max: 100 } },
            plugins: { legend: { display: false } },
            responsive: true
        }
    });
};

const renderLessons = (user, lessons) => {
    const lessonsList = document.getElementById('lessonsList');
    lessonsList.innerHTML = lessons.map(lesson => {
        const isCompleted = user.completedLessons.includes(lesson.id);
        let quizOptionsHTML = lesson.quiz.options.map((opt, index) =>
            `<button onclick="submitQuiz('${lesson.id}', ${index})" class="text-left w-full p-2 my-1 rounded bg-indigo-100 hover:bg-indigo-200">${opt}</button>`
        ).join('');

        return `
        <div id="lesson-${lesson.id}" class="p-4 rounded-lg transition-all border-l-4 ${isCompleted ? 'bg-green-50 border-green-500' : 'bg-gray-100 border-gray-300'}">
            <div class="flex justify-between items-center">
                <h3 class="text-xl font-bold">${lesson.title}</h3>
                <span class="font-bold text-blue-600">${lesson.points} pts</span>
            </div>
            <p class="text-gray-600 my-2">${lesson.content}</p>
            <div class="mt-4">
                ${isCompleted ? '<p class="text-sm text-green-700 mb-2"><i class="fa-solid fa-check-circle"></i> You have completed this lesson. You can retry for practice.</p>' : ''}
                <p class="font-semibold text-gray-700">${lesson.quiz.question}</p>
                <div class="mt-2 space-y-2">${quizOptionsHTML}</div>
                <div id="quizFeedback-${lesson.id}" class="text-sm mt-2 font-medium"></div>
                <button class="text-xs text-gray-500 hover:underline mt-2" onclick="showHint('${lesson.id}')">Get a Hint</button>
                <div id="hint-${lesson.id}" class="hidden mt-2 p-2 bg-amber-100 rounded text-amber-800 text-sm"></div>
            </div>
        </div>`;
    }).join('');
};

const renderRandomQuiz = (quizData, score = null) => {
    const quizView = document.getElementById('random-quiz');

    if (score !== null) {
        quizView.innerHTML = `
            <div class="text-center">
                <h2 class="text-3xl font-bold mb-4 text-gray-800">Quiz Complete!</h2>
                <p class="text-xl text-gray-600 mb-2">Your Score:</p>
                <p class="text-6xl font-extrabold text-indigo-600 mb-8">${score} / ${quizData.length}</p>
                <button onclick="startRandomQuiz()" class="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 font-semibold">Take Another Quiz</button>
            </div>
        `;
        return;
    }

    if (!quizData) {
        quizView.innerHTML = `
            <div class="text-center">
                <h2 class="text-3xl font-bold mb-4 text-gray-800">Test Your Knowledge</h2>
                <p class="text-lg text-gray-600 mb-6">Take a random 10-question quiz to review concepts from across the curriculum.</p>
                <button onclick="startRandomQuiz()" class="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 font-semibold">Start 10-Question Quiz</button>
            </div>
        `;
        return;
    }

    let questionsHTML = quizData.map((lesson, index) => `
        <div class="p-4 bg-slate-50 rounded-lg border border-slate-200">
            <p class="font-semibold text-gray-800 mb-2">${index + 1}. (From: ${lesson.title}) ${lesson.quiz.question}</p>
            <div class="space-y-1">
                ${lesson.quiz.options.map((option, optionIndex) => `
                    <div>
                        <input type="radio" id="q${index}_opt${optionIndex}" name="question_${index}" value="${optionIndex}" class="mr-2" required>
                        <label for="q${index}_opt${optionIndex}">${option}</label>
                    </div>
                `).join('')}
            </div>
        </div>
    `).join('');

    quizView.innerHTML = `
        <h2 class="text-3xl font-bold mb-6 text-gray-800">Random Quiz</h2>
        <form id="randomQuizForm">
            <div class="space-y-6">${questionsHTML}</div>
            <button type="submit" class="mt-8 bg-green-600 text-white px-8 py-3 rounded-lg hover:bg-green-700 font-semibold w-full">Submit Quiz</button>
        </form>
    `;
};

const renderProblems = (problems) => {
    const problemsList = document.getElementById('problemsList');
    if (problems.length === 0) {
        problemsList.innerHTML = '<p class="text-gray-500 col-span-full text-center">You haven\'t added any problems yet. Add one above to get started!</p>';
        return;
    }
    const difficultyColors = { Easy: 'text-green-600', Medium: 'text-amber-600', Hard: 'text-red-600' };
    problemsList.innerHTML = problems.map(p => `
        <div class="bg-white p-4 rounded-lg shadow space-y-3">
            <div class="flex justify-between items-start">
                <div>
                    <h3 class="text-xl font-bold text-gray-800">${p.title}</h3>
                    <span class="text-sm font-bold ${difficultyColors[p.difficulty]}">${p.difficulty}</span>
                </div>
                <button onclick="handleDeleteProblem('${p.id}')" class="text-red-400 hover:text-red-600 p-1"><i class="fa-solid fa-trash"></i></button>
            </div>
            <p class="font-mono bg-gray-100 p-2 rounded">${p.equation}</p>
            <div id="solverResult-${p.id}" class="hidden p-2 rounded-lg text-sm"></div>
            <button onclick="handleSolveProblem('${p.id}', '${p.equation}')" class="bg-indigo-500 text-white px-3 py-1 rounded font-medium hover:bg-indigo-600 text-sm">Solve</button>
        </div>
    `).join('');
};

const renderLeaderboard = (sortedUsers) => {
    const leaderboardView = document.getElementById('leaderboard');
    leaderboardView.innerHTML = `<h2 class="text-3xl font-bold mb-6 text-gray-800">Leaderboard</h2><ol class="space-y-3">` + sortedUsers.map((user, index) => {
        const crown = index === 0 ? '<i class="fas fa-crown text-amber-400 ml-2"></i>' : '';
        return `<li class="flex items-center justify-between p-3 rounded-lg ${index === 0 ? 'bg-amber-100' : 'bg-gray-100'}">
            <span class="font-bold text-lg">${index + 1}. ${user.username}${crown}</span>
            <span class="font-bold text-indigo-600">${user.points} pts</span>
        </li>`;
    }).join('') + `</ol>`;
};