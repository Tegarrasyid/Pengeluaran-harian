// 1) GANTI 2 NILAI DI BAWAH DENGAN PROJECT SUPABASE MILIKMU.
const SUPABASE_URL = "https://kfgcipqnptzvptzyseji.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_l628cTcx-YXOGyPWcs4HlQ_To7PxDeq";

const { createClient } = supabase;
const db = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const $ = id => document.getElementById(id);
let currentUser = null;
let weekStart = mondayOf(new Date());
let expenses = [];

function mondayOf(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return d;
}

function sundayOf(monday) {
  const d = new Date(monday);
  d.setDate(d.getDate() + 6);
  return d;
}

function isoDate(d) {
  const date = new Date(d);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function dateFromInput(value) {
  if (!value) return null;
  const d = new Date(`${value}T00:00:00`);
  return Number.isNaN(d.getTime()) ? null : d;
}

function formatDate(d) {
  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "long",
    year: "numeric"
  }).format(new Date(d));
}

function money(n) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0
  }).format(Number(n) || 0);
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  }[c]));
}

function setMsg(id, msg, error = true) {
  $(id).textContent = msg;
  $(id).style.color = error ? "#dc2626" : "#16a34a";
}

function updateWeekLabel() {
  $("weekLabel").textContent = `${formatDate(weekStart)} – ${formatDate(sundayOf(weekStart))}`;
}

async function init() {
  const { data: { session } } = await db.auth.getSession();
  if (session) showApp(session.user);
  else showLogin();

  db.auth.onAuthStateChange((_event, session) => {
    if (session) showApp(session.user);
    else showLogin();
  });
}

function showLogin() {
  $("loginPage").classList.remove("hidden");
  $("registerPage").classList.add("hidden");
  $("app").classList.add("hidden");
}

function showApp(user) {
  currentUser = user;
  $("loginPage").classList.add("hidden");
  $("registerPage").classList.add("hidden");
  $("app").classList.remove("hidden");

  // Aman meskipun elemen userEmail sedang dikomentari di HTML.
  if ($("userEmail")) $("userEmail").textContent = user.email || "";

  $("date").value = isoDate(new Date());
  updateWeekLabel();
  loadExpenses();
}

$("showRegister").onclick = () => {
  $("loginPage").classList.add("hidden");
  $("registerPage").classList.remove("hidden");
};

$("showLogin").onclick = () => {
  $("registerPage").classList.add("hidden");
  $("loginPage").classList.remove("hidden");
};

$("loginForm").onsubmit = async e => {
  e.preventDefault();
  setMsg("loginMsg", "Memproses...", false);

  const { error } = await db.auth.signInWithPassword({
    email: $("loginEmail").value,
    password: $("loginPassword").value
  });

  if (error) setMsg("loginMsg", error.message);
  else setMsg("loginMsg", "Berhasil masuk.", false);
};

$("registerForm").onsubmit = async e => {
  e.preventDefault();
  setMsg("registerMsg", "Mendaftarkan...", false);

  const { data, error } = await db.auth.signUp({
    email: $("registerEmail").value,
    password: $("registerPassword").value
  });

  if (error) {
    setMsg("registerMsg", error.message);
    return;
  }

  if (data.session) {
    setMsg("registerMsg", "Akun berhasil dibuat.", false);
  } else {
    setMsg("registerMsg", "Akun dibuat. Cek email untuk verifikasi jika diminta oleh Supabase.", false);
  }
};

$("logoutBtn").onclick = async () => {
  await db.auth.signOut();
};

$("prevWeek").onclick = () => {
  weekStart.setDate(weekStart.getDate() - 7);
  updateWeekLabel();
  loadExpenses();
};

$("nextWeek").onclick = () => {
  weekStart.setDate(weekStart.getDate() + 7);
  updateWeekLabel();
  loadExpenses();
};

$("currentWeek").onclick = () => {
  weekStart = mondayOf(new Date());
  updateWeekLabel();
  loadExpenses();
};

async function loadExpenses() {
  if (!currentUser) return;

  const from = isoDate(weekStart);
  const to = isoDate(sundayOf(weekStart));

  const { data, error } = await db
    .from("expenses")
    .select("*")
    .eq("user_id", currentUser.id)
    .gte("expense_date", from)
    .lte("expense_date", to)
    .order("expense_date", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) {
    setMsg("formMsg", error.message);
    return;
  }

  expenses = data || [];
  render();
}

