import { useState } from "react";
import axios from "axios";

const API = "https://summarize-and-chat-production.up.railway.app";

const styles = {
  page: { maxWidth: 740, margin: "0 auto", padding: "2rem 1.5rem", fontFamily: "'Inter', sans-serif", color: "#111" },
  heading: { fontSize: 24, fontWeight: 700, margin: 0 },
  sub: { fontSize: 14, color: "#777", marginTop: 4, marginBottom: 28 },
  label: { fontSize: 13, color: "#555", marginRight: 10 },
  select: { padding: "7px 12px", borderRadius: 8, border: "1px solid #ddd", fontSize: 14, background: "#fafafa", cursor: "pointer" },
  dropzone: { border: "1.5px dashed #ccc", borderRadius: 12, padding: "2rem", textAlign: "center", background: "#fafafa", marginBottom: 16 },
  fileTag: { display: "inline-block", background: "#f0f0f0", borderRadius: 6, padding: "4px 10px", fontSize: 13, margin: "4px 4px 0 0", color: "#444" },
  btn: { padding: "11px 0", borderRadius: 10, background: "#111", color: "#fff", border: "none", cursor: "pointer", fontSize: 15, fontWeight: 500, width: "100%", marginTop: 12 },
  btnDisabled: { padding: "11px 0", borderRadius: 10, background: "#ccc", color: "#fff", border: "none", cursor: "not-allowed", fontSize: 15, fontWeight: 500, width: "100%", marginTop: 12 },
  card: { background: "#fff", border: "1px solid #eee", borderRadius: 12, padding: "1.25rem 1.5rem", marginBottom: 16 },
  cardTitle: { fontSize: 14, fontWeight: 600, marginBottom: 8, color: "#333" },
  pre: { whiteSpace: "pre-wrap", fontSize: 14, lineHeight: 1.8, margin: 0, color: "#222" },
  chip: { display: "inline-block", padding: "6px 14px", borderRadius: 20, border: "1px solid #ddd", fontSize: 13, cursor: "pointer", margin: "4px 6px 4px 0", background: "#fafafa", color: "#333", transition: "all 0.2s" },
  chatBox: { border: "1px solid #eee", borderRadius: 12, padding: "1rem", minHeight: 220, marginBottom: 12, background: "#fff" },
  msgUser: { display: "flex", justifyContent: "flex-end", marginBottom: 10 },
  msgAI: { display: "flex", justifyContent: "flex-start", marginBottom: 10 },
  bubbleUser: { background: "#111", color: "#fff", borderRadius: 10, padding: "9px 14px", maxWidth: "78%", fontSize: 14, lineHeight: 1.6 },
  bubbleAI: { background: "#f4f4f4", color: "#111", borderRadius: 10, padding: "9px 14px", maxWidth: "78%", fontSize: 14, lineHeight: 1.6 },
  inputRow: { display: "flex", gap: 8 },
  input: { flex: 1, padding: "10px 14px", borderRadius: 10, border: "1px solid #ddd", fontSize: 14, outline: "none", background: "#fafafa" },
  sendBtn: { padding: "10px 20px", borderRadius: 10, background: "#111", color: "#fff", border: "none", cursor: "pointer", fontSize: 14 },
  hint: { fontSize: 13, color: "#aaa", textAlign: "center", padding: "2rem 0" },
  sectionTitle: { fontSize: 16, fontWeight: 600, marginBottom: 12, color: "#111" },
  styleRow: { display: "flex", alignItems: "center", gap: 10, marginBottom: 20, flexWrap: "wrap" },
  regenBtn: { padding: "7px 16px", borderRadius: 8, background: "#fff", border: "1px solid #ddd", cursor: "pointer", fontSize: 13, color: "#333" }
};

