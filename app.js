// Firebase modules
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import {
  getAuth,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import {
  getFirestore,
  collection,
  addDoc,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  orderBy,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

// --- START: FIREBASE CONFIGURATION ---
const firebaseConfig = {
  apiKey: "AIzaSyBOEhoHh4JNkTyjXgZArpvi-WTfXi0UBWU",
  authDomain: "mopeli-portfolio.firebaseapp.com",
  projectId: "mopeli-portfolio",
  storageBucket: "mopeli-portfolio.firebasestorage.app",
  messagingSenderId: "712030847258",
  appId: "1:712030847258:web:ba9378ea9794ce9288eca3"
};
// --- END: FIREBASE CONFIGURATION ---

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// ---------- State ----------
let isAdmin = false;
let projects = []; // latest snapshot, kept so we can re-render when auth changes

// ---------- DOM ----------
const $ = (id) => document.getElementById(id);
const adminPanel = $("admin-panel");
const adminToggle = $("admin-toggle");
const logoutBtn = $("logout-btn");
const loginModal = $("login-modal");
const closeLoginBtn = $("close-login");
const loginForm = $("login-form");
const loginError = $("login-error");
const projectForm = $("project-form");
const projectsGrid = $("projects-grid");
const emptyState = $("empty-state");
const projectCount = $("project-count");
const secretMark = $("secret-mark");

$("year").textContent = new Date().getFullYear();

// ---------- Helpers ----------
// Escape text before putting it in innerHTML
function esc(value = "") {
  return String(value).replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  }[c]));
}

// Only allow http(s) links
function safeUrl(url = "") {
  try {
    const u = new URL(url);
    return u.protocol === "https:" || u.protocol === "http:" ? u.href : "#";
  } catch {
    return "#";
  }
}

function faviconFor(url) {
  try {
    const host = new URL(url).hostname;
    return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(host)}&sz=128`;
  } catch {
    return "";
  }
}

// ---------- Rendering ----------
function render() {
  projectsGrid.innerHTML = "";

  const has = projects.length > 0;
  emptyState.classList.toggle("hidden", has);
  projectCount.textContent = has
    ? `${projects.length} ${projects.length === 1 ? "website" : "websites"}`
    : "";

  projects.forEach((p) => {
    const card = document.createElement("article");
    card.className = "project-card";

    const initial = esc((p.title || "?").trim().charAt(0).toUpperCase());
    const icon = faviconFor(p.url);

    card.innerHTML = `
      <div class="card-top">
        <div class="favicon">
          ${icon
            ? `<img src="${esc(icon)}" alt="" loading="lazy">`
            : `<span class="fallback">${initial}</span>`}
        </div>
        <div>
          <h3>${esc(p.title)}</h3>
          <span class="tech">${esc(p.tech)}</span>
        </div>
      </div>
      <p class="desc">${esc(p.desc)}</p>
      <a class="visit" href="${esc(safeUrl(p.url))}" target="_blank" rel="noopener">Visit website</a>
      ${isAdmin ? `<button type="button" class="delete-btn" data-id="${esc(p.id)}" aria-label="Delete ${esc(p.title)}">&times;</button>` : ""}
    `;

    // If the favicon fails to load, fall back to the first letter
    const img = card.querySelector(".favicon img");
    if (img) {
      img.addEventListener("error", () => {
        img.parentElement.innerHTML = `<span class="fallback">${initial}</span>`;
      });
    }

    projectsGrid.appendChild(card);
  });
}

// Delete (event delegation, admin only)
projectsGrid.addEventListener("click", async (e) => {
  const btn = e.target.closest(".delete-btn");
  if (!btn || !isAdmin) return;
  if (confirm("Remove this website from your portfolio?")) {
    try {
      await deleteDoc(doc(db, "projects", btn.dataset.id));
    } catch (err) {
      alert("Could not delete: " + err.message);
    }
  }
});

// ---------- Live data (one listener only) ----------
const q = query(collection(db, "projects"), orderBy("createdAt", "desc"));
onSnapshot(
  q,
  (snapshot) => {
    projects = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
    render();
  },
  (err) => console.error("Could not load projects:", err)
);

// ---------- Auth ----------
onAuthStateChanged(auth, (user) => {
  isAdmin = !!user;
  adminPanel.classList.toggle("hidden", !isAdmin);
  render(); // show/hide delete buttons
});

// Secret login: Ctrl + Shift + L
window.addEventListener("keydown", (e) => {
  if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === "l") {
    e.preventDefault();
    openLogin();
  }
});

// Secret login: click the "M" mark 5 times quickly
let taps = 0;
let tapTimer;
secretMark.addEventListener("click", () => {
  taps += 1;
  clearTimeout(tapTimer);
  tapTimer = setTimeout(() => (taps = 0), 1500);
  if (taps >= 5) {
    taps = 0;
    openLogin();
  }
});

function openLogin() {
  if (isAdmin || loginModal.open) return;
  loginError.classList.add("hidden");
  loginModal.showModal();
  $("admin-email").focus();
}

closeLoginBtn.addEventListener("click", () => loginModal.close());

loginForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const email = $("admin-email").value.trim();
  const password = $("admin-password").value;
  try {
    await signInWithEmailAndPassword(auth, email, password);
    loginForm.reset();
    loginModal.close();
  } catch {
    loginError.textContent = "That email or password isn't right. Try again.";
    loginError.classList.remove("hidden");
  }
});

logoutBtn.addEventListener("click", () => signOut(auth));

// Collapse / expand the admin panel
adminToggle.addEventListener("click", () => {
  const collapsed = adminPanel.classList.toggle("collapsed");
  adminToggle.setAttribute("aria-expanded", String(!collapsed));
});

// ---------- Add a website ----------
projectForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const submitBtn = projectForm.querySelector("button[type=submit]");
  submitBtn.disabled = true;

  try {
    await addDoc(collection(db, "projects"), {
      title: $("project-title").value.trim(),
      url: $("project-url").value.trim(),
      tech: $("project-tech").value.trim(),
      desc: $("project-desc").value.trim(),
      createdAt: serverTimestamp()
    });
    projectForm.reset();
  } catch (err) {
    alert("Could not publish: " + err.message);
  } finally {
    submitBtn.disabled = false;
  }
});
