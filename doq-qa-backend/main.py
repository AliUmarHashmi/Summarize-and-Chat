from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from groq import Groq
from dotenv import load_dotenv
from sentence_transformers import SentenceTransformer
import fitz
import uuid
import os
import numpy as np

load_dotenv()

app = FastAPI()
client = Groq(api_key=os.getenv("GROQ_API_KEY"))
embedder = SentenceTransformer("all-MiniLM-L6-v2")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

sessions = {}
MODEL = "llama-3.3-70b-versatile"

@app.get("/")
def root():
    return {"status": "ok"}


# --- Helpers ---
def chunk_text(text, chunk_size=300, overlap=50):
    words = text.split()
    chunks = []
    i = 0
    while i < len(words):
        chunk = " ".join(words[i:i + chunk_size])
        chunks.append(chunk)
        i += chunk_size - overlap
    return chunks


def get_relevant_chunks(query, chunks, embeddings, top_k=4):
    query_embedding = embedder.encode([query])
    scores = np.dot(embeddings, query_embedding.T).flatten()
    top_indices = scores.argsort()[::-1][:top_k]
    return [chunks[i] for i in top_indices]


# --- Endpoint 1: Upload ---
@app.post("/upload")
async def upload(file: UploadFile = File(None), raw_text: str = Form(None)):
    text = ""

    if file and file.filename.endswith(".pdf"):
        contents = await file.read()
        doc = fitz.open(stream=contents, filetype="pdf")
        text = "".join(page.get_text() for page in doc)
    elif raw_text:
        text = raw_text
    else:
        raise HTTPException(status_code=400, detail="Provide a PDF or raw text.")

    if not text.strip():
        raise HTTPException(status_code=400, detail="Could not extract text.")

    chunks = chunk_text(text)
    embeddings = embedder.encode(chunks)

    session_id = str(uuid.uuid4())
    sessions[session_id] = {
        "text": text,
        "chunks": chunks,
        "embeddings": embeddings,
        "history": []
    }

    return {"session_id": session_id, "word_count": len(text.split()), "chunks": len(chunks)}


# --- Endpoint 2: Summarize ---
@app.post("/summarize")
async def summarize(session_id: str = Form(...), style: str = Form("bullets")):
    if session_id not in sessions:
        raise HTTPException(status_code=404, detail="Session not found.")

    # Use first 6 chunks only to avoid token limits
    preview_text = " ".join(sessions[session_id]["chunks"][:6])

    prompts = {
        "bullets": "Summarize in 5 clear bullet points, then write a short paragraph overview.",
        "brief": "Write a professional executive brief summary in 2 paragraphs.",
        "eli5": "Explain this document simply as if talking to a 10 year old."
    }

    response = client.chat.completions.create(
        model=MODEL,
        messages=[
            {"role": "system", "content": "You are a document summarizer. Be concise and structured."},
            {"role": "user", "content": f"{prompts.get(style, prompts['bullets'])}\n\n{preview_text}"}
        ]
    )

    return {"summary": response.choices[0].message.content}


# --- Endpoint 3: Chat (RAG) ---
class ChatRequest(BaseModel):
    session_id: str
    message: str

@app.post("/chat")
async def chat(req: ChatRequest):
    if req.session_id not in sessions:
        raise HTTPException(status_code=404, detail="Session not found.")

    session = sessions[req.session_id]
    chunks = session["chunks"]
    embeddings = session["embeddings"]
    history = session["history"]

    relevant_chunks = get_relevant_chunks(req.message, chunks, embeddings)
    context = "\n\n".join(relevant_chunks)

    history.append({"role": "user", "content": req.message})

    messages = [
        {"role": "system", "content": f"Answer based only on the document context below.\n\nCONTEXT:\n{context}"},
        *history[-6:]  # keep last 6 messages to avoid token overflow
    ]

    response = client.chat.completions.create(model=MODEL, messages=messages)
    reply = response.choices[0].message.content
    history.append({"role": "assistant", "content": reply})

    return {"reply": reply}


# --- Endpoint 4: Suggest Questions ---
class SuggestRequest(BaseModel):
    session_id: str

@app.post("/suggest")
async def suggest(req: SuggestRequest):
    if req.session_id not in sessions:
        raise HTTPException(status_code=404, detail="Session not found.")

    preview_text = " ".join(sessions[req.session_id]["chunks"][:4])

    response = client.chat.completions.create(
        model=MODEL,
        messages=[
            {"role": "system", "content": "You generate exactly 3 short questions a user might ask about a document. Return only a JSON array of 3 strings, nothing else. Example: [\"What is the main topic?\", \"Who are the key people?\", \"What are the conclusions?\"]"},
            {"role": "user", "content": f"Generate 3 questions for this document:\n\n{preview_text}"}
        ]
    )

    raw = response.choices[0].message.content.strip()

    try:
        import json
        questions = json.loads(raw)
    except:
        questions = ["What is this document about?", "What are the key points?", "What conclusions are drawn?"]

    return {"questions": questions}