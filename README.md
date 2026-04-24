# 🧠 Summarize & Chat

An AI-powered web application that allows users to **summarize content** and **interact with it through chat** for deeper understanding and insights.

---
The project is live at:https://summarizeandchat.netlify.app
---

## 🚀 Features

- 📄 Upload or input text content
- ✂️ Generate concise AI summaries
- 💬 Chat with your content (ask questions, extract insights)
- ⚡ Fast backend processing with API integration
- 🌐 Clean frontend interface for user interaction

---

## 🏗️ Tech Stack

### Frontend

- HTML / CSS / JavaScript (or React if used)

### Backend

- Python (FastAPI / Flask)

### AI Integration

- LLM API (e.g., Groq / OpenAI-compatible)

---

## 📂 Project Structure

```
Summarize-and-Chat/
│
├── doq-qa-backend/      # Backend API
├── frontend/            # Frontend application
├── .gitignore
├── README.md
```

---

## ⚙️ Installation & Setup

### 1. Clone the repository

```bash
git clone https://github.com/AliUmarHashmi/Summarize-and-Chat.git
cd Summarize-and-Chat
```

---

### 2. Backend Setup

```bash
cd doq-qa-backend
pip install -r requirements.txt
```

Create `.env` file:

```
API_KEY=your_api_key_here
```

Run backend:

```bash
python app.py
```

---

### 3. Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

---

## 🔐 Environment Variables

Create a `.env` file in backend:

```
API_KEY=your_api_key
```

⚠️ Never push `.env` to GitHub

---

## 🧠 How It Works

1. User inputs or uploads content
2. Backend processes text using AI model
3. Summary is generated
4. User can ask questions → chatbot responds based on content

---

## 🛠️ Future Improvements

- 📊 Multi-document comparison
- 🎙️ Audio / video summarization
- 🧾 Export summaries (PDF/Markdown)
- 🔍 Semantic search

---

## 🤝 Contributing

Contributions are welcome. Feel free to fork and improve the project.

---

## 📄 License

This project is open-source and available under the MIT License.

---

## 👤 Author

**Ali Umar**
GitHub: https://github.com/AliUmarHashmi

---
