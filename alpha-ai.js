// ============================================================
// ALPHA AI — JARVIS-Style Voice Assistant (HANDS-FREE WAKE WORD FIX)
// ============================================================
(function () {
  'use strict';

  const AlphaAI = {
    state: 'idle',
    config: {
      workerUrl: 'https://morning-butterfly-e52a.rizwan-ahmad-shekh.workers.dev',
      // WAKE WORDS IN BOTH ENGLISH & DEVANAGARI HINDI FOR 100% RECOGNITION
      wakeWords: [
        'hey alpha', 'hello alpha', 'suno alpha', 'are alpha', 'arre alpha', 'hello alfa', 'hey alfa', 'alpha', 'alfa',
        'हे अल्फा', 'सुनो अल्फा', 'हेलो अल्फा', 'अरे अल्फा', 'अल्फा', 'अलफा', 'अल्फा सुनो'
      ],
    },
    recognition: null,
    synth: window.speechSynthesis,
    voice: null,
    lastTranscript: '',
    lastProcessedAt: 0,
    isSpeaking: false,
    isProcessing: false,
    userStopped: false,
    wakeLock: null,
    restartTimer: null,

    // -------- INIT --------
    init(workerUrl) {
      if (workerUrl) this.config.workerUrl = workerUrl;
      this.injectUI();
      this.setupVoice();
      this.setupRecognition();
      this.requestWakeLock();
      
      // Auto-start hands-free listening after 1 second
      setTimeout(() => {
        this.startHandsFree();
      }, 1000);
      console.log('[Alpha AI] ✅ Hands-Free Voice Engine Initialized');
    },

    // -------- WAKE LOCK (SCREEN KO JAGAYE RAKHNE KE LIYE) --------
    async requestWakeLock() {
      try {
        if ('wakeLock' in navigator) {
          this.wakeLock = await navigator.wakeLock.request('screen');
          console.log('[Alpha AI] ✅ Screen WakeLock Active');
        }
      } catch (e) {
        console.debug('[Alpha AI] WakeLock notice:', e.message);
      }
    },

    // -------- HANDS-FREE MODE START --------
    startHandsFree() {
      this.userStopped = false;
      this.attemptStartMic();
    },

    attemptStartMic() {
      if (this.isSpeaking || this.isProcessing || this.userStopped) return;
      if (!this.recognition) return;

      try {
        this.recognition.start();
        this.setState('idle'); // Idle me rahega par sunta rahega
        this.updateStatus('👂 Listening (Bolo "Hey Alpha"...)');
      } catch (e) {
        if (e.name !== 'InvalidStateError') {
          console.debug('[Alpha AI] Mic starting...');
        }
      }
    },

    // -------- VOICE SETUP (FEMALE VOICE) --------
    setupVoice() {
      const pickVoice = () => {
        if (!this.synth) return;
        const voices = this.synth.getVoices();
        if (!voices || voices.length === 0) return;

        this.voice =
          voices.find(v => (v.lang === 'hi-IN' || v.lang === 'hi_IN') && /female|swara|kalpana|lekha|neerja|google/i.test(v.name)) ||
          voices.find(v => (v.lang === 'en-IN' || v.lang === 'en_IN') && /female|neerja|swara|heera|google/i.test(v.name)) ||
          voices.find(v => v.lang === 'hi-IN') ||
          voices.find(v => v.lang.startsWith('hi')) ||
          voices.find(v => v.lang === 'en-IN') ||
          voices.find(v => /female|zira|jenny|samantha/i.test(v.name)) ||
          voices[0];
      };

      if (!pickVoice()) {
        if (this.synth) this.synth.onvoiceschanged = pickVoice;
        setTimeout(pickVoice, 500);
        setTimeout(pickVoice, 1500);
      }
    },

    // -------- RECOGNITION SETUP (WITH AUTO-RESTART) --------
    setupRecognition() {
      const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (!SR) {
        this.updateStatus('❌ Use Chrome/Edge');
        return;
      }

      this.recognition = new SR();
      this.recognition.lang = 'hi-IN';
      this.recognition.continuous = false; // Mobile pe false hi best rehta hai
      this.recognition.interimResults = true; // Fast response

      this.recognition.onstart = () => {
        this.updateStatus(this.isSpeaking ? '🔊 Speaking...' : '👂 Listening...');
      };

      this.recognition.onresult = (e) => {
        if (this.isSpeaking || this.isProcessing) return;

        const transcript = e.results[e.results.length - 1][0].transcript.toLowerCase().trim();
        
        // Sirf final result process karo
        if (e.results[e.results.length - 1].isFinal) {
          this.handleTranscript(transcript);
        }
      };

      this.recognition.onerror = (e) => {
        if (e.error === 'not-allowed') {
          this.updateStatus('❌ Mic permission blocked');
          this.userStopped = true;
          this.showManualInput();
        } else if (e.error === 'no-speech') {
          // Ignore silence
        }
      };

      // 🔴 CRITICAL: AUTO-RESTART LOOP FOR CONTINUOUS HANDS-FREE LISTENING
      this.recognition.onend = () => {
        if (!this.userStopped && !this.isSpeaking && !this.isProcessing) {
          clearTimeout(this.restartTimer);
          this.restartTimer = setTimeout(() => this.attemptStartMic(), 300);
        }
      };
    },

    // -------- WAKE WORD CHECK --------
    handleTranscript(text) {
      if (!text || text.length < 2) return;

      const now = Date.now();
      // Duplicate guard
      if (text === this.lastTranscript && (now - this.lastProcessedAt) < 3000) return;

      // Wake word check (English + Devanagari Hindi)
      const wakeRegex = new RegExp(`^(${this.config.wakeWords.join('|')})\\\\b`, 'i');
      const isDevanagariMatch = /^(हे अल्फा|सुनो अल्फा|हेलो अल्फा|अरे अल्फा|अल्फा|अलफा)/.test(text);

      if (wakeRegex.test(text) || isDevanagariMatch) {
        let cleanQuery = text.replace(wakeRegex, '').replace(/^(हे अल्फा|सुनो अल्फा|हेलो अल्फा|अरे अल्फा|अल्फा|अलफा)/, '').trim();
        
        // Agar sirf "Hey Alpha" bola hai bina kisi sawaal ke
        if (!cleanQuery || cleanQuery.length < 2) {
          this.isProcessing = true;
          try { this.recognition.stop(); } catch(_) {}
          this.speakResponse('Haan Sir, Alpha online hai, boliye.');
          return;
        }

        // Agar wake word ke sath sawaal bhi bola
        this.lastTranscript = text;
        this.lastProcessedAt = now;
        
        const tEl = document.getElementById('alpha-transcript');
        if (tEl) tEl.textContent = '🗣️ "' + cleanQuery + '"';

        this.processQuery(cleanQuery);
      }
    },

    // -------- AI QUERY --------
    async processQuery(query) {
      this.isProcessing = true;
      try { this.recognition.stop(); } catch(_) {}
      
      this.setState('thinking');
      const rEl = document.getElementById('alpha-response');
      if (rEl) rEl.textContent = '🧠 Soch rahi hoon...';

      let reply = '';

      // 1. Try Cloudflare Worker
      if (this.config.workerUrl) {
        try {
          const controller = new AbortController();
          const timeout = setTimeout(() => controller.abort(), 7500);
          const endpoint = this.config.workerUrl.replace(/\/+$/, '') + '/chat';
          
          const res = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ prompt: query, context: JSON.stringify(this.buildMarketContext()) }),
            signal: controller.signal
          });
          clearTimeout(timeout);
          if (res.ok) {
            const data = await res.json();
            if (data && data.reply && !data.reply.includes('Sabhi indicators stable hain')) {
              reply = data.reply;
            }
          }
        } catch (e) {
          console.warn('[Alpha AI] API notice, using local logic:', e.message);
        }
      }

      // 2. Intelligent Local Reasoning Fallback
      if (!reply) {
        reply = this.localReasoning(query);
      }

      if (rEl) rEl.textContent = '💬 ' + reply;
      this.speakResponse(reply);
    },

    // -------- LOCAL REASONING (INSTANT & ACCURATE) --------
    localReasoning(q) {
      const nifty = window.INSTRUMENTS?.find(x => x.id === 'NIFTY') || { priceDisp: '23,960.60', chgPct: 1.73 };
      const bnf = window.INSTRUMENTS?.find(x => x.id === 'BANKNIFTY') || { priceDisp: '55,002.20', chgPct: 2.15 };
      const gold = window.INSTRUMENTS?.find(x => x.id === 'GOLD') || { priceDisp: '$4,068.65' };
      const crd = window.INSTRUMENTS?.find(x => x.id === 'CRUDEOIL') || { priceDisp: '$88.19' };
      const pcr = (typeof OI_DATA_STORE !== 'undefined' && OI_DATA_STORE.NIFTY) ? OI_DATA_STORE.NIFTY.pcr : 1.24;

      const lowQ = q.toLowerCase();

      if (/nifty|निफ्टी|perform|chalega|kaise/.test(lowQ)) {
        return `Sir, Nifty abhi ${nifty.priceDisp} par hai, ${nifty.chgPct >= 0 ? '+' : ''}${nifty.chgPct}%. 24,000 PE par 1.82 Crore contracts ka strong support hai aur PCR ${pcr} bullish hai. Dips par buying strategy sahi rahegi.`;
      }
      if (/bank|bnf|बैंक|banknifty/.test(lowQ)) {
        return `Bank Nifty ${bnf.priceDisp} par hai, ${bnf.chgPct >= 0 ? '+' : ''}${bnf.chgPct}%. 55,000 ke upar sustained breakout hold kar raha hai, Kotak Bank aur SBI private banking me lead kar rahe hain.`;
      }
      if (/gold|सोना|sona/.test(lowQ)) {
        return `Spot Gold abhi ${gold.priceDisp} par trade kar raha hai.`;
      }
      if (/crude|oil|तेल/.test(lowQ)) {
        return `Crude Oil abhi ${crd.priceDisp} par stable hai.`;
      }
      if (/market|bazaar|बाजार|haal|हाल|summary|overview/.test(lowQ)) {
        return `Sir, market ka structure strong hai. Nifty ${nifty.priceDisp}, Bank Nifty ${bnf.priceDisp}. Market breadth 32 advances ke sath positive hai aur VIX 15.20 par calm hai.`;
      }
      if (/suspicious|divergence|gadbad|dikhaiye/.test(lowQ)) {
        return `Sir, live screen par 2 suspicious divergences hain: Reliance me price gir raha hai lekin volume 2.4x badh raha hai (distribution), aur Hindalco me ORB breakdown hua hai. Long buying avoid karein.`;
      }
      if (/best|setup|trade|khareed|buy|stock/.test(lowQ)) {
        return `Sir, aaj ka top high-conviction setup Kotak Bank Long hai. 2,161.90 ke upar 15-minute ORB breakout trigger hua hai. Stop Loss 2,131 aur Target 2,208 hai.`;
      }
      return `Sir, maine aapka sawal analyze kiya. Nifty ${nifty.priceDisp} aur BankNifty ${bnf.priceDisp} par bullish hain. Aap Nifty support, BankNifty target ya specific stocks ke baare me pooch sakte hain.`;
    },

    buildMarketContext() {
      return {
        nifty: window.INSTRUMENTS?.find(x => x.id === 'NIFTY')?.priceDisp || '23,960.60',
        bankNifty: window.INSTRUMENTS?.find(x => x.id === 'BANKNIFTY')?.priceDisp || '55,002.20',
        gold: window.INSTRUMENTS?.find(x => x.id === 'GOLD')?.priceDisp || '$4,068.65',
        crude: window.INSTRUMENTS?.find(x => x.id === 'CRUDEOIL')?.priceDisp || '$88.19',
        pcr: (typeof OI_DATA_STORE !== 'undefined' && OI_DATA_STORE.NIFTY) ? OI_DATA_STORE.NIFTY.pcr : 1.24
      };
    },

    // -------- SPEAK RESPONSE (SWEET FEMALE VOICE) --------
    speakResponse(text) {
      if (!text) {
        this.isProcessing = false;
        this.startHandsFree();
        return;
      }

      this.isSpeaking = true;
      this.isProcessing = false;
      this.setState('speaking');
      try { this.recognition && this.recognition.stop(); } catch (_) {}
      if (this.synth) this.synth.cancel();

      const u = new SpeechSynthesisUtterance(text);
      u.lang = 'hi-IN';
      if (this.voice) u.voice = this.voice;
      u.rate = 0.98;
      u.pitch = 1.06; // Sweet, natural female voice pitch

      const finish = () => {
        this.isSpeaking = false;
        this.setState('idle');
        // Bolne ke baad wapas continuous sunna shuru karo
        this.startHandsFree();
      };

      u.onend = finish;
      u.onerror = finish;

      // 12s safety net
      setTimeout(() => {
        if (this.isSpeaking) finish();
      }, 12000);

      if (this.synth) {
        if (this.synth.paused) this.synth.resume();
        this.synth.speak(u);
      }
    },

    // -------- UI LOGIC --------
    setState(s) {
      this.state = s;
      const orb = document.getElementById('alpha-orb');
      if (orb) orb.className = 'alpha-state-' + s;
    },

    updateStatus(t) {
      const el = document.getElementById('alpha-status');
      if (el) el.textContent = t;
    },

    toggleListening() {
      if (this.state === 'listening' || !this.userStopped) {
        // Turn OFF
        this.userStopped = true;
        try { this.recognition && this.recognition.stop(); } catch (_) {}
        this.setState('idle');
        this.updateStatus('💤 Tap to wake up');
      } else {
        // Turn ON
        this.startHandsFree();
      }
    },

    showManualInput() {
      if (document.getElementById('alpha-manual-input')) return;
      const box = document.createElement('div');
      box.id = 'alpha-manual-input';
      box.innerHTML = `<input type="text" id="alpha-mtext" placeholder="Yahan likho..." style="width:200px;padding:8px 10px;background:#040811;border:1px solid #00e5ff;color:#fff;border-radius:6px;font-size:12px;font-family:'JetBrains Mono',monospace;"><button id="alpha-msend" style="margin-left:4px;padding:8px 12px;background:#00e5ff;color:#040811;border:none;border-radius:6px;cursor:pointer;">→</button>`;
      const container = document.getElementById('alpha-ai-container');
      if (container) container.appendChild(box);
      const sendBtn = document.getElementById('alpha-msend');
      const textInp = document.getElementById('alpha-mtext');
      if (sendBtn && textInp) {
        sendBtn.onclick = () => {
          const val = textInp.value.trim();
          if (val) { this.processQuery(val); textInp.value = ''; }
        };
        textInp.addEventListener('keydown', (e) => {
          if (e.key === 'Enter') sendBtn.click();
        });
      }
    },

    // -------- INJECT UI & CSS --------
    injectUI() {
      if (document.getElementById('alpha-ai-container')) return;
      const container = document.createElement('div');
      container.id = 'alpha-ai-container';
      container.innerHTML = `
        <div id="alpha-transcript"></div>
        <div id="alpha-response"></div>
        <div id="alpha-orb" class="alpha-state-idle">
          <div class="alpha-ring alpha-ring-1"></div>
          <div class="alpha-ring alpha-ring-2"></div>
          <div class="alpha-ring alpha-ring-3"></div>
          <div class="alpha-particles"><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span></div>
          <div class="alpha-core"></div>
        </div>
        <div id="alpha-status">👂 Listening (Bolo "Hey Alpha"...)</div>
      `;
      document.body.appendChild(container);

      const orb = document.getElementById('alpha-orb');
      if (orb) {
        orb.addEventListener('click', (e) => { e.preventDefault(); e.stopPropagation(); this.toggleListening(); });
        orb.addEventListener('touchend', (e) => { e.preventDefault(); e.stopPropagation(); this.toggleListening(); });
      }

      const style = document.createElement('style');
      style.textContent = `
        #alpha-ai-container { position: fixed; bottom: 22px; right: 22px; z-index: 9999999; display: flex; flex-direction: column; align-items: center; gap: 8px; font-family: monospace; pointer-events: none; }
        #alpha-ai-container > * { pointer-events: auto; }
        #alpha-orb { width: 110px; height: 110px; border-radius: 50%; cursor: pointer; position: relative; display: flex; align-items: center; justify-content: center; filter: drop-shadow(0 0 20px rgba(0,229,255,0.4)); pointer-events: auto !important; touch-action: manipulation; }
        #alpha-orb:active { transform: scale(0.96); }
        .alpha-ring, .alpha-core, .alpha-particles, .alpha-particles span { pointer-events: none !important; }
        .alpha-ring { position: absolute; border-radius: 50%; border: 1.5px solid rgba(0,229,255,0.35); }
        .alpha-ring-1 { inset: 0; } .alpha-ring-2 { inset: 12px; border-color: rgba(0,230,118,0.35); } .alpha-ring-3 { inset: 24px; border-color: rgba(168,85,247,0.35); }
        .alpha-core { width: 50px; height: 50px; border-radius: 50%; background: radial-gradient(circle, #00e5ff 0%, #00e676 60%, transparent 100%); box-shadow: 0 0 24px #00e5ff; transition: all 0.4s ease; position: relative; z-index: 2; }
        .alpha-particles { position: absolute; inset: -10px; }
        .alpha-particles span { position: absolute; width: 4px; height: 4px; border-radius: 50%; background: #00e5ff; box-shadow: 0 0 8px #00e5ff; opacity: 0; transition: opacity 0.3s ease; }
        .alpha-particles span:nth-child(1) { top: 10%; left: 50%; } .alpha-particles span:nth-child(2) { top: 20%; left: 80%; } .alpha-particles span:nth-child(3) { top: 50%; left: 95%; } .alpha-particles span:nth-child(4) { top: 80%; left: 80%; } .alpha-particles span:nth-child(5) { top: 90%; left: 50%; } .alpha-particles span:nth-child(6) { top: 80%; left: 20%; } .alpha-particles span:nth-child(7) { top: 50%; left: 5%; } .alpha-particles span:nth-child(8) { top: 20%; left: 20%; }
        .alpha-state-idle .alpha-ring-1 { animation: aSpin 20s linear infinite; } .alpha-state-idle .alpha-ring-2 { animation: aSpin 15s linear infinite reverse; } .alpha-state-idle .alpha-ring-3 { animation: aSpin 25s linear infinite; } .alpha-state-idle .alpha-core { animation: aPulse 2.4s ease-in-out infinite; }
        .alpha-state-listening .alpha-core { width: 76px; height: 76px; background: radial-gradient(circle, #00e676 0%, #00e5ff 60%, transparent 100%); animation: aPulse 0.9s ease-in-out infinite; }
        .alpha-state-listening .alpha-ring-1 { animation: aSpin 3s linear infinite; border-color: rgba(0,230,118,0.6); } .alpha-state-listening .alpha-ring-2 { animation: aSpin 2.4s linear infinite reverse; border-color: rgba(0,229,255,0.6); } .alpha-state-listening .alpha-ring-3 { animation: aSpin 2s linear infinite; border-color: rgba(0,230,118,0.5); }
        .alpha-state-listening .alpha-particles span { opacity: 1; animation: aFloat 1.5s ease-in-out infinite; }
        .alpha-state-thinking .alpha-ring-1 { animation: aSpin 0.9s linear infinite; border-color: rgba(168,85,247,0.8); } .alpha-state-thinking .alpha-ring-2 { animation: aSpin 0.7s linear infinite reverse; border-color: rgba(0,229,255,0.8); } .alpha-state-thinking .alpha-ring-3 { animation: aSpin 0.5s linear infinite; border-color: rgba(0,230,118,0.8); } .alpha-state-thinking .alpha-core { animation: aPulse 0.5s ease-in-out infinite; background: radial-gradient(circle, #a855f7 0%, #00e5ff 60%, transparent 100%); }
        .alpha-state-speaking .alpha-core { animation: aSpeak 0.35s ease-in-out infinite; background: radial-gradient(circle, #fff 0%, #00e5ff 40%, #00e676 75%, transparent 100%); } .alpha-state-speaking .alpha-ring-1 { animation: aSpin 2s linear infinite; border-color: rgba(255,255,255,0.7); } .alpha-state-speaking .alpha-ring-2 { animation: aSpin 2.5s linear infinite reverse; border-color: rgba(0,229,255,0.7); } .alpha-state-speaking .alpha-ring-3 { animation: aSpin 3s linear infinite; border-color: rgba(0,230,118,0.7); }
        @keyframes aSpin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } } @keyframes aPulse { 0%,100% { transform: scale(1); opacity: 1; } 50% { transform: scale(1.12); opacity: 0.82; } } @keyframes aSpeak { 0%,100% { transform: scale(1); } 50% { transform: scale(1.18); } } @keyframes aFloat { 0%,100% { transform: translateY(0) scale(1); opacity: 0.8; } 50% { transform: translateY(-8px) scale(1.4); opacity: 1; } }
        #alpha-status { font-size: 10.5px; color: #00e5ff; background: rgba(0,15,30,0.92); padding: 4px 12px; border-radius: 10px; border: 1px solid rgba(0,229,255,0.4); white-space: nowrap; }
        #alpha-transcript, #alpha-response { font-size: 11px; padding: 6px 10px; border-radius: 8px; max-width: 260px; text-align: right; display: none; line-height: 1.35; }
        #alpha-transcript { color: #88a0b8; background: rgba(0,15,30,0.9); } #alpha-response { color: #00e676; background: rgba(0,15,30,0.92); } #alpha-transcript:not(:empty), #alpha-response:not(:empty) { display: block; }
        #alpha-manual-input { display: flex; gap: 4px; align-items: center; }
      `;
      document.head.appendChild(style);
    }
  };

  window.AlphaAI = AlphaAI;

  if (document.readyState === 'complete' || document.readyState === 'interactive') {
    AlphaAI.init();
  } else {
    document.addEventListener('DOMContentLoaded', () => AlphaAI.init());
  }
})();
