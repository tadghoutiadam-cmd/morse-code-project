(function(){
  const MORSE_TO_CHAR = {
    '.-':'A','-...':'B','-.-.':'C','-..':'D','.':'E','..-.':'F','--.':'G','....':'H','..':'I','.---':'J',
    '-.-':'K','.-..':'L','--':'M','-.':'N','---':'O','.--.':'P','--.-':'Q','.-.':'R','...':'S','-':'T',
    '..-':'U','...-':'V','.--':'W','-..-':'X','-.--':'Y','--..':'Z',
    '-----':'0','.----':'1','..---':'2','...--':'3','....-':'4','.....':'5','-....':'6','--...':'7','---..':'8','----.':'9',
    '.-.-.-':'.', '--..--':',', '..--..':'?', '.----.':"'", '-.-.--':'!', '-..-.':'/', '-.--.':'(', '-.--.-':')',
    '.-...':'&', '---...':':', '-.-.-.':';', '-...-':'=', '.-.-.':'+', '-....-':'-', '..--.-':'_', '.-..-.':'"',
    '...-..-':'$', '.--.-.':'@'
  };

  const $ = (id)=>document.getElementById(id);
  const lamp = $('lamp'), scope = $('scope'), ticker = $('ticker');
  const wpmSlider = $('wpm'), wpmVal = $('wpmVal');
  const tabType = $('tab-type'), tabKey = $('tab-key');
  const panelType = $('panel-type'), panelKey = $('panel-key');
  const morseInput = $('morseInput');
  const keyBtn = $('keyBtn');
  const voiceSelect = $('voiceSelect');
  const btnCopy = $('btnCopy');

  let audioCtx = null;
  function getCtx(){
    if(!audioCtx) audioCtx = new (window.AudioContext||window.webkitAudioContext)();
    if(audioCtx.state==='suspended') audioCtx.resume();
    return audioCtx;
  }

  // ---------- WPM ----------
  function getUnitMs(){ return 1200/Number(wpmSlider.value); }
  wpmSlider.addEventListener('input', ()=>{ wpmVal.textContent = wpmSlider.value+' WPM'; });

  // ---------- Scope / lamp ----------
  let level = 0;
  let history = new Array(140).fill(0);
  function setLevel(v){
    level = v;
    lamp.classList.toggle('on', !!v);
  }
  function drawScope(){
    const ctx = scope.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    const w = scope.width = scope.clientWidth * dpr;
    const h = scope.height = scope.clientHeight * dpr;
    ctx.clearRect(0,0,w,h);
    ctx.strokeStyle = '#E8A33D';
    ctx.lineWidth = 2*dpr;
    ctx.beginPath();
    const step = w/history.length;
    for(let i=0;i<history.length;i++){
      const x = i*step;
      const y = history[i] ? h*0.28 : h*0.72;
      if(i===0) ctx.moveTo(x,y); else ctx.lineTo(x,y);
      if(i<history.length-1){
        const nextY = history[i+1] ? h*0.28 : h*0.72;
        if(nextY !== y) ctx.lineTo(x+step, y);
      }
    }
    ctx.stroke();
  }
  setInterval(()=>{ history.push(level); history.shift(); drawScope(); }, 25);
  window.addEventListener('resize', drawScope);

  // ---------- tone playback ----------
  function playTone(start, duration, onLamp){
    const ctx = getCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.frequency.value = 600; osc.type='sine';
    gain.gain.setValueAtTime(0, start);
    gain.gain.linearRampToValueAtTime(0.28, start+0.006);
    gain.gain.setValueAtTime(0.28, Math.max(start+0.006, start+duration-0.006));
    gain.gain.linearRampToValueAtTime(0, start+duration);
    osc.connect(gain).connect(ctx.destination);
    osc.start(start); osc.stop(start+duration+0.02);
    if(onLamp){
      const delayOn = Math.max(0,(start - ctx.currentTime)*1000);
      const delayOff = Math.max(0,(start+duration - ctx.currentTime)*1000);
      setTimeout(()=>setLevel(1), delayOn);
      setTimeout(()=>setLevel(0), delayOff);
    }
  }

  function scheduleMorsePlayback(morseStr){
    const ctx = getCtx();
    const unit = getUnitMs()/1000;
    let t = ctx.currentTime + 0.15;
    const tokens = morseStr.trim().split(/\s+/).filter(Boolean);
    tokens.forEach(token=>{
      if(token === '/'){ t += unit*4; return; }
      for(const sym of token){
        const dur = sym==='-' ? unit*3 : unit;
        playTone(t, dur, true);
        t += dur + unit;
      }
      t += unit*2;
    });
    return t;
  }

  // ---------- decode ----------
  function decodeMorse(str){
    return str.trim().split(/\s+/).filter(Boolean).map(tok=>{
      if(tok==='/') return ' ';
      return MORSE_TO_CHAR[tok] || '\u00B7';
    }).join('');
  }

  function escapeHtml(s){
    return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  }

  let lastText = '';
  function renderTicker(text){
    lastText = text;
    if(!text){
      ticker.innerHTML = '<span class="placeholder">\u2014 awaiting transmission \u2014</span><span class="cursor"></span>';
    } else {
      ticker.innerHTML = escapeHtml(text) + '<span class="cursor"></span>';
    }
  }

  morseInput.addEventListener('input', ()=>{ renderTicker(decodeMorse(morseInput.value)); });

  // ---------- copy ----------
  btnCopy.addEventListener('click', async ()=>{
    if(!lastText) return;
    const original = btnCopy.textContent;
    try{
      await navigator.clipboard.writeText(lastText.trim());
      btnCopy.textContent = 'Copied \u2713';
    }catch(e){
      btnCopy.textContent = "Can't copy";
    }
    setTimeout(()=>{ btnCopy.textContent = original; }, 1400);
  });

  // ---------- speech ----------
  let voices = [];
  function loadVoices(){
    voices = speechSynthesis.getVoices();
    voiceSelect.innerHTML = voices.map((v,i)=>`<option value="${i}">${v.name} (${v.lang})</option>`).join('');
  }
  loadVoices();
  if('onvoiceschanged' in speechSynthesis) speechSynthesis.onvoiceschanged = loadVoices;

  function speak(text){
    if(!text || !text.trim()) return;
    const u = new SpeechSynthesisUtterance(text);
    const idx = voiceSelect.value;
    if(voices[idx]) u.voice = voices[idx];
    speechSynthesis.cancel();
    speechSynthesis.speak(u);
  }

  // ---------- tabs ----------
  function setTab(which){
    const isType = which==='type';
    tabType.classList.toggle('active', isType);
    tabKey.classList.toggle('active', !isType);
    tabType.setAttribute('aria-selected', isType);
    tabKey.setAttribute('aria-selected', !isType);
    panelType.style.display = isType ? '' : 'none';
    panelKey.style.display = isType ? 'none' : '';
    if(isType) renderTicker(decodeMorse(morseInput.value)); else renderKeyTicker();
  }
  tabType.addEventListener('click', ()=>setTab('type'));
  tabKey.addEventListener('click', ()=>setTab('key'));

  // ---------- typed-mode buttons ----------
  $('btnPlayMorse').addEventListener('click', ()=>{ scheduleMorsePlayback(morseInput.value); });
  $('btnSpeakTyped').addEventListener('click', ()=>{ speak(decodeMorse(morseInput.value)); });
  $('btnClearType').addEventListener('click', ()=>{ morseInput.value=''; renderTicker(''); });
  $('btnSpeakNow').addEventListener('click', ()=>{
    const isType = panelType.style.display !== 'none';
    speak(isType ? decodeMorse(morseInput.value) : keyDecodedText);
  });

  // ---------- key-it-live mode ----------
  let pressed=false, pressStart=0;
  let currentSymbols='';
  let keyDecodedText='';
  let letterTimer=null, wordTimer=null;
  let liveOsc=null;

  function keyModeActive(){ return panelKey.style.display !== 'none'; }

  function startLiveTone(){
    const ctx = getCtx();
    const osc = ctx.createOscillator(); const gain = ctx.createGain();
    osc.frequency.value=600; osc.type='sine';
    gain.gain.setValueAtTime(0, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.28, ctx.currentTime+0.006);
    osc.connect(gain).connect(ctx.destination);
    osc.start();
    liveOsc = {osc, gain};
  }
  function stopLiveTone(){
    if(!liveOsc) return;
    const ctx = getCtx();
    liveOsc.gain.gain.linearRampToValueAtTime(0, ctx.currentTime+0.02);
    liveOsc.osc.stop(ctx.currentTime+0.03);
    liveOsc=null;
  }

  function renderKeyTicker(){
    const preview = currentSymbols ? ' ['+currentSymbols+']' : '';
    renderTicker(keyDecodedText + preview);
  }

  function finalizeLetter(){
    if(currentSymbols){
      keyDecodedText += (MORSE_TO_CHAR[currentSymbols] || '\u00B7');
      currentSymbols='';
      renderKeyTicker();
    }
  }
  function finalizeWord(){
    if(keyDecodedText && !keyDecodedText.endsWith(' ')){
      keyDecodedText += ' ';
      renderKeyTicker();
      if($('autoSpeak').checked){
        const words = keyDecodedText.trim().split(' ');
        speak(words[words.length-1]);
      }
    }
  }

  function onPressStart(e){
    if(e.type==='keydown'){
      if(!keyModeActive()) return;
      const tag = (document.activeElement && document.activeElement.tagName) || '';
      if(['INPUT','TEXTAREA','SELECT'].includes(tag)) return;
      if(e.code!=='Space' || e.repeat) return;
      e.preventDefault();
    }
    if(pressed) return;
    pressed=true;
    pressStart = performance.now();
    clearTimeout(letterTimer); clearTimeout(wordTimer);
    startLiveTone();
    setLevel(1);
    keyBtn.classList.add('pressed');
  }
  function onPressEnd(e){
    if(e.type==='keyup'){
      if(!keyModeActive()) return;
      if(e.code!=='Space') return;
    }
    if(!pressed) return;
    pressed=false;
    const dur = performance.now()-pressStart;
    const unit = getUnitMs();
    currentSymbols += (dur < unit*2 ? '.' : '-');
    stopLiveTone();
    setLevel(0);
    keyBtn.classList.remove('pressed');
    renderKeyTicker();
    const u = getUnitMs();
    letterTimer = setTimeout(finalizeLetter, u*3);
    wordTimer = setTimeout(()=>{ finalizeLetter(); finalizeWord(); }, u*7);
  }

  keyBtn.addEventListener('mousedown', onPressStart);
  keyBtn.addEventListener('touchstart', (e)=>{ e.preventDefault(); onPressStart(e); }, {passive:false});
  window.addEventListener('mouseup', onPressEnd);
  keyBtn.addEventListener('touchend', (e)=>{ e.preventDefault(); onPressEnd(e); }, {passive:false});
  window.addEventListener('keydown', onPressStart);
  window.addEventListener('keyup', onPressEnd);

  $('btnClearKey').addEventListener('click', ()=>{
    keyDecodedText=''; currentSymbols='';
    clearTimeout(letterTimer); clearTimeout(wordTimer);
    renderKeyTicker();
  });

  renderTicker('');
  drawScope();

  // ---------- theme ----------
  const themeToggle = $('themeToggle');
  const savedTheme = localStorage.getItem('morse-theme') || 'dark';

  function applyTheme(theme){
    document.documentElement.setAttribute('data-theme', theme);
    themeToggle.textContent = theme === 'light' ? '☀' : '☾';
    themeToggle.setAttribute(
      'aria-label',
      theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'
    );
    themeToggle.title = theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode';
  }

  applyTheme(savedTheme === 'light' ? 'light' : 'dark');

  themeToggle.addEventListener('click', ()=>{
    const nextTheme = document.documentElement.getAttribute('data-theme') === 'light' ? 'dark' : 'light';
    applyTheme(nextTheme);
    localStorage.setItem('morse-theme', nextTheme);
  });
})();
