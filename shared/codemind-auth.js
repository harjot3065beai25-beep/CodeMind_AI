/**
 * CodeMind AI — shared auth + theme (website & chatbot)
 * Storage: codemind_users_v1, codemind_session_v1, codemind_theme_v1
 */
(function (global) {
  "use strict";

  var THEME_STORAGE_KEY = "codemind_theme_v1";
  var AUTH_USERS_KEY = "codemind_users_v1";
  var AUTH_SESSION_KEY = "codemind_session_v1";
  var SESSION_HASH_PREFIX = "#codemind-session=";
  var EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  function getStoredTheme() {
    try {
      var t = localStorage.getItem(THEME_STORAGE_KEY);
      return t === "light" || t === "dark" ? t : "dark";
    } catch (e) {
      return "dark";
    }
  }

  function applyTheme(theme) {
    var next = theme === "light" ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", next);
    try {
      localStorage.setItem(THEME_STORAGE_KEY, next);
    } catch (e) {}
    document.dispatchEvent(
      new CustomEvent("codemind-theme-change", { detail: { theme: next } })
    );
    return next;
  }

  function toggleTheme() {
    var current = document.documentElement.getAttribute("data-theme") || "dark";
    return applyTheme(current === "light" ? "dark" : "light");
  }

  function updateThemeToggleUI(theme) {
    var icon = document.getElementById("theme-toggle-icon");
    var label = document.getElementById("theme-toggle-label");
    if (!icon || !label) return;
    if (theme === "light") {
      icon.textContent = "\u263E";
      label.textContent = "Dark mode";
    } else {
      icon.textContent = "\u2600";
      label.textContent = "Light mode";
    }
  }

  function initTheme() {
    var saved = getStoredTheme();
    applyTheme(saved);
    updateThemeToggleUI(saved);
    var btnTheme = document.getElementById("btn-theme-toggle");
    if (btnTheme) {
      btnTheme.addEventListener("click", function () {
        updateThemeToggleUI(toggleTheme());
      });
    }
  }

  function getAvatarLetter(name, email) {
    var source = (name && name.trim()) || (email && email.trim()) || "?";
    return source.charAt(0).toUpperCase();
  }

  async function authHashPassword(password, emailSalt) {
    var raw = password + "::" + String(emailSalt).toLowerCase();
    if (global.crypto && crypto.subtle) {
      var buf = new TextEncoder().encode(raw);
      var digest = await crypto.subtle.digest("SHA-256", buf);
      return Array.from(new Uint8Array(digest))
        .map(function (b) {
          return b.toString(16).padStart(2, "0");
        })
        .join("");
    }
    var h = 5381;
    for (var i = 0; i < raw.length; i++) {
      h = Math.imul(h, 33) ^ raw.charCodeAt(i);
    }
    return "h" + (h >>> 0).toString(16) + ":" + raw.length;
  }

  function authGetUsers() {
    try {
      var raw = localStorage.getItem(AUTH_USERS_KEY);
      var arr = raw ? JSON.parse(raw) : [];
      return Array.isArray(arr) ? arr : [];
    } catch (e) {
      return [];
    }
  }

  function authSaveUsers(users) {
    localStorage.setItem(AUTH_USERS_KEY, JSON.stringify(users));
  }

  function authGetSession() {
    try {
      var raw = localStorage.getItem(AUTH_SESSION_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
    }
  }

  function authSetSession(session) {
    if (session) {
      localStorage.setItem(AUTH_SESSION_KEY, JSON.stringify(session));
    } else {
      localStorage.removeItem(AUTH_SESSION_KEY);
    }
    document.dispatchEvent(
      new CustomEvent("codemind-auth-change", { detail: { session: session } })
    );
    syncCrossAppLinks();
  }

  function buildAppHref(baseHref, session) {
    var href = baseHref || "";
    if (session && session.email) {
      try {
        return (
          href.split("#")[0] +
          SESSION_HASH_PREFIX +
          encodeURIComponent(JSON.stringify({ email: session.email, name: session.name || "" }))
        );
      } catch (e) {
        return href.split("#")[0];
      }
    }
    return href.split("#")[0];
  }

  function buildChatbotHref(baseHref, session) {
    return buildAppHref(baseHref || "../Chatbot/index.html", session);
  }

  function syncCrossAppLinks() {
    var session = authGetSession();
    document.querySelectorAll("[data-codemind-chatbot-link]").forEach(function (a) {
      var base = a.getAttribute("data-chatbot-base") || a.getAttribute("href") || "../Chatbot/index.html";
      a.setAttribute("href", buildChatbotHref(base.split("#")[0], session));
    });
    document.querySelectorAll("[data-codemind-website-link]").forEach(function (a) {
      var base = a.getAttribute("data-website-base") || a.getAttribute("href") || "../website/index.html";
      a.setAttribute("href", buildAppHref(base.split("#")[0], session));
    });
  }

  function consumeSessionFromUrl() {
    var hash = global.location.hash || "";
    if (hash.indexOf(SESSION_HASH_PREFIX) !== 0) return false;
    try {
      var session = JSON.parse(decodeURIComponent(hash.slice(SESSION_HASH_PREFIX.length)));
      if (session && session.email) {
        try {
          localStorage.setItem(AUTH_SESSION_KEY, JSON.stringify(session));
        } catch (e) {}
        global.history.replaceState(null, "", global.location.pathname + global.location.search);
        document.dispatchEvent(
          new CustomEvent("codemind-auth-change", { detail: { session: session } })
        );
        return true;
      }
    } catch (e) {}
    return false;
  }

  global.addEventListener("storage", function (e) {
    if (e.key === AUTH_SESSION_KEY || e.key === AUTH_USERS_KEY) {
      document.dispatchEvent(
        new CustomEvent("codemind-auth-change", { detail: { session: authGetSession() } })
      );
      syncCrossAppLinks();
    }
  });

  function findUserByUsername(users, username) {
    var key = username.toLowerCase();
    return users.find(function (u) {
      return (
        (u.name && u.name.toLowerCase() === key) ||
        (u.email && u.email.toLowerCase() === key)
      );
    });
  }

  /**
   * @param {object} opts
   * @param {function} [opts.onLogout] — called after session cleared
   * @param {function} [opts.onLoginSuccess] — called after login/signup
   */
  function initAuth(opts) {
    opts = opts || {};
    var modalAuth = document.getElementById("modal-auth");
    var formLogin = document.getElementById("form-login");
    var formSignup = document.getElementById("form-signup");
    if (!modalAuth || !formLogin || !formSignup) return;

    var msgLogin = document.getElementById("login-msg");
    var msgSignup = document.getElementById("signup-msg");
    var panelLogin = document.getElementById("panel-login");
    var panelSignup = document.getElementById("panel-signup");
    var authSubtitle = document.getElementById("auth-subtitle");
    var authTitle = document.getElementById("auth-title");
    var navAuth = document.getElementById("nav-auth");
    var navGuest = document.getElementById("nav-auth-guest");
    var navUser = document.getElementById("nav-auth-user");
    var navLabel = document.getElementById("nav-user-label");
    var navAvatar = document.getElementById("nav-avatar");
    var profileAvatar = document.getElementById("profile-avatar");
    var profileName = document.getElementById("profile-name");
    var profileEmail = document.getElementById("profile-email");
    var profileTrigger = document.getElementById("nav-profile-trigger");
    var profileDropdown = document.getElementById("profile-dropdown");
    var profileWrap = document.getElementById("nav-profile-wrap");
    var btnOpenAuth = document.getElementById("btn-open-auth");
    var linkShowSignup = document.getElementById("link-show-signup");
    var linkShowLogin = document.getElementById("link-show-login");
    var btnLogout = document.getElementById("btn-logout");

    function closeMobileNavIfAny() {
      if (typeof global.closeMobileNav === "function") {
        global.closeMobileNav();
      }
    }

    function showAuthMessage(el, text, isOk) {
      if (!el) return;
      el.textContent = text;
      el.classList.toggle("auth-msg--ok", !!isOk);
    }

    function switchAuthView(view) {
      var isLogin = view === "login";
      if (panelLogin) {
        panelLogin.classList.toggle("is-active", isLogin);
        panelLogin.hidden = !isLogin;
      }
      if (panelSignup) {
        panelSignup.classList.toggle("is-active", !isLogin);
        panelSignup.hidden = isLogin;
      }
      if (authTitle) {
        authTitle.textContent = isLogin ? "Sign in" : "Create account";
      }
      if (authSubtitle) {
        authSubtitle.textContent = isLogin
          ? "Enter your username and password"
          : "Fill in your details to get started";
      }
      showAuthMessage(msgLogin, "", false);
      showAuthMessage(msgSignup, "", false);
    }

    function openAuthModal(view) {
      closeMobileNavIfAny();
      closeProfileDropdown();
      switchAuthView(view || "login");
      modalAuth.hidden = false;
      document.body.style.overflow = "hidden";
      var focusId = view === "signup" ? "signup-name" : "login-username";
      var focusEl = document.getElementById(focusId);
      if (focusEl) setTimeout(function () { focusEl.focus(); }, 200);
    }

    function closeAuthModal() {
      modalAuth.hidden = true;
      document.body.style.overflow = "";
      showAuthMessage(msgLogin, "", false);
      showAuthMessage(msgSignup, "", false);
    }

    function closeProfileDropdown() {
      if (!profileDropdown || !profileTrigger) return;
      profileDropdown.classList.remove("is-open");
      profileTrigger.setAttribute("aria-expanded", "false");
    }

    function openProfileDropdown() {
      if (!profileDropdown || !profileTrigger) return;
      requestAnimationFrame(function () {
        profileDropdown.classList.add("is-open");
      });
      profileTrigger.setAttribute("aria-expanded", "true");
    }

    function toggleProfileDropdown() {
      if (!profileDropdown) return;
      if (profileDropdown.classList.contains("is-open")) {
        closeProfileDropdown();
      } else {
        openProfileDropdown();
      }
    }

    function setAvatarElements(letter) {
      var ch = letter || "?";
      if (navAvatar) navAvatar.textContent = ch;
      if (profileAvatar) profileAvatar.textContent = ch;
    }

    function setNavAuthSignedIn(signedIn) {
      if (navAuth) navAuth.classList.toggle("is-signed-in", signedIn);
      var sidebarAuth = document.querySelector(".sidebar-auth");
      if (sidebarAuth) sidebarAuth.classList.toggle("is-signed-in", signedIn);
      if (navGuest) {
        if (signedIn) navGuest.setAttribute("hidden", "");
        else navGuest.removeAttribute("hidden");
      }
      if (navUser) {
        if (signedIn) navUser.removeAttribute("hidden");
        else navUser.setAttribute("hidden", "");
      }
    }

    function refreshAuthUI() {
      var s = authGetSession();
      if (s && s.email) {
        var displayName = s.name && s.name.trim() ? s.name.trim() : s.email;
        var letter = getAvatarLetter(s.name, s.email);
        setNavAuthSignedIn(true);
        if (navLabel) {
          navLabel.textContent = displayName;
          navLabel.title = s.email;
        }
        if (profileName) profileName.textContent = displayName;
        if (profileEmail) profileEmail.textContent = s.email;
        setAvatarElements(letter);
      } else {
        setNavAuthSignedIn(false);
        closeProfileDropdown();
      }
      syncCrossAppLinks();
    }

    refreshAuthUI();
    syncCrossAppLinks();
    switchAuthView("login");

    if (btnOpenAuth) {
      btnOpenAuth.addEventListener("click", function () {
        openAuthModal("login");
      });
    }
    if (linkShowSignup) {
      linkShowSignup.addEventListener("click", function () {
        switchAuthView("signup");
        var el = document.getElementById("signup-name");
        if (el) el.focus();
      });
    }
    if (linkShowLogin) {
      linkShowLogin.addEventListener("click", function () {
        switchAuthView("login");
        var el = document.getElementById("login-username");
        if (el) el.focus();
      });
    }

    if (profileTrigger) {
      profileTrigger.addEventListener("click", function (e) {
        e.stopPropagation();
        toggleProfileDropdown();
      });
    }
    if (profileWrap) {
      profileWrap.addEventListener("click", function (e) {
        e.stopPropagation();
      });
    }

    document.addEventListener("click", function () {
      closeProfileDropdown();
    });

    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") {
        closeProfileDropdown();
        if (!modalAuth.hidden) closeAuthModal();
      }
    });

    if (btnLogout) {
      btnLogout.addEventListener("click", function () {
        authSetSession(null);
        closeProfileDropdown();
        closeAuthModal();
        closeMobileNavIfAny();
        refreshAuthUI();
        if (typeof opts.onLogout === "function") opts.onLogout();
      });
    }

    document.querySelectorAll("[data-close-modal]").forEach(function (el) {
      el.addEventListener("click", closeAuthModal);
    });

    formLogin.addEventListener("submit", function (e) {
      e.preventDefault();
      showAuthMessage(msgLogin, "", false);
      var username = document.getElementById("login-username").value.trim();
      var password = document.getElementById("login-password").value;
      if (!username || !password) {
        showAuthMessage(msgLogin, "Enter username and password.", false);
        return;
      }
      var users = authGetUsers();
      var row = findUserByUsername(users, username);
      if (!row) {
        showAuthMessage(msgLogin, "No account found for that username.", false);
        return;
      }
      authHashPassword(password, row.email).then(function (hash) {
        if (hash !== row.passwordHash) {
          showAuthMessage(msgLogin, "Invalid username or password.", false);
          return;
        }
        authSetSession({ email: row.email, name: row.name || "" });
        showAuthMessage(msgLogin, "Signed in successfully!", true);
        refreshAuthUI();
        setTimeout(function () {
          closeAuthModal();
          formLogin.reset();
          if (typeof opts.onLoginSuccess === "function") opts.onLoginSuccess();
        }, 400);
      });
    });

    formSignup.addEventListener("submit", function (e) {
      e.preventDefault();
      showAuthMessage(msgSignup, "", false);
      var name = document.getElementById("signup-name").value.trim();
      var email = document.getElementById("signup-email").value.trim();
      var password = document.getElementById("signup-password").value;
      var confirm = document.getElementById("signup-confirm").value;
      if (!name) {
        showAuthMessage(msgSignup, "Please enter a username.", false);
        return;
      }
      if (!email || !password) {
        showAuthMessage(msgSignup, "Email and password are required.", false);
        return;
      }
      if (!EMAIL_PATTERN.test(email)) {
        showAuthMessage(msgSignup, "Enter a valid email address.", false);
        return;
      }
      if (password.length < 8) {
        showAuthMessage(msgSignup, "Password must be at least 8 characters.", false);
        return;
      }
      if (password !== confirm) {
        showAuthMessage(msgSignup, "Passwords do not match.", false);
        return;
      }
      var users = authGetUsers();
      var em = email.toLowerCase();
      if (users.some(function (u) { return u.email === em; })) {
        showAuthMessage(msgSignup, "An account with this email already exists.", false);
        return;
      }
      if (users.some(function (u) { return u.name && u.name.toLowerCase() === name.toLowerCase(); })) {
        showAuthMessage(msgSignup, "This username is already taken.", false);
        return;
      }
      authHashPassword(password, email).then(function (hash) {
        users.push({ email: em, name: name, passwordHash: hash });
        authSaveUsers(users);
        authSetSession({ email: em, name: name });
        showAuthMessage(msgSignup, "Account created!", true);
        refreshAuthUI();
        setTimeout(function () {
          closeAuthModal();
          formSignup.reset();
          if (typeof opts.onLoginSuccess === "function") opts.onLoginSuccess();
        }, 400);
      });
    });

    document.addEventListener("codemind-auth-change", refreshAuthUI);
    return { refreshAuthUI: refreshAuthUI, openAuthModal: openAuthModal };
  }

  function applyThemeEarly() {
    try {
      var t = localStorage.getItem(THEME_STORAGE_KEY);
      if (t === "light" || t === "dark") {
        document.documentElement.setAttribute("data-theme", t);
      }
    } catch (e) {}
  }

  consumeSessionFromUrl();

  global.CodeMindAuth = {
    applyThemeEarly: applyThemeEarly,
    initTheme: initTheme,
    initAuth: initAuth,
    getSession: authGetSession,
    applyTheme: applyTheme,
    getStoredTheme: getStoredTheme,
    syncCrossAppLinks: syncCrossAppLinks,
    buildChatbotHref: buildChatbotHref,
    consumeSessionFromUrl: consumeSessionFromUrl,
  };
})(window);
