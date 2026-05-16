function e(){let e=window.location.pathname;return/^\/[a-z]+-[a-z]+-[a-z]+$/.test(e)}function t(){chrome.runtime.sendMessage({type:`MEETING_DETECTED`,payload:{platform:`meet`}})}function n(){chrome.runtime.sendMessage({type:`MEETING_ENDED`})}function r(){document.getElementById(`hearly-banner`)||chrome.storage.local.get(`hearly_enrollment`,e=>{let t=e?.hearly_enrollment?.isEnrolled===!0,n=document.createElement(`div`);n.id=`hearly-banner`,n.style.cssText=`
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
      `,document.body.appendChild(n),document.getElementById(`hearly-activate-btn`)?.addEventListener(`click`,()=>{chrome.runtime.sendMessage({type:`ACTIVATE_HEARLY`}),n.remove()}),document.getElementById(`hearly-train-btn`)?.addEventListener(`click`,()=>{chrome.runtime.sendMessage({type:`OPEN_POPUP`}),n.remove()}),document.getElementById(`hearly-dismiss-btn`)?.addEventListener(`click`,()=>{n.remove()})})}e()?(t(),r(),console.log(`Hearly: Meet room detected (lobby or active)`)):console.log(`Hearly: Meet page loaded, no active meeting`);var i=e();new MutationObserver(()=>{let r=e();r!==i&&(r?t():n(),i=r)}).observe(document.querySelector(`title`)||document.documentElement,{subtree:!0,characterData:!0,childList:!0});var a=null,o=null,s=null;function c(){s&&=(s.disconnect(),null),a&&=(a.close(),null),o&&=(o.getTracks().forEach(e=>e.stop()),null),console.log(`[Hearly] Audio capture stopped on Meet page`),chrome.runtime.sendMessage({type:`HEARLY_AUDIO_STOPPED`,platform:`meet`})}chrome.runtime.onMessage.addListener(e=>{e.type===`HEARLY_START_AUDIO`&&e.streamId&&navigator.mediaDevices.getUserMedia({audio:{mandatory:{chromeMediaSource:`tab`,chromeMediaSourceId:e.streamId}},video:!1}).then(e=>{o=e,a=new AudioContext({sampleRate:16e3}),s=a.createMediaStreamSource(e),console.log(`[Hearly] Audio capture started on Meet page (tabCapture)`),chrome.runtime.sendMessage({type:`HEARLY_AUDIO_STARTED`,platform:`meet`})}).catch(e=>{console.warn(`[Hearly] Meet tabCapture stream failed:`,e),chrome.runtime.sendMessage({type:`HEARLY_AUDIO_ERROR`,error:String(e)})}),e.type===`HEARLY_STOP_AUDIO`&&c()});