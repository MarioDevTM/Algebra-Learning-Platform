# Personalized Learning Platform for Algebra

This is a bachelor's thesis project that presents an interactive web platform designed to help undergraduate students learn and master fundamental concepts of algebra. The application provides a gamified learning environment with real-time feedback and a structured curriculum.

---

## Key Features 📚

* **Secure Authentication:** User registration and login system with passwords secured by bcrypt hashing.
* **Expanded Curriculum:** Over 40 detailed lessons covering algebra fundamentals, group theory, ring theory, and linear algebra, inspired by a university syllabus.
* **Interactive Lessons:** Each lesson contains comprehensive explanations and an interactive quiz to check understanding.
* **Retry Option:** Quizzes can be retaken for practice, helping to reinforce information.
* **Random Quiz Generator:** A feature that creates a 10-question test selected randomly from all lessons, ideal for review.
* **Analytics Dashboard:** Each user has a personal dashboard that displays performance statistics, such as overall accuracy and a chart showing mastery of each topic.
* **Gamification:** To increase motivation, the platform includes:
    * **Points:** Awarded for completing lessons.
    * **Achievements:** Unlocked for reaching certain milestones.
    * **Leaderboard:** Displays the top users by score.
* **User-Created Problems:** Users can add their own problems to practice.

---

## Technologies Used 🛠️

The application is built using a modern and efficient JavaScript-based tech stack.

#### **Backend**
* **Node.js:** Runtime environment for server-side JavaScript code.
* **Express.js:** Minimalist web framework for managing API routes and requests.
* **SQLite:** A serverless, file-based relational database, ideal for portability.
* **bcrypt:** Library for securely hashing passwords.
* **lodash:** Utility library used for shuffling lessons in the random quiz feature.

#### **Frontend**
* **Vanilla JavaScript (ES6+):** Pure JavaScript without frameworks for a fast application with direct DOM control.
* **HTML5 & CSS3:** The basic structure and styling of the web pages.
* **Tailwind CSS:** A utility-first CSS framework for rapid UI development.
* **Chart.js:** Library for rendering interactive charts on the dashboard.

---

## Detailed Installation and Running Guide 🚀

This section provides a complete guide to set up and run the project in your local environment.

#### **1. Prerequisites**

Before you begin, ensure your system meets the following requirements:

* **Node.js and npm:** You will need **Node.js** (LTS version 18.x or newer is recommended) and the **npm** package manager. npm is included automatically with the Node.js installation.
    * You can download Node.js from the [official website](https://nodejs.org/).
    * To check if they are installed correctly, open a terminal and run the commands:
        ```bash
        node -v
        npm -v
        ```
* **Git:** You will need Git to clone the repository. You can download Git from [here](https://git-scm.com/).

#### **2. Project Setup**

Follow these steps to download and configure the project:

1.  **Clone the repository:**
    Open a terminal and run the following command to download the project's source code:
    ```bash
    git clone [https://your-repository-address.git](https://your-repository-address.git)
    ```

2.  **Navigate to the project directory:**
    Access the newly created folder:
    ```bash
    cd project-directory-name
    ```

3.  **Install backend dependencies:**
    Run the `npm install` command. This command reads the `package.json` file and automatically downloads all the necessary packages for the server to function, such as **Express.js**, **SQLite**, **bcrypt**, and **lodash**.
    ```bash
    npm install
    ```

#### **3. Running the Application**

1.  **Run the server:**
    After the dependencies have been installed, start the backend server with the following command:
    ```bash
    npm start
    ```
    > This command executes the "start" script defined in `package.json`, which in turn runs `node backend/server.js`.

2.  **Check the console:**
    If everything started correctly, you will see two confirmation messages in your terminal:
    ```
    Connected to the SQLite database.
    Server running on http://localhost:3000
    ```

3.  **Automatic database creation:**
    On the first run, you will notice that a new file named `database.db` will be automatically created in the project's root directory. This is the SQLite database file.

#### **4. Accessing and Using the Platform**

1.  **Open the application in your browser:**
    Open your favorite browser (Chrome, Firefox, etc.) and navigate to the address:
    ```
    http://localhost:3000
    ```

2.  **Create an account:**
    On your first visit, you will be greeted by the authentication screen. Since you don't have an account yet, you will need to use the **Register** form to create a new user.

3.  **Explore the platform:**
    After you have registered and logged in, you will have access to all the platform's features. Congratulations, the project is now fully functional!