function render() {
  const days = ["Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu", "Minggu"];

  const grouped = days.map((name, i) => {
    const date = new Date(weekStart);
    date.setDate(date.getDate() + i);
    const key = isoDate(date);

    return {
      name,
      date,
      key,
      items: expenses.filter(x => x.expense_date === key)
    };
  });

  const total = expenses.reduce((s, x) => s + Number(x.amount), 0);
  const todayKey = isoDate(new Date());

  $("todayTotal").textContent = money(
    expenses
      .filter(x => x.expense_date === todayKey)
      .reduce((s, x) => s + Number(x.amount), 0)
  );

  $("weekTotal").textContent = money(total);
  $("transactionCount").textContent = expenses.length;
  $("averageTotal").textContent = money(total / 7);

  $("days").innerHTML = grouped.map(g => {
    const dayTotal = g.items.reduce((s, x) => s + Number(x.amount), 0);

    return `<div class="day">
      <div class="day-head">
        <div>
          <div class="day-title">${g.name}</div>
          <div class="muted small">${formatDate(g.date)}</div>
        </div>
        <div class="day-total">${money(dayTotal)}</div>
      </div>
      ${g.items.length ? g.items.map(x => `<div class="expense">
        <div class="expense-main">
          <strong>${escapeHtml(x.description)}</strong>
          <span><span class="badge">${escapeHtml(x.category)}</span>${formatDate(x.expense_date)}</span>
        </div>
        <div class="expense-amount">${money(x.amount)}</div>
        <div class="expense-actions">
          <button class="btn outline" onclick="editExpense('${x.id}')">✏️</button>
          <button class="btn outline" onclick="deleteExpense('${x.id}')">🗑️</button>
        </div>
      </div>`).join("") : `<div class="empty">Belum ada pengeluaran.</div>`}
    </div>`;
  }).join("");
}

$("expenseForm").onsubmit = async e => {
  e.preventDefault();

  const id = $("expenseId").value;
  const payload = {
    user_id: currentUser.id,
    expense_date: $("date").value,
    category: $("category").value,
    description: $("description").value.trim(),
    amount: Number($("amount").value)
  };

  if (!payload.description || !payload.amount) return;

  $("saveBtn").disabled = true;

  let result;
  if (id) {
    result = await db
      .from("expenses")
      .update(payload)
      .eq("id", id)
      .eq("user_id", currentUser.id);
  } else {
    result = await db.from("expenses").insert(payload);
  }

  $("saveBtn").disabled = false;

  if (result.error) {
    setMsg("formMsg", result.error.message);
    return;
  }

  resetForm();
  setMsg("formMsg", id ? "Pengeluaran diperbarui." : "Pengeluaran ditambahkan.", false);
  loadExpenses();
};

window.editExpense = function(id) {
  const x = expenses.find(e => e.id === id);
  if (!x) return;

  $("expenseId").value = x.id;
  $("date").value = x.expense_date;
  $("category").value = x.category;
  $("description").value = x.description;
  $("amount").value = x.amount;
  $("formTitle").textContent = "Edit Pengeluaran";
  $("saveBtn").textContent = "Simpan Perubahan";
  $("cancelEdit").classList.remove("hidden");
  window.scrollTo({ top: 0, behavior: "smooth" });
};

window.deleteExpense = async function(id) {
  const x = expenses.find(e => e.id === id);
  if (!x) return;

  if (!confirm(`Hapus "${x.description}" sebesar ${money(x.amount)}?`)) return;

  const { error } = await db
    .from("expenses")
    .delete()
    .eq("id", id)
    .eq("user_id", currentUser.id);

  if (error) {
    setMsg("formMsg", error.message);
    return;
  }

  loadExpenses();
};

function resetForm() {
  $("expenseId").value = "";
  $("expenseForm").reset();
  $("date").value = isoDate(new Date());
  $("formTitle").textContent = "Tambah Pengeluaran";
  $("saveBtn").textContent = "+ Simpan Pengeluaran";
  $("cancelEdit").classList.add("hidden");
}

$("cancelEdit").onclick = resetForm;

// =========================================================
// DOWNLOAD MULTI-MINGGU
// =========================================================

$("openDownload").onclick = () => {
  $("downloadPanel").classList.remove("hidden");

  // Default: minggu yang sedang ditampilkan.
  $("downloadStart").value = isoDate(weekStart);
  $("downloadEnd").value = isoDate(weekStart);
  setMsg("downloadMsg", "", false);

  $("downloadPanel").scrollIntoView({ behavior: "smooth", block: "start" });
};

$("closeDownload").onclick = () => {
  $("downloadPanel").classList.add("hidden");
};

function getDownloadRange() {
  const startInput = dateFromInput($("downloadStart").value);
  const endInput = dateFromInput($("downloadEnd").value);

  if (!startInput || !endInput) {
    throw new Error("Silakan pilih minggu mulai dan minggu sampai terlebih dahulu.");
  }

  const start = mondayOf(startInput);
  const end = mondayOf(endInput);

  if (start > end) {
    throw new Error("Minggu mulai tidak boleh lebih besar dari minggu sampai.");
  }

  return {
    start,
    end,
    startDate: isoDate(start),
    endDate: isoDate(sundayOf(end))
  };
}

function getWeeksBetween(start, end) {
  const weeks = [];
  const cursor = new Date(start);

  while (cursor <= end) {
    weeks.push(new Date(cursor));
    cursor.setDate(cursor.getDate() + 7);
  }

  return weeks;
}

