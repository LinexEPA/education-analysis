const TYPES={V:'Visual 視覺',A:'Aural 聽覺',W:'Verbal 語文',P:'Physical 動覺',L:'Logical 邏輯',S:'Social 社交',I:'Solitary 獨立'};
const QUESTIONS=[
['V','看到圖表或示意圖時，我通常比只看文字更容易理解內容。'],['V','學習新的內容時，我會注意顏色、位置或版面的安排。'],['V','我常用流程圖、心智圖或圖像整理複雜的資訊。'],['V','如果別人只用口頭說明，我會希望同時看到圖片或文字提示。'],['V','我容易記得曾經看過的圖像、場景或頁面位置。'],['V','學習一個流程時，我喜歡先看到整體架構。'],['V','使用不同顏色標示重點，可以幫助我整理資訊。'],['V','我常在腦中把一件事情想像成畫面。'],['V','示範圖片或影片能幫助我更快掌握新內容。'],['V','面對很多文字時，我會想把內容重新整理成圖表或圖像。'],
['A','聽別人說明時，我通常能很快掌握重點。'],['A','我會透過把內容說出來，幫助自己記住。'],['A','聽講解、討論或錄音，可以幫助我理解新內容。'],['A','有些事情只要聽過一次，我就能記得大概內容。'],['A','我喜歡透過提問與回答來確認自己是否理解。'],['A','當我讀到比較困難的內容時，有時會在心裡或小聲念出來。'],['A','別人用不同語氣或強調方式說明時，我容易注意到重點。'],['A','比起自己閱讀很久，我有時更希望有人先口頭解釋。'],['A','我常能記得別人曾經說過的話。'],['A','聽完一段說明後，我通常能用自己的話重新說明。'],
['W','我喜歡透過閱讀文字來理解新的內容。'],['W','寫下重點可以幫助我整理自己的想法。'],['W','我會注意一段文字中的用詞是否清楚、精確。'],['W','我喜歡用自己的文字重新整理剛學到的內容。'],['W','面對新的概念時，清楚的文字說明對我很重要。'],['W','我透過寫筆記、摘要或關鍵字可以加深記憶。'],['W','我通常能用文字清楚表達自己的想法。'],['W','我喜歡閱讀說明、文章或書面資料來進一步了解一個主題。'],['W','遇到複雜內容時，我會嘗試把它整理成幾句簡單的文字。'],['W','找到適合的詞語來描述一件事情，可以幫助我理解它。'],
['P','實際操作一次，通常比只看說明更容易讓我學會。'],['P','我喜歡在練習中逐漸了解一件事情，而不是先讀完所有內容。'],['P','看完示範後，我會想立刻自己試做看看。'],['P','我在實際操作的過程中，常會發現原本沒有注意到的問題。'],['P','如果長時間只是坐著聽課，我比較容易失去專注。'],['P','觸摸、操作或實際使用物品，可以幫助我記住內容。'],['P','學習新的技能時，我需要親自做過才會比較有把握。'],['P','我常透過實際嘗試來確認自己是否真正理解。'],['P','模擬、角色扮演或情境演練對我的學習很有幫助。'],['P','我對實際做過的事情，通常比只聽過或看過的事情記得更清楚。'],
['L','學習新內容時，我會想先知道其中的原因與原理。'],['L','我習慣把複雜的事情拆成幾個步驟來理解。'],['L','當資訊很多時，我會嘗試找出其中的規律。'],['L','我喜歡知道「為什麼要這樣做」，而不只是知道怎麼做。'],['L','我常會比較不同方法之間的差異。'],['L','面對問題時，我會先整理已知資訊，再決定下一步。'],['L','分類、排序或建立規則可以幫助我理解複雜內容。'],['L','如果一個說法前後不一致，我通常很快就會注意到。'],['L','我喜歡分析一件事情發生的原因以及可能產生的結果。'],['L','學習一個流程時，我會特別注意各步驟之間的關係。'],
['S','和別人討論，可以幫助我發現自己原本沒有想到的地方。'],['S','和同伴一起練習時，我通常能學得更快。'],['S','向別人解釋自己學到的內容，可以幫助我加深理解。'],['S','我喜歡透過小組討論交換不同的想法。'],['S','遇到不確定的地方時，我會想和別人討論看看。'],['S','觀察別人如何處理問題，可以幫助我學習。'],['S','我喜歡在互動中確認自己是否理解正確。'],['S','和別人一起完成任務時，我常能得到新的學習線索。'],['S','我會從別人的提問或回饋中重新思考自己的做法。'],['S','學習新的內容時，有可以一起討論的夥伴對我很有幫助。'],
['I','我需要一些自己思考的時間，才能真正整理清楚一件事情。'],['I','我喜歡按照自己的速度學習。'],['I','在安靜、不被打擾的環境中，我通常比較容易專心。'],['I','學完一段內容後，我會自己回想哪些地方已經懂了、哪些還不懂。'],['I','我喜歡先自己嘗試解決問題，再尋求別人的協助。'],['I','我會替自己設定學習目標或進度。'],['I','我習慣自己整理筆記或建立適合自己的學習方式。'],['I','有些內容我需要獨自消化之後，才比較容易和別人討論。'],['I','我會反思自己的學習方式是否有效。'],['I','當我自己完成一項學習任務時，我通常很清楚自己卡在哪個地方。']
];
const ORDER=Array.from({length:10},(_,r)=>['V','A','W','P','L','S','I'].map((_,c)=>c*10+r)).flat();
const state={i:0,answers:Array(70).fill(null),profile:null};
const $=id=>document.getElementById(id);

