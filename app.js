(() => {
"use strict";

/* =========================
   TEACHERS' DAY FUN GAME
   Vanilla JS / localStorage / IndexedDB / BroadcastChannel
   ========================= */

const ROUNDS = [
  "Complete the Student's Sentence",
  "Draw & Guess",
  "Guess the Student",
  "One Word Challenge",
  "Spin the Challenge"
];

const ROUND1 = [
"Ma'am, notebook ghar pe nahi hai because…",
"Ma'am, mujhe answer aata tha, but…",
"Ma'am, aaj homework nahi hai because…",
"Ma'am, jab aap bolti ho 'books close karo', tab…",
"Ma'am, test ke marks dekhne ke baad meri first reaction…",
"Ma'am, jab class mein koi bolta hai 'Ma'am, ek doubt hai', tab…",
"Ma'am, school mein sabse dangerous sentence hai…",
"Ma'am, jab aap kehti ho 'sirf 5 minutes aur', tab students…",
"Agar students ko school ka ek rule change karne ka chance mile, toh woh rule hoga…"
];

const DRAW_WORDS = [
"Camping","Detective","Pirate Ship","Astronaut","Amusement Park","Treasure Island",
"Traffic Signal","Rainy Day","School Bus","Birthday Party","Airport","Hospital",
"Movie Theatre","Fishing","Castle","Mountain Climbing","Circus","Train Journey",
"Shopping Mall","Haunted House","Secret Agent","Cooking Competition","Singing Competition",
"School Trip","Lost Luggage"
];

const ONE_WORD = [
"Students ko sabse zyada kis cheez ki zarurat hoti hai?",
"School ka sabse stressful word?",
"Classroom mein sabse dangerous sound?",
"Students ka biggest distraction?",
"Ek word mein Monday?",
"Students ka favourite period?",
"Teacher ka biggest classroom weapon?",
"Exam ke pehle students ka mood?",
"Name a school subject WITHOUT using the letters A or E.",
"One word for HOMEWORK but you cannot use a negative word.",
"One word that describes your students."
];

const SPIN = [
"MEMORY CHAIN","OBSERVE & ANSWER","DON'T SAY IT","ALPHABET RUSH",
"LAST LETTER","MYSTERY STUDENT","SCRAMBLED SCHOOL","5-SECOND PRESSURE"
];

const DEFAULT_STUDENTS = [
 {id:"s1",name:"Anam",clues:["Usually sits in the right-side row.","Known for being mischievous.","Classroom personality can be playful."],active:true},
 {id:"s2",name:"Shakera",clues:["Usually sits in the right-side row.","Very mischievous.","Can make people laugh without even saying anything."],active:true},
 {id:"s3",name:"Saima",clues:["Often absent.","Often looks tired."],active:true},
 {id:"s4",name:"RajLaxmi",clues:["Looks sweet and quiet.","Actually quite mischievous.","Good at studies."],active:true},
 {id:"s5",name:"Fifth Student",clues:["Bindass","Irregular"],active:true}
];

const DEFAULT_TEACHERS = [
 {id:"t1",name:"Farzana Teacher",title:"",active:true,score:0,drawWord:"Camping"},
 {id:"t2",name:"Maria Teacher",title:"",active:true,score:0,drawWord:"Detective"},
 {id:"t3",name:"Jadeja Sir",title:"",active:true,score:0,drawWord:"Pirate Ship"},
 {id:"t4",name:"Nusrat Teacher",title:"",active:true,score:0,drawWord:"Astronaut"},
 {id:"t5",name:"Fatima Teacher",title:"",active:true,score:0,drawWord:"Amusement Park"}
];

const DEFAULT_STATE = {
  eventTitle:"TEACHERS' DAY FUN GAME",
  subtitle:"Teachers vs The Ultimate Classroom Challenge",
  screen:"control",
  view:"game",
  started:false,
  round:0,
  teacherIndex:0,
  prompt:null,
  oneWordIndex:null,
  studentIndex:0,
  studentPhase:"photo",
  clueIndex:0,
  drawRevealed:false,
  spinIndex:null,
  currentChallenge:null,
  challengeStarted:false,
  usedRound1:[],
  usedOneWord:[],
  usedSpin:[],
  steal:{available:false,failedTeacherId:null,selectedTeacherId:null,used:false},
  winnerRevealed:false,
  scoreboardRequested:false,
  timer:{duration:0,remaining:0,running:false},
  settings:{sound:false,animations:true}
};

let data = loadData();
let timerInterval = null;
let channel = null;

try { channel = new BroadcastChannel("teachers-day-fun-game"); } catch(e) {}

if(channel) channel.onmessage = e => {
  if(e.data?.type === "STATE") {
    data.state = e.data.state;
    data.teachers = e.data.teachers;
    data.students = e.data.students;
    render();
  }
};

function uid(prefix="id"){ return prefix + Math.random().toString(36).slice(2,9); }
function clone(x){ return JSON.parse(JSON.stringify(x)); }
function activeTeachers(){ return data.teachers.filter(t=>t.active); }
function currentTeacher(){ return activeTeachers()[data.state.teacherIndex] || activeTeachers()[0] || null; }
function currentStudent(){ return data.students.filter(s=>s.active)[data.state.studentIndex] || null; }

function loadData(){
  let saved = {};
  try { saved = JSON.parse(localStorage.getItem("tdfg_data") || "{}"); } catch(e){}
  return {
    teachers: saved.teachers || clone(DEFAULT_TEACHERS),
    students: saved.students || clone(DEFAULT_STUDENTS),
    prompts: saved.prompts || clone(ROUND1),
    drawWords: saved.drawWords || clone(DRAW_WORDS).map(w=>({id:uid("w"),word:w,difficulty:"Mid",active:true})),
    oneWord: saved.oneWord || clone(ONE_WORD).map((q,i)=>({id:"q"+i,question:q,active:true})),
    spinCards: saved.spinCards || [],
    state: {...clone(DEFAULT_STATE), ...(saved.state||{})}
  };
}
function persist(broadcast=true){
  localStorage.setItem("tdfg_data",JSON.stringify(data));
  if(broadcast && channel) channel.postMessage({type:"STATE",state:data.state,teachers:data.teachers,students:data.students});
}
function toast(msg){
  const old=document.querySelector(".toast"); if(old) old.remove();
  const el=document.createElement("div"); el.className="toast"; el.textContent=msg; document.body.appendChild(el);
  setTimeout(()=>el.remove(),2200);
}

function render(){
  clearInterval(timerInterval);
  document.body.innerHTML="";
  if(data.state.screen==="presentation") renderPresentation();
  else renderControl();
  if(data.state.timer.running) startInterval();
}

function esc(s){return String(s??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]));}
function el(tag,attrs={},children=[]){
  const n=document.createElement(tag);
  Object.entries(attrs).forEach(([k,v])=>k==="class"?n.className=v:k==="html"?n.innerHTML=v:n.setAttribute(k,v));
  children.forEach(c=>n.append(c instanceof Node?c:document.createTextNode(c)));
  return n;
}
function appShell(){
  const app=el("div",{class:"app"});
  const top=el("header",{class:"topbar"});
  top.innerHTML=`<div class="brand">${esc(data.state.eventTitle)}<small>${esc(data.state.subtitle)}</small></div>`;
  const actions=el("div",{class:"actions"});
  [["Presentation Mode","presentation"],["Admin / Setup","admin"],["Scoreboard","score"]].forEach(([txt,v])=>{
    const b=el("button",{class:"btn",html:txt}); b.onclick=()=>{data.state.view=v;persist();render();}; actions.append(b);
  });
  top.append(actions); app.append(top);
  return app;
}
function renderControl(){
  const app=appShell();
  const layout=el("div",{class:"layout"});
  const side=el("aside",{class:"sidebar"});
  side.innerHTML=`<div class="nav-title">Control</div>`;
  [["game","Game Control"],["score","Live Scoreboard"],["admin","Admin / Setup"]].forEach(([v,t])=>{
    const b=el("button",{class:data.state.view===v?"active":""},[t]); b.onclick=()=>{data.state.view=v;persist();render()}; side.querySelector(".nav-title").after(b);
  });
  side.innerHTML += `<div class="nav-title">Keyboard</div><div class="muted" style="padding:10px;line-height:1.9"><span class="kbd">Space</span> Timer<br><span class="kbd">N</span> Next<br><span class="kbd">A</span> Award<br><span class="kbd">X</span> No point<br><span class="kbd">S</span> Scoreboard<br><span class="kbd">F</span> Fullscreen</div>`;
  layout.append(side);
  const main=el("main",{class:"main"});
  if(data.state.view==="admin") renderAdmin(main);
  else if(data.state.view==="score") renderScore(main,true);
  else renderGame(main);
  layout.append(main); app.append(layout); document.body.append(app);
}
function renderGame(main){
  if(!data.state.started){
    main.innerHTML=`<section class="hero"><div class="eyebrow">Live school game show</div><h1>${esc(data.state.eventTitle)}</h1><p>${esc(data.state.subtitle)}</p><button class="btn primary" id="startGame">START GAME</button></section>`;
    main.querySelector("#startGame").onclick=()=>{data.state.started=true;data.state.round=0;data.state.teacherIndex=0;prepareRound();persist();render()};
    return;
  }
  if(data.state.winnerRevealed){ renderWinner(main); return; }
  const round=data.state.round;
  const banner=el("section",{class:"round-banner",html:`<div class="eyebrow">Round ${round+1} of 5</div><h2>${esc(ROUNDS[round])}</h2>`});
  main.append(banner);
  const card=el("section",{class:"card"});
  if(round===0) round1(card);
  if(round===1) round2(card);
  if(round===2) round3(card);
  if(round===3) round4(card);
  if(round===4) round5(card);
  main.append(card);
  main.append(roundFooter());
}
function roundFooter(){
  const f=el("div",{class:"controls",style:"margin-top:14px"});
  const sb=el("button",{class:"btn"},["Show Scoreboard"]); sb.onclick=()=>{data.state.view="score";persist();render()};
  const end=el("button",{class:"btn"},["End Round"]); end.onclick=()=>endRound();
  f.append(sb,end);
  return f;
}
function teacherHeader(){
  const t=currentTeacher();
  return `<div class="muted">CURRENT TEACHER</div><h2>${t?esc(t.name):"No active teacher"}</h2><div class="score">Score: ${t?t.score:0}</div>`;
}
function timerControls(){
  const c=el("div",{class:"controls"});
  [["START TIMER","start"],["PAUSE","pause"],["RESET","reset"]].forEach(([txt,a])=>{
    const b=el("button",{class:"btn",html:txt}); b.onclick=()=>timerAction(a); c.append(b);
  });
  return c;
}
function round1(card){
  card.innerHTML=teacherHeader()+`<div class="prompt">${esc(data.state.prompt || "Press Next Prompt")}</div>`;
  card.append(timerDisplay(),timerControls());
  const c=el("div",{class:"controls",style:"margin-top:15px"});
  [["AWARD 1 POINT","award","success"],["NO POINT","nopoint","danger"],["NEXT PROMPT","next"]].forEach(([txt,a,cl])=>{
    const b=el("button",{class:`btn ${cl||""}`},[txt]); b.onclick=()=>a==="award"?award(1):a==="nopoint"?nextPrompt():nextPrompt(); c.append(b);
  });
  card.append(c);
  if(!data.state.prompt) nextPrompt(false);
}
function round2(card){
  const t=currentTeacher();
  card.innerHTML=teacherHeader()+`<div class="secret-box"><div class="muted">SECRET WORD — ANCHOR ONLY</div><h2>${esc(t?.drawWord||"No word assigned")}</h2></div><div class="timer">30</div><p class="muted">Presentation hides the word until Reveal Answer.</p>`;
  card.append(timerDisplay(),timerControls());
  const c=el("div",{class:"controls"});
  const rev=el("button",{class:"btn primary"},["REVEAL ANSWER"]); rev.onclick=()=>{data.state.drawRevealed=true;persist();render()};
  const p2=el("button",{class:"btn success"},["+2 POINTS"]);p2.onclick=()=>award(2);
  const p1=el("button",{class:"btn"},["+1 POINT"]);p1.onclick=()=>award(1);
  const np=el("button",{class:"btn danger"},["0 POINTS"]);np.onclick=()=>nextTeacher();
  c.append(rev,p2,p1,np);card.append(c);
}
function round3(card){
  const s=currentStudent();
  if(!s){card.innerHTML=`<div class="empty">No active students. Add a student in Admin.</div>`;return}
  card.innerHTML=teacherHeader()+`<h2 style="text-align:center">Student: ${esc(s.name)} <span class="tag">ANCHOR ONLY</span></h2>`;
  const c=el("div",{class:"split"});
  const left=el("div",{class:"card"});
  left.innerHTML=`<div class="muted">PHASE</div><h3>${esc(data.state.studentPhase.toUpperCase())}</h3>`;
  if(data.state.studentPhase==="photo"){
    left.innerHTML+=`<div class="photo-wrap"><img id="studentPhoto" alt="Student"></div><div class="muted" style="margin-top:8px">8-second photo phase</div>`;
  }else{
    const idx=data.state.clueIndex;
    left.innerHTML+=`<div class="clue">${idx>0?esc(s.clues[idx-1]||"No clue"): "Reveal the next clue from the control panel."}</div>`;
  }
  const right=el("div",{class:"card"});
  right.innerHTML=`<div class="muted">SCORING</div><p>Photo: <b>3</b></p><p>Clue 1: <b>2</b></p><p>Clue 2: <b>1</b></p><p>Clue 3: <b>0.5</b></p>`;
  const buttons=el("div",{class:"controls"});
  const reveal=el("button",{class:"btn primary"},["REVEAL ANSWER"]); reveal.onclick=()=>{toast(`Correct student: ${s.name}`);};
  const next=el("button",{class:"btn"},["NEXT STUDENT"]); next.onclick=()=>nextStudent();
  const photo=el("button",{class:"btn"},["PHOTO PHASE"]);photo.onclick=()=>{data.state.studentPhase="photo";data.state.clueIndex=0;timerSet(8);persist();render()};
  const clue=el("button",{class:"btn"},["NEXT CLUE"]);clue.onclick=()=>{if(data.state.studentPhase==="photo"){data.state.studentPhase="clue";data.state.clueIndex=1}else if(data.state.clueIndex<3)data.state.clueIndex++;persist();render()};
  const a3=el("button",{class:"btn success"},["+3"]);a3.onclick=()=>award(3);
  const a2=el("button",{class:"btn success"},["+2"]);a2.onclick=()=>award(2);
  const a1=el("button",{class:"btn success"},["+1"]);a1.onclick=()=>award(1);
  const ah=el("button",{class:"btn success"},["+0.5"]);ah.onclick=()=>award(.5);
  buttons.append(photo,clue,reveal,a3,a2,a1,ah,next);right.append(buttons);
  c.append(left,right);card.append(c);
  card.append(timerDisplay(),timerControls());
  if(s.photoKey) getImage(s.photoKey).then(src=>{const im=document.querySelector("#studentPhoto");if(im&&src)im.src=src});
}
function round4(card){
  const t=currentTeacher();
  card.innerHTML=teacherHeader()+`<div class="prompt">${esc(data.state.oneWordIndex!=null?(data.oneWord[data.state.oneWordIndex]?.question||""):"Press Next")}</div>`;
  card.append(timerDisplay(),timerControls());
  const c=el("div",{class:"controls"});
  const valid=el("button",{class:"btn success"},["VALID +1"]);valid.onclick=()=>award(data.state.oneWordIndex===data.oneWord.length-1?2:1);
  const invalid=el("button",{class:"btn danger"},["INVALID"]);invalid.onclick=()=>nextTeacher();
  const next=el("button",{class:"btn"},["NEXT QUESTION"]);next.onclick=()=>nextOneWord();
  c.append(valid,invalid,next);card.append(c);
  if(data.state.oneWordIndex==null) nextOneWord(false);
}
function round5(card){
  const t=currentTeacher();
  if(!data.state.currentChallenge) data.state.currentChallenge=SPIN[0];
  card.innerHTML=teacherHeader()+`<div class="wheel-wrap"><div class="pointer"></div><div class="wheel" id="wheel"></div></div><h2 style="text-align:center">${esc(data.state.currentChallenge)}</h2>`;
  const spin=el("button",{class:"btn primary",style:"display:block;margin:15px auto"},["SPIN"]);
  spin.onclick=spinWheel;
  card.append(spin);
  const info=el("div",{class:"card"});
  info.innerHTML=`<h3>${esc(data.state.currentChallenge)}</h3><p class="muted">${challengeInstructions(data.state.currentChallenge)}</p>`;
  const c=el("div",{class:"controls"});
  const success=el("button",{class:"btn success"},["CHALLENGE SUCCESS +2"]);success.onclick=()=>award(2);
  const fail=el("button",{class:"btn danger"},["CHALLENGE FAILED"]);fail.onclick=()=>{data.state.steal={available:true,failedTeacherId:t?.id||null,selectedTeacherId:null,used:false};persist();render()};
  c.append(success,fail);info.append(c);
  if(data.state.steal.available&&!data.state.steal.used){
    const sel=el("select",{style:"background:#0d1016;color:white;padding:10px;border-radius:8px;margin-top:12px"});
    activeTeachers().filter(x=>x.id!==data.state.steal.failedTeacherId).forEach(x=>sel.append(new Option(x.name,x.id)));
    const steal=el("button",{class:"btn primary",style:"margin:12px 0 0 8px"},["ENABLE STEAL"]);
    steal.onclick=()=>{data.state.steal.selectedTeacherId=sel.value;data.state.steal.used=true;data.state.steal.available=false;data.state.teacherIndex=Math.max(0,activeTeachers().findIndex(x=>x.id===sel.value));persist();render()};
    info.append(el("div",{style:"margin-top:12px;font-weight:800"},["STEAL AVAILABLE"]),sel,steal);
  }
  card.append(info);
}
function challengeInstructions(c){
 const m={
 "MEMORY CHAIN":"Show 5 words for 2 seconds each, hide them, then require the exact same order. 5/5 = 2 points.",
 "OBSERVE & ANSWER":"Show an organizer-selected classroom image for 7 seconds, hide it, then ask 3 questions. Anchor scores manually.",
 "DON'T SAY IT":"Give a target and 3 banned words. Teacher has 20 seconds. Banned word = fail.",
 "ALPHABET RUSH":"Category SCHOOL. 20 seconds. 6+ unique words = 2, 4–5 = 1, 3 or fewer = 0.",
 "LAST LETTER":"Category SCHOOL SUBJECTS. Three valid consecutive answers = 2 points.",
 "MYSTERY STUDENT":"Use Round 3 active students. Progressive clues: 2, 1, 0.5 points.",
 "SCRAMBLED SCHOOL":"Three scrambled school words in 20 seconds. 3/3 = 2, 2/3 = 1, 1/3 = 0.",
 "5-SECOND PRESSURE":"Five rapid school prompts in 20 seconds. 5/5 = 2, 4/5 = 1, 3 or fewer = 0."
 }; return m[c]||"Complete the challenge and let the anchor manually confirm the result.";
}
function timerDisplay(){
 const wrap=el("div"); wrap.innerHTML=`<div class="timer ${data.state.timer.remaining<=3&&data.state.timer.remaining>0?"danger":data.state.timer.remaining<=5&&data.state.timer.remaining>0?"warning":""}" id="timer">${Math.ceil(data.state.timer.remaining)}</div>`; return wrap;
}
function timerSet(sec){clearInterval(timerInterval);data.state.timer={duration:sec,remaining:sec,running:false};persist();render();}
function timerAction(a){
 if(a==="start"){if(data.state.timer.remaining<=0)data.state.timer.remaining=data.state.timer.duration;data.state.timer.running=true;persist();render()}
 if(a==="pause"){data.state.timer.running=false;persist();render()}
 if(a==="reset"){data.state.timer.running=false;data.state.timer.remaining=data.state.timer.duration;persist();render()}
}
function startInterval(){
 clearInterval(timerInterval);
 timerInterval=setInterval(()=>{
  if(!data.state.timer.running)return;
  data.state.timer.remaining=Math.max(0,data.state.timer.remaining-0.1);
  if(data.state.timer.remaining<=0){data.state.timer.running=false;clearInterval(timerInterval);toast("Time's up!");}
  localStorage.setItem("tdfg_data",JSON.stringify(data));
  if(channel) channel.postMessage({type:"STATE",state:data.state,teachers:data.teachers,students:data.students});
  const t=document.querySelector("#timer");if(t){t.textContent=Math.ceil(data.state.timer.remaining);t.className=`timer ${data.state.timer.remaining<=3&&data.state.timer.remaining>0?"danger":data.state.timer.remaining<=5&&data.state.timer.remaining>0?"warning":""}`}
 },100);
}
function prepareRound(){
 data.state.usedRound1=[];data.state.usedOneWord=[];data.state.usedSpin=[];data.state.prompt=null;data.state.oneWordIndex=null;data.state.drawRevealed=false;data.state.studentIndex=0;data.state.studentPhase="photo";data.state.clueIndex=0;data.state.currentChallenge=null;data.state.steal={available:false,failedTeacherId:null,selectedTeacherId:null,used:false};
 if(data.state.round===0) timerSet(5); else if(data.state.round===1) timerSet(30); else if(data.state.round===2) timerSet(8); else if(data.state.round===3) timerSet(3); else timerSet(20);
}
function nextPrompt(reRender=true){
 let available=data.prompts.map((_,i)=>i).filter(i=>!data.state.usedRound1.includes(i));
 if(!available.length){data.state.usedRound1=[];available=data.prompts.map((_,i)=>i)}
 const idx=available[Math.floor(Math.random()*available.length)];
 data.state.usedRound1.push(idx);data.state.prompt=data.prompts[idx];timerSet(5);
 if(reRender) render();
}
function nextOneWord(reRender=true){
 let available=data.oneWord.map((_,i)=>i).filter(i=>!data.state.usedOneWord.includes(i)&&data.oneWord[i].active);
 if(!available.length){data.state.usedOneWord=[];available=data.oneWord.map((_,i)=>i).filter(i=>data.oneWord[i].active)}
 if(!available.length){toast("No active One Word questions.");return}
 const idx=available[Math.floor(Math.random()*available.length)];
 data.state.usedOneWord.push(idx);data.state.oneWordIndex=idx;
 const isFinal=idx===data.oneWord.length-1;timerSet(isFinal?2:3);if(reRender)render();
}
function nextTeacher(){
 const n=activeTeachers().length;if(!n)return;
 data.state.teacherIndex=(data.state.teacherIndex+1)%n;
 data.state.steal={available:false,failedTeacherId:null,selectedTeacherId:null,used:false};
 if(data.state.round===0) nextPrompt(false);
 else if(data.state.round===1){data.state.drawRevealed=false;timerSet(30)}
 else if(data.state.round===2){data.state.studentIndex=(data.state.studentIndex+1)%Math.max(1,data.students.filter(s=>s.active).length);data.state.studentPhase="photo";data.state.clueIndex=0;timerSet(8)}
 else if(data.state.round===3) nextOneWord(false);
 else timerSet(20);
 persist();render();
}
function nextStudent(){data.state.studentIndex++;if(data.state.studentIndex>=data.students.filter(s=>s.active).length){data.state.studentIndex=0;toast("Student list complete.");}data.state.studentPhase="photo";data.state.clueIndex=0;timerSet(8);persist();render();}
function award(points){
 const t=currentTeacher();if(!t){toast("No active teacher.");return}
 t.score=Math.round((t.score+points)*10)/10;
 toast(`+${points} point${points===1?"":"s"} to ${t.name}`);
 persist();render();
}
function endRound(){
 if(data.state.round>=4){data.state.view="score";persist();render();return}
 data.state.round++;data.state.teacherIndex=0;prepareRound();persist();render();
}
function renderScore(main,fromControl){
 const sorted=[...data.teachers].filter(t=>t.active).sort((a,b)=>b.score-a.score);
 main.innerHTML=`<section class="round-banner"><div class="eyebrow">Live Scores</div><h2>TEACHERS' DAY<br>LIVE SCOREBOARD</h2></section>`;
 const list=el("div",{class:"scoreboard"});
 sorted.forEach((t,i)=>{const r=el("div",{class:`score-row ${i===0?"leader":""}`});r.innerHTML=`<div><span class="score-name">${esc(t.name)}</span>${t.title?`<span class="tag">${esc(t.title)}</span>`:""}</div><div class="score">${t.score}</div>`;list.append(r)});
 main.append(list);
 const c=el("div",{class:"controls",style:"margin-top:15px"});
 const back=el("button",{class:"btn"},["Back to Game"]);back.onclick=()=>{data.state.view="game";persist();render()};
 const winner=el("button",{class:"btn primary"},["Reveal Winner"]);winner.onclick=()=>revealWinner();
 c.append(back);
 if(data.state.round>=4)c.append(winner);
 main.append(c);
}
function renderWinner(main){
 const sorted=activeTeachers().sort((a,b)=>b.score-a.score);
 const top=sorted[0];
 main.innerHTML=`<section class="hero winner"><div class="eyebrow">Final Scoreboard</div><h1>🏆</h1><h2>AND TODAY'S<br>TEACHERS' DAY<br>GAME CHAMPION IS...</h2><div class="score">${top?esc(top.name):"No winner"}</div><p>Special Prize + Certificate</p></section>`;
}
function revealWinner(){data.state.winnerRevealed=true;persist();render();}
function renderAdmin(main){
 main.innerHTML=`<section class="round-banner"><div class="eyebrow">Organizer Only</div><h2>ADMIN / GAME SETUP</h2><p class="muted">All configuration persists locally in this browser.</p></section>`;
 const grid=el("div",{class:"grid"});
 grid.append(adminTeachers(),adminStudents(),adminContent(),adminSettings());
 main.append(grid);
}
function adminTeachers(){
 const c=el("div",{class:"card"});c.innerHTML="<h3>Teachers</h3>";
 const add=el("button",{class:"btn primary"},["+ ADD TEACHER"]);add.onclick=()=>teacherModal();c.append(add);
 const list=el("div",{class:"list",style:"margin-top:12px"});
 data.teachers.forEach(t=>{const r=el("div",{class:"list-item"});r.innerHTML=`<div class="meta"><b>${esc(t.name)}</b><span class="tag">${t.active?"Active":"Inactive"}</span><div class="muted">Score: ${t.score} · Draw: ${esc(t.drawWord||"—")}</div></div>`;const b=el("button",{class:"btn"},["Edit"]);b.onclick=()=>teacherModal(t);r.append(b);list.append(r)});c.append(list);return c;
}
function adminStudents(){
 const c=el("div",{class:"card"});c.innerHTML="<h3>Students</h3>";
 const add=el("button",{class:"btn primary"},["+ ADD STUDENT"]);add.onclick=()=>studentModal();c.append(add);
 const list=el("div",{class:"list",style:"margin-top:12px"});
 data.students.forEach(s=>{const r=el("div",{class:"list-item"});r.innerHTML=`<div class="meta"><b>${esc(s.name)}</b><span class="tag">${s.active?"Active":"Inactive"}</span><div class="muted">${esc(s.clues.join(" · "))}</div></div>`;const b=el("button",{class:"btn"},["Edit"]);b.onclick=()=>studentModal(s);r.append(b);list.append(r)});c.append(list);return c;
}
function adminContent(){
 const c=el("div",{class:"card"});c.innerHTML=`<h3>Content</h3><p class="muted">Round 1 prompts, Draw & Guess words, One Word questions and Spin challenge types are preloaded. Edit the banks using the buttons below.</p>`;
 const p=el("button",{class:"btn"},["Edit Round 1 Prompts"]);p.onclick=()=>textBankModal("Round 1 Prompts","prompts");
 const w=el("button",{class:"btn"},["Edit Draw Words"]);w.onclick=()=>textBankModal("Draw & Guess Words","drawWords");
 const q=el("button",{class:"btn"},["Edit One Word Questions"]);q.onclick=()=>textBankModal("One Word Questions","oneWord");
 c.append(p,w,q);return c;
}
function adminSettings(){
 const c=el("div",{class:"card"});c.innerHTML="<h3>Game Settings</h3>";
 const title=el("input");title.value=data.state.eventTitle;title.onchange=()=>{data.state.eventTitle=title.value;persist()};c.append(el("div",{class:"field"},[el("label",{},["Event title"]),title]));
 const sub=el("input");sub.value=data.state.subtitle;sub.onchange=()=>{data.state.subtitle=sub.value;persist()};c.append(el("div",{class:"field",style:"margin-top:10px"},[el("label",{},["Subtitle"]),sub]));
 const reset=el("button",{class:"btn danger",style:"margin-top:14px"},["RESET CURRENT GAME"]);reset.onclick=()=>{if(confirm("Reset scores and temporary game state? Saved teachers, students, photos and banks will remain.")){data.teachers.forEach(t=>t.score=0);data.state={...clone(DEFAULT_STATE),eventTitle:data.state.eventTitle,subtitle:data.state.subtitle};persist();render()}};
 const exportB=el("button",{class:"btn",style:"margin-top:8px"},["EXPORT JSON"]);exportB.onclick=exportData;
 const importB=el("button",{class:"btn",style:"margin-top:8px"},["IMPORT JSON"]);importB.onclick=importData;
 c.append(reset,exportB,importB);return c;
}
function modal(content){
 const bg=el("div",{class:"modal-backdrop"}),m=el("div",{class:"modal"});m.append(content);bg.append(m);document.body.append(bg);bg.onclick=e=>{if(e.target===bg)bg.remove()};return bg;
}
function teacherModal(t=null){
 const f=el("div");f.innerHTML=`<div class="modal-head"><h2>${t?"Edit":"Add"} Teacher</h2><button class="btn">Close</button></div>`;
 f.querySelector("button").onclick=()=>f.closest(".modal-backdrop").remove();
 const grid=el("div",{class:"form-grid"});
 const name=inputField("Name",t?.name||"");const title=inputField("Optional title",t?.title||"");const word=inputField("Draw & Guess word",t?.drawWord||"");
 const active=inputField("Active (true/false)",String(t?.active??true));
 grid.append(name,title,word,active);f.append(grid);
 const save=el("button",{class:"btn primary",style:"margin-top:15px"},["SAVE TEACHER"]);save.onclick=()=>{
  const obj={id:t?.id||uid("t"),name:name.querySelector("input").value.trim()||"Unnamed Teacher",title:title.querySelector("input").value.trim(),drawWord:word.querySelector("input").value.trim()||unusedWord(),active:active.querySelector("input").value.toLowerCase()!=="false",score:t?.score||0};
  if(t)Object.assign(t,obj);else data.teachers.push(obj);persist();f.closest(".modal-backdrop").remove();render();
 };f.append(save);modal(f);
}
function unusedWord(){const used=new Set(data.teachers.map(t=>t.drawWord));return data.drawWords.find(w=>w.active&&!used.has(w.word))?.word||"Camping";}
function studentModal(s=null){
 const f=el("div");f.innerHTML=`<div class="modal-head"><h2>${s?"Edit":"Add"} Student</h2><button class="btn">Close</button></div>`;
 f.querySelector("button").onclick=()=>f.closest(".modal-backdrop").remove();
 const name=inputField("Name",s?.name||"Fifth Student");const clues=inputField("Clues — one per line",(s?.clues||["","",""]).join("\n"));
 const file=el("input",{type:"file",accept:"image/jpeg,image/png,image/webp"});
 const grid=el("div",{class:"form-grid"});grid.append(name,clues);f.append(grid,el("div",{class:"field",style:"margin-top:10px"},[el("label",{},["Photo JPG / PNG / WEBP"]),file]));
 const save=el("button",{class:"btn primary",style:"margin-top:15px"},["SAVE STUDENT"]);
 save.onclick=async()=>{const obj=s||{id:uid("s"),active:true,clues:[]};obj.name=name.querySelector("input").value.trim()||"Fifth Student";obj.clues=clues.querySelector("textarea").value.split(/\n+/).filter(Boolean);if(!obj.clues.length)obj.clues=["","",""];if(file.files[0]){obj.photoKey=obj.id;await saveImage(obj.photoKey,file.files[0])}if(!s)data.students.push(obj);persist();f.closest(".modal-backdrop").remove();render()};
 f.append(save);modal(f);
}
function inputField(label,value){const w=el("div",{class:"field"});w.append(el("label",{},[label]));const input=label.includes("Clues")?el("textarea") : el("input");input.value=value;w.append(input);return w;}
function textBankModal(title,key){
 const f=el("div");f.innerHTML=`<div class="modal-head"><h2>${title}</h2><button class="btn">Close</button></div><p class="muted">One item per line. Saving replaces the current bank.</p>`;
 f.querySelector("button").onclick=()=>f.closest(".modal-backdrop").remove();
 const ta=el("textarea",{style:"width:100%;min-height:350px;background:#0d1016;color:white;border:1px solid #303541;border-radius:9px;padding:12px"});
 ta.value=key==="drawWords"?data.drawWords.map(x=>x.word).join("\n"):key==="oneWord"?data.oneWord.map(x=>x.question).join("\n"):data.prompts.join("\n");
 f.append(ta);const save=el("button",{class:"btn primary",style:"margin-top:12px"},["SAVE"]);save.onclick=()=>{const arr=ta.value.split(/\n+/).map(x=>x.trim()).filter(Boolean);if(key==="drawWords")data.drawWords=arr.map(w=>({id:uid("w"),word:w,difficulty:"Mid",active:true}));else if(key==="oneWord")data.oneWord=arr.map((q,i)=>({id:uid("q"),question:q,active:true}));else data.prompts=arr;persist();f.closest(".modal-backdrop").remove();render()};f.append(save);modal(f);
}
function spinWheel(){
 const wheel=document.querySelector("#wheel");if(!wheel)return;
 const idx=Math.floor(Math.random()*SPIN.length);data.state.spinIndex=idx;data.state.currentChallenge=SPIN[idx];data.state.usedSpin.push(SPIN[idx]);persist();
 wheel.style.transform=`rotate(${1440+idx*45+22}deg)`;
 setTimeout(()=>render(),4300);
}
function buildWheel(){
 const w=document.querySelector("#wheel");if(!w)return;
 SPIN.forEach((s,i)=>{const x=document.createElement("div");x.className="slice";x.textContent=s;x.style.transform=`rotate(${i*45}deg)`;w.append(x)});
}
async function getImage(key){
 if(!key)return null;
 return new Promise(resolve=>{const req=indexedDB.open("tdfg_images",1);req.onupgradeneeded=()=>req.result.createObjectStore("images");req.onsuccess=()=>{const db=req.result,tx=db.transaction("images","readonly"),r=tx.objectStore("images").get(key);r.onsuccess=()=>resolve(r.result?URL.createObjectURL(r.result):null);r.onerror=()=>resolve(null)};req.onerror=()=>resolve(null)});
}
function saveImage(key,blob){
 return new Promise((resolve,reject)=>{const req=indexedDB.open("tdfg_images",1);req.onupgradeneeded=()=>req.result.createObjectStore("images");req.onsuccess=()=>{const db=req.result,tx=db.transaction("images","readwrite");tx.objectStore("images").put(blob,key);tx.oncomplete=resolve;tx.onerror=reject};req.onerror=reject});
}
function renderPresentation(){
 const p=el("div",{class:"presentation"});const stage=el("main",{class:"stage"});const inner=el("div",{class:"stage-inner"});
 const r=data.state.round;
 if(!data.state.started){inner.innerHTML=`<div class="eyebrow">Teachers' Day</div><div class="stage-title">${esc(data.state.eventTitle)}</div><div class="stage-sub">${esc(data.state.subtitle)}</div>`}
 else if(data.state.winnerRevealed){const top=activeTeachers().sort((a,b)=>b.score-a.score)[0];inner.innerHTML=`<div class="eyebrow">CHAMPION</div><div class="stage-title winner">🏆<br>${esc(top?.name||"")}</div><div class="stage-sub">CONGRATULATIONS!<br>Special Prize + Certificate</div>`}
 else if(data.state.view==="score"){renderPresentationScore(inner)}
 else if(r===0){inner.innerHTML=`<div class="eyebrow">ROUND 1</div><div class="stage-title">COMPLETE THE<br>STUDENT'S SENTENCE</div><div class="stage-sub">${esc(currentTeacher()?.name||"")}</div><div class="prompt">${esc(data.state.prompt||"")}</div>`;inner.append(timerDisplay())}
 else if(r===1){const t=currentTeacher();inner.innerHTML=`<div class="eyebrow">DRAW & GUESS</div><div class="stage-title">${esc(t?.name||"")}</div><div class="stage-sub">${data.state.drawRevealed?"THE WORD WAS: "+esc(t?.drawWord||""):"DRAW!"}</div>`;inner.append(timerDisplay())}
 else if(r===2){const s=currentStudent();if(data.state.studentPhase==="photo"){inner.innerHTML=`<div class="eyebrow">GUESS THE STUDENT</div><div class="stage-title">WHO IS THIS STUDENT?</div><div id="presentationPhoto"></div>`;getImage(s?.photoKey).then(src=>{const x=document.querySelector("#presentationPhoto");if(x&&src)x.innerHTML=`<img src="${src}" alt="">`});}else{const clue=s?.clues?.[Math.max(0,data.state.clueIndex-1)]||"";inner.innerHTML=`<div class="eyebrow">GUESS THE STUDENT</div><div class="stage-title">CLUE ${data.state.clueIndex}</div><div class="stage-sub">${esc(clue)}</div>`}inner.append(timerDisplay())}
 else if(r===3){const q=data.oneWord[data.state.oneWordIndex];inner.innerHTML=`<div class="eyebrow">ONE WORD CHALLENGE</div><div class="stage-title">${esc(currentTeacher()?.name||"")}</div><div class="prompt">${esc(q?.question||"")}</div>`;inner.append(timerDisplay())}
 else {inner.innerHTML=`<div class="eyebrow">FINAL ROUND</div><div class="stage-title">SPIN THE CHALLENGE</div><div class="stage-sub">${esc(data.state.currentChallenge||"SPIN TO BEGIN")}</div>`}
 stage.append(inner);p.append(stage);const exit=el("button",{class:"btn",style:"position:fixed;top:15px;right:15px"},["Exit Presentation"]);exit.onclick=()=>{data.state.screen="control";data.state.view="game";persist();render()};p.append(exit);document.body.append(p);
}
function renderPresentationScore(inner){
 const sorted=activeTeachers().filter(t=>t.active).sort((a,b)=>b.score-a.score);
 inner.innerHTML=`<div class="eyebrow">LIVE SCOREBOARD</div><div class="stage-title">TEACHERS' DAY</div>`;
 const box=el("div",{style:"display:grid;gap:10px;margin-top:30px"});
 sorted.forEach(t=>{const r=el("div",{style:"display:flex;justify-content:space-between;font-size:clamp(22px,3vw,44px);padding:12px 20px;background:#151820;border-radius:12px"});r.innerHTML=`<span>${esc(t.name)}</span><b>${t.score}</b>`;box.append(r)});inner.append(box);
}
function exportData(){const copy=clone(data);delete copy.state.screen;const blob=new Blob([JSON.stringify(copy,null,2)],{type:"application/json"});const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download="teachers-day-game-backup.json";a.click();URL.revokeObjectURL(a.href);}
function importData(){const input=el("input",{type:"file",accept:"application/json"});input.onchange=()=>{const r=new FileReader();r.onload=()=>{try{const x=JSON.parse(r.result);data={...data,...x,state:{...data.state,...(x.state||{})}};persist();render();toast("Backup imported.");}catch(e){toast("Invalid backup file.")}};r.readAsText(input.files[0])};input.click();}

document.addEventListener("keydown",e=>{
 if(data.state.screen==="presentation")return;
 if(e.target.matches("input,textarea,select"))return;
 if(e.code==="Space"){e.preventDefault();timerAction(data.state.timer.running?"pause":"start")}
 if(e.key.toLowerCase()==="r")timerAction("reset");
 if(e.key.toLowerCase()==="n"){if(data.state.round===0)nextPrompt();else if(data.state.round===3)nextOneWord();else nextTeacher()}
 if(e.key.toLowerCase()==="a")award(data.state.round===3&&data.state.oneWordIndex===data.oneWord.length-1?2:1);
 if(e.key.toLowerCase()==="x")nextTeacher();
 if(e.key.toLowerCase()==="s"){data.state.view="score";persist();render()}
 if(e.key.toLowerCase()==="f")document.documentElement.requestFullscreen?.();
});

const originalRender=render;
window.addEventListener("load",()=>{render();setTimeout(buildWheel,20)});
})();