async function fetchExpensesRange(startDate, endDate) {
  const { data, error } = await db
    .from("expenses")
    .select("*")
    .eq("user_id", currentUser.id)
    .gte("expense_date", startDate)
    .lte("expense_date", endDate)
    .order("expense_date", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) throw error;
  return data || [];
}

function findWeekForExpense(expenseDate, start) {
  const date = dateFromInput(expenseDate);
  const week = mondayOf(date);
  const weekNumber = Math.floor((week - start) / (7 * 24 * 60 * 60 * 1000)) + 1;

  return {
    number: weekNumber,
    monday: week,
    label: `${formatDate(week)} - ${formatDate(sundayOf(week))}`
  };
}

function buildRangeData(range, rows) {
  const weeks = getWeeksBetween(range.start, range.end);

  const detailedRows = rows.map(x => {
    const week = findWeekForExpense(x.expense_date, range.start);

    return {
      "Minggu Ke": week.number,
      "Periode Minggu": week.label,
      "Tanggal": x.expense_date,
      "Hari": new Intl.DateTimeFormat("id-ID", {
        weekday: "long"
      }).format(dateFromInput(x.expense_date)),
      "Kategori": x.category,
      "Keterangan": x.description,
      "Nominal": Number(x.amount)
    };
  });

  const weeklySummary = weeks.map((week, index) => {
    const weekStartDate = isoDate(week);
    const weekEndDate = isoDate(sundayOf(week));
    const weekItems = rows.filter(x =>
      x.expense_date >= weekStartDate && x.expense_date <= weekEndDate
    );

    return {
      "Minggu Ke": index + 1,
      "Mulai": weekStartDate,
      "Sampai": weekEndDate,
      "Periode": `${formatDate(week)} - ${formatDate(sundayOf(week))}`,
      "Jumlah Transaksi": weekItems.length,
      "Total": weekItems.reduce((sum, x) => sum + Number(x.amount), 0)
    };
  });

  const grandTotal = rows.reduce((sum, x) => sum + Number(x.amount), 0);

  return {
    detailedRows,
    weeklySummary,
    grandTotal,
    transactionCount: rows.length
  };
}

function makeFileName(prefix, range, extension) {
  return `${prefix}-${range.startDate}-sampai-${range.endDate}.${extension}`;
}

function downloadBlob(blob, name) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

async function prepareDownload() {
  const range = getDownloadRange();
  setMsg("downloadMsg", "Mengambil data dari Supabase...", false);

  const rows = await fetchExpensesRange(range.startDate, range.endDate);
  const report = buildRangeData(range, rows);

  return { range, report };
}




$("downloadPdf").onclick = async () => {
  try {
    const { range, report } = await prepareDownload();
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    doc.setFontSize(16);
    doc.text("Rekap Pengeluaran Harian", 14, 16);

    doc.setFontSize(10);
    doc.text(
      `${formatDate(range.start)} - ${formatDate(sundayOf(range.end))}`,
      14,
      23
    );
    doc.text(
      `Total transaksi: ${report.transactionCount} | Total pengeluaran: ${money(report.grandTotal)}`,
      14,
      29
    );

    doc.setFontSize(12);
    doc.text("Ringkasan Mingguan", 14, 38);

    doc.autoTable({
      startY: 42,
      head: [["Minggu", "Periode", "Transaksi", "Total"]],
      body: report.weeklySummary.map(row => [
        `Minggu ${row["Minggu Ke"]}`,
        row["Periode"],
        String(row["Jumlah Transaksi"]),
        money(row["Total"])
      ]),
      styles: { fontSize: 8 }
    });

    const detailStartY = (doc.lastAutoTable?.finalY || 42) + 10;
    doc.setFontSize(12);
    doc.text("Detail Pengeluaran", 14, detailStartY);

    const detailRows = report.detailedRows.map(row => [
      `M${row["Minggu Ke"]}`,
      row.Tanggal,
      row.Hari,
      row.Kategori,
      row.Keterangan,
      money(row.Nominal)
    ]);

    if (detailRows.length) {
      doc.autoTable({
        startY: detailStartY + 4,
        head: [["Minggu", "Tanggal", "Hari", "Kategori", "Keterangan", "Nominal"]],
        body: detailRows,
        styles: { fontSize: 7 },
        columnStyles: {
          4: { cellWidth: 48 },
          5: { halign: "right" }
        }
      });
    } else {
      doc.setFontSize(10);
      doc.text("Tidak ada transaksi pada rentang minggu yang dipilih.", 14, detailStartY + 8);
    }

    const finalY = doc.lastAutoTable?.finalY || detailStartY + 8;
    doc.setFontSize(10);
    doc.text(`Total Keseluruhan: ${money(report.grandTotal)}`, 14, finalY + 10);

    doc.save(makeFileName("Rekap-Pengeluaran", range, "pdf"));

    setMsg("downloadMsg", `PDF berhasil dibuat. ${report.transactionCount} transaksi ikut diunduh.`, false);
  } catch (error) {
    setMsg("downloadMsg", error.message || "Gagal membuat PDF.");
  }
};

init();