export default function App() {
  const [sessionIds, setSessionIds] = useState([]);
  const [summaries, setSummaries] = useState([]);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [wordCounts, setWordCounts] = useState([]);
  const [summaryStyle, setSummaryStyle] = useState("bullets");
  const [files, setFiles] = useState([]);
  const [suggestions, setSuggestions] = useState([]);

  function handleFileChange(e) {
    const selected = Array.from(e.target.files).slice(0, 3);
    setFiles(selected);
    setSessionIds([]);
    setSummaries([]);
    setMessages([]);
    setWordCounts([]);
    setSuggestions([]);
  }

  async function handleGenerate() {
    if (files.length === 0) return;
    setLoading(true);
    setSummaries([]);
    setMessages([]);
    setSuggestions([]);

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
      const sum = await axios.post(`${API}/summarize`, new URLSearchParams({ session_id: sid, style: summaryStyle }));
      newSummaries.push(sum.data.summary);
    }
    setSummaries(newSummaries);

    // Fetch suggested questions from first document
    const sug = await axios.post(`${API}/suggest`, { session_id: newSessionIds[0] });
    setSuggestions(sug.data.questions);

    setLoading(false);
  }

  async function handleRegenerate() {
    if (sessionIds.length === 0) return;
    setLoading(true);
    const newSummaries = [];
    for (const sid of sessionIds) {
      const sum = await axios.post(`${API}/summarize`, new URLSearchParams({ session_id: sid, style: summaryStyle }));
      newSummaries.push(sum.data.summary);
    }
    setSummaries(newSummaries);
    setLoading(false);
  }

  async function handleChat(question) {
    const msg = question || input;
    if (!msg.trim() || sessionIds.length === 0) return;
    const userMsg = { role: "user", content: msg };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    const { data } = await axios.post(`${API}/chat`, { session_id: sessionIds[0], message: msg });
    setMessages((prev) => [...prev, { role: "ai", content: data.reply }]);
    setLoading(false);
  }

  return (
    <div style={styles.page}>
      <h1 style={styles.heading}>Document AI</h1>
      <p style={styles.sub}>Upload PDFs · Summarize · Ask questions</p>

      {/* Style selector */}
      <div style={styles.styleRow}>
        <span style={styles.label}>Summary style</span>
        <select style={styles.select} value={summaryStyle} onChange={(e) => setSummaryStyle(e.target.value)}>
          <option value="bullets">Bullet Points</option>
          <option value="brief">Executive Brief</option>
          <option value="eli5">Explain Simply</option>
        </select>
        {sessionIds.length > 0 && !loading && (
          <button style={styles.regenBtn} onClick={handleRegenerate}>Re-generate ↺</button>
        )}
      </div>

      {/* Upload */}
      <div style={styles.dropzone}>
        <input type="file" accept=".pdf" multiple onChange={handleFileChange} />
        <p style={{ fontSize: 13, color: "#999", marginTop: 8, marginBottom: 0 }}>Up to 3 PDFs</p>
        {files.length > 0 && (
          <div style={{ marginTop: 10 }}>
            {files.map((f, i) => (
              <span key={i} style={styles.fileTag}>
                {f.name} {wordCounts[i] ? `· ${wordCounts[i]} words` : ""}
              </span>
            ))}
          </div>
        )}
      </div>

      <button
        style={files.length === 0 || loading ? styles.btnDisabled : styles.btn}
        onClick={handleGenerate}
        disabled={files.length === 0 || loading}
      >
        {loading ? "Working..." : "Generate"}
      </button>

      {/* Summaries */}
      {summaries.length > 0 && (
        <div style={{ marginTop: 28 }}>
          <p style={styles.sectionTitle}>Summary</p>
          {summaries.map((s, i) => (
            <div key={i} style={styles.card}>
              <p style={styles.cardTitle}>{files[i]?.name}</p>
              <pre style={styles.pre}>{s}</pre>
            </div>
          ))}
        </div>
      )}

      {/* Suggested questions */}
      {suggestions.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <p style={{ fontSize: 13, color: "#777", marginBottom: 8 }}>Suggested questions</p>
          {suggestions.map((q, i) => (
            <span key={i} style={styles.chip} onClick={() => handleChat(q)}>
              {q}
            </span>
          ))}
        </div>
      )}

      {/* Chat */}
      {sessionIds.length > 0 && (
        <div>
          <p style={styles.sectionTitle}>Chat with document</p>
          <div style={styles.chatBox}>
            {messages.length === 0 && <p style={styles.hint}>Ask anything or pick a suggestion above</p>}
            {messages.map((m, i) => (
              <div key={i} style={m.role === "user" ? styles.msgUser : styles.msgAI}>
                <div style={m.role === "user" ? styles.bubbleUser : styles.bubbleAI}>{m.content}</div>
              </div>
            ))}
            {loading && <p style={{ color: "#bbb", fontSize: 13, marginTop: 8 }}>Thinking...</p>}
          </div>
          <div style={styles.inputRow}>
            <input
              style={styles.input}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleChat()}
              placeholder="Ask a question about the document..."
            />
            <button style={styles.sendBtn} onClick={() => handleChat()}>Send</button>
          </div>
        </div>
      )}
    </div>
  );
}