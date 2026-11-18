import { basePath, getFacilities } from './storage.js';
import { pageUrl, isOpenNow, escapeHtml, ratingData } from './ui.js';
import { initPetRoom } from './catdoc-pet.js';

const POSITION = 'medifind.catdoc.position.v1';
const TOUR = 'medifind.catdoc.tour.v1';
const HOME = basePath + '/index.html';
const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
const read = (store, key, fallback) => { try { return JSON.parse(window[store].getItem(key)) ?? fallback; } catch { return fallback; } };
const write = (store, key, value) => { try { window[store].setItem(key, JSON.stringify(value)); } catch {} };
const clear = (store, key) => { try { window[store].removeItem(key); } catch {} };

const steps = [
  { page:'index.html', target:'.hero-search', title:'Search with a purpose', text:'Use this search bar for a facility name, service or city. Try pharmacy or blood test.' },
  { page:'directory.html', target:'[data-filters]', title:'Refine your results', text:'Choose a category or city. Use Open now, Verified only and the minimum rating to narrow your search.' },
  { page:'directory.html', target:'[data-favorite], #filter-favorites', title:'Save your favorites', text:'Tap a heart on a facility card to save it. Favorites only shows your saved listings on this browser.' },
  { page:'directory.html', target:'[data-compare], [data-directory-grid]', title:'Build a shortlist', text:'Select Compare on up to three facility cards, then open the Compare page.' },
  { page:'compare.html', target:'.compare-controls', title:'Compare side by side', text:'Use this picker to add facilities. Compare hours, services, ratings and contact information in one place.' },
  { page:'compare.html', target:'.page-hero', title:'You are ready!', text:'Open a facility profile to see its hours, map, services and feedback. Ask me for help anytime. All listings are fictional academic samples.' }
];

function currentPage() {
  return location.pathname.split('/').pop() || 'index.html';
}
function route(page) { return page === 'index.html' ? HOME : pageUrl(page); }