function initDOB(){
  const y=$('year'),m=$('month'),now=new Date().getFullYear();
  y.innerHTML='<option value="">年</option>'+Array.from({length:63},(_,i)=>now-18-i).map(v=>`<option value="${v}">${v}</option>`).join('');
  m.innerHTML='<option value="">月</option>'+Array.from({length:12},(_,i)=>i+1).map(v=>`<option value="${v}">${String(v).padStart(2,'0')}</option>`).join('');
  $('day').innerHTML='<option value="">日</option>';
  y.addEventListener('change',updateDays);m.addEventListener('change',updateDays);
}
function updateDays(){
  const y=+$('year').value,m=+$('month').value,d=$('day'),old=d.value;
  if(!y||!m){d.innerHTML='<option value="">日</option>';return;}
  const n=new Date(y,m,0).getDate();
  d.innerHTML='<option value="">日</option>'+Array.from({length:n},(_,i)=>i+1).map(v=>`<option value="${v}">${String(v).padStart(2,'0')}</option>`).join('');
  if(+old<=n)d.value=old;
}
function ageOn(date,birth){let a=date.getFullYear()-birth.getFullYear();const md=date.getMonth()-birth.getMonth();if(md<0||(md===0&&date.getDate()<birth.getDate()))a--;return a;}
function ageBand(a){if(a<20)return '未滿20歲';if(a>=45)return '45歲以上';const lo=Math.floor(a/5)*5;return `${lo}–${lo+4}歲`;}
function zodiac(m,d){
  const cutoffs=[['摩羯座',1,19],['水瓶座',2,18],['雙魚座',3,20],['牡羊座',4,19],['金牛座',5,20],['雙子座',6,20],['巨蟹座',7,22],['獅子座',8,22],['處女座',9,22],['天秤座',10,22],['天蠍座',11,21],['射手座',12,21],['摩羯座',12,31]];
  for(const [name,mm,dd] of cutoffs){if(m<mm||(m===mm&&d<=dd))return name;}return '摩羯座';
}

$('startBtn').addEventListener('click',()=>{
  const emp=$('emp').value.trim(),unit=$('unit').value.trim(),y=+$('year').value,m=+$('month').value,d=+$('day').value;
  if(!emp||!unit||!y||!m||!d){alert('請完成員工編號、單位及出生年月日。');return;}
  const birth=new Date(y,m-1,d),today=new Date(),age=ageOn(today,birth);
  if(age<15||age>80){alert('請確認出生年月日是否正確。');return;}
  state.profile={emp,unit,birthMonth:`${y}-${String(m).padStart(2,'0')}`,age,ageBand:ageBand(age),zodiac:zodiac(m,d),testDate:localISO(today)};
  $('intro').classList.add('hidden');$('quiz').classList.remove('hidden');renderQ();window.scrollTo({top:0,behavior:'smooth'});
});

function localISO(d){const y=d.getFullYear(),m=String(d.getMonth()+1).padStart(2,'0'),day=String(d.getDate()).padStart(2,'0');return `${y}-${m}-${day}`;}
function renderQ(){
  const idx=ORDER[state.i],text=QUESTIONS[idx][1];
  $('qnum').textContent=`第 ${state.i+1} / 70 題`;$('bar').style.width=`${(state.i+1)/70*100}%`;$('question').textContent=text;
  const labels=['不像我／很少符合','有時符合','很像我／經常符合'];
  $('choices').innerHTML=[0,1,2].map(v=>`<button type="button" class="choice ${state.answers[idx]===v?'selected':''}" data-v="${v}"><b>${v}</b>　${labels[v]}</button>`).join('');
  [...$('choices').children].forEach(b=>b.addEventListener('click',()=>{state.answers[idx]=+b.dataset.v;renderQ();}));
  $('prevBtn').disabled=state.i===0;$('nextBtn').textContent=state.i===69?'完成並查看結果':'下一題';
}
$('prevBtn').addEventListener('click',()=>{if(state.i>0){state.i--;renderQ();window.scrollTo({top:0,behavior:'smooth'});}});
$('nextBtn').addEventListener('click',()=>{const idx=ORDER[state.i];if(state.answers[idx]===null){alert('請先選擇本題答案。');return;}if(state.i<69){state.i++;renderQ();window.scrollTo({top:0,behavior:'smooth'});}else finish();});

