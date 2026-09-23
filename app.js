// 1) GANTI 2 NILAI DI BAWAH DENGAN PROJECT SUPABASE MILIKMU.
const SUPABASE_URL = "https://kfgcipqnptzvptzyseji.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_l628cTcx-YXOGyPWcs4HlQ_To7PxDeq";

const { createClient } = supabase;
const db = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const $ = id => document.getElementById(id);
let currentUser = null;
let weekStart = mondayOf(new Date());
let expenses = [];

function mondayOf(date){
  const d = new Date(date);
  d.setHours(0,0,0,0);
  const day=d.getDay();
  const diff=day===0?-6:1-day;
  d.setDate(d.getDate()+diff);
  return d;
}
function sundayOf(monday){const d=new Date(monday);d.setDate(d.getDate()+6);return d}
function isoDate(d){
  const date = new Date(d);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}
function formatDate(d){return new Intl.DateTimeFormat("id-ID",{day:"2-digit",month:"long",year:"numeric"}).format(new Date(d))}
function money(n){return new Intl.NumberFormat("id-ID",{style:"currency",currency:"IDR",maximumFractionDigits:0}).format(Number(n)||0)}
function escapeHtml(s){return String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]))}
function setMsg(id,msg,error=true){$(id).textContent=msg;$(id).style.color=error?"#dc2626":"#16a34a"}

function updateWeekLabel(){
  $("weekLabel").textContent=`${formatDate(weekStart)} – ${formatDate(sundayOf(weekStart))}`;
}

async function init(){
  const {data:{session}}=await db.auth.getSession();
  if(session) showApp(session.user); else showLogin();
  db.auth.onAuthStateChange((_event,session)=>session?showApp(session.user):showLogin());
}
function showLogin(){
  $("loginPage").classList.remove("hidden");$("registerPage").classList.add("hidden");$("app").classList.add("hidden");
}
function showApp(user){
  currentUser=user;
  $("loginPage").classList.add("hidden");$("registerPage").classList.add("hidden");$("app").classList.remove("hidden");
  $("userEmail").textContent=user.email||"";
  $("date").value=isoDate(new Date());
  updateWeekLabel(); loadExpenses();
}

$("showRegister").onclick=()=>{$("loginPage").classList.add("hidden");$("registerPage").classList.remove("hidden")};
$("showLogin").onclick=()=>{$("registerPage").classList.add("hidden");$("loginPage").classList.remove("hidden")};

$("loginForm").onsubmit=async e=>{
  e.preventDefault();setMsg("loginMsg","Memproses...",false);
  const {error}=await db.auth.signInWithPassword({email:$("loginEmail").value,password:$("loginPassword").value});
  if(error)setMsg("loginMsg",error.message);else setMsg("loginMsg","Berhasil masuk.",false);
};
$("registerForm").onsubmit=async e=>{
  e.preventDefault();setMsg("registerMsg","Mendaftarkan...",false);
  const {data,error}=await db.auth.signUp({email:$("registerEmail").value,password:$("registerPassword").value});
  if(error){setMsg("registerMsg",error.message);return}
  if(data.session)setMsg("registerMsg","Akun berhasil dibuat.",false);
  else setMsg("registerMsg","Akun dibuat. Cek email untuk verifikasi jika diminta oleh Supabase.",false);
};
$("logoutBtn").onclick=async()=>{await db.auth.signOut()};

$("prevWeek").onclick=()=>{weekStart.setDate(weekStart.getDate()-7);updateWeekLabel();loadExpenses()};
$("nextWeek").onclick=()=>{weekStart.setDate(weekStart.getDate()+7);updateWeekLabel();loadExpenses()};
$("currentWeek").onclick=()=>{weekStart=mondayOf(new Date());updateWeekLabel();loadExpenses()};

async function loadExpenses(){
  if(!currentUser)return;
  const from=isoDate(weekStart),to=isoDate(sundayOf(weekStart));
  const {data,error}=await db.from("expenses").select("*").eq("user_id",currentUser.id).gte("expense_date",from).lte("expense_date",to).order("expense_date",{ascending:true}).order("created_at",{ascending:true});
  if(error){setMsg("formMsg",error.message);return}
  expenses=data||[];render();
}