// Search only the local directory. Results contain escaped text and internal profile links.
export function answerQuestion(query, all = getFacilities()) {
  const q = query.toLowerCase().trim();
  const help = [
    [/^(hi|hello|hey|howdy)[!. ]*$/, 'Hello! I am CatDoc, your directory guide. Try “Find a 24-hour pharmacy” or start my guided tour.'],
    [/how.*(compare|comparison)|what.*compare/, 'Select Compare on up to three facility cards, then <a href="' + pageUrl('compare.html') + '">open comparison</a>.'],
    [/how.*(favorite|favourite|save)|where.*(favorite|favourite)/, 'Tap the heart on a facility card. Open the <a href="' + pageUrl('directory.html') + '">directory</a> and select Favorites only to see your shortlist.'],
    [/how.*(review|rating|feedback)/, 'Open a facility profile, pick a star rating and submit a comment. Feedback stays in your browser.'],
    [/how.*(search|filter)|how.*(use|explore).*site/, 'Open the <a href="' + pageUrl('directory.html') + '">directory</a>, search by name or service and choose filters. You can also start my guided tour.'],
    [/how.*(admin|login)/, 'The <a href="' + pageUrl('admin.html') + '">admin page</a> is a client-side demonstration of facility editing and feedback moderation.'],
    [/who.*(made|built|team)|project team/, 'MediFind is a CSE326 project by Veronic, Sunil and Sushanth. <a href="' + pageUrl('about.html') + '">Meet the team</a>.']
  ];
  if (/medical advice|diagnos(?:e|is)|what medicine|medicine should|symptom|emergency|dose|dosage|treat my/.test(q)) return 'I can only find fictional directory listings, not provide medical advice. For actual care, consult a qualified provider. For an emergency, contact local emergency services.';
  const tip = help.find(([pattern]) => pattern.test(q));
  if (tip) return tip[1];
  let items = all.slice(), matched = false;
  const categories = [[/pharmac(y|ies)/,'Pharmacy'],[/clinics?/,'Clinic'],[/\blabs?\b|diagnostic/,'Lab'],[/support|rehabilitation|counselling|physio/,'Support Facility']];
  const chosen = categories.find(([pattern]) => pattern.test(q));
  if (chosen) { items = items.filter(f => f.category === chosen[1]); matched = true; }
  if (/24[ -]?hours?|24\/7|round.the.clock/.test(q)) {
    items = items.filter(f => Object.keys(f.hours || {}).length === 7 && Object.values(f.hours).every(v => v === '24 Hours')); matched = true;
  }
  if (/open now|currently open/.test(q)) { items = items.filter(f => isOpenNow(f)); matched = true; }
  if (/unverified/.test(q)) { items = items.filter(f => !f.verified); matched = true; }
  else if (/verified/.test(q)) { items = items.filter(f => f.verified); matched = true; }
  const city = [...new Set(all.map(f => f.city.toLowerCase()))].sort((a,b) => b.length-a.length).find(v => v && q.includes(v));
  if (city) { items = items.filter(f => f.city.toLowerCase() === city); matched = true; }
  const area = [...new Set(all.map(f => f.area.toLowerCase()))].sort((a,b) => b.length-a.length).find(v => v && q.includes(v));
  if (area) { items = items.filter(f => f.area.toLowerCase() === area); matched = true; }
  const names = all.filter(f => q.includes(f.name.toLowerCase()));
  if (names.length) { items = items.filter(f => names.some(n => n.id === f.id)); matched = true; }
  const services = [...new Set(all.flatMap(f => f.services || []).map(s => s.toLowerCase()))].filter(s => s.length > 3 && q.includes(s));
  if (services.length) { items = items.filter(f => (f.services || []).some(s => services.includes(s.toLowerCase()))); matched = true; }
  if (/top rated|highest rated|best rated/.test(q)) { items.sort((a,b) => ratingData(b).rating-ratingData(a).rating); matched = true; }
  if (!matched) return 'Try a facility category, city or service, or ask “How do I compare facilities?” I can also show you around with the guided tour.';
  if (!items.length) return 'No matching sample facilities. Try fewer filters or a different category.';
  return 'I found ' + items.length + ' sample listing' + (items.length === 1 ? '' : 's') + ':<br>' + items.slice(0,5).map(f => '<a href="' + pageUrl('facility.html?id=' + encodeURIComponent(f.id)) + '">' + escapeHtml(f.name) + '</a> · ' + escapeHtml(f.city) + ' · ' + (isOpenNow(f) ? 'Open now' : 'Closed')).join('<br>') + (items.length > 5 ? '<br>Explore the directory for more.' : '');
}

// The uploaded picture remains the base layer. Small SVG facial layers animate
// its existing eyes and mouth without replacing the original character.
function animatedArt(src, label='') {
  const accessibility=label?'role="img" aria-label="'+escapeHtml(label)+'"':'aria-hidden="true"';
  return '<svg class="catdoc-art" viewBox="0 0 240 240" '+accessibility+' focusable="false" xmlns="http://www.w3.org/2000/svg">'
    + '<image href="'+escapeHtml(src)+'" width="240" height="240" />'
    + '<g class="catdoc-lids"><rect x="66" y="103" width="23" height="24" rx="9" fill="#fefefe"/><rect x="145" y="106" width="23" height="24" rx="9" fill="#fefefe"/><path d="M69 115 Q77 123 85 115 M148 118 Q156 126 164 118" fill="none" stroke="#080808" stroke-width="4.5" stroke-linecap="round"/></g>'
    + '<g class="catdoc-mouth"><rect x="92" y="108" width="46" height="27" rx="10" fill="#fefefe"/><ellipse class="catdoc-mouth-shape" cx="115" cy="120" rx="10" ry="8" fill="#080808"/><ellipse class="catdoc-tongue" cx="115" cy="124" rx="4" ry="2" fill="#EF036C"/></g>'
    + '<g class="catdoc-joy" fill="#EF036C"><path d="M23 49 C12 36 1 50 23 64 C45 50 34 36 23 49Z"/><path d="M216 65 C206 54 197 65 216 78 C235 65 225 54 216 65Z"/></g>'
    + '<g class="catdoc-zzz" fill="#087527" font-family="Inter,Arial,sans-serif" font-weight="800"><text x="190" y="25" font-size="17">Z</text><text x="207" y="17" font-size="12">z</text></g>'
    + '</svg>';
}

