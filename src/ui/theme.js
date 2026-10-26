/* ───────────────────────── 5. Styles ───────────────────────── */
/* Visual direction: dark navy with a lime signal colour, taken from the client's reference dashboard. A light theme is kept as an option. */

export const STYLES = `
@import url('https://fonts.googleapis.com/css2?family=Unbounded:wght@500;700&family=Instrument+Sans:wght@400;500;600&display=swap');
.br{--ink:#040914;--paper:#F0F4F8;--panel:#FFFFFF;--panel2:#F6F9FC;--line:#CBD5E1;--muted:#64748B;--text:#0F172A;
--lime:#00F59B;--limeInk:#022013;--s1:#00F59B;--s2:#00E5FF;--s3:#A855F7;--s4:#FF6B4A;--risk:#F43F5E;--ok:#10B981;--warn:#F59E0B;
--riskBg:#FFF1F2;--okBg:#ECFDF5;--warnBg:#FFFBEB;--infoBg:#EFF6FF;--muteBg:#F1F5F9;--card:#FFFFFF;--glow:0 4px 20px rgba(0,0,0,.04);
font-family:'Instrument Sans',system-ui,-apple-system,Segoe UI,sans-serif;color:var(--text);background:var(--paper);min-height:100vh;font-size:15px;line-height:1.5;-webkit-font-smoothing:antialiased}
.br[data-theme=dark]{--paper:#070C18;--panel:#0F1829;--panel2:#14223A;--line:rgba(255,255,255,0.09);--muted:#94A3B8;--text:#F8FAFC;--s1:#00F59B;--s2:#00E5FF;--s3:#A855F7;--s4:#FF6B4A;--risk:#F43F5E;--ok:#10B981;--warn:#F59E0B;
--riskBg:rgba(244,63,94,0.18);--okBg:rgba(16,185,129,0.18);--warnBg:rgba(245,158,11,0.18);--infoBg:rgba(0,229,255,0.16);--muteBg:rgba(255,255,255,0.06);
--card:linear-gradient(165deg,rgba(18,28,48,0.85) 0%,rgba(9,15,28,0.95) 100%);
--glow:0 0 0 1px rgba(0,229,255,0.08),0 16px 40px rgba(0,0,0,0.45);
background:radial-gradient(1000px 600px at 85% -10%,rgba(168,85,247,0.18),transparent 65%),radial-gradient(800px 500px at 10% 0%,rgba(0,229,255,0.14),transparent 60%),radial-gradient(700px 500px at 50% 100%,rgba(0,245,155,0.08),transparent 60%),#070C18}
.br *{box-sizing:border-box}
.br button,.br select,.br input,.br textarea{font:inherit;color:inherit}
.br :focus-visible{outline:2px solid var(--s2);outline-offset:2px;border-radius:4px}
.br .disp{font-family:'Unbounded','Instrument Sans',system-ui,sans-serif;font-weight:500;letter-spacing:-.01em}
.br .num{font-variant-numeric:tabular-nums}
.br .muted{color:var(--muted)}
.br .sr{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap}
.br-shell{display:grid;grid-template-columns:232px minmax(0,1fr);min-height:100vh}
.br-rail{background:#050F1D;color:#E8EEF5;padding:20px 14px;display:flex;flex-direction:column;gap:6px;position:sticky;top:0;height:100vh;border-right:1px solid #10263F}
.br-brand{padding:4px 8px 22px;display:flex;gap:10px;align-items:center}
.br-brand b{display:block;font-size:15px;color:#fff;line-height:1.1}
.br-brand span{font-size:11.5px;color:#8197AE}
.br-nav{display:flex;flex-direction:column;gap:6px}
.br-navbtn{display:flex;align-items:center;gap:12px;text-align:left;border:0;background:transparent;color:#B9C8D9;padding:11px 12px;border-radius:10px;cursor:pointer}
.br-navbtn:hover{background:#0F2238}
.br-navbtn[aria-current=page]{background:var(--lime);color:var(--limeInk);font-weight:600}
.br-navbtn .badge{margin-left:auto;font-size:12px;padding:1px 8px;border-radius:999px;background:#16304D;color:#E8EEF5}
.br-navbtn[aria-current=page] .badge{background:#142100;color:#B8F500}
.br-railnote{margin-top:auto;font-size:12px;color:#8197AE;padding:10px 6px;border-top:1px solid #10263F;display:flex;gap:10px;align-items:center}
.br-main{padding:0 26px 40px;min-width:0}
.br-top{display:flex;align-items:center;gap:10px;padding:14px 0;flex-wrap:wrap}
.br-top .grow{flex:1}
.searchbox{display:flex;align-items:center;gap:8px;background:var(--panel);border:1px solid var(--line);border-radius:10px;padding:0 12px;min-width:240px;flex:1;max-width:460px}
.searchbox input{border:0;background:transparent;outline:0;padding:9px 0;width:100%}
.searchbox:focus-within{border-color:var(--s2)}
.bellbtn{position:relative}
.bellbtn .dot{position:absolute;top:-6px;right:-6px;background:var(--risk);color:#fff;font-size:11px;border-radius:999px;padding:0 6px;line-height:17px}
.chip{display:inline-flex;align-items:center;gap:6px;font-size:12.5px;padding:2px 10px;border-radius:999px;background:var(--muteBg);color:var(--text);white-space:nowrap;border:1px solid transparent}
.chip.go{background:var(--okBg);color:var(--ok)}.chip.warn{background:var(--warnBg);color:var(--warn)}
.chip.risk{background:var(--riskBg);color:var(--risk)}.chip.info{background:var(--infoBg);color:var(--s2)}
.chip.sim{background:var(--warnBg);color:var(--warn);border-color:var(--warn);font-weight:600}
.chip.lime{background:var(--lime);color:var(--limeInk);font-weight:600}
.btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;border-radius:9px;padding:8px 14px;border:1px solid var(--line);background:var(--panel);cursor:pointer;font-weight:500}
.btn:hover{border-color:var(--s2)}
.btn.primary{background:var(--lime);color:var(--limeInk);border-color:var(--lime);font-weight:600}
.btn.primary:hover{filter:brightness(.95)}
.btn.ghost{border-color:transparent;background:transparent}
.btn.sm{padding:4px 10px;font-size:13px}
.btn[disabled]{opacity:.5;cursor:not-allowed}
.pillbtn{border-radius:999px;border:0;padding:5px 14px;font-weight:600;font-size:13px;cursor:pointer;white-space:nowrap}
.pillbtn.inv{background:var(--lime);color:var(--limeInk)}.pillbtn.mon{background:#1E6FE8;color:#fff}.pillbtn.wat{background:var(--muteBg);color:var(--text)}
.page-h{display:flex;align-items:flex-end;gap:16px;flex-wrap:wrap;margin:6px 0 16px}
.page-h h1{margin:0;font-size:26px;line-height:1.15}
.page-h p{margin:4px 0 0;color:var(--muted);max-width:64ch}
.card{background:var(--card);border:1px solid var(--line);border-radius:14px;padding:16px;box-shadow:var(--glow)}
.card h2,.card h3{margin:0 0 8px;font-size:16px}
.card.flat{background:var(--panel2)}
.ch{display:flex;align-items:center;gap:10px;margin-bottom:10px}
.ch h2,.ch h3{margin:0}.ch .sub{color:var(--muted);font-size:12.5px}
.ibadge{width:34px;height:34px;border-radius:10px;display:grid;place-items:center;flex:none}
.ibadge.v{background:rgba(139,92,246,.2);color:#B49BFF}.ibadge.c{background:rgba(34,211,238,.16);color:#22D3EE}
.ibadge.l{background:rgba(184,245,0,.16);color:#B8F500}.ibadge.a{background:rgba(245,165,36,.18);color:#F5A524}
.ibadge.r{background:rgba(255,107,107,.18);color:#FF6B6B}.ibadge.g{background:rgba(74,222,128,.16);color:#4ADE80}
.grid{display:grid;gap:16px}
.g2{grid-template-columns:minmax(0,1.55fr) minmax(0,1fr)}
.g2e{grid-template-columns:repeat(2,minmax(0,1fr))}
.g3{grid-template-columns:repeat(3,minmax(0,1fr))}
.g4{grid-template-columns:repeat(4,minmax(0,1fr))}
.row{display:flex;gap:10px;align-items:center;flex-wrap:wrap}
.stack{display:flex;flex-direction:column;gap:10px}
.tbl{width:100%;border-collapse:collapse;font-size:14px}
.tbl th{text-align:left;font-weight:500;color:var(--muted);padding:8px 10px;border-bottom:1px solid var(--line);white-space:nowrap;font-size:13px}
.tbl td{padding:9px 10px;border-bottom:1px solid var(--line);vertical-align:middle}
.tbl tr.sel td{background:rgba(184,245,0,.06)}
.tbl tr.sel td:first-child{box-shadow:inset 3px 0 0 var(--lime)}
.linkbtn{background:none;border:0;padding:0;text-align:left;cursor:pointer;font-weight:600}
.linkbtn:hover{text-decoration:underline}
.scroll-x{overflow-x:auto}
.scope{display:flex;gap:10px;flex-wrap:wrap;align-items:flex-end}
.field{display:flex;flex-direction:column;gap:4px;font-size:13px}
.field label,.field .lbl{color:var(--muted)}
.field select,.field input[type=text],.field textarea{border:1px solid var(--line);background:var(--panel2);border-radius:8px;padding:6px 8px;min-height:34px}
.pillgroup{display:flex;gap:6px;flex-wrap:wrap}
.pill{border:1px solid var(--line);background:var(--panel2);border-radius:999px;padding:3px 11px;font-size:13px;cursor:pointer}
.pill[aria-pressed=true]{background:var(--lime);border-color:var(--lime);color:var(--limeInk);font-weight:600}
.meter{height:6px;border-radius:99px;background:var(--muteBg);overflow:hidden;min-width:60px}
.meter>i{display:block;height:100%;background:var(--s1);border-radius:99px}
.rangebar{position:relative;height:8px;border-radius:99px;background:var(--muteBg);min-width:90px}
.rangebar .span{position:absolute;top:0;bottom:0;background:var(--s2);opacity:.45;border-radius:99px}
.rangebar .dot{position:absolute;top:-2px;width:12px;height:12px;border-radius:50%;background:var(--s1);border:2px solid var(--panel);transform:translateX(-50%)}
.hero{position:relative;overflow:hidden;border-radius:18px;border:1px solid var(--line);min-height:250px;background:#06101F;display:flex;align-items:center}
.hero svg.art{position:absolute;inset:0;width:100%;height:100%}
.hero .copy{position:relative;padding:28px 30px;max-width:560px}
.hero h1{margin:6px 0 8px;font-size:34px;line-height:1.1;color:#fff}
.hero h1 em{font-style:normal;color:var(--lime);display:block}
.hero p{color:#B9C8D9;margin:0 0 16px;max-width:46ch}
.hero .tag{position:absolute;right:28px;top:26px;color:var(--lime);font-style:italic;font-weight:600;text-align:right;transform:rotate(-4deg);font-size:19px;line-height:1.15;text-shadow:0 2px 12px rgba(0,0,0,.6)}
.hero .eyebrow{display:flex;gap:8px;align-items:center;color:#B9C8D9;font-size:12.5px}
.tiles{display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:12px}
.tile{background:var(--card);border:1px solid var(--line);border-radius:14px;padding:14px;display:flex;flex-direction:column;gap:8px;box-shadow:var(--glow)}
.tile .v{font-size:26px;font-family:'Unbounded',system-ui,sans-serif;font-weight:500;line-height:1}
.tile .l{font-size:12.5px;color:var(--muted)}
.mm{display:grid;grid-template-columns:44px 1fr auto;gap:10px;align-items:center;padding:9px 0;border-top:1px solid var(--line)}
.mm:first-of-type{border-top:0}
.sigcards{display:grid;grid-template-columns:repeat(auto-fit,minmax(215px,1fr));gap:12px}
.sigcard{background:var(--panel2);border:1px solid var(--line);border-radius:12px;padding:12px;display:flex;gap:12px;text-align:left;cursor:pointer}
.sigcard:hover{border-color:var(--s2)}
.sigcard b{display:block;font-size:14px}
.sigcard p{margin:2px 0 6px;color:var(--muted);font-size:12.5px}
.legend{display:flex;flex-direction:column;gap:7px;font-size:13.5px}
.legend .it{display:grid;grid-template-columns:14px 1fr auto;gap:8px;align-items:center}
.legend i{width:10px;height:10px;border-radius:3px;display:inline-block}
.scorechips{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:10px}
.scorechip{border-radius:12px;padding:10px 12px;border:1px solid var(--line);background:var(--panel2)}
.scorechip .v{font-family:'Unbounded',system-ui,sans-serif;font-size:22px}
.scorechip .l{font-size:12px;color:var(--muted)}
.funnel{display:flex;align-items:stretch;gap:0;overflow-x:auto}
.funnel .st{flex:1;min-width:112px;text-align:center;padding:10px 6px;position:relative}
.funnel .st+.st::before{content:"";position:absolute;left:-5px;top:50%;width:10px;height:10px;border-top:2px solid var(--muted);border-right:2px solid var(--muted);transform:translateY(-50%) rotate(45deg)}
.funnel .ring{width:46px;height:46px;border-radius:50%;margin:0 auto 6px;display:grid;place-items:center;font-weight:700;border:2px solid var(--s2);background:var(--panel2)}
.funnel .st.hot .ring{border-color:var(--lime);color:var(--lime)}
.chat{display:flex;flex-direction:column;gap:10px}
.bubble{background:var(--panel2);border:1px solid var(--line);border-radius:12px;padding:10px 12px;font-size:14px}
.bubble.q{align-self:flex-end;background:rgba(34,211,238,.12);border-color:transparent;max-width:88%}
.suggest{display:flex;flex-direction:column;gap:6px}
.suggest button{text-align:left;background:var(--panel2);border:1px solid var(--line);border-radius:10px;padding:8px 10px;cursor:pointer;font-size:13.5px}
.suggest button:hover{border-color:var(--lime)}
.console{background:#050E1B;color:#D7E1EC;border-radius:14px;padding:14px;border:1px solid #14304D}
.stages{display:flex;gap:6px;flex-wrap:wrap;margin-bottom:10px}
.stage{font-size:12.5px;padding:3px 10px;border-radius:999px;border:1px solid #2A4562;color:#8197AE;display:flex;gap:6px;align-items:center}
.stage.done{color:#142100;background:var(--lime);border-color:var(--lime)}
.stage.now{color:#fff;border-color:#B8F500;animation:pulse 1s ease-in-out infinite}
@keyframes pulse{50%{box-shadow:0 0 0 3px rgba(0,245,155,.3)}}
@keyframes radar-sweep{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
.card{background:var(--card);border:1px solid var(--line);border-radius:16px;padding:20px;box-shadow:var(--glow);transition:border-color .25s ease,box-shadow .25s ease;backdrop-filter:blur(16px)}
.card:hover{border-color:rgba(0,229,255,0.22);box-shadow:0 12px 32px rgba(0,0,0,0.4)}
.log{font-size:13px;max-height:150px;overflow:auto;display:flex;flex-direction:column;gap:3px;color:#BFCDDC}
.log b{color:#B8F500;font-weight:500}
.drawer-bg{position:fixed;inset:0;background:rgba(2,8,16,.6);z-index:40;display:flex;justify-content:flex-end}
.drawer{width:min(560px,100%);height:100%;background:var(--paper);overflow:auto;padding:20px;border-left:1px solid var(--line)}
.kpis{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:12px}
.kpi{background:var(--card);border:1px solid var(--line);border-radius:14px;padding:12px 14px}
.kpi .v{font-size:24px;font-family:'Unbounded',system-ui,sans-serif;font-weight:500}
.kpi .l{font-size:12.5px;color:var(--muted)}
.tabs{display:flex;gap:4px;border-bottom:1px solid var(--line);margin-bottom:14px}
.tab{border:0;background:none;padding:9px 14px;cursor:pointer;color:var(--muted);border-bottom:2px solid transparent;font-weight:500}
.tab[aria-selected=true]{color:var(--text);border-bottom-color:var(--s1)}
.seg{display:flex;gap:4px}
.seg input{position:absolute;opacity:0;width:0;height:0}
.seg label{width:34px;height:32px;display:grid;place-items:center;border:1px solid var(--line);border-radius:7px;cursor:pointer;background:var(--panel2);font-variant-numeric:tabular-nums}
.seg input:checked+label{background:var(--lime);border-color:var(--lime);color:var(--limeInk);font-weight:700}
.seg input:focus-visible+label{outline:2px solid var(--s2);outline-offset:2px}
.rub{display:grid;grid-template-columns:minmax(150px,1fr) auto;gap:6px 14px;align-items:center;padding:10px 0;border-bottom:1px solid var(--line)}
.rub .hint{grid-column:1/-1;font-size:12.5px;color:var(--muted)}
.layout-a{display:grid;grid-template-columns:260px minmax(0,1fr);gap:16px;align-items:start}
.listbtn{display:flex;gap:10px;align-items:center;width:100%;text-align:left;padding:9px 10px;border:1px solid transparent;border-radius:10px;background:transparent;cursor:pointer}
.listbtn:hover{background:var(--panel2)}
.listbtn[aria-current=true]{background:var(--panel2);border-color:var(--line);box-shadow:inset 3px 0 0 var(--lime)}
.sig{padding:8px 10px;border-radius:8px;font-size:13.5px;background:var(--muteBg)}
.sig.high{background:var(--riskBg)}.sig.medium{background:var(--warnBg)}.sig.info{background:var(--infoBg)}
.bar2{display:grid;grid-template-columns:150px 1fr 48px;gap:8px;align-items:center;font-size:13px}
.bar2 .track{position:relative;height:8px;background:var(--muteBg);border-radius:99px}
.bar2 .fill{position:absolute;top:0;bottom:0;border-radius:99px}
.toast{position:fixed;bottom:18px;left:50%;transform:translateX(-50%);background:#0B1B2E;color:#fff;padding:10px 16px;border-radius:10px;z-index:60;font-size:14px;border:1px solid #2A4562}
.dlist{margin:0;padding-left:18px}
.foot{margin-top:30px;padding:18px 0 0;border-top:1px solid var(--line);display:flex;gap:12px;align-items:center;flex-wrap:wrap;color:var(--muted);font-size:13px}
.foot .tagline{color:var(--lime);margin:0 auto;text-align:center}
details>summary{cursor:pointer;font-weight:500}
.audio-player-bar{position:fixed;bottom:0;left:0;right:0;background:#050E1B;border-top:2px solid var(--lime);z-index:50;padding:8px 24px;box-shadow:0 -4px 25px rgba(0,0,0,.6)}
.player-inner{display:flex;align-items:center;gap:14px;max-width:1200px;margin:0 auto;position:relative}
.player-art{width:42px;height:42px;border-radius:6px;object-fit:cover;border:1px solid var(--line);flex:none}
.player-art-ph{width:42px;height:42px;border-radius:6px;background:var(--panel2);display:grid;place-items:center;color:var(--lime);flex:none}
.player-info{flex:1;min-width:0}
.player-title{font-size:13.5px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.player-sub{display:flex;align-items:center;gap:8px;margin-top:2px}
.player-error{color:var(--risk);font-size:11px}
.player-btn{min-width:88px}
.player-progress-bar{position:absolute;top:-8px;left:0;right:0;height:4px;background:rgba(255,255,255,.15);cursor:pointer}
.player-progress-fill{height:100%;background:var(--lime);transition:width .1s linear}
.player-close{color:var(--muted)}
.livebadge{display:inline-flex;align-items:center;gap:4px;font-size:11px;font-weight:600;padding:1px 6px;border-radius:4px;background:#1E3A1A;color:#4ADE80;border:1px solid #2B7F54}
@media (max-width:1180px){.g2{grid-template-columns:1fr}.kpis{grid-template-columns:repeat(2,minmax(0,1fr))}.g4{grid-template-columns:repeat(2,minmax(0,1fr))}.g3{grid-template-columns:1fr}.tiles{grid-template-columns:repeat(3,minmax(0,1fr))}.scorechips{grid-template-columns:repeat(3,minmax(0,1fr))}}
@media (max-width:900px){
 .br-shell{grid-template-columns:1fr}
 .br-rail{position:sticky;z-index:30;height:auto;flex-direction:row;align-items:center;padding:8px 10px;overflow-x:auto;border-right:0;border-bottom:1px solid #10263F}
 .br-brand,.br-railnote{display:none}.br-nav{flex-direction:row}
 .br-navbtn{padding:8px 12px;white-space:nowrap}
 .br-main{padding:0 14px 40px}.layout-a,.g2e{grid-template-columns:1fr}.hero .tag{display:none}.tiles{grid-template-columns:repeat(2,minmax(0,1fr))}
}
@media (prefers-reduced-motion:reduce){.stage.now{animation:none}.br *{transition:none!important}}
`;