function render(){
  const days=["Senin","Selasa","Rabu","Kamis","Jumat","Sabtu","Minggu"];
  const grouped=days.map((name,i)=>{
    const date=new Date(weekStart);date.setDate(date.getDate()+i);const key=isoDate(date);
    return {name,date,key,items:expenses.filter(x=>x.expense_date===key)};
  });
  const total=expenses.reduce((s,x)=>s+Number(x.amount),0);
  const todayKey=isoDate(new Date());
  $("todayTotal").textContent=money(expenses.filter(x=>x.expense_date===todayKey).reduce((s,x)=>s+Number(x.amount),0));
  $("weekTotal").textContent=money(total);
  $("transactionCount").textContent=expenses.length;
  $("averageTotal").textContent=money(total/7);
  $("days").innerHTML=grouped.map(g=>{
    const dayTotal=g.items.reduce((s,x)=>s+Number(x.amount),0);
    return `<div class="day">
      <div class="day-head"><div><div class="day-title">${g.name}</div><div class="muted small">${formatDate(g.date)}</div></div><div class="day-total">${money(dayTotal)}</div></div>
      ${g.items.length?g.items.map(x=>`<div class="expense">
        <div class="expense-main"><strong>${escapeHtml(x.description)}</strong><span><span class="badge">${escapeHtml(x.category)}</span>${formatDate(x.expense_date)}</span></div>
        <div class="expense-amount">${money(x.amount)}</div>
        <div class="expense-actions"><button class="btn outline" onclick="editExpense('${x.id}')">✏️</button><button class="btn outline" onclick="deleteExpense('${x.id}')">🗑️</button></div>
      </div>`).join(""):`<div class="empty">Belum ada pengeluaran.</div>`}
    </div>`;
  }).join("");
}

$("expenseForm").onsubmit=async e=>{
  e.preventDefault();
  const id=$("expenseId").value;
  const payload={user_id:currentUser.id,expense_date:$("date").value,category:$("category").value,description:$("description").value.trim(),amount:Number($("amount").value)};
  if(!payload.description||!payload.amount)return;
  $("saveBtn").disabled=true;
  let result;
  if(id) result=await db.from("expenses").update(payload).eq("id",id).eq("user_id",currentUser.id);
  else result=await db.from("expenses").insert(payload);
  $("saveBtn").disabled=false;
  if(result.error){setMsg("formMsg",result.error.message);return}
  resetForm();setMsg("formMsg",id?"Pengeluaran diperbarui.":"Pengeluaran ditambahkan.",false);loadExpenses();
};

window.editExpense=function(id){
  const x=expenses.find(e=>e.id===id);if(!x)return;
  $("expenseId").value=x.id;$("date").value=x.expense_date;$("category").value=x.category;$("description").value=x.description;$("amount").value=x.amount;
  $("formTitle").textContent="Edit Pengeluaran";$("saveBtn").textContent="Simpan Perubahan";$("cancelEdit").classList.remove("hidden");window.scrollTo({top:0,behavior:"smooth"});
};
window.deleteExpense=async function(id){
  const x=expenses.find(e=>e.id===id);if(!x)return;
  if(!confirm(`Hapus "${x.description}" sebesar ${money(x.amount)}?`))return;
  const {error}=await db.from("expenses").delete().eq("id",id).eq("user_id",currentUser.id);
  if(error){setMsg("formMsg",error.message);return}loadExpenses();
};
function resetForm(){
  $("expenseId").value="";$("expenseForm").reset();$("date").value=isoDate(new Date());
  $("formTitle").textContent="Tambah Pengeluaran";$("saveBtn").textContent="+ Simpan Pengeluaran";$("cancelEdit").classList.add("hidden");
}
$("cancelEdit").onclick=resetForm;

function exportRows(){return expenses.map(x=>({Tanggal:x.expense_date,Hari:new Intl.DateTimeFormat("id-ID",{weekday:"long"}).format(new Date(x.expense_date+"T00:00:00")),Kategori:x.category,Keterangan:x.description,Nominal:Number(x.amount)}))}
$("exportCsv").onclick=()=>{
  const rows=exportRows();const header=["Tanggal","Hari","Kategori","Keterangan","Nominal"];
  const csv=[header,...rows.map(r=>header.map(h=>`"${String(r[h]).replace(/"/g,'""')}"`))].map(r=>r.join(",")).join("\n");
  downloadBlob(new Blob(["\ufeff"+csv],{type:"text/csv;charset=utf-8"}),`Rekap-Pengeluaran-${isoDate(weekStart)}.csv`);
};
$("exportExcel").onclick=()=>{
  const rows=exportRows();const ws=XLSX.utils.json_to_sheet(rows);const wb=XLSX.utils.book_new();XLSX.utils.book_append_sheet(wb,ws,"Pengeluaran");
  XLSX.writeFile(wb,`Rekap-Pengeluaran-${isoDate(weekStart)}.xlsx`);
};
$("exportPdf").onclick=()=>{
  const {jsPDF}=window.jspdf;const doc=new jsPDF();doc.setFontSize(16);doc.text("Rekap Pengeluaran Mingguan",14,16);doc.setFontSize(10);doc.text(`${formatDate(weekStart)} - ${formatDate(sundayOf(weekStart))}`,14,23);
  const rows=exportRows().map(r=>[r.Tanggal,r.Hari,r.Kategori,r.Keterangan,money(r.Nominal)]);
  doc.autoTable({startY:29,head:[["Tanggal","Hari","Kategori","Keterangan","Nominal"]],body:rows});
  const total=expenses.reduce((s,x)=>s+Number(x.amount),0);doc.text(`Total Minggu: ${money(total)}`,14,(doc.lastAutoTable?.finalY||35)+10);
  doc.save(`Rekap-Pengeluaran-${isoDate(weekStart)}.pdf`);
};
function downloadBlob(blob,name){const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download=name;a.click();URL.revokeObjectURL(a.href)}

init();