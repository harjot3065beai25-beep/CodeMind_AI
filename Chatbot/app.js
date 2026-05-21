const chatHistory = document.getElementById("chatHistory");
const chatForm = document.getElementById("chatForm");
const chatInput = document.getElementById("chatInput");
const typingIndicator = document.getElementById("typingIndicator");
const newChatBtn = document.getElementById("newChatBtn");
const menuBtn = document.getElementById("menuBtn");
const sidebar = document.getElementById("sidebar");
const historyBtn = document.getElementById("historyBtn");
const searchBtn = document.getElementById("searchBtn");
const historyPanel = document.getElementById("historyPanel");
const searchPanel = document.getElementById("searchPanel");
const historyList = document.getElementById("historyList");
const searchInput = document.getElementById("searchInput");
const searchMeta = document.getElementById("searchMeta");
const attachBtn = document.getElementById("attachBtn");
const fileInput = document.getElementById("fileInput");
const attachImgBtn = document.getElementById("attachImgBtn");
const imageInput = document.getElementById("imageInput");
const attachPreview = document.getElementById("attachPreview");

const USER_AVATAR_SRC = "../images/user_chat.jpg";
const STORAGE_KEY = "codemind_chats_v1";

let selectedFiles = [];
let chats = loadChats();
let activeChatId = ensureActiveChat();

function scrollToBottom() {
  chatHistory.scrollTop = chatHistory.scrollHeight;
}

function escapeHtml(s) {
  return s.replace(/[&<>"']/g, (c) => {
    switch (c) {
      case "&":
        return "&amp;";
      case "<":
        return "&lt;";
      case ">":
        return "&gt;";
      case '"':
        return "&quot;";
      case "'":
        return "&#39;";
      default:
        return c;
    }
  });
}