function finish(){
  const totals={V:0,A:0,W:0,P:0,L:0,S:0,I:0};QUESTIONS.forEach(([t],i)=>totals[t]+=state.answers[i]);
  $('quiz').classList.add('hidden');$('result').classList.remove('hidden');
  $('meta').textContent=`員工編號 ${state.profile.emp}｜${state.profile.unit}｜${state.profile.ageBand}｜${state.profile.zodiac}`;
  $('scores').innerHTML=Object.entries(totals).map(([k,v])=>`<div class="score">${TYPES[k]} <b>${v}/20</b></div>`).join('');
  const max=Math.max(...Object.values(totals)),tops=Object.keys(totals).filter(k=>totals[k]>=max-1);
  $('topBadges').innerHTML=tops.map(k=>`<span class="badge">${TYPES[k]}</span>`).join('');$('advice').textContent=advice(tops);drawRadar(totals);
  window.__learningStyleResult={profile:{...state.profile},scores:{...totals},answers:[...state.answers]};
  window.scrollTo({top:0,behavior:'smooth'});
}
function advice(tops){
  const a={V:'可善用流程圖、示意圖、色彩標記與視覺化整理。',A:'可透過口頭講解、討論、複述與聲音素材強化理解。',W:'可透過閱讀、摘要、關鍵字與文字重述整理內容。',P:'可安排實作、模擬、示範後立即練習，從操作中修正理解。',L:'可先理解原理、因果、規則與流程，再進行情境應用。',S:'可加入同儕討論、互教與回饋，從互動中補足觀點。',I:'可保留獨立思考、反思與自行整理的時間。'};
  return '你目前較突出的學習偏好為：'+tops.map(k=>TYPES[k]).join('、')+'。'+tops.map(k=>a[k]).join(' ')+'建議仍搭配多種學習方式，不必把自己限定在單一類型。';
}
function drawRadar(totals){
  const c=$('radar'),ctx=c.getContext('2d'),W=c.width,H=c.height,cx=W/2,cy=H/2,R=190,keys=Object.keys(TYPES),n=keys.length;
  ctx.clearRect(0,0,W,H);ctx.font='16px sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';
  for(let ring=1;ring<=4;ring++){ctx.beginPath();keys.forEach((k,i)=>{const a=-Math.PI/2+i*2*Math.PI/n,r=R*ring/4,x=cx+Math.cos(a)*r,y=cy+Math.sin(a)*r;i?ctx.lineTo(x,y):ctx.moveTo(x,y);});ctx.closePath();ctx.strokeStyle='#ded8e7';ctx.lineWidth=1;ctx.stroke();}
  keys.forEach((k,i)=>{const a=-Math.PI/2+i*2*Math.PI/n,x=cx+Math.cos(a)*R,y=cy+Math.sin(a)*R;ctx.beginPath();ctx.moveTo(cx,cy);ctx.lineTo(x,y);ctx.strokeStyle='#eee9f3';ctx.stroke();ctx.fillStyle='#4b4653';ctx.fillText(TYPES[k].split(' ')[1],cx+Math.cos(a)*(R+38),cy+Math.sin(a)*(R+38));});
  ctx.beginPath();keys.forEach((k,i)=>{const a=-Math.PI/2+i*2*Math.PI/n,r=R*totals[k]/20,x=cx+Math.cos(a)*r,y=cy+Math.sin(a)*r;i?ctx.lineTo(x,y):ctx.moveTo(x,y);});ctx.closePath();ctx.fillStyle='rgba(143,122,169,.20)';ctx.fill();ctx.strokeStyle='#8f7aa9';ctx.lineWidth=3;ctx.stroke();
  keys.forEach((k,i)=>{const a=-Math.PI/2+i*2*Math.PI/n,r=R*totals[k]/20,x=cx+Math.cos(a)*r,y=cy+Math.sin(a)*r;ctx.beginPath();ctx.arc(x,y,4,0,Math.PI*2);ctx.fillStyle='#8f7aa9';ctx.fill();});
}
$('restartBtn').addEventListener('click',()=>location.reload());
initDOB();
