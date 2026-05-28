import{t as e}from"./assets/streamingRecorder-D2Pcv5OW.js";var t=`zoom`;function n(){window.addEventListener(`message`,e=>{if(e.source!==window)return;let n=e.data;if(n?.source!==`hearly-page`)return;if(n.type===`GET_MIC_STATE`&&n.requestId){chrome.storage.local.get([`hearly_filter`,`hearly_voice_profile`,`hearly_transcript`],e=>{window.postMessage({source:`hearly-content`,type:`MIC_STATE`,requestId:n.requestId,enabled:e.hearly_filter?.isActive===!0,embedding:e.hearly_voice_profile?.embedding??null,threshold:.58,workletUrl:chrome.runtime.getURL(`hearly-processor.js`),transcriptionEnabled:e.hearly_transcript?.isEnabled===!0},window.location.origin)});return}if(n.type===`NEW_MIC_CHUNK`&&n.audioBase64){chrome.runtime.sendMessage({type:`HEARLY_TRANSCRIBE_CHUNK`,audioBase64:n.audioBase64,speaker:`you`,timestamp:n.timestamp??Date.now()});return}let r=n.type?{MIC_PROCESSING_STARTED:`HEARLY_MIC_PROCESSING_STARTED`,MIC_PROCESSING_STOPPED:`HEARLY_MIC_PROCESSING_STOPPED`,MIC_PROCESSING_ERROR:`HEARLY_MIC_PROCESSING_ERROR`,VOICE_MATCH:`HEARLY_VOICE_MATCH`}[n.type]:void 0;r&&chrome.runtime.sendMessage({type:r,platform:n.platform??t,score:n.score,matched:n.matched,error:n.error})})}n();function r(){let e=window.location.pathname;return window.location.hostname.includes(`zoom.us`)&&e.includes(`/wc/`)}function i(){chrome.runtime.sendMessage({type:`MEETING_DETECTED`,payload:{platform:`zoom`}})}function a(){document.getElementById(`hearly-banner`)||chrome.storage.local.get(`hearly_enrollment`,e=>{let t=e?.hearly_enrollment?.isEnrolled===!0,n=document.createElement(`div`);n.id=`hearly-banner`,n.style.cssText=`
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
      `,document.body.appendChild(n),document.getElementById(`hearly-activate-btn`)?.addEventListener(`click`,()=>{chrome.runtime.sendMessage({type:`ACTIVATE_HEARLY`}),n.remove()}),document.getElementById(`hearly-train-btn`)?.addEventListener(`click`,()=>{chrome.runtime.sendMessage({type:`OPEN_POPUP`}),n.remove()}),document.getElementById(`hearly-dismiss-btn`)?.addEventListener(`click`,()=>{n.remove()})})}r()?(i(),a(),console.log(`Hearly: Zoom meeting detected`)):console.log(`Hearly: Zoom page, no active meeting`);var o=null,s=null,c=null,l=null;function u(t){l||(console.log(`[Hearly] Starting transcription recorder...`),chrome.storage.local.get(`hearly_app_settings`,n=>{let r=n.hearly_app_settings?.language??`en`;l=new e(t,`others`,(e,t)=>{chrome.runtime.sendMessage({type:`HEARLY_TRANSCRIBE_CHUNK`,audioBase64:e,language:r,speaker:`others`,timestamp:t})}),l.start()}))}function d(){l&&=(l.stop(),null),console.log(`[Hearly] Transcription recorder stopped`)}function f(){d(),c&&=(c.disconnect(),null),o&&=(o.close(),null),s&&=(s.getTracks().forEach(e=>e.stop()),null),console.log(`[Hearly] Audio capture stopped on Zoom page`),chrome.runtime.sendMessage({type:`HEARLY_AUDIO_STOPPED`,platform:`zoom`})}chrome.runtime.onMessage.addListener((e,t,n)=>{if(e.type===`HEARBEAT_PING`)return n({status:`pong`}),!0;e.type===`HEARLY_START_AUDIO`&&e.streamId&&navigator.mediaDevices.getUserMedia({audio:{mandatory:{chromeMediaSource:`tab`,chromeMediaSourceId:e.streamId}},video:!1}).then(e=>{if(s=e,o=new AudioContext({sampleRate:16e3}),o.state===`suspended`){let e=()=>{o?.resume(),window.removeEventListener(`click`,e)};window.addEventListener(`click`,e)}c=o.createMediaStreamSource(e),c.connect(o.destination),console.log(`[Hearly] Audio capture started on Zoom page (tabCapture)`),chrome.runtime.sendMessage({type:`HEARLY_AUDIO_STARTED`,platform:`zoom`}),chrome.storage.local.get(`hearly_transcript`,t=>{t.hearly_transcript?.isEnabled&&u(e)})}).catch(e=>{console.warn(`[Hearly] Zoom tabCapture stream failed:`,e),chrome.runtime.sendMessage({type:`HEARLY_AUDIO_ERROR`,error:String(e)})}),e.type===`HEARLY_STOP_AUDIO`&&f(),e.type===`HEARLY_FILTER_STATE_CHANGED`&&chrome.storage.local.get(`hearly_filter`,e=>{window.postMessage({source:`hearly-content`,type:`FILTER_STATE_CHANGED`,active:e.hearly_filter?.isActive===!0},window.location.origin)}),e.type===`HEARLY_TRANSCRIPT_STATE_CHANGED`&&chrome.storage.local.get(`hearly_transcript`,e=>{let t=e.hearly_transcript?.isEnabled===!0;window.postMessage({source:`hearly-content`,type:`TRANSCRIPT_STATE_CHANGED`,enabled:t},window.location.origin),t?s&&!l&&u(s):d()})});