import { useState, useRef, useEffect } from "react";
import { sendMessage, ingestFile, getDocuments } from "./api";
import type { Message, Document } from "./types";
import "./App.css";

let nextId = 1;

const STORAGE_KEY = "uploadedFiles";
const SELECTED_DOCS_KEY = "selectedDocs";

export default function App() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: nextId++,
      role: "assistant",
      content: "Hola 👋 Sube un documento y luego hazme preguntas sobre él.",
      ts: new Date(),
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<string[]>([]);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [selectedDocs, setSelectedDocs] = useState<Set<string>>(new Set());
  const bottomRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // Cargar documentos del backend al inicializar
  useEffect(() => {
    loadDocuments();
    // Cargar archivos guardados en localStorage
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      setUploadedFiles(JSON.parse(saved));
    }
    const savedSelected = localStorage.getItem(SELECTED_DOCS_KEY);
    if (savedSelected) {
      setSelectedDocs(new Set(JSON.parse(savedSelected)));
    }
  }, []);

  // Auto-select primero doc si hay solo uno
  useEffect(() => {
    if (documents.length > 0 && selectedDocs.size === 0) {
      const firstDoc = documents[0]?.filename;
      if (firstDoc) {
        const newSelected = new Set([firstDoc]);
        setSelectedDocs(newSelected);
        localStorage.setItem(SELECTED_DOCS_KEY, JSON.stringify(Array.from(newSelected)));
      }
    }
  }, [documents, selectedDocs]);

  // Persistir archivos en localStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(uploadedFiles));
  }, [uploadedFiles]);

  async function loadDocuments() {
    try {
      const docs = await getDocuments();
      setDocuments(docs);
    } catch (e) {
      console.error("Error cargando documentos:", e);
    }
  }

  function push(msg: Omit<Message, "id" | "ts">) {
    setMessages((prev) => [...prev, { ...msg, id: nextId++, ts: new Date() }]);
  }

  function toggleDocument(filename: string) {
    setSelectedDocs((prev) => {
      const newSelected = new Set(prev);
      if (newSelected.has(filename)) {
        newSelected.delete(filename);
      } else {
        newSelected.add(filename);
      }
      localStorage.setItem(SELECTED_DOCS_KEY, JSON.stringify(Array.from(newSelected)));
      return newSelected;
    });
  }

  async function handleSend() {
    const q = input.trim();
    if (!q || loading) return;
    
    if (selectedDocs.size === 0) {
      push({ role: "assistant", content: "⚠️ Selecciona al menos un documento para hacer preguntas." });
      return;
    }

    setInput("");
    push({ role: "user", content: q });
    setLoading(true);
    try {
      const answer = await sendMessage(q, Array.from(selectedDocs));
      push({ role: "assistant", content: answer });
    } catch (e) {
      push({ role: "assistant", content: `⚠️ Error: ${(e as Error).message}` });
    } finally {
      setLoading(false);
    }
  }

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    push({ role: "assistant", content: `📄 Procesando **${file.name}**…` });
    try {
      const name = await ingestFile(file);
      setUploadedFiles((prev) => [...prev, name]);
      // Recargar documentos del backend
      await loadDocuments();
      push({ role: "assistant", content: `✅ **${name}** ingestado. Ya puedes hacer preguntas.` });
    } catch (e) {
      push({ role: "assistant", content: `⚠️ Error al ingestar: ${(e as Error).message}` });
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  function handleKey(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="sidebar-logo">
          <span className="logo-icon">◈</span>
          <span className="logo-text">DocChat</span>
        </div>

        <div className="sidebar-section">
          <p className="sidebar-label">Documentos</p>
          <button
            className="upload-btn"
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
          >
            {uploading ? "Subiendo…" : "+ Subir archivo"}
          </button>
          <input
            ref={fileRef}
            type="file"
            accept=".pdf,.txt,.docx,.md"
            style={{ display: "none" }}
            onChange={handleFile}
          />
          <ul className="file-list">
            {documents.map((doc) => (
              <li key={doc.id} className="file-item">
                <input
                  type="checkbox"
                  id={`doc-${doc.id}`}
                  checked={selectedDocs.has(doc.filename)}
                  onChange={() => toggleDocument(doc.filename)}
                  className="file-checkbox"
                />
                <label htmlFor={`doc-${doc.id}`} className="file-label">
                  <span className="file-icon">📄</span>
                  <span className="file-name">{doc.filename}</span>
                </label>
              </li>
            ))}
            {documents.length === 0 && (
              <li className="file-empty">Sin documentos aún</li>
            )}
          </ul>
        </div>
      </aside>

      <main className="chat-area">
        <header className="chat-header">
          <h1>Asistente de documentos</h1>
          <span className="status-dot" />
          <span className="status-text">Conectado</span>
        </header>

        <div className="messages">
          {messages.map((m) => (
            <div key={m.id} className={`bubble-wrap ${m.role}`}>
              <div className="bubble">
                <p>{m.content}</p>
                <span className="ts">
                  {m.ts.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </span>
              </div>
            </div>
          ))}
          {loading && (
            <div className="bubble-wrap assistant">
              <div className="bubble typing">
                <span /><span /><span />
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        <div className="input-bar">
          <textarea
            className="input-field"
            rows={1}
            placeholder="Escribe tu pregunta…"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKey}
            disabled={loading}
          />
          <button
            className="send-btn"
            onClick={handleSend}
            disabled={loading || !input.trim()}
          >
            ➤
          </button>
        </div>
      </main>
    </div>
  );
}
