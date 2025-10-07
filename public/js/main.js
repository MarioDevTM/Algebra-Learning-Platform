document.addEventListener('DOMContentLoaded', () => {
    let state = {
        currentUser: null,
        lessons: [],
        achievements: [],
        randomQuizData: null
    };

    const getCurrentUser = () => JSON.parse(localStorage.getItem('currentUser'));
    const setCurrentUser = (user) => localStorage.setItem('currentUser', JSON.stringify(user));
    const clearCurrentUser = () => localStorage.removeItem('currentUser');

    const refreshAllDataAndRender = async () => {
        if (!state.currentUser) return;

        const [userData, lessons, achievements, problems, leaderboard, analytics] = await Promise.all([
            getUserData(state.currentUser.email),
            getLessons(),
            getAchievements(),
            getProblems(state.currentUser.email),
            getLeaderboard(),
            getAnalyticsData(state.currentUser.email)
        ]);

        state.lessons = lessons;
        state.achievements = achievements;

        renderProfile(userData, lessons, achievements);
        renderDashboard(analytics);
        renderLessons(userData, lessons);
        renderProblems(problems);
        renderLeaderboard(leaderboard);
    };

    window.submitQuiz = async (lessonId, selectedOptionIndex) => {
        const lesson = state.lessons.find(l => l.id === lessonId);
        if (!lesson) return;
        const isCorrect = selectedOptionIndex === lesson.quiz.correctAnswer;
        const feedbackEl = document.getElementById(`quizFeedback-${lesson.id}`);
        const res = await logQuizAttempt(state.currentUser.email, lessonId, isCorrect);
        const data = await res.json();
        if (isCorrect) {
            showToast(data.message, 'success');
            await refreshAllDataAndRender();
        } else {
            feedbackEl.innerHTML = `<span class="text-red-600"><i class="fa-solid fa-times-circle"></i> Not quite, try again!</span>`;
            setTimeout(() => { feedbackEl.innerHTML = ''; }, 2000);
        }
    };

    window.showHint = (lessonId) => {
        const lesson = state.lessons.find(l => l.id === lessonId);
        const hintEl = document.getElementById(`hint-${lessonId}`);
        if (lesson && hintEl) {
            hintEl.innerHTML = `<i class="fa-solid fa-lightbulb mr-2"></i>${lesson.hint}`;
            hintEl.classList.remove('hidden');
        }
    };

    window.goToRandomLesson = () => {
        if (state.lessons.length === 0) return;
        const randomIndex = Math.floor(Math.random() * state.lessons.length);
        const randomLesson = state.lessons[randomIndex];
        window.location.hash = '#lessons';
        setTimeout(() => {
            const lessonElement = document.getElementById(`lesson-${randomLesson.id}`);
            if (lessonElement) {
                lessonElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
                lessonElement.classList.add('bg-amber-200');
                setTimeout(() => { lessonElement.classList.remove('bg-amber-200'); }, 2000);
            }
        }, 100);
    };

    window.startRandomQuiz = async () => {
        state.randomQuizData = await getRandomQuiz(10);
        renderRandomQuiz(state.randomQuizData);
        const form = document.getElementById('randomQuizForm');
        if (form) {
            form.addEventListener('submit', handleRandomQuizSubmit);
        }
    };

    const handleRandomQuizSubmit = async (event) => {
        event.preventDefault();
        let score = 0;
        const form = event.target;
        for (let i = 0; i < state.randomQuizData.length; i++) {
            const lesson = state.randomQuizData[i];
            const selectedOption = form.elements[`question_${i}`].value;
            if (selectedOption !== undefined && selectedOption !== "") {
                const isCorrect = parseInt(selectedOption, 10) === lesson.quiz.correctAnswer;
                if (isCorrect) {
                    score++;
                }
                await logQuizAttempt(state.currentUser.email, lesson.id, isCorrect ? 1 : 0);
            }
        }
        showToast(`You scored ${score} out of ${state.randomQuizData.length}!`, 'success');
        renderRandomQuiz(state.randomQuizData, score);
        state.randomQuizData = null;
        await refreshAllDataAndRender();
    };

    window.handleSolveProblem = async (problemId, equation) => {
        // Implementation remains the same
    };

    window.handleDeleteProblem = async (problemId) => {
        if (confirm('Delete this problem?')) {
            await deleteProblem(problemId);
            refreshAllDataAndRender();
        }
    };

    window.logout = () => {
        clearCurrentUser();
        state.currentUser = null;
        window.location.hash = '';
        initApp();
    };

    document.getElementById('showRegisterLink').addEventListener('click', (e) => {
        e.preventDefault();
        loginForm.classList.add('hidden');
        registerForm.classList.remove('hidden');
    });

    document.getElementById('showLoginLink').addEventListener('click', (e) => {
        e.preventDefault();
        registerForm.classList.add('hidden');
        loginForm.classList.remove('hidden');
    });

    loginForm.addEventListener('submit', async e => {
        e.preventDefault();
        const email = document.getElementById('loginEmail').value;
        const password = document.getElementById('loginPassword').value;
        const res = await loginUser(email, password);
        const data = await res.json();
        if (res.ok) {
            setCurrentUser({ email: data.email, username: data.username });
            showToast('Login successful!', 'success');
            initApp();
        } else {
            showToast(data.message, 'error');
        }
    });

    registerForm.addEventListener('submit', async e => {
        e.preventDefault();
        const email = document.getElementById('regEmail').value;
        const username = document.getElementById('regUsername').value;
        const password = document.getElementById('regPassword').value;
        const res = await registerUser(email, username, password);
        const data = await res.json();
        if (res.ok) {
            showToast('Registration successful! Please log in.', 'success');
            registerForm.reset();
            loginForm.classList.remove('hidden');
            registerForm.classList.add('hidden');
        } else {
            showToast(data.message, 'error');
        }
    });

    document.getElementById('problemForm').addEventListener('submit', async e => {
        e.preventDefault();
        const title = document.getElementById('problemTitle').value;
        const equation = document.getElementById('problemEquation').value;
        const difficulty = document.getElementById('problemDifficulty').value;
        const res = await addProblem(state.currentUser.email, title, equation, difficulty);
        const data = await res.json();
        showToast(data.message, 'info');
        document.getElementById('problemForm').reset();
        await refreshAllDataAndRender();
    });

    window.addEventListener('hashchange', () => {
        navigateTo(window.location.hash);
        if(window.location.hash === '#random-quiz') {
            renderRandomQuiz(); // Ensure start screen shows on navigation
        }
    });
    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            window.location.hash = new URL(link.href).hash;
        });
    });

    const initApp = () => {
        state.currentUser = getCurrentUser();
        if (state.currentUser) {
            authSection.style.display = 'none';
            appContent.style.display = 'block';
            userStatus.innerHTML = `Logged in as: <span class="font-bold">${state.currentUser.username}</span> | <button onclick="logout()" class="text-red-300 hover:text-red-400">Logout</button>`;
            refreshAllDataAndRender();
            renderRandomQuiz();
            if (!window.location.hash || window.location.hash === "" || window.location.hash === "#") {
                window.location.hash = '#profile';
            } else {
                navigateTo(window.location.hash);
            }
        } else {
            authSection.style.display = 'block';
            appContent.style.display = 'none';
            userStatus.textContent = 'Not Logged In';
            window.location.hash = '';
        }
    };
    initApp();
});