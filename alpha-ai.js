// ============================================================
// ALPHA AI — Ultimate Fix (Hands-Free + Manual + Gold Fallback)
// ============================================================
(function () {
  'use strict';

  const AlphaAI = {
    state: 'idle',
    config: {
      workerUrl: 'https://morning-butterfly-e52a.rizwan-ahmad-shekh.workers.dev', // Aapka Cloudflare Worker URL
      wakeWords: ['hey alpha', 'hello alpha', 'suno alpha', 'are alpha', 'arre alpha', 'hello alfa', 'hey alfa', 'alpha', 'alfa', 'हे अल्फा', 'सुनो अल्फा', 'हेलो अल्फा', 'अरे अल्फा', 'अल्फा', 'अलफा'],
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
      
      setTimeout(() => {
        this.startHandsFree();
      }, 1000);
    },

    async requestWakeLock() {
      try {
        if ('wakeLock' in navigator) this.wakeLock = await navigator.wakeLock.request('screen');
      } catch (e) {}
    },

    startHandsFree() {
      this.userStopped = false;
      this.attemptStartMic();
    },

    attemptStartMic() {
      if (this.isSpeaking || this.isProcessing || this.userStopped) return;
      if (!this.recognition) return;

      try {
        this.recognition.start();
        this.setState('idle');
        this.updateStatus('👂 Listening (Bolo "Hey Alpha"...)');
      } catch (e) {}
    },

    setupVoice() {
      const pickVoice = () => {
        const voices = this.synth.getVoices();
        if (!voices || voices.length === 0) return;
        this.voice = voices.find(v => v.lang === 'hi-IN' && /female|swara|kalpana|neerja|google/i.test(v.name)) ||
                     voices.find(v => (v.lang === 'en-IN' || v.lang === 'hi-IN') && /female|swara|neerja|google/i.test(v.name)) ||
                     voices.find(v => v.lang === 'hi-IN') ||
                     voices.find(v => v.lang === 'en-IN') ||
                     voices[0];
      };
      if (!pickVoice()) {
        this.synth.onvoiceschanged = pickVoice;
        setTimeout(pickVoice, 500);
      }
    },

    setupRecognition() {
      const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (!SR) return this.updateStatus('❌ Use Chrome');

      this.recognition = new SR();
      this.recognition.lang = 'hi-IN';
      this.recognition.continuous = false;
      this.recognition.interimResults = true;

      this.recognition.onstart = () => {
        this.updateStatus(this.isSpeaking ? '🔊 Speaking...' : '👂 Listening...');
      };

      this.recognition.onresult = (e) => {
        if (this.isSpeaking || this.isProcessing) return;
        const transcript = e.results[e.results.length - 1][0].transcript.toLowerCase().trim();
        if (e.results[e.results.length - 1].isFinal) {
          this.handleTranscript(transcript);
        }
      };

      this.recognition.onerror = (e) => {
        if (e.error === 'not-allowed') {
          this.updateStatus('❌ Mic blocked. Please Allow.');
          this.userStopped = true;
          this.showManualInput();
        }
      };

      this.recognition.onend = () => {
        if (!this.userStopped && !this.isSpeaking && !this.isProcessing) {
          clearTimeout(this.restartTimer);
          this.restartTimer = setTimeout(() => this.attemptStartMic(), 250);
        }
      };
    },

    handleTranscript(text) {
      if (!text || text.length < 2) return;
      const now = Date.now();
      if (text === this.lastTranscript && (now - this.lastProcessedAt) < 3000) return;

      const wakeRegex = new RegExp(`^(${this.config.wakeWords.join('|')})\\b`, 'i');
      const isDevanagariWake = /^(हे अल्फा|सुनो अल्फा|हेलो अल्फा|अरे अल्फा|अल्फा|अलफा)/.test(text);
      
      if (wakeRegex.test(text) || isDevanagariWake) {
        let cleanQuery = text.replace(wakeRegex, '').replace(/^(हे अल्फा|सुनो अल्फा|हेलो अल्फा|अरे अल्फा|अल्फा|अलफा)/, '').trim();
        if (!cleanQuery || cleanQuery.length < 2) {
          this.isProcessing = true;
          try { this.recognition.stop(); } catch(_) {}
          this.speakResponse('Haan sir, boliye.');
          return;
        }
        this.lastTranscript = text;
        this.lastProcessedAt = now;
        const tEl = document.getElementById('alpha-transcript');
        if (tEl) tEl.textContent = '🗣️ "' + cleanQuery + '"';
        this.processQuery(cleanQuery);
      }
    },

    // Manual Input se aane wala text yahan aayega
    handleManualText(text) {
      this.lastTranscript = text;
      this.lastProcessedAt = Date.now();
      const tEl = document.getElementById('alpha-transcript');
      if (tEl) tEl.textContent = '⌨️ "' + text + '"';
      this.processQuery(text);
    },

    async processQuery(query) {
      this.isProcessing = true;
      try { this.recognition.stop(); } catch(_) {}
      
      this.setState('thinking');
      const rEl = document.getElementById('alpha-response');
      if (rEl) rEl.textContent = '🧠 Soch raha hoon...';

      let reply = '';

      // 1. Try API (Agar worker URL hai toh)
      if (this.config.workerUrl && this.config.workerUrl.startsWith('http')) {
        try {
          const controller = new AbortController();
          const timeout = setTimeout(() => controller.abort(), 6000);
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
            if (data && data.reply && !data.reply.includes('Sabhi indicators stable')) {
              reply = data.reply;
            }
          }
        } catch (e) {
          console.warn('[Alpha AI] API Fail, using local brain.');
        }
      }

      // 2. Agar API fail hui ya empty aayi, toh Local Brain (Gold, Nifty, etc) use karo
      if (!reply || reply.trim() === '') {
        reply = this.localReasoning(query);
      }

      if (rEl) rEl.textContent = '💬 ' + reply;
      this.speakResponse(reply);
    },

    // -------- LOCAL BRAIN (GUARANTEED REPLY) --------
    localReasoning(q) {
      // Check karte hain ki dashboard se data aa raha hai ya nahi
      const nifty = window.INSTRUMENTS?.find(x => x.id === 'NIFTY') || { priceDisp: '23,960.60', chgPct: 1.73 };
      const bnf = window.INSTRUMENTS?.find(x => x.id === 'BANKNIFTY') || { priceDisp: '55,240.50', chgPct: 1.01 };
      const gold = window.INSTRUMENTS?.find(x => x.id === 'GOLD') || { priceDisp: '$4,068.65', chgPct: 3.52 };
      const silver = window.INSTRUMENTS?.find(x => x.id === 'SILVER') || { priceDisp: '$52.42', chgPct: 5.27 };
      const btc = window.INSTRUMENTS?.find(x => x.id === 'BITCOIN') || { priceDisp: '$77,437.89', chgPct: -0.67 };

      // Gold Logic (Regex me English aur Hindi dono add kiye hain)
      if (/gold|सोना|sona|gol[d|t]|xau/i.test(q)) {
        return `Spot Gold abhi ${gold.priceDisp} par trade kar raha hai. Aaj isme ${gold.chgPct >= 0 ? '+' : ''}${gold.chgPct}% ka ${gold.chgPct >= 0 ? 'uptrend' : 'downtrend'} dekhne ko mil raha hai.`;
      }
      
      // Silver Logic
      if (/silver|चांदी|chandi|xag/i.test(q)) {
        return `Silver abhi ${silver.priceDisp} par hai, jisme ${silver.chgPct >= 0 ? '+' : ''}${silver.chgPct}% ka move hai.`;
      }

      // Bitcoin Logic
      if (/bitcoin|btc|बिटकॉइन/i.test(q)) {
        return `Bitcoin ka current price ${btc.priceDisp} chal raha hai, ${btc.chgPct >= 0 ? '+' : ''}${btc.chgPct}% change ke sath.`;
      }

      // Nifty Logic
      if (/nifty|निफ्टी/i.test(q)) {
        return `Nifty abhi ${nifty.priceDisp} par hai, ${nifty.chgPct >= 0 ? '+' : ''}${nifty.chgPct}% upar. 24,000 par strong support hai.`;
      }

      // Bank Nifty Logic
      if (/bank|बैंक|bnf/i.test(q)) {
        return `Bank Nifty ${bnf.priceDisp} par trade kar raha hai, jisme ${bnf.chgPct >= 0 ? '+' : ''}${bnf.chgPct}% ka move hai.`;
      }

      // Market Haal
      if (/market|bazaar|बाजार|haal|हाल/i.test(q)) {
        return `Market ${nifty.chgPct >= 0 ? 'positive' : 'negative'} hai. Nifty ${nifty.priceDisp} par aur Bank Nifty ${bnf.priceDisp} par hai.`;
      }

      // Best setup / Trade
      if (/best|setup|trade|khareed|buy|stock/i.test(q)) {
        return `Aaj ka best setup Kotak Bank Long hai. 2,161.90 ke upar 15-minute ORB breakout trigger hua hai. Stop Loss 2,131 aur Target 2,208 hai.`;
      }

      // Default fallback
      return `Main samjha nahi. Aap Gold, Silver, Bitcoin, Nifty ya Bank Nifty ka haal pooch sakte hain.`;
    },

    buildMarketContext() {
      return {
        nifty: window.INSTRUMENTS?.find(x => x.id === 'NIFTY')?.priceDisp || 'N/A',
        gold: window.INSTRUMENTS?.find(x => x.id === 'GOLD')?.priceDisp || 'N/A'
      };
    },

    speakResponse(text) {
      if (!text) {
        this.isProcessing = false;
        this.startHandsFree();
        return;
      }

      this.isSpeaking = true;
      this.isProcessing = false;
      this.setState('speaking');
      try { this.recognition.stop(); } catch(_) {}
      this.synth.cancel();

      const u = new SpeechSynthesisUtterance(text);
      u.lang = 'hi-IN';
      if (this.voice) u.voice = this.voice;
      u.rate = 0.95;
      u.pitch = 1.06; // Sweet, natural female voice pitch

      const finish = () => {
        this.isSpeaking = false;
        this.setState('idle');
        this.startHandsFree();
      };

      u.onend = finish;
      u.onerror = finish;
      this.synth.speak(u);
    },

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
      if (!this.userStopped) {
        this.userStopped = true;
        try { this.recognition.stop(); } catch(_) {}
        this.setState('idle');
        this.updateStatus('💤 Tap to wake up');
      } else {
        this.startHandsFree();
      }
    },

    showManualInput() {
      if (document.getElementById('alpha-manual-input')) return;
      const box = document.createElement('div');
      box.id = 'alpha-manual-input';
      box.innerHTML = `<input type="text" id="alpha-mtext" placeholder="Yahan likho..." style="width:200px;padding:8px;background:#040811;border:1px solid #00e5ff;color:#fff;border-radius:6px;font-family:monospace;font-size:12px;"><button id="alpha-msend" style="margin-left:4px;padding:8px 12px;background:#00e5ff;color:#040811;border:none;border-radius:6px;font-weight:bold;cursor:pointer;">→</button>`;
      document.getElementById('alpha-ai-container').appendChild(box);
      
      const sendMsg = () => {
        const val = document.getElementById('alpha-mtext').value.trim();
        if (val) {
          this.handleManualText(val);
          document.getElementById('alpha-mtext').value = '';
        }
      };

      document.getElementById('alpha-msend').onclick = sendMsg;
      document.getElementById('alpha-mtext').addEventListener('keydown', (e) => {
        if (e.key === 'Enter') sendMsg();
      });
    },

    injectUI() {
      if (document.getElementById('alpha-ai-container')) return;
      const container = document.createElement('div');
      container.id = 'alpha-ai-container';
      container.innerHTML = `
        <div id="alpha-transcript"></div>
        <div id="alpha-response"></div>
        <div id="alpha-orb" class="alpha-state-idle" title="Tap to talk to Alpha">
          <div class="alpha-ring alpha-ring-1"></div><div class="alpha-ring alpha-ring-2"></div><div class="alpha-ring alpha-ring-3"></div>
          <div class="alpha-particles"><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span></div>
          <div class="alpha-core"></div>
        </div>
        <div id="alpha-status">👂 Listening...</div>
      `;
      document.body.appendChild(container);

      const orb = document.getElementById('alpha-orb');
      orb.addEventListener('click', (e) => { e.preventDefault(); e.stopPropagation(); this.toggleListening(); });
      orb.addEventListener('touchend', (e) => { e.preventDefault(); e.stopPropagation(); this.toggleListening(); });

      const style = document.createElement('style');
      style.textContent = `
        #alpha-ai-container { position: fixed; bottom: 22px; right: 22px; z-index: 9999999; display: flex; flex-direction: column; align-items: flex-end; gap: 8px; font-family: monospace; pointer-events: none; }
        #alpha-ai-container > * { pointer-events: auto; }
        #alpha-orb { width: 100px; height: 100px; border-radius: 50%; cursor: pointer; position: relative; display: flex; align-items: center; justify-content: center; filter: drop-shadow(0 0 20px rgba(0,229,255,0.4)); touch-action: manipulation; margin-right: 10px; pointer-events: auto !important; }
        #alpha-orb:active { transform: scale(0.96); }
        .alpha-ring, .alpha-core, .alpha-particles, .alpha-particles span { pointer-events: none !important; }
        .alpha-ring { position: absolute; border-radius: 50%; border: 1.5px solid rgba(0,229,255,0.35); }
        .alpha-ring-1 { inset: 0; } .alpha-ring-2 { inset: 12px; border-color: rgba(0,230,118,0.35); } .alpha-ring-3 { inset: 24px; border-color: rgba(168,85,247,0.35); }
        .alpha-core { width: 45px; height: 45px; border-radius: 50%; background: radial-gradient(circle, #00e5ff 0%, #00e676 60%, transparent 100%); box-shadow: 0 0 24px #00e5ff; transition: all 0.4s ease; position: relative; z-index: 2; }
        .alpha-particles { position: absolute; inset: -10px; }
        .alpha-particles span { position: absolute; width: 4px; height: 4px; border-radius: 50%; background: #00e5ff; box-shadow: 0 0 8px #00e5ff; opacity: 0; transition: opacity 0.3s ease; }
        .alpha-particles span:nth-child(1) { top: 10%; left: 50%; } .alpha-particles span:nth-child(2) { top: 20%; left: 80%; } .alpha-particles span:nth-child(3) { top: 50%; left: 95%; } .alpha-particles span:nth-child(4) { top: 80%; left: 80%; } .alpha-particles span:nth-child(5) { top: 90%; left: 50%; } .alpha-particles span:nth-child(6) { top: 80%; left: 20%; } .alpha-particles span:nth-child(7) { top: 50%; left: 5%; } .alpha-particles span:nth-child(8) { top: 20%; left: 20%; }
        .alpha-state-idle .alpha-ring-1 { animation: aSpin 20s linear infinite; } .alpha-state-idle .alpha-ring-2 { animation: aSpin 15s linear infinite reverse; } .alpha-state-idle .alpha-ring-3 { animation: aSpin 25s linear infinite; } .alpha-state-idle .alpha-core { animation: aPulse 2.4s ease-in-out infinite; }
        .alpha-state-listening .alpha-core { width: 70px; height: 70px; background: radial-gradient(circle, #00e676 0%, #00e5ff 60%, transparent 100%); animation: aPulse 0.9s ease-in-out infinite; }
        .alpha-state-listening .alpha-ring-1 { animation: aSpin 3s linear infinite; border-color: rgba(0,230,118,0.6); } .alpha-state-listening .alpha-ring-2 { animation: aSpin 2.4s linear infinite reverse; border-color: rgba(0,229,255,0.6); } .alpha-state-listening .alpha-ring-3 { animation: aSpin 2s linear infinite; border-color: rgba(0,230,118,0.5); }
        .alpha-state-listening .alpha-particles span { opacity: 1; animation: aFloat 1.5s ease-in-out infinite; }
        .alpha-state-thinking .alpha-ring-1 { animation: aSpin 0.9s linear infinite; border-color: rgba(168,85,247,0.8); } .alpha-state-thinking .alpha-ring-2 { animation: aSpin 0.7s linear infinite reverse; border-color: rgba(0,229,255,0.8); } .alpha-state-thinking .alpha-ring-3 { animation: aSpin 0.5s linear infinite; border-color: rgba(0,230,118,0.8); } .alpha-state-thinking .alpha-core { animation: aPulse 0.5s ease-in-out infinite; background: radial-gradient(circle, #a855f7 0%, #00e5ff 60%, transparent 100%); }
        .alpha-state-speaking .alpha-core { animation: aSpeak 0.35s ease-in-out infinite; background: radial-gradient(circle, #fff 0%, #00e5ff 40%, #00e676 75%, transparent 100%); }
        @keyframes aSpin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } } @keyframes aPulse { 0%,100% { transform: scale(1); opacity: 1; } 50% { transform: scale(1.1); opacity: 0.8; } } @keyframes aSpeak { 0%,100% { transform: scale(1); } 50% { transform: scale(1.15); } }
        #alpha-status { font-size: 10px; color: #00e5ff; background: rgba(0,15,30,0.92); padding: 4px 10px; border-radius: 10px; border: 1px solid rgba(0,229,255,0.4); white-space: nowrap; margin-right: 15px; }
        #alpha-transcript, #alpha-response { font-size: 11px; padding: 8px 12px; border-radius: 8px; max-width: 250px; text-align: right; display: none; line-height: 1.4; box-shadow: 0 4px 12px rgba(0,0,0,0.5); }
        #alpha-transcript { color: #88a0b8; background: rgba(0,15,30,0.9); border: 1px solid rgba(136,160,184,0.3); } 
        #alpha-response { color: #00e676; background: rgba(0,15,30,0.95); border: 1px solid rgba(0,230,118,0.3); } 
        #alpha-transcript:not(:empty), #alpha-response:not(:empty) { display: block; }
        #alpha-manual-input { display: flex; gap: 4px; align-items: center; margin-right: 15px; }
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
