# AI Email Sender

An AI-powered email sender built with **Node.js**, **Express**, **Groq AI**, and **Google OAuth2**.  
This app allows you to:

- Login with Google  
- Enter recipient emails, subject, and an AI prompt  
- Generate a professional email using AI  
- Edit the generated email before sending  
- Send the email via your Google account
  
The site is live at this [link](https://ai-email-sender-p87v.onrender.com).   

Image added for your reference:

<img width="1050" height="669" alt="Screenshot 2025-09-04 at 12 07 47 AM" src="https://github.com/user-attachments/assets/4c38f58b-9571-4a53-b55c-cc3a74235819" />


---

## Features
- **Google OAuth2 Authentication** (secure login with Google before sending emails)  
- **AI-Powered Email Generation** using Groq API  
- **Editable Email Drafts** before sending  
- **Modern UI** with custom CSS styling  

---


---

## Setup Instructions

### 1) Clone the Repository
```bash
git clone https://github.com/Lakshay-462/ai-email-sender.git
cd ai-email-sender
```

### 2) Install Dependencies
```bash
npm install
```

### 3) Configure environment variables
```bash
PORT = 3000
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_CALLBACK_URL=http://localhost:3000/auth/google/callback

GROQ_API_KEY=your_groq_api_key
SESSION_SECRET=your_secret_key
```

### 4) Run the server
```bash
npm start
```





