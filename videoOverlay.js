(function(){
  // Responsive video overlay — non-invasive and works alongside halkaBox
  // Inject responsive styles once
  if(!document.getElementById('hb-video-overlay-styles')){
    var style = document.createElement('style');
    style.id = 'hb-video-overlay-styles';
    style.innerHTML = '\n.hb-video-overlay{position:fixed;inset:0;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,0.85);z-index:99999;padding:20px;box-sizing:border-box;}\n.hb-video-container{max-width:1100px;width:100%;max-height:80vh;}\n.hb-video-container video{width:100%;height:100%;max-height:80vh;object-fit:contain;background:#000;border-radius:6px;}\n.hb-video-close{position:fixed;top:18px;right:18px;z-index:100000;background:rgba(0,0,0,0.45);color:#fff;border:none;font-size:22px;width:40px;height:40px;border-radius:50%;cursor:pointer;display:flex;align-items:center;justify-content:center;}\n@media (max-width:600px){.hb-video-container{max-width:100%;max-height:95vh;padding:6px}.hb-video-close{top:10px;right:10px;font-size:18px;width:36px;height:36px}}\n';
    document.head.appendChild(style);
  }

  function createOverlay(src, poster){
    var overlay = document.createElement('div');
    overlay.className = 'hb-video-overlay';

    var container = document.createElement('div');
    container.className = 'hb-video-container';

    var video = document.createElement('video');
    video.src = src;
    if(poster) video.poster = poster;
    video.controls = true;
    video.autoplay = true;
    try{ video.volume = 0.5; }catch(e){}
    video.setAttribute('playsinline','');

    var close = document.createElement('button');
    close.className = 'hb-video-close';
    close.setAttribute('aria-label','Close video');
    close.innerHTML = '&times;';

    function removeOverlay(){ try{ video.pause(); }catch(e){} if(document.body.contains(overlay)) document.body.removeChild(overlay); if(document.body.contains(close)) document.body.removeChild(close); window.removeEventListener('keyup',onEsc); }
    function onEsc(e){ if(e.key==='Escape'){ removeOverlay(); }}

    close.addEventListener('click', removeOverlay);
    overlay.addEventListener('click',function(e){ if(e.target===overlay){ removeOverlay(); }});
    window.addEventListener('keyup', onEsc);

    container.appendChild(video);
    overlay.appendChild(container);
    document.body.appendChild(overlay);
    document.body.appendChild(close);

    // ensure volume is set when playback begins (covers autoplay restrictions)
    var setVol = function(){ try{ video.volume = 0.5; }catch(e){} video.removeEventListener('play', setVol); };
    video.addEventListener('play', setVol);

    // try to size video reasonably for very wide videos
    video.addEventListener('loadedmetadata', function(){
      // if video is extremely wide, limit height more aggressively
      var aspect = video.videoWidth && video.videoHeight ? video.videoWidth / video.videoHeight : null;
      if(aspect && aspect > 2){ container.style.maxHeight = '70vh'; }
    });

    return {overlay:overlay,video:video,close:close};
  }

  document.addEventListener('click', async function(e){
    var el = e.target.closest && e.target.closest('a[data-video]');
    if(!el) return;
    e.preventDefault();
    var src = el.getAttribute('href') || el.getAttribute('data-video');
    if(!src) return;
    var poster = el.getAttribute('data-poster') || (el.querySelector && el.querySelector('img') && el.querySelector('img').src);

    console.debug('[videoOverlay] requested video:', src);

    // Create overlay immediately (keeps play() inside the original user gesture)
    var parts = createOverlay(src, poster);
    var video = parts.video;

    // try to play immediately; if blocked the user still has controls
    try {
      var playPromise = video.play();
      if (playPromise && typeof playPromise.catch === 'function') {
        playPromise.catch(function(err){
          console.warn('[videoOverlay] autoplay blocked or play failed:', err);
        });
      }
    } catch(err){
      console.warn('[videoOverlay] video.play() threw:', err);
    }

    // Perform HEAD check in background; don't abort overlay on failure, just show a brief notice
    try{
      var resp = await fetch(src, { method: 'HEAD' });
      if(!resp.ok){
        console.error('[videoOverlay] video not available:', src, resp.status);
        var notice = document.createElement('div');
        notice.className = 'hb-video-overlay';
        var msg = document.createElement('div');
        msg.style.color = '#fff';
        msg.style.maxWidth = '600px';
        msg.style.padding = '20px';
        msg.style.textAlign = 'center';
        msg.innerHTML = '<p>Video could not be verified (HTTP '+resp.status+'). You may still try to play it.</p>';
        notice.appendChild(msg);
        document.body.appendChild(notice);
        setTimeout(function(){ try{ if(document.body.contains(notice)) document.body.removeChild(notice); }catch(e){} },4500);
      }
    }catch(err){
      console.error('[videoOverlay] fetchHEAD failed for video:', src, err);
      var notice = document.createElement('div');
      notice.className = 'hb-video-overlay';
      var msg = document.createElement('div');
      msg.style.color = '#fff';
      msg.style.maxWidth = '600px';
      msg.style.padding = '20px';
      msg.style.textAlign = 'center';
      msg.innerHTML = '<p>Could not verify video availability. Check the browser console for details.</p>';
      notice.appendChild(msg);
      document.body.appendChild(notice);
      setTimeout(function(){ try{ if(document.body.contains(notice)) document.body.removeChild(notice); }catch(e){} },4500);
    }

  },false);
})();