export function initCatDoc() {
  if (document.querySelector('.catdoc-widget')) return;
  const image = basePath + '/assets/catdoc.webp';
  const heroPicture=document.querySelector('.catdoc-stage img');
  if(heroPicture){heroPicture.insertAdjacentHTML('beforebegin',animatedArt(image,heroPicture.alt));heroPicture.remove();}
  const widget = document.createElement('div');
  widget.className = 'catdoc-widget';
  widget.innerHTML = '<div class="catdoc-bubble" aria-hidden="true">Need a helping paw?</div><button class="catdoc-character" type="button" aria-label="Pat CatDoc. Drag to move; use arrow keys to reposition.">'+ animatedArt(image) +'<span>CatDoc <i aria-hidden="true">●</i></span></button><div class="catdoc-mini-actions"><button type="button" data-mini-play>Play</button><button type="button" data-mini-ask aria-expanded="false" aria-controls="catdoc-panel">Ask</button></div>';
  const panel = document.createElement('section');
  panel.id = 'catdoc-panel'; panel.className = 'catdoc-panel'; panel.hidden = true;
  panel.setAttribute('aria-label','CatDoc directory assistant');
  panel.innerHTML = '<header class="catdoc-head">'+ animatedArt(image) +'<div><strong>CatDoc</strong><small>Your MediFind companion</small></div><button class="icon-btn" type="button" data-cat-close aria-label="Minimize CatDoc">×</button></header>'
    + '<div class="catdoc-tools"><button type="button" data-tour>Guided tour</button><button type="button" data-walk>Walk</button><button type="button" data-play>Play</button><button type="button" data-nap>Nap</button><button type="button" data-reset-pos>Reset position</button><button type="button" data-speak hidden>Read aloud</button></div>'
    + '<div class="catdoc-tour" hidden><small data-step></small><strong data-tour-title></strong><p data-tour-text></p><div><button type="button" class="btn" data-tour-stop>End tour</button><button type="button" class="btn btn-primary" data-tour-next>Next →</button></div></div>'
    + '<div class="catdoc-log" role="log" aria-live="polite" aria-label="CatDoc replies"></div>'
    + '<div class="catdoc-queries"><button type="button" data-query="Find a 24-hour pharmacy">24-hour pharmacy</button><button type="button" data-query="Show verified clinics">Verified clinics</button><button type="button" data-query="How do I compare facilities?">How to compare</button></div>'
    + '<form class="catdoc-form"><input aria-label="Ask CatDoc" placeholder="Ask about facilities…" maxlength="250" required><button class="btn btn-primary" type="submit" aria-label="Send">↗</button></form><p class="catdoc-disclaimer">Demo directory only · Not medical advice</p>';
  document.body.append(widget,panel);
  const askButton=widget.querySelector("[data-mini-ask]");
  const cat = widget.querySelector('.catdoc-character'), log = panel.querySelector('.catdoc-log'), input = panel.querySelector('input'), tour = panel.querySelector('.catdoc-tour'), bubble=widget.querySelector('.catdoc-bubble');
  let lastReply = '', step = -1, highlighted = null, position, drag = null, suppressClick = false, idleTimer, talkTimer, cheerTimer, walkTimer;
  const root=document.documentElement;
  function sleeping(value) {
    widget.classList.toggle('sleepy',value);
    root.classList.toggle('catdoc-napping',value);
    bubble.textContent=value?'Zzz… tap to wake me':'Need a helping paw?';
  }
  function activity() {
    sleeping(false);
    clearTimeout(idleTimer);
    idleTimer=setTimeout(()=>{if(panel.hidden) sleeping(true);},45000);
  }
  function talking(value, duration=0) {
    clearTimeout(talkTimer); root.classList.toggle('catdoc-talking',value);
    if(value&&duration) talkTimer=setTimeout(()=>talking(false),duration);
  }
  function celebrate() {
    clearTimeout(cheerTimer); root.classList.remove('catdoc-celebrating');
    void cat.offsetWidth; root.classList.add('catdoc-celebrating');
    cheerTimer=setTimeout(()=>root.classList.remove('catdoc-celebrating'),1250);
  }
  function reply(html) {
    const msg = document.createElement('div'); msg.className='catdoc-message bot'; msg.innerHTML=html; log.append(msg);
    lastReply=msg.textContent; log.scrollTop=log.scrollHeight;
    talking(true,Math.min(1800,Math.max(550,lastReply.length*12)));
  }
  reply('Hi, human! I’m CatDoc. I can find sample clinics, labs and pharmacies, or show you how MediFind works.');
  function ask(q) {
    q=q.trim().slice(0,250); if (!q) return;
    activity(); const msg=document.createElement('div'); msg.className='catdoc-message user'; msg.textContent=q; log.append(msg); input.value=''; reply(answerQuestion(q));
  }
  function setOpen(open, focus=true) {
    panel.hidden=!open; askButton.setAttribute('aria-expanded',String(open)); widget.classList.toggle('is-open',open); activity();
    if (open && focus) input.focus({preventScroll:true});
    if (!open && focus) askButton.focus({preventScroll:true});
  }
  function clamp(x,y) {
    const w=widget.offsetWidth,h=widget.offsetHeight;
    return {x:Math.max(8,Math.min(Math.max(8,innerWidth-w-8),x)),y:Math.max(8,Math.min(Math.max(8,innerHeight-h-8),y))};
  }
  function place(x,y,save=true) {
    position=clamp(x,y); widget.style.left=position.x+'px'; widget.style.top=position.y+'px';
    if(save) write('localStorage',POSITION,{x:position.x/Math.max(1,innerWidth-widget.offsetWidth),y:position.y/Math.max(1,innerHeight-widget.offsetHeight)});
  }
  function defaultPlace(save=true) { place(innerWidth-widget.offsetWidth-18,innerHeight-widget.offsetHeight-18,save); }
  const saved=read('localStorage',POSITION,null);
  if(saved && Number.isFinite(saved.x)&&Number.isFinite(saved.y)) place(saved.x*(innerWidth-widget.offsetWidth),saved.y*(innerHeight-widget.offsetHeight),false); else defaultPlace(false);
  addEventListener('resize',()=>{ if(position) place(position.x,position.y); });
  cat.addEventListener('pointerdown',e=>{
    if(!e.isPrimary || e.button!==0) return; activity(); suppressClick=false;
    clearTimeout(walkTimer);widget.classList.remove('walking');
    drag={id:e.pointerId,x:e.clientX,y:e.clientY,left:position.x,top:position.y,moved:false}; cat.setPointerCapture(e.pointerId);
  });
  cat.addEventListener('pointermove',e=>{
    if(!drag || drag.id!==e.pointerId) return;
    const dx=e.clientX-drag.x,dy=e.clientY-drag.y;
    if(Math.hypot(dx,dy)>6) drag.moved=true;
    if(drag.moved){widget.classList.add('dragging');place(drag.left+dx,drag.top+dy,false);}
  });
  function endDrag(e) {
    if(!drag || e.pointerId!==drag.id) return;
    suppressClick=drag.moved; if(drag.moved) place(position.x,position.y);
    drag=null;widget.classList.remove('dragging');
    if(cat.hasPointerCapture(e.pointerId)) cat.releasePointerCapture(e.pointerId);
  }
  cat.addEventListener('pointerup',endDrag);cat.addEventListener('pointercancel',endDrag);
  cat.addEventListener('click',e=>{if(suppressClick && e.detail!==0){suppressClick=false;return;}suppressClick=false;pet.react('pat',e,cat);});
  askButton.addEventListener('click',()=>setOpen(panel.hidden));
  widget.querySelector('[data-mini-play]').addEventListener('click',()=>pet.open());
  cat.addEventListener('keydown',e=>{
    const keys={ArrowLeft:[-24,0],ArrowRight:[24,0],ArrowUp:[0,-24],ArrowDown:[0,24]};
    if(keys[e.key]){e.preventDefault();activity();place(position.x+keys[e.key][0],position.y+keys[e.key][1]);}
  });
  panel.querySelector('[data-cat-close]').addEventListener('click',()=>setOpen(false));
  panel.addEventListener('keydown',e=>{if(e.key==='Escape'){e.stopPropagation();setOpen(false);}});
  document.querySelectorAll('[data-catdoc-open]').forEach(b=>b.addEventListener('click',()=>setOpen(true)));
  panel.querySelector('form').addEventListener('submit',e=>{e.preventDefault();ask(input.value);});
  panel.querySelectorAll('[data-query]').forEach(b=>b.addEventListener('click',()=>ask(b.dataset.query)));
  panel.querySelector('[data-reset-pos]').addEventListener('click',()=>{activity();defaultPlace();});
  panel.querySelector('[data-walk]').addEventListener('click',()=>{
    setOpen(false,false);cat.focus({preventScroll:true});
    clearTimeout(walkTimer);widget.classList.add('walking');
    place(position.x>innerWidth/2?12:innerWidth-widget.offsetWidth-18,innerHeight-widget.offsetHeight-18);
    walkTimer=setTimeout(()=>{widget.classList.remove('walking');celebrate();},reduced()?0:1380);
  });
  panel.querySelector('[data-play]').addEventListener('click',()=>{
    setOpen(false,false);pet.open();
  });
  panel.querySelector('[data-nap]').addEventListener('click',()=>{
    setOpen(false,false);cat.focus({preventScroll:true});clearTimeout(idleTimer);talking(false);sleeping(true);
  });
  const speak=panel.querySelector('[data-speak]');
  if('speechSynthesis' in window && 'SpeechSynthesisUtterance' in window){
    speak.hidden=false;speak.addEventListener('click',()=>{
      activity();speechSynthesis.cancel();
      const utterance=new SpeechSynthesisUtterance(step>=0?steps[step].text:lastReply);utterance.lang='en-IN';
      utterance.onstart=()=>talking(true,Math.min(60000,Math.max(3000,utterance.text.length*150)));
      utterance.onend=utterance.onerror=()=>talking(false);
      speechSynthesis.speak(utterance);
    });
  }
  function clearHighlight(){highlighted?.classList.remove('catdoc-highlight');highlighted=null;}
  function stopTour(){clearHighlight();step=-1;tour.hidden=true;clear('sessionStorage',TOUR);}
  function showStep(index){
    if(!Number.isInteger(index)||index<0||index>=steps.length){stopTour();return;}
    const item=steps[index];write('sessionStorage',TOUR,index);
    if(item.page!==currentPage()){location.href=route(item.page);return;}
    step=index;setOpen(true,false);tour.hidden=false;talking(true,1100);
    tour.querySelector('[data-step]').textContent='STEP '+(index+1)+' OF '+steps.length;
    tour.querySelector('[data-tour-title]').textContent=item.title;tour.querySelector('[data-tour-text]').textContent=item.text;
    tour.querySelector('[data-tour-next]').textContent=index===steps.length-1?'Finish ✓':'Next →';
    clearHighlight();
    // Wait for directory cards to render after the shared readiness event.
    requestAnimationFrame(()=>{if(step!==index)return;const targets=item.target.split(',').map(s=>document.querySelector(s.trim()));highlighted=targets.find(el=>el&&!el.hidden&&el.getClientRects().length)||null;if(highlighted){highlighted.classList.add('catdoc-highlight');highlighted.scrollIntoView({behavior:reduced()?'auto':'smooth',block:'center'});}});
  }
  panel.querySelector('[data-tour]').addEventListener('click',()=>showStep(0));
  panel.querySelector('[data-tour-stop]').addEventListener('click',stopTour);
  panel.querySelector('[data-tour-next]').addEventListener('click',()=>{if(step===steps.length-1){stopTour();reply('Tour complete! Great work. I’m here whenever you need a helping paw.');celebrate();}else showStep(step+1);});
  const resume=read('sessionStorage',TOUR,null);if(Number.isInteger(resume)&&resume>=0&&resume<steps.length){if(steps[resume].page===currentPage())showStep(resume);else stopTour();}
  const pet=initPetRoom({art:()=>animatedArt(image),wake:activity,sleep:()=>{clearTimeout(idleTimer);talking(false);sleeping(true);},talk:talking,celebrate,openAssistant:()=>setOpen(true),closeAssistant:()=>setOpen(false,false),isSleeping:()=>root.classList.contains('catdoc-napping'),bubble});
  activity();
}
