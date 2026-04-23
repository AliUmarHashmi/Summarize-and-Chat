from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from groq import Groq
from dotenv import load_dotenv
import fitz  # PyMuPDF
import uuid
import os

load_dotenv()

app = FastAPI()
client = Groq(api_key=os.getenv("GROQ-API-KEY"))

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# In-memory session store: { session_id: { "text": ..., "history": [] } }
sessions = {}

MODEL = "llama-3.3-70b-versatile"


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
        raise HTTPException(status_code=400, detail="Provide a PDF file or raw text.")

    if not text.strip():
        raise HTTPException(status_code=400, detail="Could not extract text.")

    session_id = str(uuid.uuid4())
    sessions[session_id] = {"text": text[:12000], "history": []}  # cap at ~12k chars
    return {"session_id": session_id, "word_count": len(text.split())}


# --- Endpoint 2: Summarize ---
@app.post("/summarize")
async def summarize(session_id: str = Form(...), style: str = Form("bullets")):
    prompts = {
        "bullets": "Summarize in 5 bullet points, then a short paragraph overview.",
        "brief": "Write a professional executive brief summary in 2 paragraphs.",
        "eli5": "Explain this document simply as if talking to a 10 year old."
    }
    doc_text = sessions[session_id]["text"]
    response = client.chat.completions.create(
        model=MODEL,
        messages=[
            {"role": "system", "content": "You are a document summarizer."},
            {"role": "user", "content": f"{prompts.get(style, prompts['bullets'])}\n\n{doc_text}"}
        ]
    )
    return {"summary": response.choices[0].message.content}


# --- Endpoint 3: Chat ---
class ChatRequest(BaseModel):
    session_id: str
    message: str

@app.post("/chat")
async def chat(req: ChatRequest):
    if req.session_id not in sessions:
        raise HTTPException(status_code=404, detail="Session not found.")

    session = sessions[req.session_id]
    doc_text = session["text"]
    history = session["history"]

    # Append user message to history
    history.append({"role": "user", "content": req.message})

    messages = [
        {"role": "system", "content": f"You are a helpful assistant. Answer questions based on the document below only.\n\nDOCUMENT:\n{doc_text}"},
        *history
    ]

    response = client.chat.completions.create(model=MODEL, messages=messages)
    reply = response.choices[0].message.content

    # Save assistant reply to history
    history.append({"role": "assistant", "content": reply})

    return {"reply": reply, "tokens_used": len(doc_text.split()) + len(req.message.split())}