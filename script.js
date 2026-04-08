// ================= FIREBASE INIT =================
import { 
  initializeApp 
} from "https://www.gstatic.com/firebasejs/9.22.2/firebase-app.js";
import { 
  getAuth, signOut 
} from "https://www.gstatic.com/firebasejs/9.22.2/firebase-auth.js";
import { 
  getFirestore, collection, doc, getDoc, setDoc, deleteDoc, onSnapshot, query, orderBy, limit 
} from "https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js";

  const firebaseConfig = {
      apiKey: "AIzaSyDi646FJnulEv5gyhQETg5VkVCGZvTUZm4",
      authDomain: "database-jasher-new.firebaseapp.com",
      projectId: "database-jasher-new",
      storageBucket: "database-jasher-new.firebasestorage.app",
      messagingSenderId: "891471113116",
      appId: "1:891471113116:web:71b603091e717d0c433659",
      measure: "G-3X132SE3RE"
  };

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// ================= DOM ELEMENTS =================
const navBtns = document.querySelectorAll(".nav-btn");
const pages = document.querySelectorAll(".page");
const pageTitle = document.getElementById("pageTitle");
const menuToggle = document.getElementById("menuToggle");
const sidebar = document.querySelector(".sidebar");
const logoutBtn = document.getElementById("logoutBtn");
const groupsGrid = document.getElementById("groupsGrid");
const blacklistList = document.getElementById("blacklistList");
const blkIdInput = document.getElementById("blkIdInput");
const blkReasonInput = document.getElementById("blkReasonInput");
const addBlacklistBtn = document.getElementById("addBlacklistBtn");
const leaderboardList = document.getElementById("leaderboardList");
const roleLabel = document.getElementById("roleLabel");
const userLabel = document.getElementById("userLabel");

// ================= SIDEBAR NAVIGATION =================
navBtns.forEach(btn => {
  btn.addEventListener("click", () => {
    navBtns.forEach(n => n.classList.remove("active"));
    btn.classList.add("active");
    pages.forEach(p => p.classList.remove("active"));
    document.getElementById(btn.dataset.page).classList.add("active");
    pageTitle.textContent = btn.textContent;
    if (window.innerWidth <= 800) sidebar.classList.remove("show");
  });
});

menuToggle.addEventListener("click", () => sidebar.classList.toggle("show"));
document.addEventListener("click", e => {
  if (window.innerWidth > 800) return;
  if (!sidebar.contains(e.target) && !menuToggle.contains(e.target)) sidebar.classList.remove("show");
});

// ================= AUTH CHECK =================
function checkLogin() {
  const username = localStorage.getItem("username");
  const role = localStorage.getItem("role") || "user";
  if (!username) {
    window.location.href = "index.html";
    return;
  }
  userLabel.textContent = username;
  roleLabel.textContent = role.toUpperCase();
  window.currentUserRole = role;

  startGroupsListener();
  startBlacklistListener();
  startLeaderboardListener();
}

checkLogin();

// Logout
logoutBtn.addEventListener("click", async () => {
  localStorage.removeItem("username");
  localStorage.removeItem("role");
  await signOut(auth);
  window.location.href = "index.html";
});

// ================= HELPERS =================
function escapeHtml(t) {
  return t ? String(t).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;") : "";
}

