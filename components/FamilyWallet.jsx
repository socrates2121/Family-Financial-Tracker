"use client";

import { useState, useEffect } from "react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";

// ── Palettes
const LIGHT = { bg:"#faf6f0",surface:"#ffffff",border:"#e8ddd0",text:"#2a2118",muted:"#937d6a",accent:"#c4602a",accentLight:"#f9ede6",green:"#4a7c59",amber:"#c4922a",red:"#b94040" };
const DARK  = { bg:"#111827",surface:"#1e2a3a",border:"#2d3f52",text:"#f0ece6",muted:"#7a8fa0",accent:"#e07a45",accentLight:"#3d200f",green:"#5a9a6f",amber:"#d4a040",red:"#d05050" };

const INCOME_CATS = ["Σύνταξη Θανάση","Σύνταξη Έμμυ","Ενοίκιο Μαρούσι","Άλλο"];
const FIXED_CATS  = ["ΔΕΗ Σπίτι","ΔΕΗ Καλλιρρόης","Νερό","Cosmote","Κινητά","Δάνειο Σπιτιού","Εφορία","Ασφάλεια Αυτοκινήτου","Άλλο Πάγιο"];
const VAR_CATS    = ["Σούπερ Μάρκετ","Βενζίνη","Ψιλικά/Τσιγάρα","Φαρμακείο","Συνεργείο","Online Αγορές","Άλλο"];
const OCC_CATS    = ["Καθαριότητα Σπιτιού","Γιατρός/Εξετάσεις","Δώρα","Άλλο Έκτακτο"];
const MONTHS = ["Ιανουάριος","Φεβρουάριος","Μάρτιος","Απρίλιος","Μάιος","Ιούνιος","Ιούλιος","Αύγουστος","Σεπτέμβριος","Οκτώβριος","Νοέμβριος","Δεκέμβριος"];

