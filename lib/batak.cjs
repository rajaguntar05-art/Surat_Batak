// ===== Mesin alih aksara Batak Toba =====
const BT = (() => {
  const VOW = new Set(['a','i','u','e','o']);
  // konsonan Latin -> [kode Toba dasar, kode Toba + u, Unicode]
  const CONS = {
    ng:['<','>','\u1BDD'], ny:['[',']','\u1BE0'], h:['h','H','\u1BC2'], k:['h','H','\u1BC2'],
    b:['b','B','\u1BC5'], p:['p','P','\u1BC7'], n:['n','N','\u1BC9'], w:['w','W','\u1BCB'],
    g:['g','G','\u1BCE'], j:['j','J','\u1BD0'], d:['d','D','\u1BD1'], r:['r','R','\u1BD2'],
    m:['m','M','\u1BD4'], t:['t','T','\u1BD6'], s:['s','S','\u1BD8'], y:['y','Y','\u1BDB'],
    l:['l','L','\u1BDE'], c:['c','C','\u1BE1'], f:['p','P','\u1BC7'], v:['p','P','\u1BC7'],
    z:['j','J','\u1BD0'], q:['h','H','\u1BC2']
  };
  const U = { A:'\u1BC0', I:'\u1BE4', UU:'\u1BE5', sE:'\u1BE9', sI:'\u1BEA', sO:'\u1BEC', sU:'\u1BEE',
              NG:'\u1BF0', H:'\u1BF1', P:'\u1BF2' };
  const VSIGN_T = {a:'',i:'i',e:'e',o:'o'};
  const VSIGN_U = {a:'',i:U.sI,e:U.sE,o:U.sO,u:U.sU};
  const INIT_T = {a:'a',i:'I',u:'U',e:'ae',o:'ao'};
  const INIT_U = {a:U.A,i:U.I,u:U.UU,e:U.A+U.sE,o:U.A+U.sO};

  function tokens(w){
    w = w.toLowerCase().replace(/x/g,'ks');
    const out=[]; let i=0;
    while(i<w.length){
      const two=w.slice(i,i+2);
      if(two==='ng'||two==='ny'){out.push(two);i+=2;} else {out.push(w[i]);i++;}
    }
    return out;
  }
  function syllables(w){
    const t=tokens(w), syl=[]; let i=0;
    while(i<t.length){
      let onset=null;
      if(!VOW.has(t[i])){onset=t[i];i++;}
      if(i>=t.length||!VOW.has(t[i])){syl.push({onset,v:null,coda:null});continue;}
      const v=t[i]; i++;
      let coda=null;
      if(i<t.length && !VOW.has(t[i]) && (i+1>=t.length || !VOW.has(t[i+1]))){coda=t[i];i++;}
      syl.push({onset,v,coda});
    }
    return syl;
  }
  const latinSyl = s => (s.onset||'')+(s.v||'')+(s.coda||'');

  // satu suku kata -> {toba, uni, note}
  function sylOut(s){
    const C = x => CONS[x] || [x,x,x];
    if(s.v===null) return {toba:C(s.onset)[0]+'\\', uni:C(s.onset)[2]+U.P, note:'Konsonan tanpa vokal: huruf induk + pangolat'};
    const openT = () => s.onset ? (s.v==='u'?C(s.onset)[1]:C(s.onset)[0]+VSIGN_T[s.v]) : INIT_T[s.v];
    const openU = () => s.onset ? C(s.onset)[2]+VSIGN_U[s.v] : INIT_U[s.v];
    if(!s.coda){
      return {toba:openT(), uni:openU(), note: s.onset ? (s.v==='a'?'Huruf induk (bunyi a melekat)':'Huruf induk + tanda vokal '+s.v) :
        (s.v==='i'||s.v==='u' ? 'Vokal '+s.v+' berdiri sendiri: huruf induk '+s.v : (s.v==='a'?'Huruf a':'Huruf a + tanda vokal '+s.v))};
    }
    if(s.coda==='ng') return {toba:openT()+'^', uni:openU()+U.NG, note:'ng penutup: paninggil'};
    if(s.coda==='h') return {toba:openT()+'x', uni:openU()+U.H, note:'h penutup: hajoringan'};
    // suku kata tertutup: tanda vokal pindah ke konsonan penutup (kode Toba)
    const first = s.onset ? C(s.onset)[0] : 'a';
    const cc = C(s.coda);
    const toba = first + (s.v==='u' ? cc[1] : cc[0]+VSIGN_T[s.v]) + '\\';
    const uni = (s.onset ? C(s.onset)[2] : U.A) + VSIGN_U[s.v] + cc[2] + U.P;
    const note = 'Suku kata tertutup: konsonan '+s.coda+' + pangolat' + (s.v!=='a' ? '; tanda vokal '+s.v+' ditulis pada konsonan penutup' : '');
    return {toba, uni, note};
  }
  function wordParts(w){ return syllables(w).map(s=>({latin:latinSyl(s), ...sylOut(s)})); }
  function latinToBatak(text){
    text = text.replace(/-/g,' ');
    let toba='', uni='';
    const re=/[A-Za-z]+|[^A-Za-z]+/g; let m;
    while((m=re.exec(text))){
      const piece=m[0];
      if(/^[A-Za-z]+$/.test(piece)){ const ps=wordParts(piece); toba+=ps.map(p=>p.toba).join(''); uni+=ps.map(p=>p.uni).join(''); }
      else { toba+=piece; uni+=piece; }
    }
    return {toba, uni};
  }

  // ===== Batak -> Latin (kode font Toba atau Unicode) =====
  const BASE_T = {a:'a',h:'h',k:'h',b:'b',p:'p',n:'n',w:'w',g:'g',j:'j',d:'d',r:'r',m:'m',t:'t',f:'t',s:'s',y:'y',l:'l','<':'ng','[':'ny',c:'c'};
  const BASEU_T = {A:'a',H:'h',K:'h',B:'b',P:'p',N:'n',W:'w',G:'g',J:'j',D:'d',R:'r',M:'m',T:'t',F:'t',S:'s',Y:'y',L:'l','>':'ng',']':'ny',C:'c'};
  const UNI_BASE = {'\u1BC0':'a','\u1BC1':'a','\u1BC2':'h','\u1BC3':'h','\u1BC4':'h','\u1BC5':'b','\u1BC6':'b','\u1BC7':'p','\u1BC8':'p',
    '\u1BC9':'n','\u1BCA':'n','\u1BCB':'w','\u1BCC':'w','\u1BCD':'w','\u1BCE':'g','\u1BCF':'g','\u1BD0':'j','\u1BD1':'d','\u1BD2':'r','\u1BD3':'r',
    '\u1BD4':'m','\u1BD5':'m','\u1BD6':'t','\u1BD7':'t','\u1BD8':'s','\u1BD9':'s','\u1BDA':'s','\u1BDB':'y','\u1BDC':'y','\u1BDD':'ng',
    '\u1BDE':'l','\u1BDF':'l','\u1BE0':'ny','\u1BE1':'c','\u1BE2':'nd','\u1BE3':'mb'};
  const UNI_SIGN = {'\u1BE7':'e','\u1BE8':'e','\u1BE9':'e','\u1BEA':'i','\u1BEB':'i','\u1BEC':'o','\u1BED':'o','\u1BEE':'u','\u1BEF':'u'};

  function isUnicodeBatak(s){ return /[\u1BC0-\u1BFF]/.test(s); }

  // pecah jadi klaster: {c: konsonan|'' (vokal), v: vokal|null(default a), ng, h, kill, raw}
  function clustersToba(word){
    const cl=[]; let cur=null;
    const push=()=>{ if(cur) cl.push(cur); cur=null; };
    for(const ch of word){
      if(ch==='I'||ch==='U'){ push(); cur={c:'',v:ch==='I'?'i':'u',letter:true}; }
      else if(BASE_T[ch]!==undefined){ push(); cur = ch==='a' ? {c:'',v:null,letter:true} : {c:BASE_T[ch],v:null}; }
      else if(BASEU_T[ch]!==undefined){ push(); cur = ch==='A' ? {c:'',v:'u',letter:true} : {c:BASEU_T[ch],v:'u'}; }
      else if(cur && (ch==='i'||ch==='e'||ch==='o')) cur.v = ch;
      else if(cur && ch==='^') cur.ng=true;
      else if(cur && ch==='x') cur.h=true;
      else if(cur && ch==='\\') cur.kill=true;
      else { push(); cl.push({other:ch}); }
    }
    push(); return cl;
  }
  function clustersUni(word){
    const cl=[]; let cur=null;
    const push=()=>{ if(cur) cl.push(cur); cur=null; };
    for(const ch of word){
      if(ch==='\u1BE4'||ch==='\u1BE5'){ push(); cur={c:'',v:ch==='\u1BE4'?'i':'u',letter:true}; }
      else if(UNI_BASE[ch]!==undefined){ push(); cur = UNI_BASE[ch]==='a' ? {c:'',v:null,letter:true} : {c:UNI_BASE[ch],v:null}; }
      else if(cur && UNI_SIGN[ch]) cur.v=UNI_SIGN[ch];
      else if(cur && ch==='\u1BF0') cur.ng=true;
      else if(cur && ch==='\u1BF1') cur.h=true;
      else if(cur && (ch==='\u1BF2'||ch==='\u1BF3')) cur.kill=true;
      else if(ch==='\u200D'||ch==='\u200C') {}
      else { push(); cl.push({other:ch}); }
    }
    push(); return cl;
  }
  function clustersToLatin(cl){
    // kembalikan tanda vokal yang "pindah" ke konsonan penutup
    for(let i=1;i<cl.length;i++){
      const c=cl[i], p=cl[i-1];
      if(c.kill && c.v && !p.other && !p.kill && !p.ng && !p.h && (p.v===null)){
        p.v=c.v; c.v=null;
      }
    }
    let out='';
    for(const c of cl){
      if(c.other!==undefined){ out+=c.other; continue; }
      let s='';
      if(c.kill){ s = c.c==='h' ? 'k' : c.c; if(c.letter) s=(c.v||'a'); }
      else s = c.c + (c.v||'a');
      if(c.ng) s+='ng';
      if(c.h) s+='h';
      out+=s;
    }
    return out;
  }
  function batakToLatin(text, mode){
    const uni = mode ? mode==='unicode' : isUnicodeBatak(text);
    if(uni) return clustersToLatin(clustersUni(text));
    // kode Toba: proses per "kata" (rangkaian karakter non-spasi)
    return text.split(/(\s+)/).map(part=>/^\s+$/.test(part)?part:clustersToLatin(clustersToba(part))).join('');
  }
  function looksLikeTobaCode(t){
    const n=(t.match(/[\\^]/g)||[]).length, w=(t.match(/\S+/g)||[]).length||1;
    return n/w > 0.25;
  }
  return {latinToBatak, wordParts, batakToLatin, isUnicodeBatak, looksLikeTobaCode, syllables};
})();
if(typeof module!=='undefined') module.exports=BT;
