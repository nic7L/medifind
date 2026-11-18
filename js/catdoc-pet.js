// CatDoc's offline virtual-pet room. Nothing is recorded without an explicit tap.
const KEY='medifind.catdoc.pet.v1';
const clamp=(n,min,max)=>Math.max(min,Math.min(max,n));
export function restorePet(value) {
  const v=value&&typeof value==='object'?value:{};
  const num=(x,d,max)=>Number.isFinite(x)?clamp(Math.floor(x),0,max):d;
  return { happiness:num(v.happiness,60,100), energy:num(v.energy,90,100),
    pats:num(v.pats,0,999999), score:num(v.score,0,999999), sound:v.sound===true };
}
const read=()=>{try{return restorePet(JSON.parse(localStorage.getItem(KEY)));}catch{return restorePet(null);}};
const save=s=>{try{localStorage.setItem(KEY,JSON.stringify(s));}catch{}};
const quiet=()=>matchMedia('(prefers-reduced-motion: reduce)').matches;
export function applyPetAction(state,kind) {
  const s={...state};
  if(kind==='pat'||kind==='stroke'||kind==='tickle'){s.happiness=clamp(s.happiness+(kind==='stroke'?3:kind==='tickle'?5:2),0,100);s.pats=clamp(s.pats+1,0,999999);}
  if(kind==='treat'){s.happiness=clamp(s.happiness+8,0,100);s.energy=clamp(s.energy+12,0,100);}
  if(kind==='ball'){s.happiness=clamp(s.happiness+6,0,100);s.energy=clamp(s.energy-3,0,100);s.score=clamp(s.score+1,0,999999);}
  if(kind==='nap')s.energy=100;
  return s;
}
export function initPetRoom({art,wake,sleep,talk,celebrate,openAssistant,closeAssistant,isSleeping,bubble}) {
  let state=read(), room, audio, timer, listening=false, petting=false, motionTimer, audioURL='', recorder, stream, chunks=[], playback, recordingTimer, requestToken=0;
  const root=document.documentElement;
  room=document.createElement('dialog');room.className='pet-room';room.setAttribute('aria-label','CatDoc playroom');
  room.innerHTML='<div class="pet-room-top"><div><small>MEDIFIND / VIRTUAL COMPANION</small><h2>CatDoc’s playroom</h2></div><button type="button" class="icon-btn" data-pet-close aria-label="Close playroom">×</button></div>'
    +'<div class="pet-meters"><label>Happiness <strong data-happiness></strong><progress data-happy-progress max="100"></progress></label><label>Energy <strong data-energy></strong><progress data-energy-progress max="100"></progress></label></div>'
    +'<div class="pet-stage"><div class="pet-floor" aria-hidden="true"></div><button class="pet-character" type="button" aria-label="Pat CatDoc or stroke with your finger">'+art()+'</button><button class="pet-ball" type="button" hidden aria-label="Catch the toy ball">●</button><span class="pet-status" role="status" aria-live="polite">Tap my head or rub my tummy!</span></div>'
    +'<p class="pet-hint">Tap the head to pat, stroke gently to pet, or tap the lower body to tickle. On a keyboard, use the Pat button.</p>'
    +'<div class="pet-actions"><button type="button" data-pet-action="pat">♥ Pat</button><button type="button" data-pet-action="tickle">✳ Tickle</button><button type="button" data-pet-action="treat">♡ Treat</button><button type="button" data-pet-action="ball">● Ball game</button><button type="button" data-pet-action="nap">☾ Nap</button><button type="button" data-pet-sound aria-pressed="false">♪ Sound off</button><button type="button" data-pet-record>♩ Repeat my voice</button><button type="button" data-pet-assistant>⌕ Ask CatDoc</button></div>'
    +'<p class="pet-totals">Pats: <strong data-pats></strong> · Toy catches: <strong data-score></strong></p><p class="pet-privacy">Sound is optional. Voice repeat uses your microphone only after permission, records for up to 6 seconds, and plays it back locally. No audio is uploaded or saved.</p>';
  document.body.append(room);
  const character=room.querySelector('.pet-character'),stage=room.querySelector('.pet-stage'),ball=room.querySelector('.pet-ball'),status=room.querySelector('.pet-status'),recordButton=room.querySelector('[data-pet-record]');
  const canRecord=!!(navigator.mediaDevices?.getUserMedia && window.MediaRecorder);
  if(!canRecord){recordButton.disabled=true;recordButton.title='Voice recording is unavailable in this browser.';}
  function render(){
    room.querySelector('[data-happiness]').textContent=state.happiness+'%';room.querySelector('[data-energy]').textContent=state.energy+'%';
    room.querySelector('[data-happy-progress]').value=state.happiness;room.querySelector('[data-energy-progress]').value=state.energy;
    room.querySelector('[data-pats]').textContent=state.pats;room.querySelector('[data-score]').textContent=state.score;
    const sound=room.querySelector('[data-pet-sound]');sound.textContent=state.sound?'♪ Sound on':'♪ Sound off';sound.setAttribute('aria-pressed',String(state.sound));
    save(state);
  }
  function tone(kind){
    if(!state.sound)return;
    try{
      const Audio=window.AudioContext||window.webkitAudioContext;if(!Audio)return;
      audio ||= new Audio();if(audio.state==='suspended')audio.resume().catch(()=>{});
      const now=audio.currentTime;
      const notes=kind==='tickle'?[520,660,840,620]:kind==='ball'?[480,620,790]:kind==='treat'?[330,490,660]:[190,250,210];
      notes.forEach((freq,i)=>{const o=audio.createOscillator(),g=audio.createGain();o.type='sine';o.frequency.setValueAtTime(freq,now+i*.075);o.frequency.exponentialRampToValueAtTime(freq*.75,now+i*.075+.09);g.gain.setValueAtTime(.001,now+i*.075);g.gain.exponentialRampToValueAtTime(.07,now+i*.075+.02);g.gain.exponentialRampToValueAtTime(.001,now+i*.075+.16);o.connect(g);g.connect(audio.destination);o.start(now+i*.075);o.stop(now+i*.075+.17);});
    }catch{}
  }
  function say(text){status.textContent=text;if(!room.open){bubble.textContent=text;clearTimeout(timer);timer=setTimeout(()=>{if(!isSleeping())bubble.textContent='Need a helping paw?';},2500);}}
  function particles(target,event,kind){
    if(quiet()||!target)return;const r=target.getBoundingClientRect();
    const cx=event&&event.clientX&&event.detail!==0?event.clientX:r.left+r.width/2,cy=event&&event.clientY&&event.detail!==0?event.clientY:r.top+r.height*.36;
    const host=room.open?room:document.body,hr=host===room?room.getBoundingClientRect():{left:0,top:0};
    for(let i=0;i<3;i++){const p=document.createElement('span');p.className='pet-particle';p.textContent=kind==='tickle'?'✳':'♥';p.setAttribute('aria-hidden','true');p.style.left=(cx-hr.left+(i-1)*22)+'px';p.style.top=(cy-hr.top)+'px';p.style.setProperty('--pet-drift',((i-1)*24)+'px');if(host===room)p.classList.add('in-room');host.append(p);setTimeout(()=>p.remove(),850);}
  }
  function expression(kind){
    clearTimeout(motionTimer);root.classList.remove('pet-purring','pet-tickled','pet-fed');
    void character.offsetWidth;root.classList.add(kind);
    motionTimer=setTimeout(()=>root.classList.remove(kind),kind==='pet-purring'?1050:850);
  }
  function react(kind,event,target=character){
    wake();
    state=applyPetAction(state,kind);render();
    const messages={pat:'Purr… I like that!',stroke:'That feels lovely!',tickle:'Hehe! That tickles!',treat:'Yum! Thank you!',ball:'Got it! Another round?'};
    say(messages[kind]||'Let’s play!');
    expression(kind==='tickle'?'pet-tickled':kind==='treat'?'pet-fed':'pet-purring');tone(kind);
    particles(target,event,kind);
    if(kind==='ball')celebrate();
  }
  function petInput(el) {
    let gesture=null,skip=false;
    el.addEventListener('pointerdown',e=>{if(!e.isPrimary||e.button!==0)return;wake();gesture={id:e.pointerId,x:e.clientX,y:e.clientY,travel:0,last:0,moved:false};skip=false;el.setPointerCapture?.(e.pointerId);});
    el.addEventListener('pointermove',e=>{if(!gesture||gesture.id!==e.pointerId)return;gesture.travel+=Math.hypot(e.clientX-gesture.x,e.clientY-gesture.y);gesture.x=e.clientX;gesture.y=e.clientY;if(gesture.travel>15)gesture.moved=true;if(gesture.travel>28&&performance.now()-gesture.last>320){gesture.travel=0;gesture.last=performance.now();react('stroke',e,el);}});
    function finish(e){if(!gesture||gesture.id!==e.pointerId)return;skip=gesture.moved;gesture=null;if(el.hasPointerCapture?.(e.pointerId))el.releasePointerCapture(e.pointerId);}
    el.addEventListener('pointerup',finish);el.addEventListener('pointercancel',finish);
    el.addEventListener('click',e=>{if(skip&&e.detail!==0){skip=false;return;}skip=false;const r=el.getBoundingClientRect();const lower=e.detail!==0&&e.clientY>r.top+r.height*.65;react(lower?'tickle':'pat',e,el);});
  }
  petInput(character);
  const hero=document.querySelector('.catdoc-stage .catdoc-art');
  if(hero){const btn=document.createElement('button');btn.type='button';btn.className='pet-hero-touch';btn.setAttribute('aria-label','Pat or stroke CatDoc');hero.before(btn);btn.append(hero);hero.setAttribute('aria-hidden','true');hero.removeAttribute('role');hero.removeAttribute('aria-label');petInput(btn);}
  function moveBall(){
    ball.hidden=false;const maxX=Math.max(8,stage.clientWidth-ball.offsetWidth-8),maxY=Math.max(8,stage.clientHeight-ball.offsetHeight-58);
    const x=8+Math.random()*(maxX-8),y=8+Math.random()*(maxY-8);
    ball.style.left=x+'px';ball.style.top=y+'px';
  }
  ball.addEventListener('click',e=>{react('ball',e,ball);moveBall();ball.focus({preventScroll:true});});
  function nap(){state=applyPetAction(state,'nap');render();sleep();say('Zzz… tap me to wake me. Energy restored!');ball.hidden=true;}
  room.querySelectorAll('[data-pet-action]').forEach(btn=>btn.addEventListener('click',()=>{
    const action=btn.dataset.petAction;
    if(action==='ball'){wake();if(ball.hidden){moveBall();say('Catch the ball! Each catch earns a point.');ball.focus({preventScroll:true});}else{ball.hidden=true;say('Ball game paused.');}return;}
    if(action==='nap'){nap();return;}
    react(action,null,character);
  }));
  room.querySelector('[data-pet-sound]').addEventListener('click',()=>{state.sound=!state.sound;render();if(state.sound)tone('pat');});
  function discardPlayback(){if(playback){playback.onended=null;playback.onerror=null;playback.pause();playback=null;}if(audioURL){URL.revokeObjectURL(audioURL);audioURL='';}talk(false);}
  function releaseStream(s){s?.getTracks().forEach(t=>t.stop());}
  function finishRecording(discard=false){
    clearTimeout(recordingTimer);
    if(recorder&&recorder.state!=='inactive'){if(discard)recorder.onstop=null;recorder.stop();}
    if(discard){releaseStream(stream);stream=null;chunks=[];}
    listening=false;recordButton.textContent='♩ Repeat my voice';
  }
  async function record(){
    if(!canRecord)return;
    if(listening){finishRecording();return;}
    if(recorder&&recorder.state!=='inactive')return;
    discardPlayback();const token=++requestToken;recordButton.disabled=true;
    try{
      const mic=await navigator.mediaDevices.getUserMedia({audio:true});
      if(token!==requestToken||!room.open){releaseStream(mic);return;}
      stream=mic;chunks=[];const current=new MediaRecorder(stream);recorder=current;
      current.ondataavailable=e=>{if(e.data.size)chunks.push(e.data);};
      current.onstop=()=>{
        releaseStream(mic);if(stream===mic)stream=null;
        if(token!==requestToken||!room.open){chunks=[];return;}
        const clip=new Blob(chunks,{type:current.mimeType||'audio/webm'});chunks=[];
        if(!clip.size){say('No sound captured. Try again.');return;}
        audioURL=URL.createObjectURL(clip);const player=new Audio(audioURL);playback=player;
        player.playbackRate=1.25;player.preservesPitch=false;if('webkitPreservesPitch'in player)player.webkitPreservesPitch=false;
        player.onplay=()=>{talk(true,7000);say('Listen! I’m repeating your voice.');};
        player.onended=player.onerror=()=>{discardPlayback();say('Say something else whenever you like!');};
        player.play().catch(()=>{discardPlayback();say('Playback was blocked by this browser. Try again.');});
      };
      current.start();listening=true;recordButton.textContent='■ Stop & repeat';say('Listening… speak for up to 6 seconds.');
      recordingTimer=setTimeout(()=>finishRecording(),6000);
    }catch{releaseStream(stream);stream=null;say('Microphone unavailable or permission denied. You can still play without it.');}
    finally{recordButton.disabled=!canRecord;}
  }
  recordButton.addEventListener('click',record);
  function clean(){requestToken++;finishRecording(true);discardPlayback();ball.hidden=true;clearTimeout(motionTimer);root.classList.remove('pet-purring','pet-tickled','pet-fed');}
  room.addEventListener('close',clean);
  room.querySelector('[data-pet-close]').addEventListener('click',()=>room.close());
  room.querySelector('[data-pet-assistant]').addEventListener('click',()=>{room.close();openAssistant();});
  function open(){if(room.open)return;closeAssistant();wake();render();say('Tap my head or rub my tummy!');room.showModal();character.focus({preventScroll:true});}
  document.querySelectorAll('[data-pet-open]').forEach(b=>b.addEventListener('click',open));
  render();
  return {open,react};
}
