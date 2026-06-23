// waves.js - lightweight canvas monochrome wave animation
(function(){
  const canvas = document.getElementById('waveCanvas') || document.getElementById('wallpaper');
  if(!canvas) return;
  const ctx = canvas.getContext('2d');
  let w=0,h=0, t=0;
  function resize(){
    w = canvas.width = innerWidth;
    h = canvas.height = innerHeight;
  }
  addEventListener('resize', resize);
  resize();

  function drawLayer(i, time){
    ctx.save();
    ctx.globalCompositeOperation = i===0? 'source-over' : 'lighter';
    const alpha = 0.06 + i*0.04;
    ctx.fillStyle = `rgba(255,255,255,${alpha})`;

    ctx.beginPath();
    const amplitude = 40 + i*30;
    const frequency = 0.0025 + i*0.0015;
    ctx.moveTo(0, h);
    for(let x=0;x<=w;x+=4){
      const y = h/2 + Math.sin((x*time*frequency) + (i*1.5) + x*0.01) * amplitude * Math.sin(time*0.0008 + i);
      ctx.lineTo(x,y);
    }
    ctx.lineTo(w,h);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  function frame(now){
    t = now;
    ctx.clearRect(0,0,w,h);
    // vignette
    const g = ctx.createLinearGradient(0,0,0,h);
    g.addColorStop(0,'rgba(0,0,0,0)');
    g.addColorStop(1,'rgba(0,0,0,0.25)');
    ctx.fillStyle = g;
    ctx.fillRect(0,0,w,h);

    // layers
    drawLayer(0,now);
    drawLayer(1,now);
    drawLayer(2,now);

    // subtle grain
    ctx.fillStyle = 'rgba(255,255,255,0.01)';
    for(let i=0;i<200;i++){
      ctx.fillRect(Math.random()*w, Math.random()*h, 1,1);
    }

    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
})();