// ================= GROUPS LISTENER =================
function startGroupsListener() {
  let blacklistSet = new Set();

  // DENGARKAN BLACKLIST GROUPS DARI BOT
  onSnapshot(collection(db, "blacklistGroups"), snap => {
    blacklistSet.clear();
    snap.forEach(docSnap => blacklistSet.add(docSnap.id));

    document.querySelectorAll(".group-card").forEach(card => {
      const groupId = card.dataset.id;
      const statusDiv = card.querySelector(".status");
      const blBtn = card.querySelector(".bl-btn");
      if (statusDiv) statusDiv.textContent = blacklistSet.has(groupId) ? "🚫 Blacklist" : "🟢 Aktif";
      if (blBtn) blBtn.textContent = blacklistSet.has(groupId) ? "Hapus dari Blacklist" : "Blacklist";
    });
  });

  // DENGARKAN SEMUA GROUP DARI BOT
  onSnapshot(collection(db, "groups"), snap => {
    groupsGrid.innerHTML = "";
    snap.forEach(docSnap => {
      const data = docSnap.data();
      const isBlacklisted = blacklistSet.has(docSnap.id);

      const el = document.createElement("div");
      el.className = "group-card";
      el.dataset.id = docSnap.id;
      el.innerHTML = `
        <div style="display:flex;justify-content:space-between;align-items:start">
          <div>
            <h4>${escapeHtml(data.title || "Tanpa Nama")}</h4>
            <div class="meta">ID: <code>${escapeHtml(docSnap.id)}</code></div>
            <div class="meta">Added by: ${escapeHtml(data.addedByName || data.addedBy || "-")}</div>
            <div class="meta status">${isBlacklisted ? "🚫 Blacklist" : "🟢 Aktif"}</div>
          </div>
          <div style="text-align:right" class="meta">${data.memberCount || 0} anggota</div>
        </div>
      `;

      // ADMIN ACTIONS
      if (window.currentUserRole === "admin") {
        const actions = document.createElement("div");
        actions.style.display = "flex";
        actions.style.gap = "8px";
        actions.style.marginTop = "10px";

        const delBtn = document.createElement("button");
        delBtn.className = "small-btn danger";
        delBtn.textContent = "Hapus Grup";
        delBtn.onclick = async () => {
          if (confirm(`Yakin hapus ${data.title}?`)) {
            // tandai untuk bot cleanup
            await setDoc(doc(db, "groups", docSnap.id), { markedDeleted: true }, { merge: true });
          }
        };

        const blBtn = document.createElement("button");
        blBtn.className = "small-btn bl-btn";
        blBtn.textContent = isBlacklisted ? "Hapus dari Blacklist" : "Blacklist";
        blBtn.onclick = async () => {
          if (blacklistSet.has(docSnap.id)) {
            await deleteDoc(doc(db, "blacklistGroups", docSnap.id));
          } else {
            const reason = prompt("Alasan:", "Spam");
            if (reason !== null) {
              await setDoc(doc(db, "blacklistGroups", docSnap.id), { reason, date: Date.now() });
            }
          }
        };

        actions.appendChild(blBtn);
        actions.appendChild(delBtn);
        el.appendChild(actions);
      }

      groupsGrid.appendChild(el);
    });
  });
}

// ================= BLACKLIST LISTENER =================
function startBlacklistListener() {
  onSnapshot(collection(db, "blacklistGroups"), snap => {
    blacklistList.innerHTML = "";
    snap.forEach(docSnap => {
      const data = docSnap.data();
      const li = document.createElement("li");
      li.innerHTML = `
        <div>
          <strong>${escapeHtml(docSnap.id)}</strong>
          <div class="meta">${escapeHtml(data.reason || "-")} (${new Date(data.date).toLocaleString()})</div>
        </div>
      `;
      if (window.currentUserRole === "admin") {
        const rm = document.createElement("button");
        rm.className = "small-btn";
        rm.textContent = "Hapus";
        rm.onclick = async () => {
          if (confirm(`Hapus ${docSnap.id}?`)) await deleteDoc(doc(db, "blacklistGroups", docSnap.id));
        };
        li.appendChild(rm);
      }
      blacklistList.appendChild(li);
    });
  });

  if (addBlacklistBtn) {
    addBlacklistBtn.addEventListener("click", async () => {
      if (window.currentUserRole !== "admin") return alert("Hanya admin bisa menambah blacklist.");
      const id = blkIdInput.value.trim();
      if (!id) return alert("Masukkan ID grup!");
      const reason = blkReasonInput.value.trim() || "Tidak disebutkan";
      await setDoc(doc(db, "blacklistGroups", id), { reason, date: Date.now() });
      blkIdInput.value = "";
      blkReasonInput.value = "";
      alert("Berhasil menambahkan blacklist!");
    });
  }
}

// ================= LEADERBOARD (dari USERS) =================

function startLeaderboardListener() {
  const q = query(collection(db, "leaderboard"), orderBy("poinJasher", "desc"), limit(20));

  onSnapshot(q, (snap) => {
    leaderboardList.innerHTML = "";

    const header = document.createElement("div");
    header.style.display = "flex";
    header.style.justifyContent = "space-between";
    header.style.fontWeight = "bold";
    header.style.padding = "4px 0";
    header.innerHTML = `
      <div style="flex:2">Nama</div>
      <div style="flex:1;text-align:center">Poin</div>
      <div style="flex:1;text-align:center">Group</div>
      <div style="flex:1;text-align:center">Status</div>
    `;
    leaderboardList.appendChild(header);

    snap.forEach(doc => {
      const u = doc.data();
      const row = document.createElement("div");
      row.style.display = "flex";
      row.style.justifyContent = "space-between";
      row.style.padding = "4px 0";
      row.innerHTML = `
        <div style="flex:2">${escapeHtml(u.username || doc.id)}</div>
        <div style="flex:1;text-align:center">${u.poinJasher || 0}</div>
        <div style="flex:1;text-align:center">${u.jumlahGroup || 0}</div>
        <div style="flex:1;text-align:center">${u.premiumUser?.active ? "Premium" : "Free"}</div>
      `;
      leaderboardList.appendChild(row);
    });
  });
}