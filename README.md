Eco Read Loop Backend

Eco Read Loop Backend is a Node.js + Express API that powers the Eco Read Loop application. It handles user authentication, book management, categories, wishlists, and other backend functionalities.

💻 Tech Stack

Backend: Node.js, Express.js

Database: MongoDB & Mongoose

Authentication: JWT, bcrypt

⚡ Installation

Clone the repository (if separate backend repo, otherwise go to backend folder):

git clone https://github.com/yourusername/ecoreadloop.git
cd ecoreadloop/backend


Install dependencies

npm install


Create a .env file in the backend folder:

PORT=5000
MONGO_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret


Replace your_mongodb_connection_string with your MongoDB Atlas connection string.
Replace your_jwt_secret with any random secret string.

Run the backend server

node server.js


Backend will run at:

http://localhost:5000

📂 API Endpoints
Authentication

POST /api/auth/signup - Register a new user

POST /api/auth/login - Login a user

GET /api/auth/getuser - Get logged-in user info

Books

GET /api/books - Get all books

POST /api/books - Add a new book (authenticated users)

PUT /api/books/:id - Update a book (authenticated users)

DELETE /api/books/:id - Delete a book (authenticated users)

Categories

GET /api/categories - Get all book categories

Wishlist

GET /api/wishlist - Get user wishlist

POST /api/wishlist - Add book to wishlist

DELETE /api/wishlist/:id - Remove book from wishlist

🔗 Frontend Integration

Frontend is located in the Eco Read Loop Frontend Repository
.
Make sure to update the frontend .env file with the backend URL:

REACT_APP_API_URL=http://localhost:5000

👩‍💻 Author

Vaishnavi Jaiswal
LinkedIn
 | GitHub
