import { useState, useRef, useEffect } from "react";
import { MessageCircle, X, Send, Plus, ArrowLeft, Trash2 } from "lucide-react";
import api from "../api/axios";
import { useAuth } from "../context/AuthContext";

function renderText(text) {
  if (!text) return null;
  const parts = text.split(/(\[.+?\]\(.+?\))/);
  return parts.map((part, i) => {
    const match = part.match(/\[(.+?)\]\((.+?)\)/);
    if (match) {
      return (
        <a
          key={i}
          href={match[2]}
          target="_blank"
          rel="noopener noreferrer"
          className="chat-link"
        >
          {match[1]}
        </a>
      );
    }
    return part.split("\n").map((line, j) => (
      <span key={`${i}-${j}`}>
        {j > 0 && <br />}
        {line}
      </span>
    ));
  });
}

const GREETINGS = [
  (name) => `Hey ${name}! Ready to make your wardrobe work harder? Let's go.`,
  (name) => `Welcome back, ${name}. What are we styling today?`,
  (name) => `Hey ${name}, your personal stylist is here. What's the occasion?`,
  (name) => `${name}! Let's put together something that turns heads today.`,
  (name) => `What's up, ${name}? Tell me the vibe and I'll handle the rest.`,
];

function getGreeting(name) {
  const idx = Math.floor(Math.random() * GREETINGS.length);
  return GREETINGS[idx](name);
}

export default function ChatWidget() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [sessions, setSessions] = useState([]);
  const [activeSession, setActiveSession] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [view, setView] = useState("chat");
  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const loadSessions = async () => {
    try {
      const res = await api.get("/chat/sessions");
      setSessions(res.data.data);
    } catch (e) {
      console.error(e);
    }
  };

  const getWelcomeMessage = () => {
    const firstName = user?.name?.split(" ")[0] || "there";
    return { role: "model", text: getGreeting(firstName) };
  };

  const createSession = () => {
    setActiveSession(null);
    setMessages([getWelcomeMessage()]);
    setView("chat");
  };

  const deleteSession = async (e, sessionId) => {
    e.stopPropagation();
    try {
      await api.delete(`/chat/sessions/${sessionId}`);
      if (activeSession === sessionId) {
        setActiveSession(null);
        setMessages([getWelcomeMessage()]);
      }
      loadSessions();
    } catch (err) {
      console.error(err);
    }
  };

  const loadSession = async (sessionId) => {
    try {
      const res = await api.get(`/chat/sessions/${sessionId}`);
      setActiveSession(sessionId);
      setMessages(res.data.data.messages || []);
      setView("chat");
    } catch (e) {
      console.error(e);
    }
  };

  const sendMessage = async () => {
    if (!input.trim() || loading) return;
    const userMsg = input.trim();
    setInput("");

    let sessionId = activeSession;
    if (!sessionId) {
      try {
        const res = await api.post("/chat/sessions");
        sessionId = res.data.data.sessionId;
        setActiveSession(sessionId);
      } catch (e) {
        console.error(e);
        return;
      }
    }

    setMessages((prev) => [...prev, { role: "user", text: userMsg }]);
    setLoading(true);

    try {
      const res = await api.post(`/chat/sessions/${sessionId}/messages`, {
        message: userMsg,
      });
      setMessages((prev) => [
        ...prev,
        {
          role: "model",
          text: res.data.data.reply,
          attachments: res.data.data.attachments,
        },
      ]);
      loadSessions();
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          role: "model",
          text: "Sorry, something went wrong. Please try again.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleOpen = () => {
    setOpen(true);
    if (!activeSession) {
      loadSessions();
      if (messages.length === 0) {
        setMessages([getWelcomeMessage()]);
      }
    }
  };

  return (
    <>
      {!open && (
        <button className="chat-fab" onClick={handleOpen}>
          <MessageCircle size={24} />
        </button>
      )}

      {open && (
        <div className="chat-panel">
          <div className="chat-header">
            {view === "chat" && sessions.length > 0 && (
              <button
                className="btn-icon"
                onClick={() => {
                  setView("list");
                  loadSessions();
                }}
              >
                <ArrowLeft size={18} />
              </button>
            )}
            <span className="chat-title">
              {view === "list" ? "Conversations" : "Vastria AI"}
            </span>
            <div className="chat-header-actions">
              {view === "chat" && (
                <button
                  className="btn-icon"
                  onClick={createSession}
                  title="New chat"
                >
                  <Plus size={18} />
                </button>
              )}
              <button className="btn-icon" onClick={() => setOpen(false)}>
                <X size={18} />
              </button>
            </div>
          </div>

          {view === "list" ? (
            <div className="chat-sessions">
              <button className="session-item new-chat" onClick={createSession}>
                <Plus size={16} /> New conversation
              </button>
              {sessions.map((s) => (
                <div
                  key={s._id}
                  className={`session-item ${s._id === activeSession ? "active" : ""}`}
                  onClick={() => loadSession(s._id)}
                >
                  <span className="session-title">{s.title}</span>
                  <button
                    className="btn-icon session-delete"
                    onClick={(e) => deleteSession(e, s._id)}
                    title="Delete conversation"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <>
              <div className="chat-messages">
                {messages.map((msg, i) => (
                  <div key={i} className={`chat-msg ${msg.role}`}>
                    <div className="chat-bubble">{renderText(msg.text)}</div>
                  </div>
                ))}
                {loading && (
                  <div className="chat-msg model">
                    <div className="chat-bubble typing">
                      <span />
                      <span />
                      <span />
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>
              <div className="chat-input-area">
                <input
                  type="text"
                  placeholder="Type a message..."
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && sendMessage()}
                  disabled={loading}
                />
                <button
                  className="btn-send"
                  onClick={sendMessage}
                  disabled={loading || !input.trim()}
                >
                  <Send size={18} />
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </>
  );
}
