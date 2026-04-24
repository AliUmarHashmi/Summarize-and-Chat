import { useState } from "react";
import axios from "axios";

const API = "https://summarize-and-chat-production.up.railway.app";

export default function App() {
  const [sessionIds, setSessionIds] = useState([]);
  const [summaries, setSummaries] = useState([]);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [wordCounts, setWordCounts] = useState([]);
  const [summaryStyle, setSummaryStyle] = useState("bullets");
  const [files, setFiles] = useState([]);

  function handleFileChange(e) {
    const selected = Array.from(e.target.files).slice(0, 3);
    setFiles(selected);
    setSessionIds([]);
    setSummaries([]);
    setMessages([]);
    setWordCounts([]);
  }

  async function handleGenerate() {
    if (files.length === 0) return;
    setLoading(true);
    setSummaries([]);
    setMessages([]);

    const newSessionIds = [];
    const newWordCounts = [];

    for (const file of files) {
      const form = new FormData();
      form.append("file", file);
      const { data } = await axios.post(`${API}/upload`, form);
      newSessionIds.push(data.session_id);
      newWordCounts.push(data.word_count);
    }

    setSessionIds(newSessionIds);
    setWordCounts(newWordCounts);

    const newSummaries = [];
    for (const sid of newSessionIds) {
      const sum = await axios.post(`${API}/summarize`, new URLSearchParams({
        session_id: sid,
        style: summaryStyle
      }));
      newSummaries.push(sum.data.summary);
    }

    setSummaries(newSummaries);
    setLoading(false);
  }

  async function handleChat() {
    if (!input.trim() || sessionIds.length === 0) return;
    const userMsg = { role: "user", content: input };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    // Chat against first uploaded document (or extend to all if needed)
    const { data } = await axios.post(`${API}/chat`, {
      session_id: sessionIds[0],
      message: input
    });
    setMessages((prev) => [...prev, { role: "ai", content: data.reply }]);
    setLoading(false);
  }

  return (
    <div style={{ maxWidth: 720, margin: "0 auto", padding: "2rem", fontFamily: "sans-serif" }}>
      <h1 style={{ fontSize: 22, fontWeight: 600, marginBottom: 4 }}>AI Document Q&A</h1>
      <p style={{ color: "#666", marginBottom: 24, fontSize: 14 }}>Upload up to 3 PDFs, choose a style, and generate</p>

      {/* Summary Style Selector */}
      <div style={{ marginBottom: 16 }}>
        <label style={{ fontSize: 14, color: "#666", marginRight: 10 }}>Summary style:</label>
        <select
          value={summaryStyle}
          onChange={(e) => setSummaryStyle(e.target.value)}
          style={{ padding: "6px 12px", borderRadius: 8, border: "0.5px solid #ccc", fontSize: 14 }}
        >
          <option value="bullets">Bullet Points</option>
          <option value="brief">Executive Brief</option>
          <option value="eli5">Explain Simply (ELI5)</option>
        </select>
      </div>

      {/* Upload */}
      <div style={{ border: "1.5px dashed #ccc", borderRadius: 10, padding: "2rem", textAlign: "center", marginBottom: 16 }}>
        <input type="file" accept=".pdf" multiple onChange={handleFileChange} />
        {files.length > 0 && (
          <div style={{ marginTop: 10 }}>
            {files.map((f, i) => (
              <p key={i} style={{ fontSize: 13, color: "#555", margin: "2px 0" }}>
                {f.name} {wordCounts[i] ? `— ${wordCounts[i]} words` : ""}
              </p>
            ))}
          </div>
        )}
      </div>

      {/* Generate Button */}
      <button
        onClick={handleGenerate}
        disabled={files.length === 0 || loading}
        style={{
          width: "100%",
          padding: "12px",
          borderRadius: 8,
          background: files.length === 0 || loading ? "#ccc" : "#0070f3",
          color: "#fff",
          border: "none",
          cursor: files.length === 0 || loading ? "not-allowed" : "pointer",
          fontSize: 15,
          fontWeight: 500,
          marginBottom: 24
        }}
      >
        {loading ? "Generating..." : "Generate"}
      </button>

      {/* Summaries */}
      {summaries.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          {summaries.map((s, i) => (
            <div key={i} style={{ background: "#f7f7f7", borderRadius: 10, padding: "1.25rem", marginBottom: 16 }}>
              <h2 style={{ fontSize: 15, fontWeight: 600, marginBottom: 8 }}>
                {files[i]?.name} — Summary
              </h2>
              <pre style={{ whiteSpace: "pre-wrap", fontSize: 14, lineHeight: 1.7, margin: 0 }}>{s}</pre>
            </div>
          ))}
        </div>
      )}

      {/* Re-generate with new style after upload */}
      {sessionIds.length > 0 && !loading && (
        <div style={{ marginBottom: 24, display: "flex", alignItems: "center", gap: 10 }}>
          <label style={{ fontSize: 14, color: "#666" }}>Change style:</label>
          <select
            value={summaryStyle}
            onChange={(e) => setSummaryStyle(e.target.value)}
            style={{ padding: "6px 12px", borderRadius: 8, border: "0.5px solid #ccc", fontSize: 14 }}
          />
          <button
            onClick={async () => {
              setLoading(true);
              const newSummaries = [];
              for (const sid of sessionIds) {
                const sum = await axios.post(`${API}/summarize`, new URLSearchParams({
                  session_id: sid,
                  style: summaryStyle
                }));
                newSummaries.push(sum.data.summary);
              }
              setSummaries(newSummaries);
              setLoading(false);
            }}
            style={{ padding: "6px 16px", borderRadius: 8, background: "#0070f3", color: "#fff", border: "none", cursor: "pointer", fontSize: 14 }}
          >
            Re-generate
          </button>
        </div>
      )}

      {/* Chat */}
      {sessionIds.length > 0 && (
        <div>
          <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12 }}>Chat with document</h2>
          <div style={{ border: "0.5px solid #ddd", borderRadius: 10, padding: "1rem", minHeight: 200, marginBottom: 12 }}>
            {messages.length === 0 && (
              <p style={{ color: "#aaa", fontSize: 14 }}>Ask anything about the document...</p>
            )}
            {messages.map((m, i) => (
              <div key={i} style={{ display: "flex", justifyContent: m.role === "user" ? "flex-end" : "flex-start", marginBottom: 10 }}>
                <div style={{
                  background: m.role === "user" ? "#0070f3" : "#f0f0f0",
                  color: m.role === "user" ? "#fff" : "#111",
                  borderRadius: 10,
                  padding: "8px 14px",
                  maxWidth: "80%",
                  fontSize: 14,
                  lineHeight: 1.6
                }}>
                  {m.content}
                </div>
              </div>
            ))}
            {loading && <p style={{ color: "#aaa", fontSize: 13 }}>AI is typing...</p>}
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleChat()}
              placeholder="Ask a question..."
              style={{ flex: 1, padding: "10px 14px", borderRadius: 8, border: "0.5px solid #ccc", fontSize: 14 }}
            />
            <button
              onClick={handleChat}
              style={{ padding: "10px 20px", borderRadius: 8, background: "#0070f3", color: "#fff", border: "none", cursor: "pointer", fontSize: 14 }}
            >
              Send
            </button>
          </div>
        </div>
      )}
    </div>
  );
}