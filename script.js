(function () {
  "use strict";

  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const isDesktop = window.matchMedia("(min-width: 769px)").matches;

  const CHAT_AI_CONFIG = {
    apiKey: "AIzaSyBiBmyCTDQw9mbbiWvEdVWPgZV-3xWVG9I",
    systemPrompt:
      "You are CodeMind AI, a senior coding assistant. Answer clearly, suggest fixes and refactors, and use markdown code blocks (```language) for any code. Be concise unless the user asks for depth.",
    maxTokens: 1024,
  };

   const Api_Url =
    "https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=AIzaSyBiBmyCTDQw9mbbiWvEdVWPgZV-3xWVG9I" 
    encodeURIComponent(CHAT_AI_CONFIG.apiKey);

  function initLoader() {
    const loader = document.getElementById("page-loader");
    if (!loader) return;

    window.addEventListener("load", function onLoad() {
      window.removeEventListener("load", onLoad);
      loader.classList.add("is-hidden");
      setTimeout(function () {
        loader.remove();
      }, 70);
    });

    // Fallback if load event already fired
    if (document.readyState === "complete") {
      loader.classList.add("is-hidden");
      setTimeout(function () {
        loader.remove();
      }, 500);
    }
  }

  /* ---------- Particle canvas background ---------- */
  function initParticles() {
    const canvas = document.getElementById("particle-canvas");
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    let particles = [];
    let animationId;
    let w = 0;
    let h = 0;

    const COUNT = prefersReducedMotion ? 40 : 90;

    function resize() {
      w = canvas.width = window.innerWidth;
      h = canvas.height = window.innerHeight;
    }

    function Particle() {
      this.x = Math.random() * w;
      this.y = Math.random() * h;
      this.vx = (Math.random() - 0.5) * 0.35;
      this.vy = (Math.random() - 0.5) * 0.35;
      this.r = Math.random() * 1.8 + 0.4;
      this.a = Math.random() * 0.45 + 0.15;
    }

    Particle.prototype.step = function () {
      this.x += this.vx;
      this.y += this.vy;
      if (this.x < 0 || this.x > w) this.vx *= -1;
      if (this.y < 0 || this.y > h) this.vy *= -1;
    };

    function initParticlesList() {
      particles = [];
      for (let i = 0; i < COUNT; i++) particles.push(new Particle());
    }

    function getParticleColors() {
      var root = getComputedStyle(document.documentElement);
      return {
        fill: root.getPropertyValue("--particle-fill").trim() || "rgba(0, 245, 212, 0.55)",
        stroke: root.getPropertyValue("--particle-stroke").trim() || "rgba(123, 44, 191, 0.12)",
      };
    }

    function draw() {
      var colors = getParticleColors();
      ctx.clearRect(0, 0, w, h);
      ctx.fillStyle = colors.fill;
      ctx.strokeStyle = colors.stroke;

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        p.step();
        ctx.globalAlpha = p.a;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();

        for (let j = i + 1; j < particles.length; j++) {
          const q = particles[j];
          const dx = p.x - q.x;
          const dy = p.y - q.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 110) {
            ctx.globalAlpha = (1 - dist / 110) * 0.15;
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(q.x, q.y);
            ctx.stroke();
          }
        }
      }
      ctx.globalAlpha = 1;
      animationId = requestAnimationFrame(draw);
    }

    resize();
    initParticlesList();
    window.addEventListener("resize", function () {
      resize();
      initParticlesList();
    });

    if (!prefersReducedMotion) {
      draw();
    } else {
      // Single static frame for reduced motion
      ctx.fillStyle = getParticleColors().fill;
      for (let i = 0; i < 20; i++) {
        ctx.beginPath();
        ctx.arc(Math.random() * w, Math.random() * h, 1.2, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    return function destroy() {
      if (animationId) cancelAnimationFrame(animationId);
    };
  }

  /* ---------- Cursor glow ---------- */
  function initCursorGlow() {
    if (!isDesktop || prefersReducedMotion) return;

    document.body.classList.add("is-desktop");
    const glow = document.getElementById("cursor-glow");
    if (!glow) return;

    let raf;
    let mx = 0;
    let my = 0;
    let cx = window.innerWidth / 2;
    let cy = window.innerHeight / 2;

    function tick() {
      cx += (mx - cx) * 0.08;
      cy += (my - cy) * 0.08;
      glow.style.left = cx + "px";
      glow.style.top = cy + "px";
      raf = requestAnimationFrame(tick);
    }

    window.addEventListener(
      "mousemove",
      function (e) {
        mx = e.clientX;
        my = e.clientY;
        glow.classList.add("is-active");
      },
      { passive: true }
    );

    window.addEventListener(
      "mouseout",
      function (e) {
        if (!e.relatedTarget) glow.classList.remove("is-active");
      },
      { passive: true }
    );

    tick();
  }

  /* ---------- Navbar scroll + mobile menu ---------- */
  function initNav() {
    const header = document.querySelector(".site-header");
    const toggle = document.getElementById("nav-toggle");
    const navMenu = document.getElementById("nav-menu");

    function onScroll() {
      if (!header) return;
      header.classList.toggle("is-scrolled", window.scrollY > 24);
    }

    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();

    function closeMobileMenu() {
      if (!navMenu || !toggle) return;
      navMenu.classList.remove("is-open");
      toggle.classList.remove("is-open");
      toggle.setAttribute("aria-expanded", "false");
    }

    if (toggle && navMenu) {
      toggle.addEventListener("click", function () {
        const open = navMenu.classList.toggle("is-open");
        toggle.classList.toggle("is-open", open);
        toggle.setAttribute("aria-expanded", open ? "true" : "false");
      });

      navMenu.querySelectorAll('a[href^="#"]').forEach(function (a) {
        a.addEventListener("click", function () {
          closeMobileMenu();
        });
      });
    }

    window.closeMobileNav = closeMobileMenu;
  }

  /* ---------- GSAP hero animations ---------- */
  function initGSAP() {
    if (typeof gsap === "undefined" || prefersReducedMotion) return;

    const tl = gsap.timeline({ defaults: { ease: "power3.out" } });

    tl.from(".hero .eyebrow", { opacity: 0, y: 20, duration: 0.6 })
      .from(
        ".hero-title .line",
        { opacity: 0, y: 40, stagger: 0.12, duration: 0.7 },
        "-=0.35"
      )
      .from(".hero-sub", { opacity: 0, y: 24, duration: 0.55 }, "-=0.45")
      .from(".hero-cta .btn", { opacity: 0, y: 16, stagger: 0.1, duration: 0.45 }, "-=0.35")
      .from(".hero-stats .stat", { opacity: 0, y: 20, stagger: 0.08, duration: 0.45 }, "-=0.25")
      .from(".hero-visual .code-window", { opacity: 0, scale: 0.94, duration: 0.7, ease: "back.out(1.2)" }, "-=0.6");

    gsap.to(".hero-scroll-hint", {
      opacity: 0.5,
      yoyo: true,
      repeat: -1,
      duration: 1.8,
      ease: "sine.inOut",
    });
  }

  /* ---------- Stat counters ---------- */
  function initCounters() {
    const nums = document.querySelectorAll(".stat-num[data-count]");
    if (!nums.length) return;

    const animate = function (el) {
      const target = parseInt(el.getAttribute("data-count"), 10);
      const duration = 1200;
      const start = performance.now();

      function frame(now) {
        const t = Math.min(1, (now - start) / duration);
        const eased = 1 - Math.pow(1 - t, 3);
        el.textContent = Math.round(target * eased);
        if (t < 1) requestAnimationFrame(frame);
      }
      requestAnimationFrame(frame);
    };

    const io = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            nums.forEach(animate);
            io.disconnect();
          }
        });
      },
      { threshold: 0.3 }
    );

    const heroStats = document.querySelector(".hero-stats");
    if (heroStats) io.observe(heroStats);
  }

  /* ---------- Tilt on cards ---------- */
  function initTilt() {
    const cards = document.querySelectorAll("[data-tilt]");
    if (!cards.length || prefersReducedMotion) return;

    const max = 8;

    cards.forEach(function (card) {
      card.addEventListener(
        "mousemove",
        function (e) {
          const r = card.getBoundingClientRect();
          const px = (e.clientX - r.left) / r.width - 0.5;
          const py = (e.clientY - r.top) / r.height - 0.5;
          card.style.setProperty("--ry", px * max + "deg");
          card.style.setProperty("--rx", -py * max + "deg");
        },
        { passive: true }
      );

      card.addEventListener(
        "mouseleave",
        function () {
          card.style.setProperty("--ry", "0deg");
          card.style.setProperty("--rx", "0deg");
        },
        { passive: true }
      );
    });
  }

  /* ---------- Three.js torus knot ---------- */
  function initThree() {
    const container = document.getElementById("three-container");
    if (!container || typeof THREE === "undefined") return;

    let renderer;
    let scene;
    let camera;
    let mesh;
    let animId;

    try {
      const width = container.clientWidth;
      const height = Math.max(280, container.clientHeight || 320);

      scene = new THREE.Scene();
      camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
      camera.position.z = 5;

      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
      renderer.setSize(width, height);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      container.appendChild(renderer.domElement);

      const geo = new THREE.TorusKnotGeometry(1, 0.32, 120, 16);
      const mat = new THREE.MeshStandardMaterial({
        color: 0x00f5d4,
        metalness: 0.35,
        roughness: 0.35,
        emissive: 0x2d0a4e,
        emissiveIntensity: 0.4,
      });
      mesh = new THREE.Mesh(geo, mat);
      scene.add(mesh);

      scene.add(new THREE.AmbientLight(0xffffff, 0.35));
      const p1 = new THREE.PointLight(0x7b2cbf, 1.1, 20);
      p1.position.set(3, 3, 4);
      scene.add(p1);
      const p2 = new THREE.PointLight(0x00f5d4, 0.8, 20);
      p2.position.set(-3, -2, 3);
      scene.add(p2);

      function animate(t) {
        animId = requestAnimationFrame(animate);
        if (!mesh) return;
        mesh.rotation.x = t * 0.00035;
        mesh.rotation.y = t * 0.00055;
        renderer.render(scene, camera);
      }

      if (!prefersReducedMotion) {
        animate(0);
      } else {
        renderer.render(scene, camera);
      }

      const ro = new ResizeObserver(function (entries) {
        for (const e of entries) {
          const cr = e.contentRect;
          const w = cr.width;
          const h = Math.max(260, cr.height);
          camera.aspect = w / h;
          camera.updateProjectionMatrix();
          renderer.setSize(w, h);
        }
      });
      ro.observe(container);
    } catch (err) {
      if (container) {
        container.innerHTML =
          '<p style="padding:2rem;color:var(--text-muted);text-align:center;">3D preview unavailable in this browser.</p>';
      }
    }

    return function cleanup() {
      if (animId) cancelAnimationFrame(animId);
      if (renderer) {
        renderer.dispose();
        if (renderer.domElement && renderer.domElement.parentNode) {
          renderer.domElement.parentNode.removeChild(renderer.domElement);
        }
      }
    };
  }

  /* ---------- Contact form ---------- */
  function initForm() {
    const form = document.getElementById("contact-form");
    const status = document.getElementById("form-status");
    if (!form || !status) return;

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      const name = form.name.value.trim();
      const email = form.email.value.trim();
      const message = form.message.value.trim();

      if (!name || !email || !message) {
        status.textContent = "Please fill in all fields.";
        status.style.color = "#ff7b72";
        return;
      }

      status.style.color = "var(--accent)";
      status.textContent = "Thanks, " + name + "! We will reach out at " + email + ".";
      form.reset();
    });
  }

  /* ---------- Chat widget (Google Gemini — Api_Url + user { message, file }) ---------- */
  function initChat() {
    const fab = document.getElementById("chat-fab");
    const win = document.getElementById("chat-window");
    const close = document.getElementById("chat-close");
    const form = document.getElementById("chat-form");
    const input = document.getElementById("chat-input");
    const messages = document.getElementById("chat-messages");
    const sendBtn = form ? form.querySelector('button[type="submit"]') : null;
    const fileInput = document.getElementById("chat-file");
    const attachBtn = document.getElementById("chat-attach");

    if (!fab || !win || !form || !input || !messages) return;

    /** Same shape as your bot — filled each send, optional file as base64 */
    let user = {
      message: null,
      file: {
        mime_type: null,
        data: null,
      },
    };

    /** Gemini conversation history */
    let geminiContents = [];

    function hasRealApiKey() {
      const k = CHAT_AI_CONFIG.apiKey;
      return typeof k === "string" && k.length > 30 && k !== "YOUR_API_KEY_HERE";
    }

    function resetUserPayload() {
      user.message = null;
      user.file.mime_type = null;
      user.file.data = null;
      if (fileInput) fileInput.value = "";
      if (attachBtn) {
        attachBtn.classList.remove("has-file");
        attachBtn.title = "Attach file";
      }
    }

    /**
     * Build Gemini `parts` from `user` (text + optional inline_data).
     */
    function buildUserParts() {
      const parts = [];
      const text = user.message != null ? String(user.message).trim() : "";
      const hasFile = !!(user.file && user.file.mime_type && user.file.data);

      if (text) {
        parts.push({ text: text });
      }
      if (hasFile) {
        parts.push({
          inline_data: {
            mime_type: user.file.mime_type,
            data: user.file.data,
          },
        });
      }
      if (parts.length === 0) {
        parts.push({ text: " " });
      }
      if (!text && hasFile) {
        parts.unshift({
          text: "Use the attached file or image to help answer. Summarize, debug, or suggest improvements as appropriate.",
        });
      }
      return parts;
    }

    /**
     * POST to Gemini using Api_Url; uses global `user` for this turn.
     */
    async function fetchAiReply() {
      geminiContents.push({ role: "user", parts: buildUserParts() });

      const body = {
        systemInstruction: {
          parts: [{ text: CHAT_AI_CONFIG.systemPrompt }],
        },
        contents: geminiContents,
        generationConfig: {
          maxOutputTokens: CHAT_AI_CONFIG.maxTokens,
          temperature: 0.7,
        },
      };

      const res = await fetch(Api_Url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json().catch(function () {
        return {};
      });

      if (!res.ok) {
        const msg =
          data.error && data.error.message
            ? data.error.message
            : res.statusText || "Request failed";
        throw new Error(msg + " (" + res.status + ")");
      }

      const candidate = data.candidates && data.candidates[0];
      if (!candidate) {
        const br = data.promptFeedback && data.promptFeedback.blockReason;
        throw new Error(br ? "Response blocked: " + br : "No response from model.");
      }
      const parts = candidate && candidate.content && candidate.content.parts;
      let assistantText = "";
      if (parts && parts.length) {
        assistantText = parts
          .map(function (p) {
            return p.text || "";
          })
          .join("");
        assistantText = String(assistantText).trim();
      }

      if (!assistantText) {
        throw new Error("Empty response from API.");
      }

      geminiContents.push({ role: "model", parts: [{ text: assistantText }] });
      return assistantText;
    }

    function setChatOpen(isOpen) {
      win.hidden = !isOpen;
      fab.setAttribute("aria-expanded", isOpen ? "true" : "false");
      if (isOpen) {
        input.focus();
      } else {
        fab.focus();
      }
    }

    fab.addEventListener("click", function () {
      setChatOpen(win.hidden);
    });

    function openChatPanel() {
      if (win.hidden) setChatOpen(true);
    }

    document.querySelectorAll('a[href="#chat-panel"]').forEach(function (a) {
      a.addEventListener("click", function (e) {
        e.preventDefault();
        openChatPanel();
      });
    });

    if (close) {
      close.addEventListener("click", function (e) {
        e.preventDefault();
        e.stopPropagation();
        setChatOpen(false);
      });
    }

    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && !win.hidden) {
        setChatOpen(false);
      }
    });

    function addBubble(text, who) {
      const div = document.createElement("div");
      div.className = "chat-bubble " + (who === "user" ? "user" : "bot");
      if (who === "bot") {
        div.classList.add("ai-response");
      }
      div.textContent = text;
      messages.appendChild(div);
      messages.scrollTop = messages.scrollHeight;
      return div;
    }

    function addErrorBubble(message) {
      const div = document.createElement("div");
      div.className = "chat-bubble bot error";
      div.textContent = message;
      messages.appendChild(div);
      messages.scrollTop = messages.scrollHeight;
    }

    if (attachBtn && fileInput) {
      attachBtn.addEventListener("click", function () {
        fileInput.click();
      });
      fileInput.addEventListener("change", function () {
        const file = fileInput.files && fileInput.files[0];
        if (!file) {
          user.file.mime_type = null;
          user.file.data = null;
          attachBtn.classList.remove("has-file");
          attachBtn.title = "Attach file";
          return;
        }
        if (file.size > 4 * 1024 * 1024) {
          addErrorBubble("File is too large (max 4 MB).");
          fileInput.value = "";
          return;
        }
        const reader = new FileReader();
        reader.onload = function () {
          const dataUrl = reader.result;
          const comma = String(dataUrl).indexOf(",");
          const base64 = comma >= 0 ? String(dataUrl).slice(comma + 1) : String(dataUrl);
          user.file.mime_type = file.type || "application/octet-stream";
          user.file.data = base64;
          attachBtn.classList.add("has-file");
          attachBtn.title = file.name;
        };
        reader.onerror = function () {
          addErrorBubble("Could not read the file.");
          resetUserPayload();
        };
        reader.readAsDataURL(file);
      });
    }

    function setLoading(isLoading) {
      input.disabled = isLoading;
      if (sendBtn) sendBtn.disabled = isLoading;
      if (attachBtn) attachBtn.disabled = isLoading;
      if (fileInput) fileInput.disabled = isLoading;
    }

    function addLoadingBubble() {
      const wrap = document.createElement("div");
      wrap.className = "chat-bubble bot ai-loading";
      wrap.setAttribute("role", "status");
      wrap.innerHTML =
        '<span class="ai-loading-label">CodeMind is thinking</span><span class="ai-loading-dots" aria-hidden="true"><span>.</span><span>.</span><span>.</span></span>';
      messages.appendChild(wrap);
      messages.scrollTop = messages.scrollHeight;
      return wrap;
    }

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      const q = input.value.trim();
      const hasAttachment = !!(user.file && user.file.mime_type && user.file.data);
      if (!q && !hasAttachment) return;

      user.message = q || null;

      let displayText = q;
      if (!displayText && hasAttachment) {
        displayText = "[Attached file: " + (attachBtn && attachBtn.title ? attachBtn.title : "file") + "]";
      }
      addBubble(displayText, "user");
      input.value = "";

      if (!hasRealApiKey()) {
        addErrorBubble(
          'Live AI is off. In script.js, set CHAT_AI_CONFIG.apiKey to your Google API key and enable the Generative Language API for your project.'
        );
        resetUserPayload();
        return;
      }

      const loadingEl = addLoadingBubble();
      setLoading(true);

      fetchAiReply()
        .then(function (reply) {
          if (loadingEl.parentNode) loadingEl.remove();
          addBubble(reply, "bot");
        })
        .catch(function (err) {
          if (loadingEl.parentNode) loadingEl.remove();
          geminiContents.pop();
          addErrorBubble("Could not get a reply: " + (err && err.message ? err.message : String(err)));
        })
        .finally(function () {
          resetUserPayload();
          setLoading(false);
          input.focus();
        });
    });
  }

  /* ---------- Auth + theme (shared module) ---------- */
  function initTheme() {
    if (window.CodeMindAuth) {
      CodeMindAuth.initTheme();
      document.addEventListener("codemind-theme-change", function () {
        document.body.style.transition = "background-color 0.35s ease, color 0.35s ease";
      });
    }
  }

  function initAuth() {
    if (window.CodeMindAuth) {
      CodeMindAuth.initAuth({});
    }
  }

  /* ---------- Footer year ---------- */
  function initYear() {
    const y = document.getElementById("year");
    if (y) y.textContent = String(new Date().getFullYear());
  }

  /* ---------- Boot ---------- */
  initLoader();
  initParticles();
  initCursorGlow();
  initNav();
  initTheme();
  initAuth();
  initGSAP();
  initCounters();
  initTilt();
  initThree();
  initForm();
  initChat();
  initYear();
})();
