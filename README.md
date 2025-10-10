CodeAlpha — Social Media Web App

A mini social media platform built as part of the CodeAlpha Internship Program.
This project demonstrates core full-stack development skills including authentication, CRUD operations, database management, and responsive frontend interaction.

1.🚀 Features

🔐 User Authentication — Signup, Login with JWT-based security

📝 Create & Delete Posts — Users can post text content

❤️ Like System — Like and unlike posts in real-time

💬 Comment Section — Add comments to any post

👥 Follow / Unfollow — Follow other users, view followers & following lists

🧾 Profile View — See user details and their posts

⚡ Dynamic Feed — Fetches and displays all posts from all users

💾 MongoDB Integration — Persistent database using Mongoose

🌐 Responsive Frontend — Simple UI with HTML, CSS, and JavaScript

2.🛠️ Tech Stack
Layer	Technology Used
Frontend	HTML, CSS, JavaScript (Vanilla JS)
Backend	Node.js, Express.js
Database	MongoDB with Mongoose
Authentication	JWT (JSON Web Token)
Hosting	(Optional: Can deploy on Render / Vercel / Netlify)
3.⚙️ Installation Guide

Follow these steps to run the project locally:

Clone this repository:

git clone https://github.com/Muzammil-s/codealpha-socialmedia.git
cd codealpha-socialmedia


4.Install backend dependencies:

cd backend
npm install


5.Setup environment variables:
Create a .env file inside /backend and add:

6.MONGO_URI=your_mongodb_connection_string
JWT_SECRET=your_secret_key
PORT=5000


7.Start the backend server:

npm run dev


Server will run at http://localhost:5000

8.Open the frontend:

Open index.html in your browser

Sign up, login, and explore your mini social media app 🎉

9.🧩 Folder Structure
codealpha-socialmedia/
│
├── backend/
│   ├── controllers/
│   ├── models/
│   ├── routes/
│   ├── server.js
│   └── .env
│
├── index.html
├── script.js
└── style.css



10.👨‍🎓 Internship Details

Organization: CodeAlpha
Intern: Muzammil
Domain: Full Stack Web Development
Project: Social Media Web App
Duration: [Insert internship month/year]

11.🏆 Author

Developed by: Muzammil

GitHub: Muzammil-s