function getSessionUser() {
  try {
    if (window.CodeMindAuth && CodeMindAuth.getSession) {
      return CodeMindAuth.getSession();
    }
    const raw = localStorage.getItem("codemind_session_v1");
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function getUserInitial() {
  const s = getSessionUser();
  if (!s) return null;
  const source = (s.name && s.name.trim()) || (s.email && s.email.trim()) || "";
  return source ? source.charAt(0).toUpperCase() : null;
}

function createAvatar(role) {
  const avatar = document.createElement("div");
  avatar.className = `avatar ${role}`;

  if (role === "ai") {
    avatar.setAttribute("aria-label", "CodeMind Ai");
    avatar.innerHTML = `
      <svg viewBox="0 0 40 40" width="28" height="28" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <defs>
          <linearGradient id="lg-av" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#00f5d4"/>
            <stop offset="100%" stop-color="#7b2cbf"/>
          </linearGradient>
        </defs>
        <rect x="2" y="2" width="36" height="36" rx="8" stroke="url(#lg-av)" stroke-width="2"/>
        <path d="M12 14h6v12h-6zM22 14h6v8h-6z" fill="url(#lg-av)" opacity=".9"/>
        <circle cx="28" cy="26" r="3" fill="#00f5d4"/>
      </svg>
    `;
    return avatar;
  }

  const initial = getUserInitial();
  if (initial) {
    avatar.textContent = initial;
    avatar.classList.add("avatar-letter");
    avatar.setAttribute("aria-label", "You");
    return avatar;
  }
  const img = document.createElement("img");
  img.alt = "You";
  img.referrerPolicy = "no-referrer";
  img.src = USER_AVATAR_SRC;
  avatar.appendChild(img);
  return avatar;
}

function createBubbleHtml(text, query) {
  if (!query) return `<p>${escapeHtml(text)}</p>`;
  const q = query.trim();
  if (!q) return `<p>${escapeHtml(text)}</p>`;

  const safe = escapeHtml(text);
  const re = new RegExp(escapeRegExp(q), "ig");
  const highlighted = safe.replace(re, (m) => `<mark class="match">${m}</mark>`);
  return `<p>${highlighted}</p>`;
}

function escapeRegExp(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function createMessage(role, text, query) {
  const article = document.createElement("article");
  article.className = `message ${role} fade-in`;

  const avatar = createAvatar(role);
  const bubble = document.createElement("div");
  bubble.className = "bubble";
  bubble.innerHTML = createBubbleHtml(text, query);

  article.appendChild(avatar);
  article.appendChild(bubble);
  return article;
}

function showTyping(show) {
  typingIndicator.classList.toggle("hidden", !show);
}

function appendMessage(role, text) {
  const active = getActiveChat();
  active.messages.push({ role, text, ts: Date.now() });
  saveChats();

  chatHistory.appendChild(createMessage(role, text, searchInput?.value));
  scrollToBottom();
}

async function getAiResponse(userMessage) {
    const API_KEY = "AIzaSyBiBmyCTDQw9mbbiWvEdVWPgZV-3xWVG9I";

    try {
        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${API_KEY}`,
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    contents: [
                        {
                            parts: [{ text: userMessage }]
                        }
                    ]
                })
            }
        );

        const data = await response.json();

        return data.candidates?.[0]?.content?.parts?.[0]?.text || "No response from AI.";
    } catch (error) {
        return "Error connecting to AI.";
    }
}

chatForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const message = chatInput.value.trim();
  if (!message) return;

  const fileNote =
    selectedFiles.length > 0
      ? `\n\nAttached: ${selectedFiles.map((f) => f.name).join(", ")}`
      : "";
  appendMessage("user", `${message}${fileNote}`);
  chatInput.value = "";
  chatInput.focus();
  selectedFiles = [];
  renderAttachPreview();

  showTyping(true);
  scrollToBottom();

  try {
    const reply = await getAiResponse(message);
    showTyping(false);
    appendMessage("ai", reply);
  } catch (error) {
    showTyping(false);
    appendMessage("ai", "Something went wrong. Please try again.");
  }
});

newChatBtn.addEventListener("click", () => {
  startNewChat();
});

menuBtn.addEventListener("click", () => {
  sidebar.classList.toggle("open");
});

chatInput.addEventListener("keydown", (event) => {
  // Enter sends message. Shift+Enter can be reserved if changed to textarea later.
  if (event.key === "Enter" && !event.shiftKey) {
    event.preventDefault();
    chatForm.requestSubmit();
  }
});

historyBtn.addEventListener("click", () => {
  historyPanel.classList.toggle("hidden");
  searchPanel.classList.add("hidden");
  renderHistory();
});

searchBtn.addEventListener("click", () => {
  searchPanel.classList.toggle("hidden");
  historyPanel.classList.add("hidden");
  if (!searchPanel.classList.contains("hidden")) {
    searchInput.focus();
  }
  applySearch();
});

searchInput.addEventListener("input", () => {
  applySearch();
});

attachBtn.addEventListener("click", () => {
  fileInput.click();
});

fileInput.addEventListener("change", () => {
  selectedFiles = Array.from(fileInput.files || []);
  renderAttachPreview();
});

attachImgBtn.addEventListener("click", () => {
  imageInput.click();
});

imageInput.addEventListener("change", () => {
  const imgs = Array.from(imageInput.files || []);
  selectedFiles = selectedFiles.concat(imgs);
  renderAttachPreview();
});

function initVoiceToText() {
  const voiceBtn = document.getElementById("voiceBtn");
  const chatInputField = document.getElementById("chatInputField");
  const chatInputRecording = document.getElementById("chatInputRecording");
  if (!voiceBtn || !chatInputField || !chatInput || !chatInputRecording) return;

  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) {
    voiceBtn.disabled = true;
    voiceBtn.title = "Voice input is not supported in this browser. Try Chrome or Edge.";
    return;
  }

  let recognition = null;
  let isVoiceRecording = false;
  let voicePrefix = "";
  let voiceFinalTranscript = "";

  function setRecordingUI(active) {
    isVoiceRecording = active;
    voiceBtn.classList.toggle("is-recording", active);
    voiceBtn.setAttribute("aria-pressed", active ? "true" : "false");
    voiceBtn.setAttribute(
      "aria-label",
      active ? "Stop recording and add text" : "Start voice input"
    );
    chatInputField.classList.toggle("is-recording", active);
    if (active) {
      chatInputRecording.hidden = false;
      chatInputRecording.setAttribute("aria-hidden", "false");
      chatInput.placeholder = "";
    } else {
      chatInputRecording.hidden = true;
      chatInputRecording.setAttribute("aria-hidden", "true");
      chatInput.placeholder = "Ask anything…";
    }
  }

  function startVoiceRecording() {
    voicePrefix = chatInput.value;
    if (voicePrefix && !/\s$/.test(voicePrefix)) voicePrefix += " ";
    voiceFinalTranscript = "";
    setRecordingUI(true);
    try {
      recognition.start();
    } catch (err) {
      if (err.name !== "InvalidStateError") setRecordingUI(false);
    }
  }

  function stopVoiceRecording() {
    if (!isVoiceRecording) return;
    setRecordingUI(false);
    try {
      recognition.stop();
    } catch (e) {
      /* already stopped */
    }
    chatInput.value = chatInput.value.trim();
    chatInput.focus();
  }

  recognition = new SpeechRecognition();
  recognition.continuous = true;
  recognition.interimResults = true;
  recognition.lang = document.documentElement.lang || navigator.language || "en-US";

  recognition.onresult = (event) => {
    let interim = "";
    for (let i = event.resultIndex; i < event.results.length; i++) {
      const transcript = event.results[i][0].transcript;
      if (event.results[i].isFinal) voiceFinalTranscript += transcript;
      else interim += transcript;
    }
    chatInput.value = voicePrefix + voiceFinalTranscript + interim;
  };

  recognition.onerror = (event) => {
    if (event.error === "aborted") return;
    setRecordingUI(false);
    if (event.error === "not-allowed") {
      window.alert(
        "Microphone access was denied. Allow microphone permission in your browser to use voice input."
      );
    }
  };

  recognition.onend = () => {
    if (!isVoiceRecording) return;
    try {
      recognition.start();
    } catch (e) {
      setRecordingUI(false);
      chatInput.value = (voicePrefix + voiceFinalTranscript).trim();
    }
  };

  voiceBtn.addEventListener("click", () => {
    if (isVoiceRecording) stopVoiceRecording();
    else startVoiceRecording();
  });
}

initVoiceToText();

function renderAttachPreview() {
  attachPreview.innerHTML = "";
  if (!selectedFiles.length) {
    attachPreview.classList.add("hidden");
    fileInput.value = "";
    imageInput.value = "";
    return;
  }
  attachPreview.classList.remove("hidden");

  selectedFiles.forEach((f, idx) => {
    const chip = document.createElement("div");
    chip.className = "file-chip";
    chip.innerHTML = `<span>${escapeHtml(f.name)}</span>`;
    const x = document.createElement("button");
    x.type = "button";
    x.setAttribute("aria-label", `Remove ${f.name}`);
    x.textContent = "×";
    x.addEventListener("click", () => {
      selectedFiles.splice(idx, 1);
      renderAttachPreview();
    });
    chip.appendChild(x);
    attachPreview.appendChild(chip);
  });
}

function loadChats() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveChats() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(chats));
}

function newChatObject() {
  return {
    id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()),
    title: "New chat",
    createdAt: Date.now(),
    messages: [],
  };
}

function ensureActiveChat() {
  if (!chats.length) {
    const c = newChatObject();
    c.messages.push({
      role: "ai",
      text: "Hi, I am CodeMind Ai. Ask anything about coding, debugging, or architecture.",
      ts: Date.now(),
    });
    chats.unshift(c);
    saveChats();
    return c.id;
  }
  return chats[0].id;
}

function getActiveChat() {
  const found = chats.find((c) => c.id === activeChatId);
  return found || chats[0];
}

function deriveTitle(chat) {
  const firstUser = chat.messages.find((m) => m.role === "user");
  if (!firstUser) return "New chat";
  const t = firstUser.text.replace(/\s+/g, " ").trim();
  return t.length > 36 ? `${t.slice(0, 36)}…` : t;
}

function renderChat(chat, query) {
  chatHistory.innerHTML = "";
  chat.messages.forEach((m) => {
    chatHistory.appendChild(createMessage(m.role, m.text, query));
  });
  scrollToBottom();
}

function startNewChat() {
  const current = getActiveChat();
  current.title = deriveTitle(current);
  const c = newChatObject();
  c.messages.push({
    role: "ai",
    text: "New chat started. Ask me anything about code, architecture, or debugging.",
    ts: Date.now(),
  });
  chats.unshift(c);
  activeChatId = c.id;
  saveChats();
  renderChat(c, searchInput.value);
  renderHistory();
  historyPanel.classList.add("hidden");
  searchPanel.classList.add("hidden");
}

function renderHistory() {
  historyList.innerHTML = "";
  if (!chats.length) {
    historyList.innerHTML = `<p class="side-help">No chats yet.</p>`;
    return;
  }

  chats.slice(0, 12).forEach((c) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "history-item";
    btn.innerHTML = `
      <span class="dot" aria-hidden="true"></span>
      <span class="meta">
        <span class="title">${escapeHtml(c.title || "Chat")}</span>
        <span class="sub">${new Date(c.createdAt).toLocaleString()}</span>
      </span>
    `;
    btn.addEventListener("click", () => {
      activeChatId = c.id;
      saveChats();
      renderChat(c, searchInput.value);
      sidebar.classList.remove("open");
    });
    historyList.appendChild(btn);
  });
}

function applySearch() {
  const q = (searchInput.value || "").trim();
  const chat = getActiveChat();
  renderChat(chat, q);
  if (!q) {
    searchMeta.textContent = "Type to highlight matches.";
    return;
  }
  const count = (chat.messages || []).reduce((acc, m) => {
    return acc + (m.text.toLowerCase().includes(q.toLowerCase()) ? 1 : 0);
  }, 0);
  searchMeta.textContent = count ? `${count} message(s) matched.` : "No matches.";
}

renderChat(getActiveChat(), "");
renderHistory();
scrollToBottom();

function refreshUserAvatarsInChat() {
  document.querySelectorAll(".message.user .avatar").forEach(function (el) {
    el.replaceWith(createAvatar("user"));
  });
}

/* Auth + theme (shared with website) */
if (window.CodeMindAuth) {
  CodeMindAuth.initTheme();
  CodeMindAuth.initAuth({
    onLoginSuccess: refreshUserAvatarsInChat,
    onLogout: refreshUserAvatarsInChat,
  });
  document.addEventListener("codemind-auth-change", refreshUserAvatarsInChat);
}