const mKey   = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`;
const mLabel = (k) => { const [y,m] = k.split("-"); return `${MONTHS[+m-1]} ${y}`; };
const fmt    = (n) => new Intl.NumberFormat("el-GR",{style:"currency",currency:"EUR",maximumFractionDigits:0}).format(n||0);
const shift  = (k, dir) => { const [y,m] = k.split("-").map(Number); const d = new Date(y,m-1+dir); return mKey(d); };
const todayISO = () => new Date().toISOString().split("T")[0];

export default function FamilyWallet() {
  const [tab,setTab]               = useState("dashboard");
  const [month,setMonth]           = useState(mKey());
  const [allData,setAllData]       = useState({});
  const [dark,setDark]             = useState(false);
  const [goal,setGoal]             = useState(500);
  const [goalInput,setGoalInput]   = useState("500");
  const [showAdd,setShowAdd]       = useState(false);
  const [addType,setAddType]       = useState("expense");
  const [addGroup,setAddGroup]     = useState("variable");
  const [form,setForm]             = useState({cat:"",amount:"",note:"",date:todayISO()});
  const [aiText,setAiText]         = useState("");
  const [aiLoading,setAiLoading]   = useState(false);
  const [delConfirm,setDelConfirm] = useState(null);

  const C = dark ? DARK : LIGHT;

  // ── Load from localStorage
  useEffect(() => {
    if (!document.getElementById("fw-fonts")) {
      const l = document.createElement("link");
      l.id = "fw-fonts"; l.rel = "stylesheet";
      l.href = "https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,600;0,700;1,400&family=Source+Sans+3:wght@300;400;600;700&display=swap";
      document.head.appendChild(l);
    }
    fetch("/api/data")
      .then(r => r.json())
      .then(({ data }) => { if (data && Object.keys(data).length) setAllData(data); })
      .catch(() => {});
    try {
      const s = localStorage.getItem("fw-settings-v2");
      if (s) { const p=JSON.parse(s); if(p.dark!==undefined)setDark(p.dark); if(p.goal)setGoal(p.goal); }
    } catch(e) {}
  }, []);

  // ── Persist settings
  useEffect(() => {
    try { localStorage.setItem("fw-settings-v2", JSON.stringify({dark,goal})); } catch(e) {}
  }, [dark, goal]);

  const persist = (d) => {
    setAllData(d);
    fetch("/api/data", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ data: d }),
    }).catch(() => {});
  };

  // ── Current month data & totals
  const md = allData[month] || {income:[],fixed:[],variable:[],occasional:[]};
  const T = (() => {
    const income    = md.income.reduce((s,e)=>s+e.amount,0);
    const fixed     = md.fixed.reduce((s,e)=>s+e.amount,0);
    const variable  = md.variable.reduce((s,e)=>s+e.amount,0);
    const occasional= md.occasional.reduce((s,e)=>s+e.amount,0);
    return {income,fixed,variable,occasional,expenses:fixed+variable+occasional,balance:income-(fixed+variable+occasional)};
  })();

  // ── Add entry
  const addEntry = () => {
    if (!form.cat||!form.amount||isNaN(+form.amount)||+form.amount<=0) return;
    const d = form.date ? new Date(form.date).toLocaleDateString("el-GR") : new Date().toLocaleDateString("el-GR");
    const entry = {id:Date.now(),cat:form.cat,amount:+form.amount,note:form.note,date:d};
    const nmd = {income:[...md.income],fixed:[...md.fixed],variable:[...md.variable],occasional:[...md.occasional]};
    nmd[addType==="income"?"income":addGroup] = [...nmd[addType==="income"?"income":addGroup], entry];
    persist({...allData,[month]:nmd});
    setForm({cat:"",amount:"",note:"",date:todayISO()}); setShowAdd(false);
  };

  // ── Delete entry
  const delEntry = (group, id) => {
    const nmd = {income:[...md.income],fixed:[...md.fixed],variable:[...md.variable],occasional:[...md.occasional]};
    nmd[group] = nmd[group].filter(e=>e.id!==id);
    persist({...allData,[month]:nmd}); setDelConfirm(null);
  };

  // ── CSV Export
  const exportCSV = () => {
    const rows = [["Μήνας","Τύπος","Ομάδα","Κατηγορία","Ποσό (€)","Ημερομηνία","Σημείωση"]];
    const gmap = {income:"Έσοδο",fixed:"Πάγιο",variable:"Μεταβλητό",occasional:"Έκτακτο"};
    Object.entries(allData).sort().forEach(([mk,mdata]) => {
      const lbl = mLabel(mk);
      ["income","fixed","variable","occasional"].forEach(g => {
        (mdata[g]||[]).forEach(e => {
          rows.push([lbl, g==="income"?"Έσοδο":"Έξοδο", gmap[g], e.cat, e.amount, e.date, e.note||""]);
        });
      });
    });
    const csv  = rows.map(r=>r.map(v=>`"${String(v).replace(/"/g,'""')}"`).join(",")).join("\n");
    const blob = new Blob(["\uFEFF"+csv],{type:"text/csv;charset=utf-8"});
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a"); a.href=url; a.download=`family-wallet-${mKey()}.csv`; a.click();
    URL.revokeObjectURL(url);
  };


  // ── AI Insight
  const genInsight = async () => {
    setAiLoading(true); setAiText("");
    try {
      const r = await fetch("/api/ai", { 
        method:"POST", headers:{"Content-Type":"application/json"},
        body:JSON.stringify({
          model:"claude-sonnet-4-5", max_tokens:1000,
          system:`Είσαι ο οικογενειακός λογιστής του Θανάση και της Έμμυς — ζευγάρι συνταξιούχων στην Ελλάδα. Σταθερά έσοδα: συντάξεις ΙΚΑ/ΕΦΚΑ + ενοίκιο από ακίνητο στο Μαρούσι. Δύο κατοικίες: κύρια + εξοχικό στην Καλλιρρόη Ασπροποτάμου (εξ ου δύο λογαριασμοί ΔΕΗ). Στόχος αποταμίευσης: ${fmt(goal)}/μήνα. Φιλοσοφία: ποτέ κριτική, μόνο παρατήρηση. Ελληνικά, ζεστά, απλά, χωρίς bullet points — μικρές παράγραφοι: σύνοψη | τι πήγε καλά | κάτι να προσέξουν.`,
          messages:[{role:"user",content:`Μήνας: ${mLabel(month)}\nΈσοδα: ${fmt(T.income)}\nΠάγια: ${fmt(T.fixed)}\nΜεταβλητά: ${fmt(T.variable)}\nΈκτακτα: ${fmt(T.occasional)}\nΥπόλοιπο: ${fmt(T.balance)}\nΣτόχος αποταμίευσης: ${fmt(goal)}\n\nΑναλυτικά:\n${JSON.stringify(md,null,2)}`}]
        })
       });
      const j = await r.json(); 
       setAiText(j.content[0].text);
    } catch { setAiText("Σφάλμα σύνδεσης. Δοκιμάστε ξανά."); }
    setAiLoading(false);
  };

  // ── Styles
  const S = {
    app:{fontFamily:"'Source Sans 3',sans-serif",background:C.bg,minHeight:"100vh",maxWidth:430,margin:"0 auto",position:"relative",paddingBottom:90,color:C.text,transition:"background 0.25s,color 0.25s"},
    header:{background:C.surface,borderBottom:`1px solid ${C.border}`,padding:"16px 20px 12px",position:"sticky",top:0,zIndex:10,boxShadow:dark?"0 2px 12px rgba(0,0,0,0.4)":"0 2px 8px rgba(42,33,24,0.06)",transition:"background 0.25s"},
    h1:{fontFamily:"'Playfair Display',serif",fontSize:22,fontWeight:700,color:C.text,margin:0},
    sub:{fontSize:13,color:C.muted,marginTop:2},
    mNav:{display:"flex",alignItems:"center",gap:8,marginTop:10},
    mBtn:{background:"none",border:`1px solid ${C.border}`,borderRadius:8,padding:"5px 14px",cursor:"pointer",fontSize:18,color:C.muted,lineHeight:1},
    mLbl:{flex:1,textAlign:"center",fontSize:15,fontWeight:600,color:C.text},
    card:{background:C.surface,borderRadius:16,padding:"20px",margin:"12px 16px 0",border:`1px solid ${C.border}`,boxShadow:dark?"none":"0 1px 4px rgba(42,33,24,0.06)",transition:"background 0.25s,border-color 0.25s"},
    balCard:(p)=>({background:p?C.green:C.red,borderRadius:16,padding:"24px 20px",margin:"16px 16px 0",color:"#fff"}),
    balLbl:{fontSize:12,opacity:0.8,marginBottom:2,fontWeight:300,letterSpacing:"0.07em",textTransform:"uppercase"},
    balAmt:{fontFamily:"'Playfair Display',serif",fontSize:44,fontWeight:700,lineHeight:1.1,marginTop:4},
    balNote:{fontSize:13,opacity:0.75,marginTop:8},
    sRow:{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"12px 0",borderBottom:`1px solid ${C.border}`},
    sLast:{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"12px 0"},
    sLbl:{fontSize:17,color:C.text,display:"flex",alignItems:"center",gap:8},
    sAmt:(col)=>({fontSize:18,fontWeight:700,color:col}),
    secTit:{fontFamily:"'Playfair Display',serif",fontSize:13,fontWeight:600,color:C.muted,margin:"20px 16px 4px",letterSpacing:"0.06em",textTransform:"uppercase"},
    eRow:{display:"flex",alignItems:"center",padding:"11px 0"},
    eDot:(col)=>({width:9,height:9,borderRadius:"50%",background:col,marginRight:12,flexShrink:0}),
    eAmt:(col)=>({fontSize:16,fontWeight:700,color:col,marginRight:10,whiteSpace:"nowrap"}),
    eDel:{background:"none",border:"none",color:C.muted,cursor:"pointer",fontSize:15,padding:"4px 8px"},
    fab:{position:"fixed",bottom:88,right:"calc(50% - 200px)",width:58,height:58,borderRadius:"50%",background:C.accent,border:"none",color:"#fff",fontSize:32,cursor:"pointer",boxShadow:"0 4px 20px rgba(196,96,42,0.4)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:20},
    nav:{position:"fixed",bottom:0,left:"50%",transform:"translateX(-50%)",width:"100%",maxWidth:430,background:C.surface,borderTop:`1px solid ${C.border}`,display:"flex",zIndex:10,transition:"background 0.25s"},
    navBtn:(a)=>({flex:1,padding:"10px 4px 13px",background:"none",border:"none",cursor:"pointer",fontSize:10,color:a?C.accent:C.muted,fontFamily:"'Source Sans 3',sans-serif",display:"flex",flexDirection:"column",alignItems:"center",gap:3,fontWeight:a?700:400}),
    ov:{position:"fixed",inset:0,background:"rgba(0,0,0,0.65)",zIndex:30,display:"flex",alignItems:"flex-end",justifyContent:"center"},
    modal:{background:C.surface,borderRadius:"20px 20px 0 0",padding:"24px 20px 44px",width:"100%",maxWidth:430,maxHeight:"90vh",overflowY:"auto"},
    mTit:{fontFamily:"'Playfair Display',serif",fontSize:21,fontWeight:700,marginBottom:20,color:C.text},
    seg:{display:"flex",background:C.bg,borderRadius:10,padding:3,marginBottom:14,gap:3},
    segB:(a)=>({flex:1,padding:"9px 4px",border:"none",borderRadius:8,cursor:"pointer",fontSize:13,fontWeight:a?700:400,background:a?C.surface:"transparent",color:a?C.text:C.muted,boxShadow:a?"0 1px 4px rgba(0,0,0,0.15)":"none",fontFamily:"'Source Sans 3',sans-serif"}),
    lbl:{fontSize:12,color:C.muted,marginBottom:6,display:"block",fontWeight:700,letterSpacing:"0.06em",textTransform:"uppercase"},
    inp:{width:"100%",padding:"13px 14px",border:`1px solid ${C.border}`,borderRadius:10,fontSize:17,fontFamily:"'Source Sans 3',sans-serif",background:C.bg,color:C.text,boxSizing:"border-box",marginBottom:14,outline:"none"},
    cGrid:{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:16},
    chip:(a)=>({padding:"11px 8px",border:`1.5px solid ${a?C.accent:C.border}`,borderRadius:10,cursor:"pointer",fontSize:13,textAlign:"center",background:a?C.accentLight:C.surface,color:a?C.accent:C.text,fontWeight:a?700:400,fontFamily:"'Source Sans 3',sans-serif",lineHeight:1.3}),
    btn:(bg=C.accent,fg="#fff")=>({width:"100%",padding:"15px",background:bg,color:fg,border:"none",borderRadius:12,fontSize:17,fontWeight:700,cursor:"pointer",fontFamily:"'Source Sans 3',sans-serif",marginTop:4}),
    setRow:{display:"flex",alignItems:"center",padding:"16px 0",borderBottom:`1px solid ${C.border}`,gap:12},
    setLast:{display:"flex",alignItems:"center",padding:"16px 0",gap:12},
    setLbl:{flex:1},
    setTitle:{fontSize:16,color:C.text,fontWeight:600},
    setDesc:{fontSize:13,color:C.muted,marginTop:3},
    confirmBox:{position:"fixed",inset:0,background:"rgba(0,0,0,0.65)",zIndex:40,display:"flex",alignItems:"center",justifyContent:"center",padding:20},
    confirmCard:{background:C.surface,borderRadius:16,padding:"24px 20px",width:"100%",maxWidth:340,textAlign:"center"},
  };

  // ── DASHBOARD
  const renderDashboard = () => {
    const pie = [{name:"Πάγια",value:T.fixed,color:C.accent},{name:"Μεταβλητά",value:T.variable,color:C.amber},{name:"Έκτακτα",value:T.occasional,color:C.green}].filter(d=>d.value>0);
    const gPct = goal>0 ? Math.min((T.balance/goal)*100,100) : 0;
    const gMet = T.balance>=goal;
    const isEmpty = T.income===0 && T.expenses===0;
    return (
      <div>
        <div style={S.balCard(T.balance>=0)}>
          <div style={S.balLbl}>Υπόλοιπο Μήνα</div>
          <div style={S.balAmt}>{fmt(T.balance)}</div>
          <div style={S.balNote}>{T.balance>=0?`✓ Αποταμιεύετε ${fmt(T.balance)} αυτόν τον μήνα`:"⚠ Τα έξοδα υπερβαίνουν τα έσοδα"}</div>
        </div>
        {!isEmpty && (
          <div style={S.card}>
            <div style={S.sRow}><span style={S.sLbl}><span>📥</span>Έσοδα</span><span style={S.sAmt(C.green)}>{fmt(T.income)}</span></div>
            <div style={S.sRow}><span style={S.sLbl}><span>📋</span>Πάγια</span><span style={S.sAmt(C.accent)}>{fmt(T.fixed)}</span></div>
            <div style={S.sRow}><span style={S.sLbl}><span>🛒</span>Μεταβλητά</span><span style={S.sAmt(C.amber)}>{fmt(T.variable)}</span></div>
            <div style={S.sLast}><span style={S.sLbl}><span>💊</span>Έκτακτα</span><span style={S.sAmt(C.muted)}>{fmt(T.occasional)}</span></div>
          </div>
        )}
        {goal>0 && !isEmpty && (
          <div style={S.card}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"baseline",marginBottom:10}}>
              <div style={{fontFamily:"'Playfair Display',serif",fontSize:16,fontWeight:600}}>Στόχος Αποταμίευσης</div>
              <div style={{fontSize:13,color:gMet?C.green:C.muted,fontWeight:700}}>{Math.round(gPct)}%</div>
            </div>
            <div style={{height:10,background:C.bg,borderRadius:99,overflow:"hidden",border:`1px solid ${C.border}`,marginBottom:10}}>
              <div style={{height:"100%",width:`${gPct}%`,background:gMet?C.green:C.accent,borderRadius:99,transition:"width 0.6s ease"}}/>
            </div>
            <div style={{display:"flex",justifyContent:"space-between",fontSize:13,color:C.muted}}>
              <span>{fmt(T.balance)} υπόλοιπο</span><span>Στόχος: {fmt(goal)}</span>
            </div>
            {gMet&&<div style={{marginTop:10,fontSize:13,color:C.green,fontWeight:600}}>✓ Ο στόχος επιτεύχθηκε αυτόν τον μήνα!</div>}
          </div>
        )}
        {pie.length>0 && (
          <div style={S.card}>
            <div style={{fontFamily:"'Playfair Display',serif",fontSize:16,fontWeight:600,marginBottom:4}}>Κατανομή Εξόδων</div>
            <div style={{fontSize:13,color:C.muted,marginBottom:14}}>Σύνολο: {fmt(T.expenses)}</div>
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie data={pie} cx="50%" cy="50%" innerRadius={52} outerRadius={78} dataKey="value" paddingAngle={2}>
                  {pie.map((d,i)=><Cell key={i} fill={d.color} strokeWidth={0}/>)}
                </Pie>
                <Tooltip formatter={(v)=>fmt(v)} contentStyle={{fontFamily:"'Source Sans 3',sans-serif",borderRadius:10,border:`1px solid ${C.border}`,background:C.surface,color:C.text}}/>
              </PieChart>
            </ResponsiveContainer>
            <div style={{display:"flex",justifyContent:"center",gap:20,marginTop:8,flexWrap:"wrap"}}>
              {pie.map(d=>(<div key={d.name} style={{display:"flex",alignItems:"center",gap:6,fontSize:13,color:C.muted}}><span style={{width:9,height:9,borderRadius:"50%",background:d.color,display:"inline-block"}}/>{d.name} · {Math.round((d.value/T.expenses)*100)}%</div>))}
            </div>
          </div>
        )}
        {!isEmpty && (
          <div style={S.card}>
            <div style={{fontFamily:"'Playfair Display',serif",fontSize:15,fontWeight:600,marginBottom:14}}>Έξοδα ως % Εσόδων</div>
            {[{label:"Πάγια",val:T.fixed,col:C.accent},{label:"Μεταβλητά",val:T.variable,col:C.amber},{label:"Έκτακτα",val:T.occasional,col:C.green}].map(r=>(
              <div key={r.label} style={{marginBottom:12}}>
                <div style={{display:"flex",justifyContent:"space-between",fontSize:13,color:C.muted,marginBottom:5}}><span>{r.label}</span><span style={{fontWeight:600,color:C.text}}>{T.income>0?Math.round((r.val/T.income)*100):0}%</span></div>
                <div style={{height:8,background:C.bg,borderRadius:99,overflow:"hidden",border:`1px solid ${C.border}`}}><div style={{height:"100%",width:`${T.income>0?Math.min((r.val/T.income)*100,100):0}%`,background:r.col,borderRadius:99,transition:"width 0.6s ease"}}/></div>
              </div>
            ))}
          </div>
        )}
        {isEmpty && (
          <div style={{textAlign:"center",padding:"50px 24px",color:C.muted}}>
            <div style={{fontSize:44,marginBottom:14}}>📒</div>
            <div style={{fontFamily:"'Playfair Display',serif",fontSize:19,marginBottom:8,color:C.text}}>Καλωσορίσατε!</div>
            <div style={{fontSize:15,lineHeight:1.6}}>Πατήστε <strong>+</strong> για να καταχωρήσετε<br/>το πρώτο έσοδο ή έξοδο του μήνα.</div>
          </div>
        )}
      </div>
    );
  };

  // ── HISTORY
  const renderHistory = () => {
    const groups = [{key:"income",label:"Έσοδα",color:C.green},{key:"fixed",label:"Πάγια",color:C.accent},{key:"variable",label:"Μεταβλητά",color:C.amber},{key:"occasional",label:"Έκτακτα",color:C.muted}];
    const hasAny = groups.some(g=>md[g.key].length>0);
    if (!hasAny) return <div style={{textAlign:"center",padding:"60px 24px",color:C.muted}}><div style={{fontSize:36,marginBottom:12}}>📄</div><div style={{fontSize:16}}>Δεν υπάρχουν καταχωρήσεις αυτόν τον μήνα.</div></div>;
    return (
      <div>
        {groups.map(g=>{
          const entries = [...md[g.key]].sort((a,b)=>b.id-a.id);
          if (!entries.length) return null;
          return (
            <div key={g.key}>
              <div style={S.secTit}>{g.label} · {fmt(entries.reduce((s,e)=>s+e.amount,0))}</div>
              <div style={{...S.card,padding:"4px 20px"}}>
                {entries.map((e,i)=>(
                  <div key={e.id} style={{...S.eRow,borderBottom:i===entries.length-1?"none":`1px solid ${C.border}`}}>
                    <div style={S.eDot(g.color)}/>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{fontSize:16}}>{e.cat}</div>
                      {e.note&&<div style={{fontSize:13,color:C.muted,marginTop:2}}>{e.note}</div>}
                      <div style={{fontSize:12,color:C.muted,marginTop:1}}>{e.date}</div>
                    </div>
                    <span style={S.eAmt(g.key==="income"?C.green:C.text)}>{g.key==="income"?"+":"−"}{fmt(e.amount)}</span>
                    <button style={S.eDel} onClick={()=>setDelConfirm({group:g.key,id:e.id})}>✕</button>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  // ── AI
  const renderAI = () => (
    <div>
      <div style={S.card}>
        <div style={{fontFamily:"'Playfair Display',serif",fontSize:19,fontWeight:700,marginBottom:6}}>Ανάλυση {mLabel(month)}</div>
        <div style={{fontSize:14,color:C.muted,marginBottom:20,lineHeight:1.6}}>Ο AI λογιστής αναλύει τα οικονομικά του μήνα — ζεστά, κατανοητά, χωρίς κριτική.</div>
        <button style={{...S.btn(),opacity:aiLoading?0.7:1}} onClick={genInsight} disabled={aiLoading}>{aiLoading?"⏳  Αναλύω...":"✦  Δημιουργία Ανάλυσης"}</button>
      </div>
      {aiText&&(
        <div style={{...S.card,marginTop:12}}>
          <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:16}}><span style={{fontSize:18}}>✦</span><span style={{fontFamily:"'Playfair Display',serif",fontSize:15,color:C.muted,fontStyle:"italic"}}>Ανάλυση από τον λογιστή</span></div>
          <div style={{fontSize:16,lineHeight:1.8,color:C.text,whiteSpace:"pre-wrap"}}>{aiText}</div>
        </div>
      )}
    </div>
  );

  // ── SETTINGS
  const renderSettings = () => (
    <div>
      <div style={S.secTit}>Εμφάνιση</div>
      <div style={{...S.card,padding:"0 20px"}}>
        <div style={S.setLast}>
          <div style={S.setLbl}><div style={S.setTitle}>Dark Mode</div><div style={S.setDesc}>Σκούρο θέμα για χρήση τη νύχτα</div></div>
          <div onClick={()=>setDark(v=>!v)} style={{width:52,height:30,borderRadius:99,background:dark?C.accent:C.border,cursor:"pointer",position:"relative",transition:"background 0.2s",flexShrink:0}}>
            <div style={{position:"absolute",top:3,left:dark?24:3,width:24,height:24,borderRadius:"50%",background:"#fff",transition:"left 0.2s",boxShadow:"0 1px 4px rgba(0,0,0,0.25)"}}/>
          </div>
        </div>
      </div>

      <div style={S.secTit}>Στόχος Αποταμίευσης</div>
      <div style={{...S.card,padding:"0 20px"}}>
        <div style={S.setRow}>
          <div style={S.setLbl}><div style={S.setTitle}>Μηνιαίος στόχος</div><div style={S.setDesc}>Εμφανίζεται στο Dashboard ως progress bar</div></div>
          <div style={{display:"flex",alignItems:"center",gap:6}}>
            <input style={{width:90,padding:"9px 10px",border:`1px solid ${C.border}`,borderRadius:8,fontSize:16,textAlign:"right",fontFamily:"'Source Sans 3',sans-serif",background:C.bg,color:C.text,outline:"none"}} type="number" value={goalInput} onChange={e=>setGoalInput(e.target.value)} onBlur={()=>{const v=+goalInput;if(!isNaN(v)&&v>=0){setGoal(v);}}}/>
            <span style={{fontSize:15,color:C.muted}}>€</span>
          </div>
        </div>
        <div style={S.setLast}>
          <div style={S.setLbl}><div style={S.setTitle}>Τρέχον υπόλοιπο {mLabel(month)}</div></div>
          <div style={{fontSize:17,fontWeight:700,color:T.balance>=goal?C.green:C.accent}}>{fmt(T.balance)}</div>
        </div>
      </div>

      <div style={S.secTit}>Δεδομένα</div>
      <div style={{...S.card,padding:"0 20px"}}>
        <div style={S.setRow}>
          <div style={S.setLbl}><div style={S.setTitle}>Εξαγωγή σε CSV</div><div style={S.setDesc}>Όλοι οι μήνες με ημερομηνίες — συμβατό με Excel</div></div>
          <button onClick={exportCSV} style={{padding:"10px 16px",background:C.accent,color:"#fff",border:"none",borderRadius:10,fontSize:14,fontWeight:700,cursor:"pointer",fontFamily:"'Source Sans 3',sans-serif",flexShrink:0}}>↓ CSV</button>
        </div>
        <div style={S.setLast}>
          <div style={S.setLbl}><div style={S.setTitle}>Διαγραφή Δεδομένων</div><div style={S.setDesc}>Μόνιμη διαγραφή όλων των καταχωρήσεων</div></div>
          <button onClick={()=>{if(window.confirm("Σίγουρα; Θα διαγραφούν ΟΛΑ τα δεδομένα μόνιμα.")){setAllData({});try{localStorage.removeItem("fw-data-v2");}catch(e){}}}} style={{padding:"10px 14px",background:"none",color:C.red,border:`1.5px solid ${C.red}`,borderRadius:10,fontSize:14,fontWeight:700,cursor:"pointer",fontFamily:"'Source Sans 3',sans-serif",flexShrink:0}}>Διαγραφή</button>
        </div>
      </div>
    </div>
  );

  // ── ADD MODAL
  const renderAddModal = () => {
    const cats = addType==="income"?INCOME_CATS:addGroup==="fixed"?FIXED_CATS:addGroup==="variable"?VAR_CATS:OCC_CATS;
    return (
      <div style={S.ov} onClick={e=>e.target===e.currentTarget&&setShowAdd(false)}>
        <div style={S.modal}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
            <div style={S.mTit}>Νέα Καταχώρηση</div>
            <button onClick={()=>setShowAdd(false)} style={{background:"none",border:"none",fontSize:22,cursor:"pointer",color:C.muted,padding:4}}>✕</button>
          </div>
          <div style={S.seg}>
            <button style={S.segB(addType==="income")}  onClick={()=>{setAddType("income"); setForm(f=>({...f,cat:""}));}}>📥 Έσοδο</button>
            <button style={S.segB(addType==="expense")} onClick={()=>{setAddType("expense");setForm(f=>({...f,cat:""}));}}>📤 Έξοδο</button>
          </div>
          {addType==="expense"&&(
            <div style={S.seg}>
              <button style={S.segB(addGroup==="fixed")}      onClick={()=>{setAddGroup("fixed");      setForm(f=>({...f,cat:""}));}}>Πάγιο</button>
              <button style={S.segB(addGroup==="variable")}   onClick={()=>{setAddGroup("variable");   setForm(f=>({...f,cat:""}));}}>Μεταβλητό</button>
              <button style={S.segB(addGroup==="occasional")} onClick={()=>{setAddGroup("occasional"); setForm(f=>({...f,cat:""}));}}>Έκτακτο</button>
            </div>
          )}
          <label style={S.lbl}>Κατηγορία</label>
          <div style={S.cGrid}>{cats.map(c=>(<button key={c} style={S.chip(form.cat===c)} onClick={()=>setForm(f=>({...f,cat:c}))}>{c}</button>))}</div>
          <label style={S.lbl}>Ποσό (€)</label>
          <input style={S.inp} type="number" inputMode="decimal" placeholder="0" value={form.amount} onChange={e=>setForm(f=>({...f,amount:e.target.value}))}/>
          <label style={S.lbl}>Ημερομηνία</label>
          <input style={S.inp} type="date" value={form.date} onChange={e=>setForm(f=>({...f,date:e.target.value}))}/>
          <label style={S.lbl}>Σημείωση (προαιρετικό)</label>
          <input style={{...S.inp,marginBottom:16}} type="text" placeholder="π.χ. Λογαριασμός Ιανουαρίου" value={form.note} onChange={e=>setForm(f=>({...f,note:e.target.value}))}/>
          <button style={{...S.btn(),opacity:(!form.cat||!form.amount)?0.5:1}} onClick={addEntry}>Καταχώρηση</button>
        </div>
      </div>
    );
  };

  const tabs = [
    {id:"dashboard",icon:"◈",label:"Dashboard"},
    {id:"history",  icon:"≡",label:"Ιστορικό"},
    {id:"ai",       icon:"✦",label:"Ανάλυση"},
    {id:"settings", icon:"⚙",label:"Ρυθμίσεις"},
  ];

  return (
    <div style={S.app}>
      <style>{`input[type=date]{color-scheme:${dark?"dark":"light"};}`}</style>
      <div style={S.header}>
        <div style={{display:"flex",alignItems:"baseline",gap:8}}>
          <div style={S.h1}>Family Wallet</div>
          <div style={S.sub}>Θανάσης & Έμμυ</div>
        </div>
        <div style={S.mNav}>
          <button style={S.mBtn} onClick={()=>setMonth(s=>shift(s,-1))}>‹</button>
          <div style={S.mLbl}>{mLabel(month)}</div>
          <button style={S.mBtn} onClick={()=>setMonth(s=>shift(s,+1))}>›</button>
        </div>
      </div>
      <div style={{paddingTop:8,paddingBottom:24}}>
        {tab==="dashboard"&&renderDashboard()}
        {tab==="history"  &&renderHistory()}
        {tab==="ai"       &&renderAI()}
        {tab==="settings" &&renderSettings()}
      </div>
      <button style={S.fab} onClick={()=>setShowAdd(true)}>+</button>
      {showAdd&&renderAddModal()}
      {delConfirm&&(
        <div style={S.confirmBox}>
          <div style={S.confirmCard}>
            <div style={{fontFamily:"'Playfair Display',serif",fontSize:18,marginBottom:8,color:C.text}}>Διαγραφή;</div>
            <div style={{fontSize:15,color:C.muted,marginBottom:20}}>Σίγουρα θέλετε να διαγράψετε αυτή την καταχώρηση;</div>
            <div style={{display:"flex",gap:10}}>
              <button style={{...S.btn(C.border,C.text),flex:1}} onClick={()=>setDelConfirm(null)}>Άκυρο</button>
              <button style={{...S.btn(C.red),flex:1}} onClick={()=>delEntry(delConfirm.group,delConfirm.id)}>Διαγραφή</button>
            </div>
          </div>
        </div>
      )}
      <nav style={S.nav}>
        {tabs.map(t=>(<button key={t.id} style={S.navBtn(tab===t.id)} onClick={()=>setTab(t.id)}><span style={{fontSize:22,lineHeight:1}}>{t.icon}</span><span>{t.label}</span></button>))}
      </nav>
    </div>
  );
}
