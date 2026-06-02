(function(){var e=class{noiseFloor=.005;speechEnergyThreshold=.015;decayRate=.9995;attackRate=.05;fastAlpha=.1;slowAlpha=.01;fastEnergy=0;slowEnergy=0;process(e){let t=0;for(let n=0;n<e.length;n++){let r=e[n]??0;t+=r*r}let n=Math.sqrt(t/Math.max(1,e.length));this.fastEnergy=this.fastAlpha*n+(1-this.fastAlpha)*this.fastEnergy,this.slowEnergy=this.slowAlpha*n+(1-this.slowAlpha)*this.slowEnergy,this.fastEnergy<this.noiseFloor?this.noiseFloor=this.attackRate*this.fastEnergy+(1-this.attackRate)*this.noiseFloor:this.noiseFloor=this.decayRate*this.noiseFloor+(1-this.decayRate)*this.fastEnergy;let r=this.noiseFloor+this.speechEnergyThreshold,i=this.fastEnergy>r;return{isSpeech:i,confidence:i?Math.min(1,(this.fastEnergy-r)/.1):0}}},t=class{mediaRecorder1=null;mediaRecorder2=null;stream;chunkDurationMs=4e3;overlapMs=2e3;intervalId=null;timeoutIds=[];onAudioChunkReady;speaker;audioContext=null;analyser=null;scriptProcessor=null;vad;hasSpeechInCurrentWindow=!1;constructor(t,n,r){this.stream=t,this.speaker=n,this.onAudioChunkReady=r,this.vad=new e}start(){this.startVADAnalysis();let e=e=>{let t=[],n=Date.now(),r={mimeType:`audio/webm;codecs=opus`},i;try{i=new MediaRecorder(this.stream,r)}catch{i=new MediaRecorder(this.stream)}e===1?this.mediaRecorder1=i:this.mediaRecorder2=i,i.ondataavailable=e=>{e.data&&e.data.size>0&&t.push(e.data)},i.onstop=()=>{if(this.hasSpeechInCurrentWindow){let e=new Blob(t,{type:`audio/webm`}),r=new FileReader;r.onloadend=()=>{let e=r.result.split(`,`)[1];e&&this.onAudioChunkReady(e,n,this.speaker)},r.readAsDataURL(e)}this.hasSpeechInCurrentWindow=!1,t=[]},i.start();let a=setTimeout(()=>{i.state===`recording`&&i.stop()},this.chunkDurationMs);this.timeoutIds.push(a)};e(1);let t=setTimeout(()=>{e(2)},this.chunkDurationMs-this.overlapMs);this.timeoutIds.push(t),this.intervalId=setInterval(()=>{e(1);let t=setTimeout(()=>{e(2)},this.chunkDurationMs-this.overlapMs);this.timeoutIds.push(t)},(this.chunkDurationMs-this.overlapMs)*2)}startVADAnalysis(){try{this.audioContext=new AudioContext({sampleRate:16e3});let e=this.audioContext.createMediaStreamSource(this.stream);this.analyser=this.audioContext.createAnalyser(),this.analyser.fftSize=512,this.scriptProcessor=this.audioContext.createScriptProcessor(2048,1,1),this.scriptProcessor.onaudioprocess=e=>{let t=e.inputBuffer.getChannelData(0),{isSpeech:n}=this.vad.process(t);n&&(this.hasSpeechInCurrentWindow=!0)},e.connect(this.analyser),this.analyser.connect(this.scriptProcessor),this.scriptProcessor.connect(this.audioContext.destination)}catch(e){console.warn(`[Hearly VAD] VAD setup failed, falling back to full capture:`,e),this.hasSpeechInCurrentWindow=!0}}stop(){let e=this.intervalId;if(e&&(clearInterval(e),this.intervalId=null),this.timeoutIds.forEach(e=>clearTimeout(e)),this.timeoutIds=[],this.mediaRecorder1&&this.mediaRecorder1.state!==`inactive`){try{this.mediaRecorder1.stop()}catch{}this.mediaRecorder1=null}if(this.mediaRecorder2&&this.mediaRecorder2.state!==`inactive`){try{this.mediaRecorder2.stop()}catch{}this.mediaRecorder2=null}let t=this.scriptProcessor;t&&(t.disconnect(),this.scriptProcessor=null);let n=this.analyser;n&&(n.disconnect(),this.analyser=null);let r=this.audioContext;r&&(r.close(),this.audioContext=null)}},n=.75,r={voiceProfile:`hearly_voice_profile`,appSettings:`hearly_app_settings`,transcriptIndexMeta:`hearly_transcript_meta`},i=`hearly_storage_key_jwk`;async function a(){return new Promise((e,t)=>{chrome.storage.local.get(i,async n=>{if(n[i])try{let t=n[i];e(await crypto.subtle.importKey(`jwk`,t,{name:`AES-GCM`,length:256},!0,[`encrypt`,`decrypt`]));return}catch(e){console.error(`[Hearly Crypto] Key import failed, generating new key`,e)}try{let t=await crypto.subtle.generateKey({name:`AES-GCM`,length:256},!0,[`encrypt`,`decrypt`]),n=await crypto.subtle.exportKey(`jwk`,t);chrome.storage.local.set({[i]:n},()=>{e(t)})}catch(e){t(e)}})})}function o(e){let t=new Uint8Array(e),n=``;for(let e=0;e<t.byteLength;e++)n+=String.fromCharCode(t[e]);return btoa(n)}function s(e){let t=atob(e),n=new Uint8Array(t.length);for(let e=0;e<t.length;e++)n[e]=t.charCodeAt(e);return n.buffer}var c=class{static async encryptAndSet(e,t){try{let n=await a(),r=new TextEncoder().encode(JSON.stringify(t)),i=crypto.getRandomValues(new Uint8Array(12)),s=await crypto.subtle.encrypt({name:`AES-GCM`,iv:i},n,r),c=`${o(i.buffer)}:${o(s)}`;return new Promise(t=>{chrome.storage.local.set({[e]:c},t)})}catch(n){return console.error(`[Hearly Crypto] Encryption failed for key:`,e,n),new Promise(n=>{chrome.storage.local.set({[e]:JSON.stringify(t)},n)})}}static async decryptAndGet(e){return new Promise(t=>{chrome.storage.local.get(e,async n=>{let r=n[e];if(!r||typeof r!=`string`){t(null);return}if(!r.includes(`:`)){try{t(JSON.parse(r))}catch{t(null)}return}try{let e=await a(),[n,i]=r.split(`:`);if(!n||!i){t(null);return}let o=new Uint8Array(s(n)),c=s(i),l=await crypto.subtle.decrypt({name:`AES-GCM`,iv:o},e,c),u=new TextDecoder;t(JSON.parse(u.decode(l)))}catch(n){console.error(`[Hearly Crypto] Decryption failed for key:`,e,n),t(null)}})})}},l=()=>typeof chrome<`u`&&chrome.storage!==void 0;async function u(){if(!l())return null;let e=await c.decryptAndGet(r.voiceProfile);return!e||typeof e!=`object`?null:{...e,embedding:e.embedding instanceof Float32Array?e.embedding:new Float32Array(e.embedding)}}var d=null,f=null;function p(e){return Math.min(9e3,Math.max(5e3,5e3+e.length*45))}function m(e){return e.toUpperCase()}function h(){return d&&document.body.contains(d)?d:(d=document.createElement(`div`),d.id=`hearly-live-subtitle`,d.style.cssText=`
    position: fixed;
    left: 50%;
    bottom: 88px;
    z-index: 2147483647;
    transform: translate(-50%, 12px);
    max-width: min(760px, calc(100vw - 32px));
    min-width: min(360px, calc(100vw - 32px));
    padding: 12px 16px;
    border-radius: 16px;
    border: 1px solid rgba(255,255,255,0.14);
    background: rgba(8,8,8,0.82);
    color: #f7f7f7;
    font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    font-size: 18px;
    font-weight: 650;
    line-height: 1.35;
    text-align: center;
    letter-spacing: 0;
    box-shadow: 0 18px 50px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.08);
    backdrop-filter: blur(18px);
    -webkit-backdrop-filter: blur(18px);
    opacity: 0;
    pointer-events: none;
    transition: opacity 220ms ease, transform 220ms ease;
    word-break: break-word;
  `,document.body.appendChild(d),d)}function g(e){let t=e.text.trim();if(!t)return;let n=h(),r=e.speaker===`you`?`MIC`:`CALL`;n.replaceChildren();let i=document.createElement(`div`);i.style.cssText=`display:flex;align-items:center;justify-content:center;gap:8px;margin-bottom:6px;`;let a=document.createElement(`span`);a.style.cssText=`border:1px solid rgba(181,240,61,0.35);background:rgba(181,240,61,0.1);color:#B5F03D;border-radius:999px;padding:2px 7px;font-size:10px;font-weight:800;letter-spacing:0.08em;`,a.textContent=m(e.language);let o=document.createElement(`span`);o.style.cssText=`border:1px solid rgba(255,255,255,0.12);background:rgba(255,255,255,0.06);color:#bdbdbd;border-radius:999px;padding:2px 7px;font-size:10px;font-weight:750;letter-spacing:0.08em;`,o.textContent=r;let s=document.createElement(`div`);s.textContent=t,i.append(a,o),n.append(i,s),window.requestAnimationFrame(()=>{d&&(d.style.opacity=`1`,d.style.transform=`translate(-50%, 0)`)}),f!==null&&window.clearTimeout(f),f=window.setTimeout(()=>{d&&(d.style.opacity=`0`,d.style.transform=`translate(-50%, 12px)`)},p(t))}var _=`teams`;function v(){window.addEventListener(`message`,e=>{if(e.source!==window)return;let t=e.data;if(t?.source!==`hearly-page`)return;if(t.type===`GET_MIC_STATE`&&t.requestId){chrome.storage.local.get([`hearly_filter`,`hearly_transcript`],async e=>{let r=await u();window.postMessage({source:`hearly-content`,type:`MIC_STATE`,requestId:t.requestId,enabled:e.hearly_filter?.isActive===!0,embedding:r?.embedding?Array.from(r.embedding):null,threshold:n,workletUrl:chrome.runtime.getURL(`hearly-processor.js`),transcriptionEnabled:e.hearly_transcript?.isEnabled===!0},window.location.origin)});return}if(t.type===`NEW_MIC_CHUNK`&&t.audioBase64){chrome.runtime.sendMessage({type:`HEARLY_TRANSCRIBE_CHUNK`,audioBase64:t.audioBase64,speaker:`you`,timestamp:t.timestamp??Date.now()});return}let r=t.type?{MIC_PROCESSING_STARTED:`HEARLY_MIC_PROCESSING_STARTED`,MIC_PROCESSING_STOPPED:`HEARLY_MIC_PROCESSING_STOPPED`,MIC_PROCESSING_ERROR:`HEARLY_MIC_PROCESSING_ERROR`,VOICE_MATCH:`HEARLY_VOICE_MATCH`}[t.type]:void 0;r&&chrome.runtime.sendMessage({type:r,platform:t.platform??_,score:t.score,matched:t.matched,error:t.error})})}v();function y(){let e=window.location.href;return e.includes(`teams.microsoft.com`)||e.includes(`teams.live.com`)}function b(){return[`[data-tid="calling-screen"]`,`[data-tid="meeting-composite"]`,`[data-tid="prejoin-screen"]`,`.ts-calling-screen`,`[class*="calling"]`,`[class*="meeting"]`].some(e=>!!document.querySelector(e))}function x(){chrome.runtime.sendMessage({type:`MEETING_DETECTED`,payload:{platform:`teams`}})}function S(){chrome.runtime.sendMessage({type:`MEETING_ENDED`})}var C=!1;function w(){C||document.getElementById(`hearly-banner`)||chrome.storage.local.get(`hearly_enrollment`,e=>{if(C||document.getElementById(`hearly-banner`))return;let t=e?.hearly_enrollment?.isEnrolled===!0,n=document.createElement(`div`);n.id=`hearly-banner`,n.style.cssText=`
      position: fixed;
      top: 16px;
      left: 50%;
      transform: translateX(-50%);
      z-index: 999999;
      background: rgba(14, 14, 14, 0.85);
      backdrop-filter: blur(20px);
      -webkit-backdrop-filter: blur(20px);
      border: 1px solid rgba(255,255,255,0.08);
      border-radius: 16px;
      display: flex;
      align-items: center;
      gap: 14px;
      padding: 10px 14px 10px 12px;
      font-family: Inter, -apple-system, sans-serif;
      box-shadow: 0 8px 32px rgba(0,0,0,0.6), 0 0 0 0.5px rgba(255,255,255,0.05);
      white-space: nowrap;
    `;let r=`
      <div style="
        width: 34px;
        height: 34px;
        background: #0f0f0f;
        border-radius: 10px;
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
        border: 1px solid rgba(181,240,61,0.15);
      ">
        <svg width="20" height="16" viewBox="0 0 20 16" fill="none" xmlns="http://www.w3.org/2000/svg">
          <style>
            @keyframes hb1 { 0%,100%{height:4px;y:6px} 50%{height:10px;y:3px} }
            @keyframes hb2 { 0%,100%{height:8px;y:4px} 50%{height:14px;y:1px} }
            @keyframes hb3 { 0%,100%{height:12px;y:2px} 50%{height:16px;y:0px} }
            @keyframes hb4 { 0%,100%{height:14px;y:1px} 50%{height:10px;y:3px} }
            @keyframes hb5 { 0%,100%{height:8px;y:4px} 50%{height:14px;y:1px} }
            @keyframes hb6 { 0%,100%{height:4px;y:6px} 50%{height:9px;y:3px} }
            .hb1{animation:hb1 1.1s ease-in-out infinite}
            .hb2{animation:hb2 0.9s ease-in-out infinite 0.1s}
            .hb3{animation:hb3 1.0s ease-in-out infinite 0.2s}
            .hb4{animation:hb4 0.8s ease-in-out infinite 0.15s}
            .hb5{animation:hb5 1.1s ease-in-out infinite 0.05s}
            .hb6{animation:hb6 0.9s ease-in-out infinite 0.25s}
          </style>
          <rect class="hb1" x="0"  y="6"  width="2.5" rx="1.25" height="4"  fill="#3a5c0a" opacity="0.6"/>
          <rect class="hb2" x="3"  y="4"  width="2.5" rx="1.25" height="8"  fill="#6aaa10" opacity="0.75"/>
          <rect class="hb3" x="6"  y="2"  width="2.5" rx="1.25" height="12" fill="#B5F03D"/>
          <rect class="hb4" x="9"  y="1"  width="2.5" rx="1.25" height="14" fill="#B5F03D"/>
          <rect class="hb5" x="12" y="4"  width="2.5" rx="1.25" height="8"  fill="#6aaa10" opacity="0.75"/>
          <rect class="hb6" x="15" y="6"  width="2.5" rx="1.25" height="4"  fill="#3a5c0a" opacity="0.6"/>
        </svg>
      </div>
    `;t?n.innerHTML=`
        ${r}
        <div style="display:flex; flex-direction:column; gap:1px;">
          <div style="color:#F0F0F0; font-size:13px; font-weight:600; letter-spacing:-0.1px; line-height:1.3;">
            Hearly detected your meeting
          </div>
          <div style="color:#9CA3AF; font-size:11px; font-weight:400; line-height:1.3;">
            Voice focus is ready
          </div>
        </div>
        <button id="hearly-activate-btn" style="
          background: #B5F03D;
          color: #000000;
          border: none;
          border-radius: 10px;
          padding: 7px 14px;
          font-size: 12px;
          font-weight: 700;
          cursor: pointer;
          font-family: Inter, -apple-system, sans-serif;
          letter-spacing: 0.1px;
          flex-shrink: 0;
        ">Activate</button>
        <button id="hearly-dismiss-btn" style="
          background: transparent;
          color: #444444;
          border: none;
          padding: 4px 2px;
          font-size: 18px;
          cursor: pointer;
          line-height: 1;
          flex-shrink: 0;
        ">×</button>
      `:n.innerHTML=`
        ${r}
        <div style="display:flex; flex-direction:column; gap:1px;">
          <div style="color:#F0F0F0; font-size:13px; font-weight:600; letter-spacing:-0.1px; line-height:1.3;">
            Train your voice in 30 sec
          </div>
          <div style="color:#9CA3AF; font-size:11px; font-weight:400; line-height:1.3;">
            Let Hearly learn your voice to get started
          </div>
        </div>
        <button id="hearly-train-btn" style="
          background: transparent;
          color: #B5F03D;
          border: 1px solid rgba(181,240,61,0.4);
          border-radius: 10px;
          padding: 7px 14px;
          font-size: 12px;
          font-weight: 700;
          cursor: pointer;
          font-family: Inter, -apple-system, sans-serif;
          letter-spacing: 0.1px;
          flex-shrink: 0;
        ">Open Hearly</button>
        <button id="hearly-dismiss-btn" style="
          background: transparent;
          color: #444444;
          border: none;
          padding: 4px 2px;
          font-size: 18px;
          cursor: pointer;
          line-height: 1;
          flex-shrink: 0;
        ">×</button>
      `;let i=()=>{C||document.getElementById(`hearly-banner`)||(document.body?(document.body.appendChild(n),document.getElementById(`hearly-activate-btn`)?.addEventListener(`click`,()=>{chrome.runtime.sendMessage({type:`ACTIVATE_HEARLY`}),C=!0,n.remove()}),document.getElementById(`hearly-train-btn`)?.addEventListener(`click`,()=>{chrome.runtime.sendMessage({type:`OPEN_POPUP`}),C=!0,n.remove()}),document.getElementById(`hearly-dismiss-btn`)?.addEventListener(`click`,()=>{C=!0,n.remove()})):new MutationObserver((e,t)=>{document.body&&(t.disconnect(),i())}).observe(document.documentElement,{childList:!0,subtree:!0}))};i()})}function T(){if(!y())return;console.log(`[Hearly] Teams domain detected — watching for meeting...`),w();let e=()=>{if(!document.body){setTimeout(e,50);return}b()&&(x(),console.log(`[Hearly] Teams meeting active on load`));let t=b();new MutationObserver(()=>{let e=b();e!==t&&(e?(x(),console.log(`[Hearly] Teams meeting started`)):(S(),console.log(`[Hearly] Teams meeting ended`)),t=e),!document.getElementById(`hearly-banner`)&&!C&&w()}).observe(document.body,{subtree:!0,childList:!0})};e();let t=window.location.href;setInterval(()=>{window.location.href!==t&&(t=window.location.href,console.log(`[Hearly] Teams URL changed:`,t),!document.getElementById(`hearly-banner`)&&!C&&w())},1e3)}T();var E=null,D=null,O=null,k=null;function A(e){k||(console.log(`[Hearly] Starting transcription recorder...`),k=new t(e,`others`,(e,t)=>{chrome.runtime.sendMessage({type:`HEARLY_TRANSCRIBE_CHUNK`,audioBase64:e,speaker:`others`,timestamp:t})}),k.start())}function j(){let e=k;e&&(e.stop(),k=null),console.log(`[Hearly] Transcription recorder stopped`)}function M(){j();let e=O;e&&(e.disconnect(),O=null);let t=E;t&&(t.close(),E=null);let n=D;n&&(n.getTracks().forEach(e=>e.stop()),D=null),console.log(`[Hearly] Audio capture stopped on Teams page`),chrome.runtime.sendMessage({type:`HEARLY_AUDIO_STOPPED`,platform:`teams`})}chrome.runtime.onMessage.addListener((e,t,n)=>{if(e.type===`HEARLY_NEW_TRANSCRIPT_ENTRY`&&e.entry&&g(e.entry),e.type===`HEARBEAT_PING`)return n({status:`pong`}),!0;e.type===`HEARLY_START_AUDIO`&&e.streamId&&navigator.mediaDevices.getUserMedia({audio:{mandatory:{chromeMediaSource:`tab`,chromeMediaSourceId:e.streamId}},video:!1}).then(e=>{if(D=e,E=new AudioContext({sampleRate:16e3}),E.state===`suspended`){let e=()=>{E?.resume(),window.removeEventListener(`click`,e)};window.addEventListener(`click`,e)}O=E.createMediaStreamSource(e),O.connect(E.destination),console.log(`[Hearly] Audio capture started on Teams page (tabCapture)`),chrome.runtime.sendMessage({type:`HEARLY_AUDIO_STARTED`,platform:`teams`}),chrome.storage.local.get(`hearly_transcript`,t=>{t.hearly_transcript?.isEnabled&&A(e)})}).catch(e=>{console.warn(`[Hearly] Teams tabCapture stream failed:`,e),chrome.runtime.sendMessage({type:`HEARLY_AUDIO_ERROR`,error:String(e)})}),e.type===`HEARLY_STOP_AUDIO`&&M(),e.type===`HEARLY_FILTER_STATE_CHANGED`&&chrome.storage.local.get(`hearly_filter`,e=>{window.postMessage({source:`hearly-content`,type:`FILTER_STATE_CHANGED`,active:e.hearly_filter?.isActive===!0},window.location.origin)}),e.type===`HEARLY_TRANSCRIPT_STATE_CHANGED`&&chrome.storage.local.get(`hearly_transcript`,e=>{let t=e.hearly_transcript?.isEnabled===!0;window.postMessage({source:`hearly-content`,type:`TRANSCRIPT_STATE_CHANGED`,enabled:t},window.location.origin),t?D&&!k&&A(D):j()})});function N(){if(document.getElementById(`hearly-indicator`))return;let e=document.createElement(`div`);e.id=`hearly-indicator`,e.style.cssText=`
    position: fixed;
    bottom: 24px;
    right: 24px;
    z-index: 999999;
    background: rgba(14, 14, 14, 0.85);
    backdrop-filter: blur(16px);
    -webkit-backdrop-filter: blur(16px);
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 20px;
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 14px;
    font-family: Inter, -apple-system, sans-serif;
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.5), 0 0 0 0.5px rgba(255, 255, 255, 0.05);
    cursor: pointer;
    user-select: none;
    transition: transform 0.2s ease, background 0.2s ease, border-color 0.2s ease;
  `,e.addEventListener(`mouseenter`,()=>{e.style.transform=`scale(1.04)`,e.style.borderColor=`rgba(255, 255, 255, 0.16)`}),e.addEventListener(`mouseleave`,()=>{e.style.transform=`scale(1)`,e.style.borderColor=`rgba(255, 255, 255, 0.08)`});let t=document.createElement(`span`);t.id=`hearly-indicator-label`,t.style.cssText=`
    color: #F0F0F0;
    font-size: 12px;
    font-weight: 600;
    letter-spacing: -0.1px;
    transition: color 0.3s ease;
  `,e.appendChild(t);let n=document.createElement(`div`);n.id=`hearly-indicator-dot`,n.style.cssText=`
    width: 8px;
    height: 8px;
    border-radius: 50%;
    transition: background 0.3s ease;
  `,e.appendChild(n);let r=e=>{e?(t.innerText=`Hearly ON`,t.style.color=`#F0F0F0`,n.style.background=`#B5F03D`,n.style.boxShadow=`none`):(t.innerText=`Hearly OFF`,t.style.color=`#9CA3AF`,n.style.background=`#EF4444`,n.style.boxShadow=`none`)};e.addEventListener(`click`,()=>{chrome.storage.local.get(`hearly_filter`,e=>{e.hearly_filter?.isActive!==!0&&chrome.storage.local.set({hearly_filter:{isActive:!0}},()=>{chrome.runtime.sendMessage({type:`HEARLY_TOGGLE`}),window.postMessage({source:`hearly-content`,type:`FILTER_STATE_CHANGED`,active:!0},window.location.origin),r(!0)})})}),chrome.storage.local.get(`hearly_filter`,e=>{r(e.hearly_filter?.isActive===!0)}),chrome.storage.onChanged.addListener(e=>{e.hearly_filter&&r(e.hearly_filter.newValue?.isActive===!0)});let i=()=>{document.body?document.body.appendChild(e):setTimeout(i,100)};i()}N()})();