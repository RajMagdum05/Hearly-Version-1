var e=`teams`,t=!1,n=`fallback`,r=!1;async function i(e){try{let t=atob(e),n=new Uint8Array(t.length);for(let e=0;e<t.length;e+=1)n[e]=t.charCodeAt(e);let r=new Blob([n],{type:`audio/webm`}),i=new AudioContext;try{let e=await i.decodeAudioData((await r.arrayBuffer()).slice(0)),t=new Float32Array(e.length);for(let n=0;n<e.numberOfChannels;n+=1){let r=e.getChannelData(n);for(let n=0;n<r.length;n+=1)t[n]+=(r[n]??0)/e.numberOfChannels}return{samples:Array.from(t),sampleRate:e.sampleRate}}finally{await i.close()}}catch(e){return console.warn(`[Hearly] Failed to decode transcript audio chunk:`,e),null}}var a=class{stream;speaker;onChunk;recorder=null;timer=null;chunks=[];constructor(e,t,n){this.stream=e,this.speaker=t,this.onChunk=n}start(){this.recorder||(this.startWindow(),this.timer=window.setInterval(()=>this.startWindow(),4e3))}startWindow(){this.recorder?.state===`recording`&&this.recorder.stop(),this.chunks=[];let e=Date.now();this.recorder=new MediaRecorder(this.stream),this.recorder.ondataavailable=e=>{e.data.size>0&&this.chunks.push(e.data)},this.recorder.onstop=()=>{let t=new Blob(this.chunks,{type:`audio/webm`});if(t.size===0)return;let n=new FileReader;n.onloadend=()=>{let t=String(n.result).split(`,`)[1];t&&this.onChunk(t,e,this.speaker)},n.readAsDataURL(t)},this.recorder.start(),window.setTimeout(()=>{this.recorder?.state===`recording`&&this.recorder.stop()},3900)}stop(){this.timer&&=(window.clearInterval(this.timer),null),this.recorder?.state===`recording`&&this.recorder.stop(),this.recorder=null}};function o(){window.addEventListener(`message`,a=>{if(a.source!==window)return;let o=a.data;if(o?.source!==`hearly-page`)return;if(o.type===`GET_MIC_STATE`&&o.requestId){chrome.storage.local.get([`hearly_filter`,`hearly_voice_runtime_profile`,`hearly_transcript`],e=>{n=e.hearly_voice_runtime_profile?.embeddingModel??`fallback`,window.postMessage({source:`hearly-content`,type:`MIC_STATE`,requestId:o.requestId,enabled:e.hearly_filter?.isActive===!0,embedding:(e.hearly_voice_runtime_profile?.embeddingModel??`fallback`)===`fallback`?e.hearly_voice_runtime_profile?.embedding??null:null,embeddingModel:e.hearly_voice_runtime_profile?.embeddingModel??`fallback`,threshold:.58,workletUrl:chrome.runtime.getURL(`hearly-processor.js`),transcriptionEnabled:e.hearly_transcript?.isEnabled===!0},window.location.origin)});return}if(o.type===`VOICE_WINDOW`&&o.samplesBuffer){if(n!==`onnx-ready`||t)return;t=!0,chrome.runtime.sendMessage({type:`HEARLY_VERIFY_VOICE_WINDOW`,samples:Array.from(new Float32Array(o.samplesBuffer)),sampleRate:o.sampleRate??48e3,threshold:.58,vadConfidence:o.vadConfidence},n=>{if(t=!1,!(chrome.runtime.lastError||!n)){if(n.unavailable){r||(r=!0,chrome.runtime.sendMessage({type:`HEARLY_MIC_PROCESSING_ERROR`,platform:o.platform??e,error:`Local ONNX speaker model unavailable. Export hearly-speaker-v1.onnx and reload extension.`}));return}r=!1,window.postMessage({source:`hearly-content`,type:`VOICE_MATCH_DECISION`,matched:n.matched===!0,score:n.score??0,vadConfidence:o.vadConfidence},window.location.origin),chrome.runtime.sendMessage({type:`HEARLY_VOICE_MATCH`,platform:o.platform??e,score:n.score??0,matched:n.matched===!0})}});return}if(o.type===`NEW_MIC_CHUNK`&&o.audioBase64){(async()=>{let e=await i(o.audioBase64);e&&chrome.runtime.sendMessage({type:`HEARLY_TRANSCRIBE_CHUNK`,audioBase64:o.audioBase64,samples:e.samples,sampleRate:e.sampleRate,speaker:`you`,timestamp:o.timestamp??Date.now()})})();return}let s=o.type?{MIC_PROCESSING_STARTED:`HEARLY_MIC_PROCESSING_STARTED`,MIC_PROCESSING_STOPPED:`HEARLY_MIC_PROCESSING_STOPPED`,MIC_PROCESSING_ERROR:`HEARLY_MIC_PROCESSING_ERROR`,VOICE_MATCH:`HEARLY_VOICE_MATCH`,VOICE_ACTIVITY:`HEARLY_VOICE_ACTIVITY`}[o.type]:void 0;s&&chrome.runtime.sendMessage({type:s,platform:o.platform??e,score:o.score,matched:o.matched,isSpeech:o.isSpeech,confidence:o.confidence,rms:o.rms,noiseFloor:o.noiseFloor,error:o.error})})}o();function s(){let e=window.location.href;return e.includes(`teams.microsoft.com`)||e.includes(`teams.live.com`)}function c(){return[`[data-tid="calling-screen"]`,`[data-tid="meeting-composite"]`,`[data-tid="prejoin-screen"]`,`.ts-calling-screen`,`[class*="calling"]`,`[class*="meeting"]`].some(e=>!!document.querySelector(e))}function l(){chrome.runtime.sendMessage({type:`MEETING_DETECTED`,payload:{platform:`teams`}})}function u(){chrome.runtime.sendMessage({type:`MEETING_ENDED`})}function d(){document.getElementById(`hearly-banner`)||chrome.storage.local.get(`hearly_enrollment`,e=>{let t=e?.hearly_enrollment?.isEnrolled===!0,n=document.createElement(`div`);n.id=`hearly-banner`,n.style.cssText=`
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
      `,document.body.appendChild(n),document.getElementById(`hearly-activate-btn`)?.addEventListener(`click`,()=>{chrome.runtime.sendMessage({type:`ACTIVATE_HEARLY`}),n.remove()}),document.getElementById(`hearly-train-btn`)?.addEventListener(`click`,()=>{chrome.runtime.sendMessage({type:`OPEN_POPUP`}),n.remove()}),document.getElementById(`hearly-dismiss-btn`)?.addEventListener(`click`,()=>{n.remove()})})}function f(){if(!s())return;console.log(`[Hearly] Teams domain detected — watching for meeting...`),d(),c()&&(l(),console.log(`[Hearly] Teams meeting active on load`));let e=c();new MutationObserver(()=>{let t=c();t!==e&&(t?(l(),console.log(`[Hearly] Teams meeting started`)):(u(),console.log(`[Hearly] Teams meeting ended`)),e=t),document.getElementById(`hearly-banner`)||d()}).observe(document.body,{subtree:!0,childList:!0});let t=window.location.href;setInterval(()=>{window.location.href!==t&&(t=window.location.href,console.log(`[Hearly] Teams URL changed:`,t),document.getElementById(`hearly-banner`)||d())},1e3)}f();var p=null,m=null,h=null,g=null;function _(e){g||(console.log(`[Hearly] Starting transcription recorder...`),chrome.storage.local.get(`hearly_app_settings`,t=>{let n=t.hearly_app_settings?.language??`en`;g=new a(e,`others`,(e,t)=>{(async()=>{let r=await i(e);r&&chrome.runtime.sendMessage({type:`HEARLY_TRANSCRIBE_CHUNK`,audioBase64:e,samples:r.samples,sampleRate:r.sampleRate,language:n,speaker:`others`,timestamp:t})})()}),g.start()}))}function v(){g&&=(g.stop(),null),console.log(`[Hearly] Transcription recorder stopped`)}function y(){v(),h&&=(h.disconnect(),null),p&&=(p.close(),null),m&&=(m.getTracks().forEach(e=>e.stop()),null),console.log(`[Hearly] Audio capture stopped on Teams page`),chrome.runtime.sendMessage({type:`HEARLY_AUDIO_STOPPED`,platform:`teams`})}chrome.runtime.onMessage.addListener((e,t,n)=>{if(e.type===`HEARBEAT_PING`)return n({status:`pong`}),!0;e.type===`HEARLY_START_AUDIO`&&e.streamId&&navigator.mediaDevices.getUserMedia({audio:{mandatory:{chromeMediaSource:`tab`,chromeMediaSourceId:e.streamId}},video:!1}).then(e=>{if(m=e,p=new AudioContext({sampleRate:16e3}),p.state===`suspended`){let e=()=>{p?.resume(),window.removeEventListener(`click`,e)};window.addEventListener(`click`,e)}h=p.createMediaStreamSource(e),h.connect(p.destination),console.log(`[Hearly] Audio capture started on Teams page (tabCapture)`),chrome.runtime.sendMessage({type:`HEARLY_AUDIO_STARTED`,platform:`teams`}),chrome.storage.local.get(`hearly_transcript`,t=>{t.hearly_transcript?.isEnabled&&_(e)})}).catch(e=>{console.warn(`[Hearly] Teams tabCapture stream failed:`,e),chrome.runtime.sendMessage({type:`HEARLY_AUDIO_ERROR`,error:String(e)})}),e.type===`HEARLY_STOP_AUDIO`&&y(),e.type===`HEARLY_FILTER_STATE_CHANGED`&&chrome.storage.local.get(`hearly_filter`,e=>{window.postMessage({source:`hearly-content`,type:`FILTER_STATE_CHANGED`,active:e.hearly_filter?.isActive===!0},window.location.origin)}),e.type===`HEARLY_TRANSCRIPT_STATE_CHANGED`&&chrome.storage.local.get(`hearly_transcript`,e=>{let t=e.hearly_transcript?.isEnabled===!0;window.postMessage({source:`hearly-content`,type:`TRANSCRIPT_STATE_CHANGED`,enabled:t},window.location.origin),t?m&&!g&&_(m):v()})});