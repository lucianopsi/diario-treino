/* Diário de Treino 2.0 — PWA. Dados no aparelho (localStorage) e, com login, sincronizados no Firestore.
   A chave original "diario-treino-v1" é mantida (só ganha campos novos) e uma cópia dela é guardada
   antes da primeira gravação desta versão, para permitir voltar atrás. */
(function () {
  'use strict';

  var VERSAO_APP = '2.3.1';
  var CHAVE = 'diario-treino-v1';
  var CHAVE_COPIA = 'diario-treino-v1-copia-antes-2.0';
  var CHAVE_VINCULO = 'diario-treino-vinculo';
  var CHAVE_DISP = 'diario-treino-dispositivo';
  var LETRAS = 'ABCDEFG';

  var GRUPOS = [
    { g: 'Peito', ex: ['Supino reto (barra)', 'Supino reto (halteres)', 'Supino reto (máquina)', 'Supino inclinado (barra)', 'Supino inclinado (halteres)', 'Supino inclinado (máquina)', 'Supino declinado (barra)', 'Supino declinado (halteres)', 'Crucifixo reto (halteres)', 'Crucifixo inclinado (halteres)', 'Crucifixo (máquina)', 'Crossover (polia alta)', 'Crossover (polia baixa)', 'Flexão de braço', 'Mergulho nas paralelas (peito)', 'Pullover (halter)'] },
    { g: 'Costas', ex: ['Puxada frontal (pegada aberta)', 'Puxada frontal (triângulo)', 'Puxada supinada', 'Barra fixa', 'Barra fixa assistida (graviton)', 'Remada curvada (barra)', 'Remada curvada supinada', 'Remada unilateral (serrote)', 'Remada baixa (triângulo)', 'Remada cavalinho (T-bar)', 'Remada articulada (máquina)', 'Pulldown (corda)', 'Pulldown (barra reta)', 'Levantamento terra'] },
    { g: 'Ombros', ex: ['Desenvolvimento (halteres)', 'Desenvolvimento (barra)', 'Desenvolvimento (máquina)', 'Desenvolvimento Arnold', 'Elevação lateral (halteres)', 'Elevação lateral (polia)', 'Elevação lateral (máquina)', 'Elevação frontal (halteres)', 'Elevação frontal (anilha)', 'Crucifixo inverso (halteres)', 'Crucifixo inverso (máquina)', 'Face pull (corda)', 'Remada alta (barra)'] },
    { g: 'Trapézio', ex: ['Encolhimento (barra)', 'Encolhimento (halteres)', 'Encolhimento (máquina)'] },
    { g: 'Bíceps', ex: ['Rosca direta (barra)', 'Rosca direta (barra W)', 'Rosca alternada (halteres)', 'Rosca martelo', 'Rosca concentrada', 'Rosca Scott (barra)', 'Rosca Scott (máquina)', 'Rosca na polia (barra)', 'Rosca inclinada (halteres)', 'Rosca 21'] },
    { g: 'Tríceps', ex: ['Tríceps corda (polia)', 'Tríceps barra (polia)', 'Tríceps unilateral (polia)', 'Tríceps testa (barra W)', 'Tríceps francês (halter)', 'Tríceps coice (halter)', 'Tríceps banco', 'Mergulho nas paralelas (tríceps)', 'Supino fechado'] },
    { g: 'Antebraço', ex: ['Rosca de punho', 'Rosca de punho inversa', 'Rosca inversa (barra)'] },
    { g: 'Quadríceps', ex: ['Agachamento livre', 'Agachamento frontal', 'Agachamento no Smith', 'Agachamento hack (máquina)', 'Agachamento búlgaro', 'Agachamento sumô (halter)', 'Leg press 45°', 'Leg press horizontal', 'Cadeira extensora', 'Afundo (halteres)', 'Passada (avanço)', 'Subida no banco (step up)'] },
    { g: 'Posterior de coxa', ex: ['Mesa flexora', 'Cadeira flexora', 'Flexora em pé (unilateral)', 'Stiff (barra)', 'Stiff (halteres)', 'Levantamento terra romeno', 'Bom dia (barra)'] },
    { g: 'Glúteos e adutores', ex: ['Elevação pélvica (barra)', 'Elevação pélvica (máquina)', 'Ponte de glúteo', 'Glúteo na polia (coice)', 'Glúteo 4 apoios (máquina)', 'Cadeira abdutora', 'Cadeira adutora', 'Abdução na polia'] },
    { g: 'Panturrilha', ex: ['Panturrilha em pé (máquina)', 'Panturrilha sentada', 'Panturrilha no leg press', 'Panturrilha no Smith', 'Panturrilha unilateral (halter)'] },
    { g: 'Abdômen e lombar', ex: ['Abdominal supra (solo)', 'Abdominal na máquina', 'Abdominal na polia (ajoelhado)', 'Abdominal infra (elevação de pernas)', 'Elevação de pernas na barra', 'Abdominal oblíquo', 'Abdominal remador', 'Prancha', 'Prancha lateral', 'Roda abdominal', 'Russian twist', 'Hiperextensão lombar'] }
  ];
  var GRUPO_DE = {};
  GRUPOS.forEach(function (gr) { gr.ex.forEach(function (n) { GRUPO_DE[n] = gr.g; }); });
  var REGRAS_GRUPO = [
    [/panturrilha/, 'Panturrilha'], [/encolhimento/, 'Trapézio'], [/punho/, 'Antebraço'],
    [/abdominal|prancha|lombar|russian|roda abd|obl[ií]quo/, 'Abdômen e lombar'],
    [/p[eé]lvica|gl[uú]teo|abdutora|adutora|abdu[cç][aã]o/, 'Glúteos e adutores'],
    [/flexora|stiff|romeno|bom dia/, 'Posterior de coxa'],
    [/agachamento|leg press|extensora|afundo|passada|b[uú]lgaro|step up|hack/, 'Quadríceps'],
    [/tr[ií]ceps|testa|franc[eê]s|coice|supino fechado/, 'Tríceps'],
    [/rosca/, 'Bíceps'],
    [/desenvolvimento|eleva[cç][aã]o lateral|eleva[cç][aã]o frontal|face pull|crucifixo inverso|remada alta/, 'Ombros'],
    [/supino|crucifixo|crossover|peck|flex[aã]o de bra[cç]o|pullover|peito/, 'Peito'],
    [/puxada|remada|pulldown|barra fixa|terra|graviton/, 'Costas']
  ];
  function grupoDe(nome) {
    if (GRUPO_DE[nome]) return GRUPO_DE[nome];
    var n = String(nome || '').toLowerCase();
    for (var i = 0; i < REGRAS_GRUPO.length; i++) if (REGRAS_GRUPO[i][0].test(n)) return REGRAS_GRUPO[i][1];
    return 'Outros';
  }
  var MEDALHAS = [{ n: 3, nome: 'Largada' }, { n: 5, nome: 'Ritmo' }, { n: 7, nome: 'Semana cheia' }, { n: 12, nome: 'Imparável' }, { n: 20, nome: 'Lenda do mês' }];
  /* composição corporal do Galaxy Watch, na ordem da tela do Samsung Health */
  var MEDIDAS = [
    { k: 'peso', nome: 'Peso', un: ' kg', casas: 1 },
    { k: 'musculoEsq', nome: 'Massa muscular esquelética', un: ' kg', casas: 1 },
    { k: 'gordura', nome: 'Gordura corporal', un: '%', casas: 1, pp: true },
    { k: 'gorduraKg', nome: 'Massa de gordura', un: ' kg', casas: 1 },
    { k: 'massaMagra', nome: 'Massa livre de gordura', un: ' kg', casas: 1 },
    { k: 'aguaKg', nome: 'Água corporal', un: ' L', casas: 1 },
    { k: 'imc', nome: 'IMC', un: '', casas: 1 },
    { k: 'tmb', nome: 'Metabolismo basal', un: ' kcal', casas: 0 }
  ];

  var $view = document.getElementById('view');
  var $nav = document.getElementById('nav');
  var $overlay = document.getElementById('overlay');
  var $shell = document.querySelector('.shell');
  var $import = document.getElementById('importFile');
  var $saudeFile = document.getElementById('saudeFile');
  var $sync = document.getElementById('sync');

  var D = null;
  var armazenamentoOk = false;
  var persistenciaPedida = false;
  var DISP = null;
  var ui = {
    tela: 'inicio', editor: false, editId: null, editTreinoId: null, picker: false, grupo: 'Peito', busca: '', flash: '',
    toast: '', confirm: null, abertoHist: {}, filtroLetra: '', filtroEx: '', evoEx: '', evoModo: 'carga',
    corpoPeriodo: 0, abertoPeso: null, relMes: null
  };
  var sync = {
    disponivel: false, usuario: null, vinculado: false, negado: false, pendentes: 0, erro: null, parar: null,
    timer: null, contagemNuvem: null, liveRemoto: null, ultimoLiveId: null, conflito: null,
    ultimo: { config: null, prefs: null, live: null, s: {}, w: {}, h: {} }
  };
  var toastT = null, flashT = null, wakeLock = null, eventoInstalar = null, focoAntesDialogo = null, renderPendente = false;

  /* ---------- utilidades ---------- */
  function uid(p) { return p + Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function kg(n, casas) { return Number(n || 0).toLocaleString('pt-BR', { maximumFractionDigits: casas == null ? 2 : casas }); }
  function pad(n) { return String(n).padStart(2, '0'); }
  function diaKey(d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
  function addDias(d, n) { return new Date(d.getFullYear(), d.getMonth(), d.getDate() + n); }
  function deKey(k) { var p = k.split('-'); return new Date(+p[0], +p[1] - 1, +p[2]); }
  function ddmm(k) { var p = k.split('-'); return p[2] + '/' + p[1]; }
  function plural(n, um, varios) { return n + ' ' + (n === 1 ? um : varios); }
  function num(v) { var x = parseFloat(String(v).replace(',', '.')); return isFinite(x) ? x : 0; }
  function numOuNada(v) { if (v === '' || v == null) return null; var x = parseFloat(String(v).replace(',', '.')); return isFinite(x) ? x : null; }
  function virgula(n) { return String(n).replace('.', ','); }
  function clone(o) { return JSON.parse(JSON.stringify(o)); }
  function semAcento(s) { return String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, ''); }
  function agoraLocalISO() { var d = new Date(); return diaKey(d) + 'T' + pad(d.getHours()) + ':' + pad(d.getMinutes()); }

  function icon(nome, tam) {
    var s = tam || 20;
    var p = {
      check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
      play: '<path d="M7 4.5v15l12-7.5z" fill="currentColor" stroke="none"/>',
      plus: '<path d="M12 5v14M5 12h14"/>',
      trash: '<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>',
      chev: '<path d="M9 6l6 6-6 6"/>',
      chevDown: '<path d="M6 9l6 6 6-6"/>',
      back: '<path d="M15 6l-6 6 6 6"/>',
      up: '<path d="M12 19V5M6 11l6-6 6 6"/>',
      down: '<path d="M12 5v14M6 13l6 6 6-6"/>',
      equal: '<path d="M6 9.5h12M6 14.5h12"/>',
      search: '<circle cx="11" cy="11" r="6.5"/><path d="M16 16l4 4"/>',
      circle: '<circle cx="12" cy="12" r="8"/>',
      half: '<circle cx="12" cy="12" r="8"/><path d="M12 4a8 8 0 0 1 0 16z" fill="currentColor" stroke="none"/>',
      done: '<circle cx="12" cy="12" r="9" fill="currentColor" stroke="none"/><path d="M8 12.5l2.8 2.8L16.5 9.5" style="stroke:var(--ink)"/>',
      home: '<path d="M4 11l8-7 8 7v9h-5v-6H9v6H4z"/>',
      dumbbell: '<path d="M6 7v10M3 9.5v5M18 7v10M21 9.5v5M6 12h12"/>',
      chart: '<path d="M4 19h16M7 16v-5M12 16V7M17 16v-8"/>',
      cal: '<rect x="4" y="5" width="16" height="15" rx="2"/><path d="M4 10h16M9 3v4M15 3v4"/>',
      body: '<rect x="4" y="4" width="16" height="16" rx="4"/><path d="M8.5 10a4.5 4.5 0 0 1 7 0M12 10l1.5-2"/>',
      gear: '<circle cx="12" cy="12" r="3"/><path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M5.6 18.4l2.1-2.1M16.3 7.7l2.1-2.1"/>',
      swap: '<path d="M7 7h12l-3-3M17 17H5l3 3"/>',
      medal: '<circle cx="12" cy="14" r="5"/><path d="M9 9L7 3h4l1 3 1-3h4l-2 6"/>',
      cloud: '<path d="M7 18h10a4 4 0 0 0 .5-8 6 6 0 0 0-11.4 1.6A3.3 3.3 0 0 0 7 18z"/>',
      bt: '<path d="M7 7l10 10-5 4V3l5 4L7 17"/>',
      download: '<path d="M12 4v11M7 10l5 5 5-5M5 20h14"/>',
      upload: '<path d="M12 20V9M7 14l5-5 5 5M5 4h14"/>',
      share: '<circle cx="18" cy="5" r="2.5"/><circle cx="6" cy="12" r="2.5"/><circle cx="18" cy="19" r="2.5"/><path d="M8.2 10.8l7.6-4.4M8.2 13.2l7.6 4.4"/>',
      edit: '<path d="M4 20h4L19 9l-4-4L4 16z"/>'
    }[nome];
    return '<svg width="' + s + '" height="' + s + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + p + '</svg>';
  }

  /* ---------- dados locais ---------- */
  function exemplo() {
    function e(nome, series, reps) { return { id: uid('e'), nome: nome, series: series, reps: reps, carga: 0 }; }
    function t(letra, nome, exs) { return { id: uid('t'), letra: letra, nome: nome, exs: exs }; }
    var abc = { id: uid('p'), nome: 'ABC', treinos: [
      t('A', 'Peito', [e('Supino reto (barra)', 4, 10), e('Supino inclinado (halteres)', 3, 12), e('Crucifixo (máquina)', 3, 12), e('Crossover', 3, 15)]),
      t('B', 'Costas', [e('Puxada frontal', 4, 10), e('Remada curvada', 4, 10), e('Remada baixa', 3, 12), e('Pulldown (corda)', 3, 15)]),
      t('C', 'Pernas', [e('Agachamento livre', 4, 10), e('Leg press 45°', 4, 12), e('Cadeira extensora', 3, 12), e('Mesa flexora', 3, 12), e('Panturrilha em pé', 4, 15)])
    ] };
    return normalizar({ v: 1, programas: [abc], ativoId: abc.id, historico: [], regra: 'descanso', tema: 'auto', sessao: null, ultimoBackup: null, pesagens: [], saude: [], perfil: {}, gavetas: {} });
  }

  function valido(d) {
    return d && Array.isArray(d.programas) && d.programas.length > 0 && Array.isArray(d.historico) &&
      d.programas.every(function (p) { return p && p.id && Array.isArray(p.treinos) && p.treinos.length > 0; });
  }

  function normalizar(d) {
    d.v = 1;
    d.regra = d.regra === 'estrita' ? 'estrita' : 'descanso';
    d.tema = ['claro', 'escuro', 'auto'].indexOf(d.tema) >= 0 ? d.tema : 'escuro';
    if (!Array.isArray(d.pesagens)) d.pesagens = [];
    if (!Array.isArray(d.saude)) d.saude = []; // resumo diário do relógio (Samsung Health), um item por dia
    if (!d.perfil || typeof d.perfil !== 'object') d.perfil = {};
    if (!d.gavetas || typeof d.gavetas !== 'object') d.gavetas = {};
    if (!d.programas.some(function (p) { return p.id === d.ativoId; })) d.ativoId = d.programas[0].id;
    d.programas.forEach(function (p) { if (p.proximoId && !p.treinos.some(function (t) { return t.id === p.proximoId; })) p.proximoId = null; });
    if (d.sessao && !acharTreinoEm(d.programas, d.sessao.treinoId)) d.sessao = null;
    if (d.sessao) normalizarSessao(d.sessao, acharTreinoEm(d.programas, d.sessao.treinoId));
    return d;
  }
  function normalizarSessao(s, t) {
    if (!s.id) s.id = uid('h');
    if (!Array.isArray(s.exs) || !s.exs.length && t.exs.length) s.exs = clone(t.exs); // sessões antigas: copia do treino
    t = { exs: s.exs };
    if (!Array.isArray(s.sets)) s.sets = [];
    s.sets = s.sets.map(function (x) { return Array.isArray(x) ? x : (x && Array.isArray(x.s) ? x.s : []); }); // formato da nuvem → local
    while (s.sets.length < t.exs.length) s.sets.push([]);
    if (!Array.isArray(s.feitos)) s.feitos = s.sets.map(function () { return false; });
    while (s.feitos.length < t.exs.length) s.feitos.push(false);
    if (!Array.isArray(s.ordem) || s.ordem.length !== t.exs.length) s.ordem = t.exs.map(function (x, i) { return i; });
    if (s.atual === undefined) s.atual = null;
  }

  function carregar() {
    try {
      localStorage.setItem('__teste', '1');
      localStorage.removeItem('__teste');
      armazenamentoOk = true;
      DISP = localStorage.getItem(CHAVE_DISP);
      if (!DISP) { DISP = uid('d'); localStorage.setItem(CHAVE_DISP, DISP); }
      var raw = localStorage.getItem(CHAVE);
      if (raw) {
        if (!localStorage.getItem(CHAVE_COPIA)) localStorage.setItem(CHAVE_COPIA, raw); // cópia intacta da versão anterior
        var d = JSON.parse(raw);
        if (valido(d)) return normalizar(d);
      }
    } catch (err) {
      armazenamentoOk = false;
    }
    if (!DISP) DISP = uid('d');
    return exemplo();
  }

  function gravarLocal() {
    if (!armazenamentoOk) return;
    try { localStorage.setItem(CHAVE, JSON.stringify(D)); }
    catch (err) { armazenamentoOk = false; mostrarToast('Não foi possível salvar neste aparelho. Exporte um backup.'); }
  }

  function salvar() {
    gravarLocal();
    if (!persistenciaPedida && navigator.storage && navigator.storage.persist) {
      persistenciaPedida = true;
      navigator.storage.persist().catch(function () {});
    }
    agendarEnvio();
  }

  function vivos() { return D.historico.filter(function (h) { return !h.apagado; }).sort(function (a, b) { return a.dia < b.dia ? -1 : a.dia > b.dia ? 1 : 0; }); }
  function pesagensVivas() { return D.pesagens.filter(function (p) { return !p.apagado; }).sort(function (a, b) { return a.data < b.data ? -1 : 1; }); }
  function acharTreinoEm(progs, id) {
    for (var i = 0; i < progs.length; i++) for (var j = 0; j < progs[i].treinos.length; j++) if (progs[i].treinos[j].id === id) return progs[i].treinos[j];
    return null;
  }
  function acharTreino(id) { return acharTreinoEm(D.programas, id); }
  function ativo() { return D.programas.find(function (p) { return p.id === D.ativoId; }) || D.programas[0]; }
  function progEd() { return D.programas.find(function (p) { return p.id === ui.editId; }) || ativo(); }
  function treinoEd() { var p = progEd(); return p.treinos.find(function (t) { return t.id === ui.editTreinoId; }) || p.treinos[0]; }
  function marcarEdicao() { D.editado = true; }

  /* ---------- regras do treino ---------- */
  function proximoRodizio(p) {
    var h = vivos();
    for (var i = h.length - 1; i >= 0; i--) {
      var ix = p.treinos.findIndex(function (t) { return t.id === h[i].treinoId; });
      if (ix >= 0) return p.treinos[(ix + 1) % p.treinos.length];
    }
    return p.treinos[0];
  }
  function proximoTreino(p) {
    var manual = p.proximoId && p.treinos.find(function (t) { return t.id === p.proximoId; });
    return manual || proximoRodizio(p);
  }

  function registrosDe(nome) {
    var regs = [];
    vivos().forEach(function (h) {
      var e = h.exs.find(function (x) { return x.nome === nome; });
      if (e && e.sets.length) {
        var top = e.sets.reduce(function (a, x) { return x.carga > a.carga ? x : a; }, e.sets[0]);
        regs.push({ dia: h.dia, sets: e.sets, top: top.carga, topSet: top, volume: e.sets.reduce(function (a, x) { return a + x.carga * x.reps; }, 0) });
      }
    });
    return regs;
  }
  function refEx(nome) {
    var regs = registrosDe(nome);
    if (!regs.length) return null;
    var ult = regs[regs.length - 1], ant = regs.length > 1 ? regs[regs.length - 2] : null;
    var recorde = regs.reduce(function (a, r) { return r.top > a.top ? r : a; }, regs[0]);
    return { ult: ult, ant: ant, recorde: recorde.top, recordeDia: recorde.dia, topSet: ult.topSet, tendencia: ant ? ult.top - ant.top : null, n: regs.length };
  }
  function seta(dif) {
    if (dif > 0) return '<span class="trend up">' + icon('up', 14) + '+' + kg(dif) + ' kg</span>';
    if (dif < 0) return '<span class="trend down">' + icon('down', 14) + '−' + kg(-dif) + ' kg</span>';
    return '<span class="trend eq">' + icon('equal', 14) + 'mesma carga</span>';
  }
  function placeholderCarga(ex, j, ref) {
    if (ref) { var s = ref.ult.sets[j] || ref.topSet; return virgula(s.carga); }
    return ex.carga ? virgula(ex.carga) : '';
  }

  /* Sequência do mês. Regra "descanso": até 2 dias sem treino seguidos não quebram; o 3º quebra. */
  function sequencia(regra) {
    var hoje = new Date();
    var Y = hoje.getFullYear(), M = hoje.getMonth(), Dd = hoje.getDate();
    var feitos = {};
    vivos().forEach(function (h) { feitos[h.dia] = true; });
    function T(d) { return !!feitos[diaKey(new Date(Y, M, d))]; }
    var estrita = regra === 'estrita';
    var run = 0, gap = 0, melhor = 0, ate = [0], dias = 0, inicioRun = 0, inicios = [0];
    for (var d = 1; d <= Dd; d++) {
      if (T(d)) { if (run === 0) inicioRun = d; run++; gap = 0; dias++; } else { gap++; if (estrita || gap >= 3) run = 0; }
      if (run > melhor) melhor = run;
      ate[d] = run; inicios[d] = inicioRun;
    }
    var hojeFeito = T(Dd);
    var refDia = estrita && !hojeFeito ? Dd - 1 : Dd;
    var atual = refDia >= 1 ? ate[refDia] : 0;
    var naSequencia = {};
    if (atual > 0) for (var k = inicios[refDia]; k <= refDia; k++) if (T(k)) naSequencia[diaKey(new Date(Y, M, k))] = true;
    var status;
    if (hojeFeito) status = 'Treino de hoje registrado.';
    else if (atual > 0) {
      if (estrita) status = 'Treine hoje para manter a sequência.';
      else if (gap === 1) status = 'Descanso 1 de 2: pode descansar hoje e amanhã.';
      else status = 'Descanso 2 de 2: treine amanhã para manter a sequência.';
    } else status = 'Treine hoje para começar uma sequência.';
    return { atual: atual, melhor: melhor, dias: dias, status: status, feitos: feitos, naSequencia: naSequencia, Y: Y, M: M, D: Dd };
  }

  /* ---------- sessão em andamento ---------- */
  function novaSessao(t) {
    return {
      id: uid('h'), treinoId: t.id, inicio: Date.now(), atual: null, exs: clone(t.exs),
      feitos: t.exs.map(function () { return false; }),
      ordem: t.exs.map(function (x, i) { return i; }),
      sets: t.exs.map(function (ex) { var a = []; for (var k = 0; k < ex.series; k++) a.push({ carga: '', reps: '', ok: false }); return a; })
    };
  }
  function exsSessao() { return D.sessao.exs; }
  function seriesOk(i) { return (D.sessao.sets[i] || []).filter(function (x) { return x.ok; }).length; }
  function sugeridoIdx() {
    var s = D.sessao;
    for (var k = 0; k < s.ordem.length; k++) if (!s.feitos[s.ordem[k]]) return s.ordem[k];
    return -1;
  }
  function tempoSessao() {
    if (!D.sessao) return '00:00';
    var sec = Math.max(0, Math.floor((Date.now() - D.sessao.inicio) / 1000));
    var h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), s = sec % 60;
    return (h ? h + ':' : '') + pad(m) + ':' + pad(s);
  }
  function pedirTelaLigada() {
    if (!('wakeLock' in navigator) || !D.sessao || document.visibilityState !== 'visible') return;
    navigator.wakeLock.request('screen').then(function (w) { wakeLock = w; }).catch(function () {});
  }
  function liberarTela() { if (wakeLock) { wakeLock.release().catch(function () {}); wakeLock = null; } }

  function finalizar() {
    var s = D.sessao, t = acharTreino(s.treinoId);
    if (!t) { D.sessao = null; salvar(); render(); return; }
    var total = 0;
    var p = D.programas.find(function (pp) { return pp.treinos.indexOf(t) >= 0; });
    var reg = { id: s.id, dia: diaKey(new Date()), treinoId: t.id, letra: t.letra, nome: t.nome, divisao: p ? p.nome : '', duracao: Math.max(1, Math.round((Date.now() - s.inicio) / 60000)), exs: [] };
    if (s.preTreino) reg.preTreino = true;
    s.ordem.forEach(function (i) {
      var ex = s.exs[i];
      var feitas = (s.sets[i] || []).filter(function (x) { return x.ok; }).map(function (x) { return { carga: num(x.carga), reps: parseInt(x.reps, 10) || 0 }; });
      total += feitas.length;
      if (!feitas.length) return;
      reg.exs.push({ nome: ex.nome, sets: feitas });
      var noTreino = t.exs.find(function (x) { return x.id === ex.id; });
      if (noTreino) noTreino.carga = feitas.reduce(function (a, x) { return x.carga > a ? x.carga : a; }, 0);
    });
    if (!total) return;
    if (p) p.proximoId = null;
    var antes = sequencia(D.regra);
    var ix = D.historico.findIndex(function (h) { return h.id === reg.id; });
    if (ix >= 0) D.historico[ix] = reg; else D.historico.push(reg); // mesmo id: nunca duplica
    var depois = sequencia(D.regra);
    var novas = MEDALHAS.filter(function (m) { return antes.melhor < m.n && depois.melhor >= m.n; });
    D.sessao = null;
    salvar();
    liberarTela();
    var msg = 'Treino ' + t.letra + ' salvo · ' + plural(total, 'série', 'séries') + ' · sequência de ' + plural(depois.atual, 'dia', 'dias') + '.';
    if (novas.length) msg += ' Medalha "' + novas[novas.length - 1].nome + '" conquistada!';
    mostrarToast(msg);
    irPara('inicio', false);
  }

  /* ---------- nuvem: sincronização ---------- */
  function cfgDe() { return { programas: D.programas, ativoId: D.ativoId, regra: D.regra }; }
  function prefsDe() { return { tema: D.tema, gavetas: D.gavetas, ultimoBackup: D.ultimoBackup || null, perfil: D.perfil }; }
  function semMeta(o) { var c = clone(o); delete c.atualizadoEm; delete c.dispositivo; delete c.atual; delete c.ativo; delete c.aviso; return c; }
  function liveParaNuvem(s) { var c = clone(s); c.sets = c.sets.map(function (a) { return { s: a }; }); c.atual = null; delete c.aviso; return c; } // Firestore não aceita lista dentro de lista
  function lerVinculo() { try { return JSON.parse(localStorage.getItem(CHAVE_VINCULO) || 'null'); } catch (e) { return null; } }

  function agendarEnvio() {
    if (!sync.vinculado) return;
    clearTimeout(sync.timer);
    sync.timer = setTimeout(enviarDiferencas, 600);
    renderSync();
  }

  function gravarNuvem(rel, dados, desfazer) {
    if (!window.Nuvem || !sync.usuario) return;
    window.Nuvem.gravar(sync.usuario.uid, rel, dados).catch(function (e) {
      if (desfazer) desfazer();
      if (e && e.code === 'permission-denied') { sync.negado = true; sync.erroDetalhe = { codigo: e.code, onde: 'gravar' }; render(); }
      renderSync();
    });
  }

  function enviarDiferencas() {
    sync.timer = null;
    if (!sync.vinculado || !sync.usuario) return;
    var agora = Date.now(), mudou = false, u = sync.ultimo;
    var jc = JSON.stringify(cfgDe());
    if (jc !== u.config) {
      D.configEm = agora; u.config = jc; mudou = true;
      gravarNuvem('config/main', Object.assign({ schema: 2, atualizadoEm: agora }, cfgDe()), function () { u.config = null; });
    }
    var jp = JSON.stringify(prefsDe());
    if (jp !== u.prefs) {
      D.prefsEm = agora; u.prefs = jp; mudou = true;
      gravarNuvem('config/prefs', Object.assign({ atualizadoEm: agora }, prefsDe()), function () { u.prefs = null; });
    }
    D.historico.forEach(function (h) {
      var j = JSON.stringify(semMeta(h));
      if (u.s[h.id] !== j) {
        h.atualizadoEm = agora; u.s[h.id] = j; mudou = true;
        gravarNuvem('sessions/' + h.id, h, function () { delete u.s[h.id]; });
      }
    });
    D.pesagens.forEach(function (p) {
      var j = JSON.stringify(semMeta(p));
      if (u.w[p.id] !== j) {
        p.atualizadoEm = agora; u.w[p.id] = j; mudou = true;
        gravarNuvem('weights/' + p.id, p, function () { delete u.w[p.id]; });
      }
    });
    D.saude.forEach(function (d) {
      var j = JSON.stringify(semMeta(d));
      if (u.h[d.id] !== j) {
        d.atualizadoEm = agora; u.h[d.id] = j; mudou = true;
        gravarNuvem('health/' + d.id, d, function () { delete u.h[d.id]; });
      }
    });
    if (D.sessao) {
      var jl = JSON.stringify(semMeta(D.sessao));
      if (jl !== u.live) {
        D.sessao.atualizadoEm = agora; u.live = jl; sync.ultimoLiveId = D.sessao.id; mudou = true;
        gravarNuvem('live/current', Object.assign(liveParaNuvem(D.sessao), { ativo: true, dispositivo: DISP, atualizadoEm: agora }), function () { u.live = null; });
      }
    } else if (sync.ultimoLiveId) {
      gravarNuvem('live/current', { ativo: false, id: sync.ultimoLiveId, dispositivo: DISP, atualizadoEm: agora });
      sync.ultimoLiveId = null; u.live = null;
    }
    if (mudou) gravarLocal();
    renderSync();
  }

  /* Junta documentos da nuvem na lista local: vence quem tem atualizadoEm maior.
     "mapa" guarda o último conteúdo conhecido na nuvem, para só reenviar o que mudou. */
  function mesclar(lista, docs, mapa) {
    var mudou = false;
    docs.forEach(function (d) {
      if (!d || !d.id) return;
      var i = lista.findIndex(function (x) { return x.id === d.id; });
      if (i < 0) { lista.push(d); mapa[d.id] = JSON.stringify(semMeta(d)); mudou = true; return; }
      var rt = d.atualizadoEm || 0, lt = lista[i].atualizadoEm || 0;
      if (rt > lt) { lista[i] = d; mapa[d.id] = JSON.stringify(semMeta(d)); mudou = true; }
      else if (rt === lt) mapa[d.id] = JSON.stringify(semMeta(d));
      // local mais novo: fica como está e será reenviado
    });
    return mudou;
  }

  function comecarEscuta() {
    if (sync.parar) sync.parar();
    var u = sync.usuario;
    sync.parar = window.Nuvem.escutar(u.uid, {
      config: function (d) {
        if (d && (d.atualizadoEm || 0) > (D.configEm || 0)) {
          D.programas = d.programas; D.ativoId = d.ativoId; D.regra = d.regra || D.regra; D.configEm = d.atualizadoEm;
          normalizar(D); sync.ultimo.config = JSON.stringify(cfgDe()); gravarLocal(); renderSeguro();
        } else if (d && d.atualizadoEm === D.configEm) sync.ultimo.config = JSON.stringify(cfgDe());
        agendarEnvio();
      },
      prefs: function (d) {
        if (d && (d.atualizadoEm || 0) > (D.prefsEm || 0)) {
          D.tema = d.tema || D.tema; D.gavetas = d.gavetas || {}; D.ultimoBackup = d.ultimoBackup || D.ultimoBackup; D.perfil = d.perfil || {}; D.prefsEm = d.atualizadoEm;
          normalizar(D); sync.ultimo.prefs = JSON.stringify(prefsDe()); gravarLocal(); renderSeguro();
        } else if (d && d.atualizadoEm === D.prefsEm) sync.ultimo.prefs = JSON.stringify(prefsDe());
        agendarEnvio();
      },
      sessions: function (docs) {
        sync.contagemNuvem = docs.filter(function (d) { return !d.apagado; }).length;
        if (mesclar(D.historico, docs, sync.ultimo.s)) { gravarLocal(); renderSeguro(); }
        agendarEnvio();
      },
      weights: function (docs) {
        if (mesclar(D.pesagens, docs, sync.ultimo.w)) { gravarLocal(); renderSeguro(); }
        agendarEnvio();
      },
      health: function (docs) {
        if (mesclar(D.saude, docs, sync.ultimo.h)) { gravarLocal(); renderSeguro(); }
        agendarEnvio();
      },
      live: tratarLive,
      erro: function (e) {
        if (e && e.code === 'permission-denied') { sync.negado = true; sync.erroDetalhe = { codigo: e.code, onde: 'sincronizar' }; } else sync.erro = (e && e.code) || 'erro';
        renderSync(); render();
      }
    });
  }

  function tratarLive(d) {
    if (!d) return;
    if (d.ativo === false) {
      sync.liveRemoto = null;
      if (D.sessao && D.sessao.id === d.id && d.dispositivo !== DISP) {
        D.sessao = null; sync.ultimoLiveId = null; sync.ultimo.live = null; liberarTela(); gravarLocal();
        mostrarToast('O treino em andamento foi encerrado em outro aparelho.');
        render();
      }
      return;
    }
    if (d.dispositivo === DISP) return;
    var t = acharTreino(d.treinoId);
    if (!t) return;
    var remoto = clone(d);
    normalizarSessao(remoto, t);
    if (D.sessao && D.sessao.id === d.id) {
      if ((d.atualizadoEm || 0) > (D.sessao.atualizadoEm || 0)) {
        remoto.atual = D.sessao.atual;
        delete remoto.ativo; delete remoto.dispositivo;
        D.sessao = remoto; sync.ultimo.live = JSON.stringify(semMeta(D.sessao)); sync.ultimoLiveId = D.sessao.id;
        gravarLocal(); renderSeguro();
      }
    } else if (!D.sessao && Date.now() - (d.atualizadoEm || 0) < 12 * 3600 * 1000) {
      sync.liveRemoto = remoto; renderSeguro();
    }
  }

  function vincular() {
    try { localStorage.setItem(CHAVE_VINCULO, JSON.stringify({ uid: sync.usuario.uid, email: sync.usuario.email, em: new Date().toISOString() })); } catch (e) {}
    sync.vinculado = true; sync.conflito = null;
    comecarEscuta();
    agendarEnvio();
    render();
  }

  function adotarRemoto(r) {
    if (r.config) { D.programas = r.config.programas; D.ativoId = r.config.ativoId; D.regra = r.config.regra || D.regra; D.configEm = r.config.atualizadoEm; }
    if (r.prefs) { D.tema = r.prefs.tema || D.tema; D.gavetas = r.prefs.gavetas || {}; D.perfil = r.prefs.perfil || {}; D.ultimoBackup = r.prefs.ultimoBackup || D.ultimoBackup; D.prefsEm = r.prefs.atualizadoEm; }
    var saudeLocal = D.saude || [];
    D.historico = r.sessions.slice(); D.pesagens = r.weights.slice(); D.saude = (r.health || []).slice();
    normalizar(D);
    sync.ultimo = { config: r.config ? JSON.stringify(cfgDe()) : null, prefs: r.prefs ? JSON.stringify(prefsDe()) : null, live: null, s: {}, w: {}, h: {} };
    D.historico.forEach(function (h) { sync.ultimo.s[h.id] = JSON.stringify(semMeta(h)); });
    D.pesagens.forEach(function (p) { sync.ultimo.w[p.id] = JSON.stringify(semMeta(p)); });
    D.saude.forEach(function (d) { sync.ultimo.h[d.id] = JSON.stringify(semMeta(d)); });
    mesclarLocalSobre(D.saude, saudeLocal, sync.ultimo.h); // dados do relógio nunca se perdem: são somados
    gravarLocal();
  }

  function iniciarVinculo() {
    var u = sync.usuario, v = lerVinculo();
    if (!u.verificado) { sync.negado = true; render(); return; }
    if (v && v.uid === u.uid) { sync.vinculado = true; comecarEscuta(); agendarEnvio(); render(); return; }
    if (!navigator.onLine) { mostrarToast('Conecte-se à internet para vincular os dados à sua conta.'); render(); return; }
    sync.verificando = true; render();
    window.Nuvem.lerTudo(u.uid).then(function (r) {
      sync.verificando = false;
      var remotoVivos = r.sessions.filter(function (s) { return !s.apagado; });
      var remotoVazio = !r.config && !r.sessions.length && !r.weights.length;
      var locais = vivos(), localTem = locais.length > 0 || pesagensVivas().length > 0 || !!D.editado;
      var mesmos = locais.length === remotoVivos.length && locais.every(function (h) { return remotoVivos.some(function (x) { return x.id === h.id; }); });
      if (remotoVazio && !localTem) { vincular(); }
      else if (remotoVazio) { abrirConfirm({ tipo: 'migrarEnviar' }); }
      else if (!localTem || (mesmos && pesagensVivas().length === 0)) { adotarRemoto(r); vincular(); mostrarToast('Dados da nuvem carregados: ' + plural(remotoVivos.length, 'treino', 'treinos') + '.'); }
      else { sync.conflito = r; abrirConfirm({ tipo: 'migrarConflito', nl: locais.length, nr: remotoVivos.length, pl: pesagensVivas().length, pr: r.weights.filter(function (w) { return !w.apagado; }).length }); }
    }).catch(function (e) {
      sync.verificando = false;
      if (e && e.code === 'permission-denied') { sync.negado = true; sync.erroDetalhe = { codigo: e.code, onde: 'ler' }; }
      else mostrarToast('Não foi possível ler a nuvem agora (' + ((e && e.code) || 'erro') + '). Tente de novo em Ajustes.');
      render();
    });
  }

  function migrar(opcao) {
    exportar('arquivo', 'treino-backup-antes-da-nuvem-');
    var r = sync.conflito, antes = vivos().length;
    if (opcao === 'enviar') {
      sync.ultimo = { config: null, prefs: null, live: null, s: {}, w: {}, h: {} };
      vincular();
      mostrarToast('Enviando ' + plural(antes, 'treino', 'treinos') + ' e ' + plural(pesagensVivas().length, 'pesagem', 'pesagens') + ' para a nuvem. Um backup foi baixado antes.');
    } else if (opcao === 'nuvem') {
      adotarRemoto(r); vincular();
      mostrarToast('Mantidos os dados da nuvem (' + plural(vivos().length, 'treino', 'treinos') + '). O backup deste aparelho foi baixado.');
    } else if (opcao === 'juntar') {
      var cfgLocal = { programas: D.programas, ativoId: D.ativoId, regra: D.regra, em: D.configEm || 0 };
      var hist = D.historico.slice(), pes = D.pesagens.slice();
      adotarRemoto(r);
      if (!r.config || cfgLocal.em > (r.config.atualizadoEm || 0)) { D.programas = cfgLocal.programas; D.ativoId = cfgLocal.ativoId; D.regra = cfgLocal.regra; sync.ultimo.config = null; }
      mesclarLocalSobre(D.historico, hist, sync.ultimo.s);
      mesclarLocalSobre(D.pesagens, pes, sync.ultimo.w);
      normalizar(D); gravarLocal(); vincular();
      mostrarToast('Dados juntados: ' + plural(vivos().length, 'treino', 'treinos') + ' no total, sem duplicar.');
    } else if (opcao === 'local') {
      var idsLocais = {};
      D.historico.forEach(function (h) { idsLocais[h.id] = true; });
      r.sessions.forEach(function (s) { if (!idsLocais[s.id] && !s.apagado) { var c = clone(s); c.apagado = true; D.historico.push(c); } }); // só marca; dá para desfazer
      var idsP = {};
      D.pesagens.forEach(function (p) { idsP[p.id] = true; });
      r.weights.forEach(function (w) { if (!idsP[w.id] && !w.apagado) { var c = clone(w); c.apagado = true; D.pesagens.push(c); } });
      sync.ultimo = { config: null, prefs: null, live: null, s: {}, w: {}, h: {} };
      gravarLocal(); vincular();
      mostrarToast('A nuvem foi substituída pelos dados deste aparelho (' + plural(antes, 'treino', 'treinos') + '). Os registros que só existiam na nuvem foram marcados como apagados, não destruídos.');
    }
  }
  function mesclarLocalSobre(alvo, locais, mapa) {
    locais.forEach(function (h) {
      var i = alvo.findIndex(function (x) { return x.id === h.id; });
      if (i < 0) { alvo.push(h); delete mapa[h.id]; }
      else if ((h.atualizadoEm || 0) > (alvo[i].atualizadoEm || 0)) { alvo[i] = h; delete mapa[h.id]; }
    });
  }

  function estadoSync() {
    if (!sync.usuario) return null;
    if (sync.negado) return { cls: 'erro', txt: 'Sem permissão' };
    if (!sync.vinculado) return { cls: 'aviso', txt: sync.verificando ? 'Verificando…' : 'Não vinculado' };
    if (!navigator.onLine) return { cls: 'off', txt: 'Offline' + (sync.pendentes ? ' (' + sync.pendentes + ' pendente' + (sync.pendentes > 1 ? 's' : '') + ')' : '') };
    if (sync.erro) return { cls: 'erro', txt: 'Erro ao salvar' };
    if (sync.pendentes || sync.timer) return { cls: 'salvando', txt: 'Salvando…' };
    return { cls: 'ok', txt: 'Sincronizado' };
  }
  function renderSync() {
    var e = estadoSync();
    if (!e) { $sync.hidden = true; return; }
    $sync.hidden = false;
    $sync.className = 'sync-chip ' + e.cls;
    $sync.innerHTML = '<span class="dot" aria-hidden="true"></span>' + esc(e.txt);
    $sync.setAttribute('aria-label', 'Sincronização: ' + e.txt);
  }

  /* ---------- ações gerais ---------- */
  function mostrarToast(msg) {
    ui.toast = msg;
    clearTimeout(toastT);
    toastT = setTimeout(function () { ui.toast = ''; renderSeguro(); }, 7000);
  }
  function mostrarFlash(msg) {
    ui.flash = msg;
    clearTimeout(flashT);
    flashT = setTimeout(function () { ui.flash = ''; var el = document.getElementById('flash'); if (el) el.textContent = ''; }, 2500);
  }
  function irPara(tela, empurrar) {
    ui.tela = tela; ui.picker = false;
    if (tela !== 'treinar') ui.editor = false;
    if (empurrar !== false) { try { history.pushState({ tela: tela }, ''); } catch (e) {} }
    render();
    window.scrollTo(0, 0);
  }

  function exportar(modo, prefixo) {
    var nome = (prefixo || 'treino-backup-') + diaKey(new Date()) + '.json';
    var conteudo = JSON.stringify(Object.assign({ app: 'diario-treino', versaoApp: VERSAO_APP, exportadoEm: new Date().toISOString() }, D), null, 2);
    var blob = new Blob([conteudo], { type: 'application/json' });
    function marcar() { D.ultimoBackup = new Date().toISOString(); salvar(); renderSeguro(); }
    if (modo === 'compartilhar' && navigator.canShare) {
      var arq = new File([blob], nome, { type: 'application/json' });
      if (navigator.canShare({ files: [arq] })) { navigator.share({ files: [arq], title: 'Backup do Diário de Treino' }).then(marcar).catch(function () {}); return; }
    }
    var url = URL.createObjectURL(blob), a = document.createElement('a');
    a.href = url; a.download = nome;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 2000);
    marcar();
  }

  function abrirConfirm(c) {
    if (!ui.confirm) focoAntesDialogo = document.activeElement;
    var novo = !ui.confirm;
    ui.confirm = c;
    if (novo) { try { history.pushState({ tela: ui.tela, dialogo: true }, ''); } catch (e) {} }
    renderOverlay();
  }
  function fecharConfirm(viaVoltar) {
    var c = ui.confirm;
    ui.confirm = null;
    renderOverlay();
    if (!viaVoltar) { voltarDialogo(); }
    if (focoAntesDialogo && document.contains(focoAntesDialogo)) focoAntesDialogo.focus();
  }

  /* Remove a entrada do diálogo do histórico do navegador sem que o "voltar" mude de tela. */
  function voltarDialogo() { ui.voltandoDialogo = true; try { history.back(); } catch (e) { ui.voltandoDialogo = false; } }

  function confirmar(arg) {
    var c = ui.confirm;
    if (!c) return;
    ui.confirm = null; renderOverlay();
    voltarDialogo();
    if (c.tipo === 'descartar') { D.sessao = null; liberarTela(); }
    else if (c.tipo === 'finalizarParcial') { finalizar(); return; }
    else if (c.tipo === 'sessRemover') {
      var ss = D.sessao, i = c.alvo, ex = ss.exs[i], tt = acharTreino(ss.treinoId);
      ss.exs.splice(i, 1); ss.sets.splice(i, 1); ss.feitos.splice(i, 1);
      ss.ordem = ss.ordem.filter(function (x) { return x !== i; }).map(function (x) { return x > i ? x - 1 : x; });
      if (ss.atual === i) ss.atual = null; else if (ss.atual !== null && ss.atual > i) ss.atual--;
      if (ss.atual === null) { var sg = sugeridoIdx(); ss.atual = sg >= 0 ? sg : null; }
      if (c.perm && tt) { tt.exs = tt.exs.filter(function (x) { return x.id !== ex.id; }); marcarEdicao(); }
      ss.aviso = ex.nome + ' removido' + (c.perm ? ' deste treino e das próximas vezes.' : ' só de hoje.');
    }
    else if (c.tipo === 'excluirHist') { var h = D.historico.find(function (x) { return x.id === c.alvo; }); if (h) h.apagado = true; ui.abertoHist = {}; }
    else if (c.tipo === 'excluirPeso') { var pz = D.pesagens.find(function (x) { return x.id === c.alvo; }); if (pz) pz.apagado = true; ui.abertoPeso = null; }
    else if (c.tipo === 'excluirDiv') {
      D.programas = D.programas.filter(function (p) { return p.id !== ui.editId; });
      var a = ativo(); ui.editId = a.id; ui.editTreinoId = a.treinos[0].id; ui.picker = false; marcarEdicao();
    } else if (c.tipo === 'removerTreino') {
      var p = progEd(), cur = treinoEd(), ix = p.treinos.indexOf(cur);
      p.treinos.splice(ix, 1);
      p.treinos.forEach(function (t, i) { t.letra = LETRAS[i]; });
      ui.editTreinoId = p.treinos[Math.max(0, ix - 1)].id; ui.picker = false; marcarEdicao();
    } else if (c.tipo === 'removerEx') { treinoEd().exs.splice(c.alvo, 1); marcarEdicao(); }
    else if (c.tipo === 'importar') {
      var dados = c.dados; delete dados.app; delete dados.exportadoEm; delete dados.versaoApp;
      if (sync.vinculado) { // importar com nuvem ativa: junta pelo id, sem apagar nada
        mesclarLocalSobre(D.historico, dados.historico || [], sync.ultimo.s);
        mesclarLocalSobre(D.pesagens, dados.pesagens || [], sync.ultimo.w);
        mesclarLocalSobre(D.saude, dados.saude || [], sync.ultimo.h);
        D.programas = dados.programas; D.ativoId = dados.ativoId; normalizar(D); marcarEdicao();
      } else { D = normalizar(dados); }
      var a2 = ativo(); ui.editId = a2.id; ui.editTreinoId = a2.treinos[0].id; ui.abertoHist = {};
      mostrarToast('Backup importado: ' + plural(vivos().length, 'treino', 'treinos') + ' no histórico.');
    } else if (c.tipo === 'zerar') {
      D = exemplo(); ui.editId = D.ativoId; ui.editTreinoId = D.programas[0].treinos[0].id; ui.abertoHist = {};
    } else if (c.tipo === 'migrarEnviar') { migrar('enviar'); return; }
    else if (c.tipo === 'migrarConflito') { migrar(arg); return; }
    else if (c.tipo === 'importarSaude') { aplicarSaude(c); }
    else if (c.tipo === 'trocar') { /* tratado no próprio botão */ }
    salvar();
    render();
  }

  /* ---------- dados do relógio (Samsung Health) ---------- */
  var NOMES_ACHADOS = { sono: 'sono', vitalidade: 'FC e VFC noturnas', passos: 'passos', exercicio: 'treinos de força do relógio', peso: 'composição corporal do relógio' };
  function chaveSaude(d) { var c = semMeta(d); delete c.importadoEm; return JSON.stringify(c); }
  function saudeOrdenada() { return D.saude.slice().sort(function (a, b) { return a.dia < b.dia ? -1 : 1; }); }
  function lerSaude(arquivos) {
    if (!window.Saude) { mostrarToast('O leitor dos dados do relógio não carregou. Recarregue o app.'); render(); return; }
    mostrarToast('Lendo a exportação do Samsung Health…'); render();
    window.Saude.importar(arquivos).then(function (r) {
      var mapa = {}; D.saude.forEach(function (d) { mapa[d.id] = d; });
      var novos = 0, mudados = 0, docs = [];
      r.dias.forEach(function (d) {
        var a = mapa[d.id], m = a ? Object.assign({}, a, d) : d; // campos que não vieram nesta importação ficam como estavam
        if (!a) { novos++; docs.push(m); }
        else if (chaveSaude(a) !== chaveSaude(m)) { mudados++; docs.push(m); }
      });
      var pmap = {}; D.pesagens.forEach(function (p) { pmap[p.id] = p; });
      var medNovas = 0, medMud = 0, medDocs = [];
      (r.medidas || []).forEach(function (m) {
        var a = pmap[m.id];
        if (!a) { medNovas++; medDocs.push(m); return; }
        if (a.apagado) return; // excluída por você: não volta
        var mm = Object.assign({}, a, m);
        if (chaveSaude(a) !== chaveSaude(mm)) { medMud++; medDocs.push(mm); }
      });
      ui.toast = '';
      if (!docs.length && !medDocs.length) { D.perfil.ultimaImportacao = Date.now(); delete D.perfil.lembreteAdiado; salvar(); }
      abrirConfirm({ tipo: 'importarSaude', docs: docs, medDocs: medDocs, medTotal: (r.medidas || []).length, medNovas: medNovas, medMud: medMud, total: r.dias.length, novos: novos, mudados: mudados, ini: r.dias.length ? r.dias[0].dia : null, fim: r.dias.length ? r.dias[r.dias.length - 1].dia : null, achados: r.achados });
    }).catch(function (e) {
      var c = e && e.message;
      mostrarToast(c === 'nada' ? 'Não encontrei os arquivos do Samsung Health (sleep, vitality_score, exercise…). Escolha o .zip da exportação ou os .csv da pasta.'
        : c === 'sem-descompressao' ? 'Este navegador não abre .zip. Selecione os arquivos .csv da pasta exportada.'
        : 'Não consegui ler esse arquivo (' + (c || 'erro') + '). Tente selecionar os .csv da pasta exportada.');
      render();
    });
  }
  function aplicarSaude(c) {
    var agora = Date.now(), pos = {};
    D.saude.forEach(function (d, i) { pos[d.id] = i; });
    c.docs.forEach(function (d) {
      d.importadoEm = agora;
      if (pos[d.id] == null) D.saude.push(d); else D.saude[pos[d.id]] = d;
    });
    D.saude.sort(function (a, b) { return a.dia < b.dia ? -1 : 1; });
    var pos2 = {};
    D.pesagens.forEach(function (p, i) { pos2[p.id] = i; });
    (c.medDocs || []).forEach(function (m) { if (pos2[m.id] == null) D.pesagens.push(m); else D.pesagens[pos2[m.id]] = m; });
    D.perfil.ultimaImportacao = agora;
    delete D.perfil.lembreteAdiado;
    ui.relMes = null;
    mostrarToast('Dados do relógio importados: ' + plural(c.novos, 'dia novo', 'dias novos') + (c.mudados ? ', ' + plural(c.mudados, 'atualizado', 'atualizados') : '') + (c.medNovas || c.medMud ? ' e ' + plural(c.medNovas + c.medMud, 'medição corporal', 'medições corporais') : '') + '.');
  }
  /* lembrete: depois de N dias sem importar (padrão 7), aviso no Início e no Corpo */
  function diasSemImportar() {
    var t = D.perfil.ultimaImportacao || 0;
    if (!t) D.saude.forEach(function (d) { if ((d.importadoEm || 0) > t) t = d.importadoEm; });
    if (!t) return null;
    return Math.round((deKey(diaKey(new Date())) - deKey(diaKey(new Date(t)))) / 86400000);
  }
  function lembreteDias() { var n = D.perfil.lembreteDias; return n === 0 ? 0 : n || 7; }
  function avisoRelogio(noCorpo) {
    var n = lembreteDias(), d = diasSemImportar();
    if (!n || d === null || d < n || D.perfil.lembreteAdiado === diaKey(new Date())) return '';
    return '<section class="notice lembrete-rel" role="status"><strong>Hora de sincronizar o relógio · ' + plural(d, 'dia', 'dias') + ' sem importar</strong>' +
      '<ol class="passos small">' + (noCorpo ? '<li>Se for medir, faça a composição corporal no relógio, com o peso da balança.</li>' : '') +
      '<li>Abra o Samsung Health no celular e deixe o relógio sincronizar.</li><li>Menu › Configurações › Baixar dados pessoais.</li><li>Importe aqui o .zip ou os .csv.</li></ol>' +
      '<div class="row-actions"><button type="button" class="btn sm primary" data-act="importarRelogio">' + icon('upload', 16) + 'Importar agora</button><button type="button" class="btn sm ghost" data-act="lembreteHoje">Hoje não</button></div></section>';
  }
  function mesesComDados() {
    var ks = {};
    D.saude.forEach(function (d) { ks[d.dia.slice(0, 7)] = true; });
    vivos().forEach(function (h) { ks[h.dia.slice(0, 7)] = true; });
    ks[diaKey(new Date()).slice(0, 7)] = true;
    return Object.keys(ks).sort();
  }
  function nomeMes(mk) { var t = deKey(mk + '-01').toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }); return t.charAt(0).toUpperCase() + t.slice(1); }
  function faixaDias(a, b) {
    var A = deKey(a), B = deKey(b), m = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
    return A.getMonth() === B.getMonth() ? A.getDate() + '–' + B.getDate() + ' ' + m[B.getMonth()] : A.getDate() + ' ' + m[A.getMonth()] + ' – ' + B.getDate() + ' ' + m[B.getMonth()];
  }
  function relatorioHtml() {
    var meses = mesesComDados();
    if (!ui.relMes || meses.indexOf(ui.relMes) < 0) {
      // padrão: o mês atual; no começo do mês (menos de 7 dias), o anterior
      var hj = new Date(), atual = diaKey(hj).slice(0, 7), ant = diaKey(new Date(hj.getFullYear(), hj.getMonth() - 1, 1)).slice(0, 7);
      ui.relMes = hj.getDate() < 7 && meses.indexOf(ant) >= 0 ? ant : atual;
    }
    var ix = meses.indexOf(ui.relMes);
    var nav = '<div class="mes-nav"><button type="button" class="icon-btn sm" aria-label="Mês anterior" data-act="relMes" data-arg="-1"' + (ix <= 0 ? ' disabled' : '') + '>' + icon('back', 18) + '</button>' +
      '<b>' + esc(nomeMes(ui.relMes)) + '</b><button type="button" class="icon-btn sm" aria-label="Próximo mês" data-act="relMes" data-arg="1"' + (ix >= meses.length - 1 ? ' disabled' : '') + '>' + icon('chev', 18) + '</button></div>';
    var topo = '<div class="rel-top"><h2 class="section-title" id="rel-t">Relatório do mês</h2>' + nav + '</div>';
    if (!D.saude.length) {
      return '<section class="section card flat rel" aria-labelledby="rel-t">' + topo +
        '<p class="small">Cruza o sono e a recuperação medidos pelo relógio com os seus treinos, semana a semana. Para isso, importe a exportação do Samsung Health.</p>' +
        '<button type="button" class="btn primary" data-act="importarRelogio">' + icon('upload', 18) + 'Importar dados do relógio</button>' +
        '<span class="small muted">No Samsung Health: menu › Configurações › Baixar dados pessoais. Depois escolha aqui o .zip ou os arquivos .csv da pasta criada.</span></section>';
    }
    var R = window.Saude.mensal(ui.relMes, { sessoes: vivos(), saude: saudeOrdenada(), hoje: diaKey(new Date()) });
    var T = R.totais;
    var difV = T.vfc != null && T.refVfc != null ? T.vfc - T.refVfc : null;
    var tot = '<div class="stats3"><div><span class="muted small">Treinos</span><b>' + T.treinos + '</b><span class="small muted">no mês</span></div>' +
      '<div><span class="muted small">Sono médio</span><b>' + (T.sono != null ? window.Saude.horasTxt(T.sono) : '—') + '</b><span class="small muted">' + plural(T.nSono, 'noite', 'noites') + '</span></div>' +
      '<div><span class="muted small">VFC no sono</span><b>' + (T.vfc != null ? Math.round(T.vfc) + '<small> ms</small>' : '—') + '</b><span class="small muted">' + (difV != null ? (Math.abs(difV) < 1 ? 'igual aos 60 dias antes' : (difV > 0 ? '+' : '−') + kg(Math.abs(difV), 0) + ' vs. 60 dias antes') : 'sem referência') + '</span></div></div>';
    var rotulo = { abaixo: 'Abaixo do seu normal', faixa: 'No seu normal', acima: 'Acima do seu normal' };
    var sems = R.semanas.filter(function (w) { return !w.futura; }).map(function (w) {
      var dados = [];
      dados.push(plural(w.treinos, 'treino', 'treinos') + (w.duracao ? ' · ' + w.duracao + ' min' : ''));
      if (w.sono != null) dados.push('sono ' + window.Saude.horasTxt(w.sono));
      if (w.vfc != null) dados.push('VFC ' + Math.round(w.vfc) + ' ms');
      if (w.volume) dados.push(Math.round(w.volume).toLocaleString('pt-BR') + ' kg de volume');
      var est = w.estadoVfc ? '<span class="rel-est ' + w.estadoVfc + '"><i aria-hidden="true"></i>' + rotulo[w.estadoVfc] + '</span>' : '';
      return '<article class="rel-sem"><div class="rel-sem-top"><b>' + esc(faixaDias(w.inicio, w.fim)) + '</b>' + est + '</div>' +
        '<span class="small soft">' + esc(dados.join(' · ')) + '</span>' +
        (w.frases.length ? '<p>' + w.frases.map(esc).join(' ') + '</p>' : '') + '</article>';
    }).join('');
    var achados = R.achados.map(function (a) { return '<div class="rel-achado' + (a.fraco ? ' fraco' : '') + '"><b>' + esc(a.tit) + '</b><p class="small">' + esc(a.txt) + '</p></div>'; }).join('');
    var rodape = '<div class="rel-rodape"><span class="small muted">Dados do relógio até ' + (R.ultimoDado ? ddmm(R.ultimoDado) : '—') + (R.faltaDepois ? ' — importe de novo para completar o mês' : '') + '.</span>' +
      '<button type="button" class="btn sm" data-act="importarRelogio">' + icon('upload', 16) + 'Importar de novo</button></div>' +
      '<span class="small muted">"Seu normal" é a média dos 60 dias anteriores. São associações nos seus próprios dados, não diagnóstico; semanas com menos de 3 noites medidas ficam sem leitura.</span>';
    return '<section class="section card flat rel" aria-labelledby="rel-t">' + topo + tot +
      (sems ? '<div class="rel-sems">' + sems + '</div>' : '<p class="small muted">Nenhuma semana deste mês com dados ainda.</p>') +
      '<h3 class="rel-sub">Leituras do mês</h3>' + achados + rodape + '</section>';
  }

  /* ---------- ações (data-act) ---------- */
  var A = {
    ir: function (tela) { irPara(tela); },
    gaveta: function (id) {
      var sec = document.querySelector('[data-gaveta="' + id + '"]');
      var aberta = sec ? sec.classList.contains('aberta') : estaAberta(id, true); // respeita o padrão de cada gaveta
      D.gavetas[id] = !aberta; salvar();
      if (sec) { sec.classList.toggle('aberta', !aberta); var b = sec.querySelector('.gaveta-cab'); if (b) b.setAttribute('aria-expanded', String(!aberta)); var corpo = sec.querySelector('.gaveta-corpo'); if (corpo) corpo.hidden = aberta; if (!aberta && window.Graficos) window.Graficos.desenharTodos(sec); }
    },
    iniciar: function (id) {
      var t = acharTreino(id);
      if (!t || !t.exs.length) return;
      if (D.sessao) { irPara('treinar'); return; }
      ui.toast = '';
      D.sessao = novaSessao(t);
      var sug = sugeridoIdx(); D.sessao.atual = sug >= 0 ? sug : null;
      salvar(); pedirTelaLigada(); irPara('treinar');
    },
    continuarRemoto: function () {
      if (!sync.liveRemoto) return;
      D.sessao = clone(sync.liveRemoto); delete D.sessao.ativo; delete D.sessao.dispositivo;
      sync.ultimo.live = JSON.stringify(semMeta(D.sessao)); sync.ultimoLiveId = D.sessao.id; sync.liveRemoto = null;
      salvar(); pedirTelaLigada(); irPara('treinar');
    },
    cancelar: function () {
      var algum = D.sessao.sets.some(function (a) { return a.some(function (x) { return x.ok; }); });
      if (algum) abrirConfirm({ tipo: 'descartar' });
      else { D.sessao = null; salvar(); liberarTela(); render(); }
    },
    toggleSet: function (arg) {
      var ij = arg.split(','), i = +ij[0], j = +ij[1], x = D.sessao.sets[i][j];
      var ex = D.sessao.exs[i];
      if (!x.ok) {
        if (x.carga === '') x.carga = placeholderCarga(ex, j, refEx(ex.nome));
        if (x.reps === '') x.reps = String(ex.reps);
      }
      x.ok = !x.ok; salvar(); render();
    },
    addSet: function (i) {
      var arr = D.sessao.sets[+i], u = arr[arr.length - 1] || { carga: '', reps: '' };
      arr.push({ carga: u.carga, reps: u.reps, ok: false }); salvar(); render();
    },
    abrirEx: function (i) { D.sessao.atual = D.sessao.atual === +i ? null : +i; salvar(); render(); rolarPara('exg-' + i); },
    mover: function (arg) {
      var a = arg.split(','), pos = +a[0], dir = +a[1], o = D.sessao.ordem, alvo = pos + dir;
      if (alvo < 0 || alvo >= o.length) return;
      var tmp = o[pos]; o[pos] = o[alvo]; o[alvo] = tmp;
      salvar(); render();
      var b = document.querySelector('[data-act="mover"][data-arg="' + alvo + ',' + dir + '"]') || document.querySelector('[data-act="mover"][data-arg="' + alvo + ',' + (-dir) + '"]');
      if (b) b.focus();
    },
    concluirEx: function () {
      var s = D.sessao;
      if (s.atual === null || !seriesOk(s.atual)) return;
      var nome = s.exs[s.atual].nome;
      s.feitos[s.atual] = true;
      var prox = sugeridoIdx();
      s.atual = prox >= 0 ? prox : null;
      s.aviso = nome + ' concluído.' + (prox >= 0 ? ' A seguir: ' + s.exs[prox].nome + ' — ou abra outro da lista.' : ' Todos os exercícios feitos.');
      salvar(); render();
      if (prox >= 0) rolarPara('exg-' + prox);
    },
    finalizar: function () {
      var s = D.sessao;
      var pend = s.exs.filter(function (ex, i) { return !seriesOk(i); }).length;
      if (pend) abrirConfirm({ tipo: 'finalizarParcial', pend: pend }); else finalizar();
    },
    sessAdicionar: function () { ui.busca = ''; abrirConfirm({ tipo: 'exSessao', modo: 'add', perm: false }); },
    sessTrocar: function (i) {
      var ex = D.sessao.exs[+i]; ui.busca = '';
      if (GRUPOS.some(function (gr) { return gr.g === grupoDe(ex.nome); })) ui.grupo = grupoDe(ex.nome);
      abrirConfirm({ tipo: 'exSessao', modo: 'trocar', idx: +i, perm: false });
    },
    sessRemover: function (i) { abrirConfirm({ tipo: 'sessRemover', alvo: +i, perm: false }); },
    exPerm: function () { if (ui.confirm) ui.confirm.perm = !ui.confirm.perm; },
    escolherEx: function (nome) {
      var c = ui.confirm, s = D.sessao, t = acharTreino(s.treinoId);
      if (!nome) { var el = document.getElementById('ex-custom'); nome = el ? el.value.trim() : ''; if (!nome) { if (el) el.focus(); mostrarFlash('Digite o nome do exercício.'); var f = document.getElementById('flash'); if (f) f.textContent = 'Digite o nome do exercício.'; return; } }
      function vazias(n) { var a = []; for (var k = 0; k < n; k++) a.push({ carga: '', reps: '', ok: false }); return a; }
      var alvo;
      if (c.modo === 'add') {
        var novo = { id: uid('e'), nome: nome, series: 3, reps: 12, carga: 0 };
        s.exs.push(novo); s.sets.push(vazias(3)); s.feitos.push(false);
        alvo = s.exs.length - 1; s.ordem.push(alvo);
        if (c.perm && t) { t.exs.push(clone(novo)); marcarEdicao(); }
        s.aviso = nome + ' adicionado' + (c.perm ? ' a este treino e às próximas vezes.' : ' só para hoje.');
      } else {
        var velho = s.exs[c.idx]; alvo = c.idx;
        s.exs[c.idx] = { id: c.perm ? velho.id : uid('e'), nome: nome, series: velho.series, reps: velho.reps, carga: 0 };
        if (!c.perm) s.exs[c.idx].trocadoDe = velho.trocadoDe || velho.nome;
        s.sets[c.idx] = vazias(velho.series); s.feitos[c.idx] = false;
        if (c.perm && t) { var no = t.exs.find(function (x) { return x.id === velho.id; }); if (no) { no.nome = nome; no.carga = 0; marcarEdicao(); } }
        s.aviso = velho.nome + ' trocado por ' + nome + (c.perm ? ' (também nas próximas vezes).' : ' só hoje.');
      }
      s.atual = alvo;
      ui.confirm = null; renderOverlay(); voltarDialogo();
      salvar(); render(); rolarPara('exg-' + alvo);
    },
    definirProximo: function (id) {
      var p = ativo();
      p.proximoId = proximoRodizio(p).id === id ? null : id;
      marcarEdicao(); salvar(); render();
      if (ui.confirm && ui.confirm.tipo === 'trocar') { ui.confirm = null; renderOverlay(); voltarDialogo(); }
    },
    trocarTreino: function () { abrirConfirm({ tipo: 'trocar' }); },
    verMedalhas: function () {
      D.gavetas.medalhas = true; salvar(); render();
      rolarPara('gaveta-medalhas');
    },
    regra: function (r) { D.regra = r === 'estrita' ? 'estrita' : 'descanso'; marcarEdicao(); salvar(); render(); },
    abrirHist: function (id) { ui.abertoHist[id] = !ui.abertoHist[id]; render(); },
    excluirHist: function (id) { abrirConfirm({ tipo: 'excluirHist', alvo: id }); },
    filtroLetra: function (l) { ui.filtroLetra = l; render(); },
    evoModo: function (m) { ui.evoModo = m; render(); },
    corpoPeriodo: function (p) { ui.corpoPeriodo = +p; render(); },
    abrirPeso: function (id) { ui.abertoPeso = ui.abertoPeso === id ? null : id; render(); },
    excluirPeso: function (id) { abrirConfirm({ tipo: 'excluirPeso', alvo: id }); },
    editor: function (on) { ui.editor = on === '1'; ui.picker = false; render(); window.scrollTo(0, 0); },
    pickProg: function (id) { var p = D.programas.find(function (x) { return x.id === id; }); ui.editId = id; ui.editTreinoId = p.treinos[0].id; ui.picker = false; render(); },
    novaDivisao: function () {
      var t = { id: uid('t'), letra: 'A', nome: 'Novo treino', exs: [] };
      var p = { id: uid('p'), nome: 'Nova divisão', treinos: [t] };
      D.programas.push(p); ui.editId = p.id; ui.editTreinoId = t.id; ui.picker = false; marcarEdicao();
      salvar(); render();
      var el = document.getElementById('nome-divisao'); if (el) { el.focus(); el.select(); }
    },
    usar: function () { D.ativoId = progEd().id; marcarEdicao(); salvar(); render(); },
    excluirDiv: function () { abrirConfirm({ tipo: 'excluirDiv' }); },
    pickTreino: function (id) { ui.editTreinoId = id; ui.picker = false; render(); },
    addTreino: function () {
      var p = progEd(); if (p.treinos.length >= 7) return;
      var t = { id: uid('t'), letra: LETRAS[p.treinos.length], nome: 'Novo treino', exs: [] };
      p.treinos.push(t); ui.editTreinoId = t.id; ui.picker = false; marcarEdicao(); salvar(); render();
    },
    removerTreino: function () { abrirConfirm({ tipo: 'removerTreino' }); },
    step: function (arg) {
      var a = arg.split(','), ex = treinoEd().exs[+a[0]], campo = a[1], d = +a[2];
      ex[campo] = Math.min(campo === 'series' ? 10 : 50, Math.max(1, ex[campo] + d)); marcarEdicao(); salvar(); render();
    },
    removerEx: function (i) { abrirConfirm({ tipo: 'removerEx', alvo: +i, nome: treinoEd().exs[+i].nome }); },
    moverEx: function (arg) {
      var a = arg.split(','), i = +a[0], d = +a[1], exs = treinoEd().exs, j = i + d;
      if (j < 0 || j >= exs.length) return;
      var t = exs[i]; exs[i] = exs[j]; exs[j] = t; marcarEdicao(); salvar(); render();
    },
    picker: function () {
      ui.picker = !ui.picker; ui.busca = '';
      var ex0 = treinoEd().exs[0], g0 = ex0 ? grupoDe(ex0.nome) : null;
      if (ui.picker && GRUPOS.some(function (gr) { return gr.g === g0; })) ui.grupo = g0;
      render();
    },
    grupo: function (g) { ui.grupo = g; ui.busca = ''; if (ui.confirm && ui.confirm.tipo === 'exSessao') renderOverlay(); else render(); },
    addEx: function (nome) {
      treinoEd().exs.push({ id: uid('e'), nome: nome || 'Novo exercício', series: 3, reps: 12, carga: 0 });
      marcarEdicao(); salvar();
      if (nome) { mostrarFlash(nome + ' adicionado ao treino ' + treinoEd().letra + '.'); render(); return; }
      ui.picker = false; render();
      var ins = document.querySelectorAll('[data-bind^="exNome:"]'), el = ins[ins.length - 1]; if (el) { el.focus(); el.select(); }
    },
    corpoTodas: function () { D.perfil.corpoTodas = !D.perfil.corpoTodas; salvar(); render(); },
    padraoMedida: function (id) {
      var m = D.pesagens.find(function (x) { return x.id === id; }); if (!m) return;
      var auto = (function () { var h = +m.data.slice(11, 13); return h < JANELA.ini || h >= JANELA.fim; })();
      var foraAgora = foraDoPadrao(m);
      if (foraAgora === auto) m.padraoManual = foraAgora ? 'dentro' : 'fora'; else delete m.padraoManual; // volta ao automático quando coincide
      salvar(); render();
    },
    lembreteHoje: function () { D.perfil.lembreteAdiado = diaKey(new Date()); salvar(); render(); },
    lembreteDias: function (n) { D.perfil.lembreteDias = +n; salvar(); render(); },
    relMes: function (d) { var m = mesesComDados(), i = m.indexOf(ui.relMes) + (+d); if (i >= 0 && i < m.length) { ui.relMes = m[i]; render(); } },
    importarRelogio: function () { $saudeFile.value = ''; $saudeFile.click(); },
    preTreino: function () { if (!D.sessao) return; D.sessao.preTreino = !D.sessao.preTreino; salvar(); render(); },
    histPre: function (id) { var h = D.historico.find(function (x) { return x.id === id; }); if (!h) return; if (h.preTreino) delete h.preTreino; else h.preTreino = true; salvar(); render(); },
    tema: function (t) { D.tema = ['claro', 'escuro', 'auto'].indexOf(t) >= 0 ? t : 'auto'; salvar(); render(); },
    exportar: function () { exportar('arquivo'); },
    compartilhar: function () { exportar('compartilhar'); },
    importar: function () { $import.value = ''; $import.click(); },
    zerar: function () { abrirConfirm({ tipo: 'zerar' }); },
    instalar: function () {
      if (!eventoInstalar) return;
      eventoInstalar.prompt();
      eventoInstalar.userChoice.finally(function () { eventoInstalar = null; render(); });
    },
    entrar: function () {
      if (!window.Nuvem) { mostrarToast('A nuvem não carregou (sem internet?). Tente de novo com conexão.'); render(); return; }
      window.Nuvem.entrar().catch(function (e) {
        var c = (e && e.code) || '';
        if (c === 'auth/popup-closed-by-user' || c === 'auth/cancelled-popup-request') return;
        mostrarToast(c === 'auth/unauthorized-domain' ? 'Este endereço ainda não está autorizado no Firebase (Authentication › Domínios autorizados).' : 'Não foi possível entrar: ' + (c || e));
        render();
      });
    },
    sair: function () {
      if (sync.pendentes > 0 && !window.confirm('Há ' + sync.pendentes + ' alteração(ões) ainda não enviada(s). Sair mesmo assim? Elas continuam salvas neste aparelho.')) return;
      if (sync.parar) sync.parar();
      sync.parar = null; sync.vinculado = false; sync.negado = false; sync.erro = null;
      if (window.Nuvem) window.Nuvem.sair();
    },
    trocarConta: function () {
      try { localStorage.removeItem(CHAVE_VINCULO); } catch (e) {}
      A.sair();
      setTimeout(function () { A.entrar(); }, 400);
    },
    revincular: function () { if (sync.usuario) iniciarVinculo(); },
    tentarDeNovo: function () { if (!sync.usuario) return; sync.negado = false; sync.erroDetalhe = null; if (sync.vinculado) { comecarEscuta(); render(); } else iniciarVinculo(); },
    fechar: function () { fecharConfirm(false); },
    confirmar: function (arg) { confirmar(arg); }
  };

  function rolarPara(id) {
    setTimeout(function () { var el = document.getElementById(id); if (el && el.scrollIntoView) el.scrollIntoView({ block: 'start', behavior: 'smooth' }); }, 30);
  }
  function estaAberta(id, padrao) { return D.gavetas[id] === undefined ? padrao : !!D.gavetas[id]; }
  function gaveta(id, titulo, extra, corpo, padrao) {
    var aberta = estaAberta(id, padrao !== false);
    return '<section class="gaveta' + (aberta ? ' aberta' : '') + '" data-gaveta="' + id + '" id="gaveta-' + id + '">' +
      '<button type="button" class="gaveta-cab" aria-expanded="' + aberta + '" aria-controls="gc-' + id + '" data-act="gaveta" data-arg="' + id + '">' +
      '<span class="gaveta-tit">' + titulo + '</span>' + (extra ? '<span class="gaveta-extra">' + extra + '</span>' : '') + '<span class="gaveta-seta">' + icon('chevDown', 20) + '</span></button>' +
      '<div class="gaveta-corpo" id="gc-' + id + '"' + (aberta ? '' : ' hidden') + '>' + corpo + '</div></section>';
  }

  /* ---------- telas ---------- */
  function cabecalho(titulo, sub, eyebrow) {
    return '<header class="page-head">' + (eyebrow ? '<span class="eyebrow">' + esc(eyebrow) + '</span>' : '') + '<h1>' + titulo + '</h1>' + (sub ? '<p class="sub">' + sub + '</p>' : '') + '</header>';
  }
  function toastHtml() { return ui.toast ? '<div class="toast" role="status">' + icon('check', 18) + '<span>' + esc(ui.toast) + '</span></div>' : ''; }
  function avisoNegado() {
    if (!sync.negado || !sync.usuario) return '';
    return '<section class="notice erro" role="alert"><strong>Sem permissão para acessar a nuvem</strong><span class="small">Você entrou como <b>' + esc(sync.usuario.email || '?') + '</b>' + (sync.usuario.verificado ? '' : ' (e-mail não verificado)') + '. Esta conta não tem acesso aos dados do Diário de Treino. Os dados deste aparelho continuam salvos aqui.</span>' +
      '<span class="small muted">Detalhe técnico: ' + esc((sync.erroDetalhe && sync.erroDetalhe.codigo) || 'permission-denied') + ' ao ' + esc((sync.erroDetalhe && sync.erroDetalhe.onde) || 'acessar') + ' apps/treino/users/' + esc(sync.usuario.uid) + '</span>' +
      '<div class="row-actions"><button type="button" class="btn sm" data-act="tentarDeNovo">Tentar de novo</button><button type="button" class="btn sm" data-act="trocarConta">Sair e entrar com outra conta</button></div></section>';
  }
  function tags(t) {
    var gs = [];
    t.exs.forEach(function (x) { var g = grupoDe(x.nome); if (gs.indexOf(g) < 0) gs.push(g); });
    return gs.length ? '<div class="tags">' + gs.map(function (g) { return '<span class="tag-g">' + esc(g) + '</span>'; }).join('') + '</div>' : '';
  }

  function vInicio() {
    var p = ativo(), prox = proximoTreino(p), seq = sequencia(D.regra);
    var hoje = new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' });
    var emSessao = !!D.sessao, tSess = emSessao ? acharTreino(D.sessao.treinoId) : null;
    var heroT = tSess || prox;
    var hero = '<section class="hero card next" aria-labelledby="hero-t"><div class="hero-top"><div><span class="eyebrow accent">' + (emSessao ? 'Treino em andamento' : 'Próximo treino' + (p.proximoId ? ' · ajustado' : '')) + '</span>' +
      '<h2 id="hero-t"><span class="badge on" aria-hidden="true">' + esc(heroT.letra) + '</span><span>' + esc(heroT.nome || 'Sem nome') + '</span></h2></div>' +
      '<div class="streak-mini" aria-label="' + plural(seq.atual, 'dia', 'dias') + ' de sequência"><b>' + seq.atual + '</b><span>' + (seq.atual === 1 ? 'dia' : 'dias') + '<br>seguidos</span></div></div>' +
      tags(heroT) + '<p class="small muted">' + esc(seq.status) + '</p>' +
      (emSessao ? '<button type="button" class="btn primary block xl" data-act="ir" data-arg="treinar">' + icon('play', 16) + 'Continuar treino · ' + tempoSessao() + '</button>'
        : '<button type="button" class="btn primary block xl" data-act="iniciar" data-arg="' + prox.id + '"' + (prox.exs.length ? '' : ' disabled') + '>' + icon('play', 16) + 'Começar treino ' + esc(prox.letra) + '</button>') + '</section>';

    var remoto = sync.liveRemoto && !emSessao ? (function () { var t = acharTreino(sync.liveRemoto.treinoId); return '<section class="notice"><strong>Treino ' + esc(t ? t.letra + ' · ' + t.nome : '') + ' em andamento em outro aparelho</strong><span class="small muted">Iniciado às ' + new Date(sync.liveRemoto.inicio).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) + '. Você pode continuar daqui, com as séries já marcadas.</span><button type="button" class="btn sm primary" data-act="continuarRemoto">Continuar aqui</button></section>'; })() : '';

    var atalhos = '<nav class="atalhos" aria-label="Atalhos">' +
      atalho('trocarTreino', '', 'swap', 'Trocar treino') + atalho('ir', 'historico', 'cal', 'Histórico') + atalho('verMedalhas', '', 'medal', 'Medalhas') + atalho('compartilhar', '', 'share', 'Backup') + '</nav>';

    // treinos da semana (segunda a domingo)
    var hj = new Date(), dow = (hj.getDay() + 6) % 7, seg = addDias(hj, -dow), dias = [];
    var porDia = {}; vivos().forEach(function (h) { (porDia[h.dia] = porDia[h.dia] || []).push(h); });
    for (var i = 0; i < 7; i++) {
      var dt = addDias(seg, i), k = diaKey(dt), hs = porDia[k] || [];
      dias.push('<li class="semana-dia' + (k === diaKey(hj) ? ' hoje' : '') + (hs.length ? ' feito' : '') + '"><span class="sd-nome">' + ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'][i] + '</span><span class="sd-letra">' + (hs.length ? hs.map(function (h) { return esc(h.letra); }).join('·') : '–') + '</span></li>');
    }
    var nSemana = Object.keys(porDia).filter(function (k) { return deKey(k) >= seg; }).length;
    var gSemana = gaveta('semana', 'Treinos da semana', plural(nSemana, 'dia', 'dias'), '<ul class="semana" aria-label="Dias desta semana">' + dias.join('') + '</ul>');

    var linhasCarga = prox.exs.map(function (ex) {
      var r = refEx(ex.nome);
      return '<div class="list-row"><div><span class="nome">' + esc(ex.nome) + '</span><span class="small muted">' + (r ? ddmm(r.ult.dia) + ' · ' + kg(r.topSet.carga) + ' kg × ' + r.topSet.reps : 'sem registro ainda') + '</span></div>' + (r && r.tendencia !== null ? seta(r.tendencia) : '') + '</div>';
    }).join('');
    var gCargas = gaveta('cargas', 'Últimas cargas · treino ' + esc(prox.letra), '', '<div class="list">' + (linhasCarga || '<p class="small muted pad">Sem exercícios.</p>') + '</div>');

    var gMedalhas = gaveta('medalhas', 'Medalhas do mês', plural(MEDALHAS.filter(function (m) { return seq.melhor >= m.n; }).length, 'conquistada', 'conquistadas'), medalhasHtml(seq), true);

    var dd = D.ultimoBackup ? Math.floor((Date.now() - new Date(D.ultimoBackup)) / 86400000) : null;
    var lembrete = !sync.vinculado && vivos().length >= 5 && (dd === null || dd >= 14)
      ? '<section class="notice"><strong>Faça um backup</strong><span class="small muted">' + (dd === null ? 'Você ainda não salvou uma cópia do histórico.' : 'Seu último backup foi há ' + dd + ' dias.') + ' Ou entre com Google em Ajustes para guardar tudo na nuvem.</span><button type="button" class="btn sm" data-act="compartilhar">' + icon('share', 18) + 'Salvar backup agora</button></section>' : '';

    return cabecalho('Início', null, hoje) + avisoNegado() + toastHtml() + avisoRelogio(false) + remoto + hero + atalhos + lembrete + gSemana + gCargas + gMedalhas;
  }
  function atalho(act, arg, ic, rot) {
    return '<button type="button" class="atalho" data-act="' + act + '" data-arg="' + arg + '"><span class="atalho-ic">' + icon(ic, 22) + '</span><span>' + rot + '</span></button>';
  }
  function medalhasHtml(seq) {
    var m = MEDALHAS.map(function (md) {
      var on = seq.melhor >= md.n;
      return '<div class="medal' + (on ? ' on' : '') + '" role="listitem" aria-label="' + md.nome + ': ' + md.n + ' dias de sequência, ' + (on ? 'conquistada' : 'bloqueada') + '"><div class="disc" aria-hidden="true">' + md.n + '</div><span class="nm" aria-hidden="true">' + md.nome + '</span></div>';
    }).join('');
    var prox = MEDALHAS.find(function (md) { return seq.melhor < md.n; });
    var txt = prox ? 'Faltam ' + plural(prox.n - seq.atual, 'dia', 'dias') + ' de sequência para "' + prox.nome + '"' : 'Todas as medalhas do mês conquistadas.';
    var pct = prox ? Math.round(Math.min(1, seq.atual / prox.n) * 100) : 100;
    return '<div class="medals" role="list">' + m + '</div><div class="prox-medalha"><strong>' + esc(txt) + '</strong><div class="progress" aria-hidden="true"><span style="width:' + pct + '%"></span></div><span class="small muted">As medalhas recomeçam no dia 1º.</span></div>';
  }

  /* --- Treinar --- */
  function vTreinar() {
    if (D.sessao) return vSessao();
    if (ui.editor) return vEditor();
    var p = ativo(), prox = proximoTreino(p);
    var cards = p.treinos.map(function (t) {
      var ehProx = t.id === prox.id, series = t.exs.reduce(function (a, x) { return a + x.series; }, 0);
      var ult = null, h = vivos();
      for (var k = h.length - 1; k >= 0; k--) if (h[k].treinoId === t.id) { ult = h[k]; break; }
      var nomes = t.exs.map(function (x) { return x.nome; });
      return '<article class="card' + (ehProx ? ' next' : '') + '"><div class="card-top"><div class="badge" aria-hidden="true">' + esc(t.letra) + '</div><div class="info">' +
        (ehProx ? '<span class="eyebrow accent">Próximo da sequência</span>' : '') + '<h2><span class="sr-only">Treino ' + esc(t.letra) + ': </span>' + esc(t.nome || 'Sem nome') + '</h2>' +
        '<span class="small muted">' + plural(t.exs.length, 'exercício', 'exercícios') + ' · ' + plural(series, 'série', 'séries') + '</span></div></div>' + tags(t) +
        '<p class="preview">' + (nomes.length ? esc(nomes.slice(0, 3).join(' · ')) + (nomes.length > 3 ? ' · +' + (nomes.length - 3) : '') : 'Sem exercícios — use "Editar treinos".') + '</p>' +
        '<div class="card-foot"><span class="small muted">' + (ult ? 'Último: ' + ddmm(ult.dia) : 'Ainda não realizado') + '</span>' +
        '<button type="button" class="btn sm ' + (ehProx ? 'primary' : '') + '" data-act="iniciar" data-arg="' + t.id + '"' + (t.exs.length ? '' : ' disabled') + ' aria-label="Iniciar treino ' + esc(t.letra) + '">' + icon('play', 14) + 'Iniciar</button></div></article>';
    }).join('');
    return cabecalho('Treinar', 'Divisão <strong>' + esc(p.nome || 'Sem nome') + '</strong> · ' + plural(p.treinos.length, 'treino', 'treinos')) + toastHtml() +
      vAjusteProximo(p, prox) + '<div class="grid-cards">' + cards + '</div>' +
      '<button type="button" class="btn outline block" data-act="editor" data-arg="1">' + icon('edit', 18) + 'Editar divisões e treinos</button>';
  }
  function vAjusteProximo(p, prox) {
    if (p.treinos.length < 2) return '';
    var manual = !!p.proximoId, rod = proximoRodizio(p);
    return '<section class="card flat ajuste" aria-labelledby="prox-lbl"><div class="ajuste-top"><span class="label" id="prox-lbl">Próximo treino</span>' +
      (manual ? '<span class="pill">ajustado</span>' : '<span class="small muted">pelo rodízio</span>') + '</div>' +
      letrasProximo(p, prox) +
      '<span class="small muted">' + (manual ? 'Pelo rodízio seria o ' + esc(rod.letra) + '. Depois que você treinar, a sequência continua a partir do treino feito. <button type="button" class="link inline" data-act="definirProximo" data-arg="' + rod.id + '">Voltar ao rodízio</button>'
        : 'Faltou ou a semana começou por outro treino? Toque na letra para ajustar.') + '</span></section>';
  }
  function letrasProximo(p, prox) {
    return '<div class="chips" role="group" aria-label="Escolher o próximo treino">' + p.treinos.map(function (t) {
      return '<button type="button" class="letter" aria-pressed="' + (t.id === prox.id) + '" aria-label="Definir treino ' + esc(t.letra) + ', ' + esc(t.nome || 'sem nome') + ', como próximo" data-act="definirProximo" data-arg="' + t.id + '">' + esc(t.letra) + '</button>';
    }).join('') + '</div>';
  }

  function linhaRef(ref) {
    if (!ref) return '<span class="small muted">Primeira vez — sem registro anterior.</span>';
    return '<span class="small">Última (' + ddmm(ref.ult.dia) + '): <b>' + kg(ref.topSet.carga) + ' kg × ' + ref.topSet.reps + '</b></span>' + (ref.tendencia !== null ? seta(ref.tendencia) : '');
  }
  function vSessao() {
    var s = D.sessao, t = acharTreino(s.treinoId), feitos = s.feitos.filter(Boolean).length, okTot = 0;
    s.sets.forEach(function (a, i) { okTot += seriesOk(i); });
    var exs = s.exs, sug = sugeridoIdx(), pct = exs.length ? Math.round(feitos / exs.length * 100) : 0;
    var aviso = s.aviso ? '<div class="toast" role="status">' + icon('check', 18) + '<span>' + esc(s.aviso) + '</span></div>' : '';
    if (s.aviso) { s.aviso = ''; gravarLocal(); }
    var itens = s.ordem.map(function (i, pos) {
      var ex = exs[i], ok = seriesOk(i), sets = s.sets[i] || [], feito = s.feitos[i], aberta = s.atual === i, ref = refEx(ex.nome);
      var est = feito ? 'done' : ok ? 'half' : 'circle';
      var status = feito ? 'Feito' : ok ? ok + '/' + sets.length : i === sug ? 'A seguir' : '';
      var corpo = '';
      if (aberta) {
        var hojeTop = sets.filter(function (x) { return x.ok; }).reduce(function (a, x) { return Math.max(a, num(x.carga)); }, 0);
        var refCard = '<div class="ref-card">' + (ref
          ? '<div class="ref-row"><span class="muted small">Última vez · ' + ddmm(ref.ult.dia) + '</span><span class="ref-sets">' + ref.ult.sets.map(function (x) { return kg(x.carga) + '×' + x.reps; }).join('  ·  ') + '</span></div>' +
            '<div class="ref-row two"><span><span class="muted small">Recorde</span> <b>' + kg(ref.recorde) + ' kg</b></span>' + (ref.tendencia !== null ? '<span><span class="muted small">vs. anterior</span> ' + seta(ref.tendencia) + '</span>' : '') + '</div>' +
            (ok ? '<div class="ref-row hoje"><span class="muted small">Hoje (maior carga)</span><span><b>' + kg(hojeTop) + ' kg</b> ' + seta(hojeTop - ref.ult.top) + '</span></div>' : '')
          : '<span class="muted small">Primeira vez neste exercício. Os valores de hoje viram a referência do próximo treino.</span>') + '</div>';
        var linhas = sets.map(function (x, j) {
          var rot = esc(ex.nome) + ', série ' + (j + 1), ph = placeholderCarga(ex, j, ref);
          return '<div class="set-grid set-row' + (x.ok ? ' ok' : '') + '"><span class="set-n">' + (j + 1) + '</span>' +
            '<input class="num" type="text" inputmode="decimal" autocomplete="off" enterkeyhint="next" placeholder="' + esc(ph || 'kg') + '" aria-label="' + rot + ': carga em kg' + (ph ? ' (referência ' + esc(ph) + ')' : '') + '" value="' + esc(x.carga) + '" data-set="' + i + ',' + j + ',carga">' +
            '<input class="num" type="number" inputmode="numeric" min="0" enterkeyhint="done" placeholder="' + ex.reps + '" aria-label="' + rot + ': repetições (meta ' + ex.reps + ')" value="' + esc(x.reps) + '" data-set="' + i + ',' + j + ',reps">' +
            '<button type="button" class="check" aria-pressed="' + x.ok + '" aria-label="' + (x.ok ? 'Desmarcar ' : 'Concluir ') + rot + '" data-act="toggleSet" data-arg="' + i + ',' + j + '">' + icon('check', 20) + '</button></div>';
        }).join('');
        corpo = '<div class="exg-corpo">' + refCard +
          '<div class="set-grid set-labels" aria-hidden="true"><span>#</span><span>Carga (kg)</span><span>Reps</span><span></span></div>' + linhas +
          '<button type="button" class="link plain add" data-act="addSet" data-arg="' + i + '">' + icon('plus', 16) + 'Adicionar série</button>' +
          '<span class="small muted">Campo vazio usa o valor em cinza ao marcar a série.</span>' +
          (ex.trocadoDe ? '<span class="small muted">Hoje no lugar de ' + esc(ex.trocadoDe) + '.</span>' : '') +
          '<div class="row-actions exg-acoes"><button type="button" class="btn sm" data-act="sessTrocar" data-arg="' + i + '">' + icon('swap', 16) + 'Trocar exercício</button><button type="button" class="btn sm ghost" data-act="sessRemover" data-arg="' + i + '">' + icon('trash', 16) + 'Remover</button></div>' +
          '<button type="button" class="btn primary block" data-act="concluirEx"' + (ok ? '' : ' disabled') + '>' + (feito ? 'Salvar e fechar' : 'Concluir exercício') + '</button></div>';
      }
      return '<section class="ex-gaveta' + (aberta ? ' aberta' : '') + (feito ? ' feito' : '') + (i === sug && !aberta ? ' sug' : '') + '" id="exg-' + i + '">' +
        '<div class="exg-cab"><button type="button" class="exg-toggle" aria-expanded="' + aberta + '" data-act="abrirEx" data-arg="' + i + '">' +
        '<span class="st st-' + est + '" aria-hidden="true">' + icon(est, 22) + '</span><span class="mid"><b>' + esc(ex.nome) + '</b><span class="small muted">' + ex.series + ' × ' + ex.reps + (ref ? ' · última ' + kg(ref.topSet.carga) + ' kg' : '') + '</span></span>' +
        (status ? '<span class="small st-txt">' + status + '</span>' : '') + '</button>' +
        '<div class="exg-ordem"><button type="button" class="icon-btn sm" aria-label="Mover ' + esc(ex.nome) + ' para cima" data-act="mover" data-arg="' + pos + ',-1"' + (pos === 0 ? ' disabled' : '') + '>' + icon('up', 18) + '</button>' +
        '<button type="button" class="icon-btn sm" aria-label="Mover ' + esc(ex.nome) + ' para baixo" data-act="mover" data-arg="' + pos + ',1"' + (pos === s.ordem.length - 1 ? ' disabled' : '') + '>' + icon('down', 18) + '</button></div></div>' +
        corpo + '</section>';
    }).join('');
    return '<div class="sess-head"><div class="sess-row"><button type="button" class="link plain" data-act="cancelar">Cancelar</button><span class="sess-dir"><button type="button" class="chip sm-chip pre" aria-pressed="' + !!s.preTreino + '" data-act="preTreino">' + (s.preTreino ? icon('check', 16) : '') + 'Pré-treino</button><span class="timer" id="tempo" role="timer" aria-label="Tempo de treino">' + tempoSessao() + '</span></span></div>' +
      '<div class="sess-title"><div class="badge on" aria-hidden="true">' + esc(t.letra) + '</div><div class="sess-title-txt"><span class="eyebrow">Em andamento' + (sync.vinculado ? ' · na nuvem' : '') + '</span><h1>' + esc(t.nome) + '</h1></div></div>' +
      '<div class="sess-row"><div class="progress" role="progressbar" aria-valuemin="0" aria-valuemax="' + exs.length + '" aria-valuenow="' + feitos + '" aria-label="Exercícios concluídos"><span style="width:' + pct + '%"></span></div><span class="small soft nowrap">' + feitos + ' de ' + exs.length + ' exercícios</span></div></div>' +
      '<div class="sess-list">' + aviso + '<p class="small muted">Toque num exercício para abrir. Use as setas para mudar a ordem; dá para trocar, remover ou adicionar exercícios só para hoje.</p>' + itens +
      '<button type="button" class="btn outline block" data-act="sessAdicionar">' + icon('plus', 18) + 'Adicionar exercício</button></div>' +
      '<div class="sess-foot"><div class="sess-foot-inner">' + (okTot ? '' : '<span class="hint">Registre ao menos uma série para salvar.</span>') +
      '<button type="button" class="btn primary block xl" data-act="finalizar"' + (okTot ? '' : ' disabled') + '>' + icon('check', 18) + 'Concluir sessão</button></div></div>';
  }

  function vEditor() {
    var ed = progEd(), te = treinoEd(), emUso = ed.id === D.ativoId;
    var chips = D.programas.map(function (p) {
      return '<button type="button" class="chip" aria-pressed="' + (p.id === ed.id) + '" data-act="pickProg" data-arg="' + p.id + '"><span class="nome">' + esc(p.nome || 'Sem nome') + '</span>' + (p.id === D.ativoId ? '<span class="tag">· em uso</span>' : '') + '</button>';
    }).join('');
    var letras = ed.treinos.map(function (t) { return '<button type="button" class="letter" aria-pressed="' + (t.id === te.id) + '" aria-label="Treino ' + esc(t.letra) + ', ' + esc(t.nome || 'sem nome') + '" data-act="pickTreino" data-arg="' + t.id + '">' + esc(t.letra) + '</button>'; }).join('');
    var exs = te.exs.map(function (ex, i) {
      return '<div class="ex-edit"><div class="ex-edit-top"><span class="idx" aria-hidden="true">' + (i + 1) + '</span>' +
        '<input class="input" type="text" aria-label="Nome do exercício ' + (i + 1) + '" value="' + esc(ex.nome) + '" data-bind="exNome:' + i + '" enterkeyhint="done">' +
        '<button type="button" class="icon-btn" aria-label="Remover ' + esc(ex.nome) + '" data-act="removerEx" data-arg="' + i + '">' + icon('trash', 18) + '</button></div>' +
        '<div class="ex-edit-sub"><span class="tag-g">' + esc(grupoDe(ex.nome)) + '</span><span class="ex-edit-ordem"><button type="button" class="icon-btn sm" aria-label="Subir ' + esc(ex.nome) + '" data-act="moverEx" data-arg="' + i + ',-1"' + (i === 0 ? ' disabled' : '') + '>' + icon('up', 16) + '</button><button type="button" class="icon-btn sm" aria-label="Descer ' + esc(ex.nome) + '" data-act="moverEx" data-arg="' + i + ',1"' + (i === te.exs.length - 1 ? ' disabled' : '') + '>' + icon('down', 16) + '</button></span></div>' +
        '<div class="ex-edit-grid">' +
        '<div class="field tight"><span class="mini-label" id="s' + i + '">Séries</span><div class="stepper" role="group" aria-labelledby="s' + i + '"><button type="button" aria-label="Menos uma série" data-act="step" data-arg="' + i + ',series,-1">−</button><output>' + ex.series + '</output><button type="button" aria-label="Mais uma série" data-act="step" data-arg="' + i + ',series,1">+</button></div></div>' +
        '<div class="field tight"><span class="mini-label" id="r' + i + '">Reps</span><div class="stepper" role="group" aria-labelledby="r' + i + '"><button type="button" aria-label="Menos uma repetição" data-act="step" data-arg="' + i + ',reps,-1">−</button><output>' + ex.reps + '</output><button type="button" aria-label="Mais uma repetição" data-act="step" data-arg="' + i + ',reps,1">+</button></div></div>' +
        '<div class="field tight"><label class="mini-label" for="c' + i + '">Carga kg</label><input id="c' + i + '" class="num" type="text" inputmode="decimal" autocomplete="off" placeholder="0" value="' + (ex.carga ? esc(virgula(ex.carga)) : '') + '" data-bind="exCarga:' + i + '"></div>' +
        '</div></div>';
    }).join('');
    var noTreino = te.exs.map(function (x) { return x.nome; });
    return '<button type="button" class="link plain back" data-act="editor" data-arg="0">' + icon('back', 18) + 'Treinos</button>' +
      cabecalho('Editar treinos', 'Divisões, exercícios, séries e cargas.') +
      '<section class="section"><h2 class="section-title">Divisões</h2><div class="chips">' + chips + '<button type="button" class="chip dashed" data-act="novaDivisao">' + icon('plus', 16) + 'Nova divisão</button></div>' +
      '<div class="card flat"><div class="field"><label for="nome-divisao">Nome da divisão</label><input id="nome-divisao" class="input" type="text" value="' + esc(ed.nome) + '" data-bind="progNome" enterkeyhint="done"></div>' +
      '<button type="button" class="btn ' + (emUso ? '' : 'primary') + ' block" data-act="usar"' + (emUso ? ' disabled' : '') + '>' + (emUso ? 'Esta é a divisão em uso' : 'Usar esta divisão') + '</button>' +
      (!emUso && D.programas.length > 1 ? '<button type="button" class="link" data-act="excluirDiv">Excluir esta divisão</button>' : '') + '</div></section>' +
      '<section class="section"><h2 class="section-title">Treinos da divisão</h2><div class="chips">' + letras + (ed.treinos.length < 7 ? '<button type="button" class="letter add" aria-label="Adicionar treino à divisão" data-act="addTreino">' + icon('plus', 20) + '</button>' : '') + '</div></section>' +
      '<section class="card flat" style="gap:14px" aria-label="Editar treino ' + esc(te.letra) + '"><div class="field"><label for="foco-treino">Treino ' + esc(te.letra) + ' · foco</label><input id="foco-treino" class="input title" type="text" value="' + esc(te.nome) + '" data-bind="treinoNome" enterkeyhint="done"></div>' +
      (exs || '<p class="muted">Nenhum exercício neste treino ainda.</p>') +
      '<button type="button" class="btn outline block" aria-expanded="' + ui.picker + '" data-act="picker">' + icon('plus', 18) + 'Adicionar exercício</button>' +
      (ui.picker ? '<div class="picker">' + libHtml('addEx', noTreino) +
        '<div class="row-actions"><button type="button" class="chip square dashed" data-act="addEx" data-arg="">Outro (personalizado)</button><button type="button" class="btn sm" data-act="picker">Fechar lista</button></div></div>' : '') +
      (ed.treinos.length > 1 ? '<button type="button" class="link" data-act="removerTreino">Excluir treino ' + esc(te.letra) + '</button>' : '') + '</section>';
  }

  /* Biblioteca de exercícios por grupamento, com busca. act = ação ao tocar num exercício. */
  function libHtml(act, jaNaLista) {
    var abas = GRUPOS.map(function (gr) { return '<button type="button" class="chip sm-chip" aria-pressed="' + (ui.grupo === gr.g) + '" data-act="grupo" data-arg="' + esc(gr.g) + '">' + esc(gr.g) + '</button>'; }).join('');
    var lib = GRUPOS.map(function (gr) {
      return '<div class="lib-grupo" data-grupo="' + esc(gr.g) + '"' + (ui.grupo === gr.g ? '' : ' hidden') + '><span class="lib-g">' + esc(gr.g) + '</span><div class="chips">' +
        gr.ex.map(function (n) { var ja = jaNaLista.indexOf(n) >= 0; return '<button type="button" class="chip square' + (ja ? ' ja' : '') + '" data-busca="' + esc(semAcento(n + ' ' + gr.g)) + '" data-act="' + act + '" data-arg="' + esc(n) + '"' + (ja ? ' aria-label="' + esc(n) + ', já está na lista"' : '') + '>' + (ja ? icon('check', 14) : '') + esc(n) + '</button>'; }).join('') + '</div></div>';
    }).join('');
    return '<div class="busca">' + icon('search', 18) + '<input id="busca-ex" class="input" type="search" placeholder="Buscar exercício" aria-label="Buscar exercício" value="' + esc(ui.busca) + '" enterkeyhint="search" autocomplete="off"></div>' +
      '<div class="chips grupos" role="group" aria-label="Grupamento muscular">' + abas + '</div><div id="lib">' + lib + '<p class="small muted" id="lib-vazio" hidden>Nenhum exercício encontrado.</p></div>' +
      '<span class="small soft" id="flash" role="status">' + esc(ui.flash || '') + '</span>';
  }

  /* --- Evolução --- */
  function nomesComHistorico() {
    var set = {}; vivos().forEach(function (h) { h.exs.forEach(function (x) { set[x.nome] = true; }); });
    return Object.keys(set);
  }
  function vEvolucao() {
    var seq = sequencia(D.regra), nomes = nomesComHistorico(), p = ativo();
    var html = cabecalho('Evolução', 'Relatório do mês, cargas, frequência e recordes.') + toastHtml();
    html += relatorioHtml();
    if (!vivos().length) return html + '<section class="vazio card flat"><strong>Ainda sem treinos registrados</strong><span class="small muted">Os gráficos aparecem depois do primeiro treino finalizado.</span><button type="button" class="btn primary" data-act="ir" data-arg="treinar">Ir para Treinar</button></section>' + calendarioHtml(seq);
    if (!ui.evoEx || nomes.indexOf(ui.evoEx) < 0) {
      var prim = null; p.treinos.some(function (t) { return t.exs.some(function (x) { if (nomes.indexOf(x.nome) >= 0) { prim = x.nome; return true; } return false; }); });
      ui.evoEx = prim || nomes[0];
    }
    var grupos = p.treinos.map(function (t) {
      var ops = t.exs.filter(function (x) { return nomes.indexOf(x.nome) >= 0; }).map(function (x) { return '<option' + (x.nome === ui.evoEx ? ' selected' : '') + '>' + esc(x.nome) + '</option>'; }).join('');
      return ops ? '<optgroup label="Treino ' + esc(t.letra) + ' · ' + esc(t.nome) + '">' + ops + '</optgroup>' : '';
    }).join('');
    var naDivisao = {}; p.treinos.forEach(function (t) { t.exs.forEach(function (x) { naDivisao[x.nome] = true; }); });
    var outros = nomes.filter(function (n) { return !naDivisao[n]; }).sort();
    if (outros.length) grupos += '<optgroup label="Outros">' + outros.map(function (n) { return '<option' + (n === ui.evoEx ? ' selected' : '') + '>' + esc(n) + '</option>'; }).join('') + '</optgroup>';

    var regs = registrosDe(ui.evoEx), ref = refEx(ui.evoEx), modo = ui.evoModo;
    var pontos = regs.map(function (r) { return { x: ddmm(r.dia), y: modo === 'carga' ? r.top : Math.round(r.volume), dica: ddmm(r.dia) + (modo === 'carga' ? ' · ' + kg(r.topSet.carga) + ' kg × ' + r.topSet.reps : ' · ' + plural(r.sets.length, 'série', 'séries')) }; });
    if (modo === 'volume' && pontos.length > 16) pontos = pontos.slice(-16);
    var grafico = pontos.length >= 1 ? window.Graficos.registrar('evo', { tipo: modo === 'carga' ? 'linha' : 'barras', titulo: (modo === 'carga' ? 'Carga máxima' : 'Volume') + ' de ' + ui.evoEx, pontos: pontos, fmtY: function (v) { return kg(v) + ' kg'; }, fmtEixo: function (v) { return kg(v, 0); }, altura: 210, colunas: ['Data', modo === 'carga' ? 'Carga máxima' : 'Volume (kg)'] }) : '';
    var secEx = '<section class="section card flat" aria-labelledby="evo-t"><h2 class="section-title" id="evo-t">Por exercício</h2>' +
      '<div class="field"><label for="evo-ex" class="sr-only">Exercício</label><select id="evo-ex" class="input" data-change="evoEx">' + grupos + '</select></div>' +
      '<div class="segmented" role="group" aria-label="Medida"><button type="button" aria-pressed="' + (modo === 'carga') + '" data-act="evoModo" data-arg="carga">Carga máxima</button><button type="button" aria-pressed="' + (modo === 'volume') + '" data-act="evoModo" data-arg="volume">Volume (carga × reps)</button></div>' +
      grafico +
      (ref ? '<div class="stats3"><div><span class="muted small">Recorde</span><b>' + kg(ref.recorde) + ' kg</b><span class="small muted">' + ddmm(ref.recordeDia) + '</span></div><div><span class="muted small">Última</span><b>' + kg(ref.topSet.carga) + ' kg</b><span class="small muted">' + ddmm(ref.ult.dia) + '</span></div><div><span class="muted small">Registros</span><b>' + ref.n + '</b><span class="small muted">' + (ref.tendencia !== null ? (ref.tendencia > 0 ? 'subindo' : ref.tendencia < 0 ? 'caiu' : 'estável') : '—') + '</span></div></div>' : '') + '</section>';

    // frequência semanal (12 semanas)
    var hj = new Date(), dow = (hj.getDay() + 6) % 7, segAtual = addDias(hj, -dow), semanas = [];
    var diasTreino = {}; vivos().forEach(function (h) { diasTreino[h.dia] = true; });
    for (var w = 11; w >= 0; w--) {
      var ini = addDias(segAtual, -7 * w), c = 0;
      for (var d = 0; d < 7; d++) if (diasTreino[diaKey(addDias(ini, d))]) c++;
      semanas.push({ x: pad(ini.getDate()) + '/' + pad(ini.getMonth() + 1), y: c, dica: 'Semana de ' + pad(ini.getDate()) + '/' + pad(ini.getMonth() + 1) + ' · ' + plural(c, 'dia', 'dias') });
    }
    var media8 = semanas.slice(-8).reduce(function (a, s) { return a + s.y; }, 0) / 8;
    var mesK = diaKey(hj).slice(0, 7), mesAntK = diaKey(new Date(hj.getFullYear(), hj.getMonth() - 1, 1)).slice(0, 7);
    var noMes = Object.keys(diasTreino).filter(function (k) { return k.slice(0, 7) === mesK; }).length;
    var mesAnt = Object.keys(diasTreino).filter(function (k) { return k.slice(0, 7) === mesAntK; }).length;
    var secFreq = '<section class="section card flat" aria-labelledby="freq-t"><h2 class="section-title" id="freq-t">Frequência</h2>' +
      '<div class="stats3"><div><span class="muted small">Este mês</span><b>' + noMes + '</b><span class="small muted">dias treinados</span></div><div><span class="muted small">Mês anterior</span><b>' + mesAnt + '</b><span class="small muted">dias</span></div><div><span class="muted small">Média semanal</span><b>' + kg(media8, 1) + '</b><span class="small muted">últimas 8 sem.</span></div></div>' +
      window.Graficos.registrar('freq', { tipo: 'barras', titulo: 'Dias treinados por semana, últimas 12 semanas', pontos: semanas, fmtY: function (v) { return plural(v, 'dia', 'dias'); }, fmtEixo: function (v) { return String(v); }, altura: 170, colunas: ['Semana', 'Dias'] }) + '</section>';

    var prs = nomes.map(function (n) { var r = refEx(n); return { n: n, r: r }; }).filter(function (o) { return o.r && o.r.recorde > 0; })
      .sort(function (a, b) { return a.r.recordeDia < b.r.recordeDia ? 1 : -1; });
    var linhasPR = prs.map(function (o) { return '<div class="list-row"><div><span class="nome">' + esc(o.n) + '</span><span class="small muted">' + esc(grupoDe(o.n)) + ' · ' + ddmm(o.r.recordeDia) + '</span></div><span class="delta up">' + kg(o.r.recorde) + ' kg</span></div>'; }).join('');
    var gPR = gaveta('recordes', 'Recordes pessoais', plural(prs.length, 'exercício', 'exercícios'), '<div class="list">' + (linhasPR || '<p class="small muted pad">Sem recordes ainda.</p>') + '</div>');

    return html + secEx + secFreq + calendarioHtml(seq) + gPR;
  }
  function calendarioHtml(seq) {
    var agora = new Date(), primeiro = new Date(seq.Y, seq.M, 1), nDias = new Date(seq.Y, seq.M + 1, 0).getDate(), cal = '';
    for (var b = 0; b < primeiro.getDay(); b++) cal += '<span class="day vazio" aria-hidden="true"></span>';
    for (var d = 1; d <= nDias; d++) {
      var k = diaKey(new Date(seq.Y, seq.M, d)), feito = !!seq.feitos[k], naSeq = !!seq.naSequencia[k], hoje = d === seq.D, fut = d > seq.D;
      cal += '<span class="day' + (feito ? (naSeq ? ' seq' : ' feito') : '') + (hoje ? ' hoje' : '') + (fut ? ' futuro' : '') + '" aria-label="Dia ' + d + (feito ? ', treinou' + (naSeq ? ', faz parte da sequência atual' : '') : fut ? '' : ', sem treino') + (hoje ? ', hoje' : '') + '">' + d + '</span>';
    }
    var estrita = D.regra === 'estrita';
    return '<section class="section card flat" aria-labelledby="cal-t"><div class="seq-top"><div><h2 class="section-title" id="cal-t">' + esc(agora.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })) + '</h2>' +
      '<span class="seq-big">' + seq.atual + ' <small>' + (seq.atual === 1 ? 'dia' : 'dias') + ' de sequência</small></span><span class="small muted">' + esc(seq.status) + '</span></div>' +
      '<div class="seq-side"><span class="small muted">Melhor do mês</span><b>' + plural(seq.melhor, 'dia', 'dias') + '</b><span class="small muted">' + plural(seq.dias, 'treino', 'treinos') + '</span></div></div>' +
      '<div class="cal-head" aria-hidden="true"><span>D</span><span>S</span><span>T</span><span>Q</span><span>Q</span><span>S</span><span>S</span></div><div class="cal">' + cal + '</div>' +
      '<div class="legenda small"><span><i class="lg seq"></i>Sequência atual</span><span><i class="lg feito"></i>Outros dias treinados</span></div>' +
      '<span class="small muted">Regra: ' + (estrita ? 'dias seguidos, sem descanso' : 'até 2 dias de descanso seguidos não quebram a sequência') + ' (mude em Ajustes).</span></section>';
  }

  /* --- Histórico --- */
  function vHistorico() {
    var todos = vivos().slice().reverse();
    var letras = []; todos.forEach(function (h) { if (letras.indexOf(h.letra) < 0) letras.push(h.letra); }); letras.sort();
    var nomes = nomesComHistorico().sort();
    if (ui.filtroEx && nomes.indexOf(ui.filtroEx) < 0) ui.filtroEx = '';
    var lista = todos.filter(function (h) { return (!ui.filtroLetra || h.letra === ui.filtroLetra) && (!ui.filtroEx || h.exs.some(function (x) { return x.nome === ui.filtroEx; })); });
    var filtros = '<div class="filtros"><div class="chips" role="group" aria-label="Filtrar por treino"><button type="button" class="chip sm-chip" aria-pressed="' + !ui.filtroLetra + '" data-act="filtroLetra" data-arg="">Todos</button>' +
      letras.map(function (l) { return '<button type="button" class="chip sm-chip" aria-pressed="' + (ui.filtroLetra === l) + '" data-act="filtroLetra" data-arg="' + esc(l) + '">' + esc(l) + '</button>'; }).join('') + '</div>' +
      '<div class="field"><label for="f-ex" class="sr-only">Filtrar por exercício</label><select id="f-ex" class="input" data-change="filtroEx"><option value="">Todos os exercícios</option>' + nomes.map(function (n) { return '<option' + (n === ui.filtroEx ? ' selected' : '') + '>' + esc(n) + '</option>'; }).join('') + '</select></div></div>';
    var mesAtual = '', html = '';
    lista.forEach(function (h) {
      var mk = h.dia.slice(0, 7);
      if (mk !== mesAtual) { mesAtual = mk; html += '<h2 class="mes-tit">' + esc(deKey(mk + '-01').toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })) + '</h2>'; }
      var n = h.exs.reduce(function (a, x) { return a + x.sets.length; }, 0), vol = h.exs.reduce(function (a, x) { return a + x.sets.reduce(function (b2, y) { return b2 + y.carga * y.reps; }, 0); }, 0);
      var aberto = !!ui.abertoHist[h.id];
      html += '<article class="sess-item"><button type="button" aria-expanded="' + aberto + '" data-act="abrirHist" data-arg="' + h.id + '"><span class="mini" aria-hidden="true">' + esc(h.letra) + '</span><span class="mid"><b>Treino ' + esc(h.letra) + ' · ' + esc(h.nome) + '</b><span class="small muted">' + h.duracao + ' min · ' + plural(n, 'série', 'séries') + ' · ' + Math.round(vol).toLocaleString('pt-BR') + ' kg' + (h.preTreino ? ' · pré-treino' : '') + '</span></span>' +
        '<span class="dt">' + esc(deKey(h.dia).toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit' })) + '</span><span class="gaveta-seta">' + icon('chevDown', 18) + '</span></button>' +
        (aberto ? '<div class="sess-det">' + h.exs.map(function (x) { return '<div class="ex' + (x.nome === ui.filtroEx ? ' destaque' : '') + '"><b>' + esc(x.nome) + '</b><span>' + x.sets.map(function (y) { return kg(y.carga) + '×' + y.reps; }).join('  ·  ') + '</span></div>'; }).join('') +
          '<div class="row-actions"><button type="button" class="btn sm" aria-pressed="' + !!h.preTreino + '" data-act="histPre" data-arg="' + h.id + '">' + (h.preTreino ? 'Tirar marca de pré-treino' : 'Marcar: usei pré-treino') + '</button></div>' +
          '<button type="button" class="link" data-act="excluirHist" data-arg="' + h.id + '">Excluir este registro</button></div>' : '') + '</article>';
    });
    return cabecalho('Histórico', plural(todos.length, 'treino registrado', 'treinos registrados') + (sync.vinculado && sync.contagemNuvem !== null ? ' · ' + sync.contagemNuvem + ' na nuvem' : '')) + toastHtml() +
      (todos.length ? filtros + '<div class="section">' + (html || '<p class="muted">Nenhum treino com esses filtros.</p>') + '</div>' : '<p class="muted">Nenhum treino registrado ainda. Finalize um treino para ele aparecer aqui.</p>');
  }

  /* --- Corpo: composição corporal medida pelo Galaxy Watch (importada do Samsung Health) --- */
  function medidasRelogio() { return D.pesagens.filter(function (p) { return !p.apagado && p.origem === 'samsung'; }).sort(function (a, b) { return a.data < b.data ? -1 : 1; }); }
  /* padrão de medição: de manhã, entre 5h e 10h (em jejum, antes de comer e treinar).
     Fora disso, água e comida distorcem a bioimpedância. Dá para corrigir medição a medição. */
  var JANELA = { ini: 5, fim: 10 };
  function foraDoPadrao(m) {
    if (m.padraoManual === 'dentro') return false;
    if (m.padraoManual === 'fora') return true;
    var h = +m.data.slice(11, 13);
    return h < JANELA.ini || h >= JANELA.fim;
  }
  function verTodas() { return !!D.perfil.corpoTodas; }
  function pesagensAntigas() { return D.pesagens.filter(function (p) { return !p.apagado && p.origem !== 'samsung'; }).sort(function (a, b) { return a.data < b.data ? -1 : 1; }); }
  /* um ponto por dia: média das medições do dia (duas medições seguidas costumam variar 1–3 p.p.) */
  function diasCorpo() {
    var por = {}, ordem = [];
    medidasRelogio().forEach(function (m) {
      if (!verTodas() && foraDoPadrao(m)) return;
      var k = m.data.slice(0, 10);
      if (!por[k]) { por[k] = { n: 0, s: {}, c: {}, altura: null }; ordem.push(k); }
      var d = por[k]; d.n++;
      if (m.altura) d.altura = m.altura;
      MEDIDAS.forEach(function (md) { if (m[md.k] != null) { d.s[md.k] = (d.s[md.k] || 0) + m[md.k]; d.c[md.k] = (d.c[md.k] || 0) + 1; } });
    });
    return ordem.map(function (k) {
      var d = por[k], o = { dia: k, n: d.n };
      MEDIDAS.forEach(function (md) { if (d.c[md.k]) o[md.k] = d.s[md.k] / d.c[md.k]; });
      var alt = d.altura || num(D.perfil.altura);
      if (o.peso && alt > 50) o.imc = o.peso / Math.pow(alt / 100, 2);
      return o;
    });
  }
  function semMudanca(md, dif) { return Math.abs(dif) < (md.casas ? 0.05 : 0.5); }
  function difTxt(md, dif) {
    if (semMudanca(md, dif)) return 'sem mudança';
    return (dif > 0 ? '+' : '−') + kg(Math.abs(dif), md.casas) + (md.pp ? ' p.p.' : md.un);
  }
  /* barra no estilo do Samsung Health: a medição anterior fica como "sombra" atrás da atual */
  function barraCorpo(md, serie) {
    var atual = serie[serie.length - 1], v = atual[md.k];
    if (v == null) return '';
    var ant = null;
    for (var i = serie.length - 2; i >= 0; i--) if (serie[i][md.k] != null) { ant = serie[i]; break; }
    var vals = serie.map(function (d) { return d[md.k]; }).filter(function (x) { return x != null; });
    var mn = Math.min.apply(null, vals), mx = Math.max.apply(null, vals), amp = Math.max(mx - mn, Math.abs(mx) * 0.04);
    var lo = Math.max(0, mn - amp * 0.9), hi = mx + amp * 0.35;
    function pc(x) { return Math.max(3, Math.min(100, (x - lo) / (hi - lo) * 100)).toFixed(1); }
    var dif = ant ? v - ant[md.k] : null;
    var val = kg(v, md.casas) + md.un;
    var dir = dif === null || semMudanca(md, dif) ? '' : dif > 0 ? 'sobe' : 'desce';
    var dTxt = dif === null ? 'primeira medição' : difTxt(md, dif) + ' vs. ' + ddmm(ant.dia);
    return '<div class="cb-linha"><div class="cb-top"><span>' + esc(md.nome) + '</span><b>' + esc(val) + '</b></div>' +
      '<div class="cb-barra" role="img" aria-label="' + esc(md.nome + ': ' + val + (ant ? '; anterior ' + kg(ant[md.k], md.casas) + md.un : '')) + '">' +
      (ant ? '<span class="cb-sombra" style="width:' + pc(ant[md.k]) + '%"></span>' : '') + '<span class="cb-atual" style="width:' + pc(v) + '%"></span></div>' +
      '<span class="small cb-dif ' + dir + '">' + (dir ? icon(dir === 'sobe' ? 'up' : 'down', 14) : '') + esc(dTxt) + '</span></div>';
  }
  function itemPesagem(p) {
    var dt = new Date(p.data), aberto = ui.abertoPeso === p.id, extras;
    if (p.origem === 'samsung') extras = MEDIDAS.filter(function (md) { return md.k !== 'peso' && md.k !== 'imc' && p[md.k] != null; }).map(function (md) { return '<div><span class="muted small">' + esc(md.nome) + '</span><b>' + kg(p[md.k], md.casas) + esc(md.un) + '</b></div>'; }).join('');
    else extras = [['gordura', 'Gordura', '%'], ['musculo', 'Massa muscular', ' kg'], ['agua', 'Água', '%']].filter(function (x) { return p[x[0]] != null; }).map(function (x) { return '<div><span class="muted small">' + x[1] + '</span><b>' + kg(p[x[0]], 1) + x[2] + '</b></div>'; }).join('');
    var resumo = kg(p.peso, 1) + ' kg' + (p.gordura != null ? ' · ' + kg(p.gordura, 1) + '%' : p.origem === 'samsung' ? ' · só peso' : '');
    var fora = p.origem === 'samsung' && foraDoPadrao(p);
    return '<article class="sess-item"><button type="button" aria-expanded="' + aberto + '" data-act="abrirPeso" data-arg="' + esc(p.id) + '"><span class="mini peso" aria-hidden="true">' + icon('body', 18) + '</span><span class="mid"><b>' + esc(resumo) + '</b><span class="small muted">' + (p.origem === 'samsung' ? 'Galaxy Watch' : p.origem === 'balanca' ? 'Balança (Bluetooth)' : 'Manual') + (fora ? ' · <span class="tag-fora">fora do padrão</span>' : '') + '</span></span>' +
      '<span class="dt">' + dt.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' }) + ' ' + pad(dt.getHours()) + ':' + pad(dt.getMinutes()) + '</span><span class="gaveta-seta">' + icon('chevDown', 18) + '</span></button>' +
      (aberto ? '<div class="sess-det">' + (extras ? '<div class="stats3 compact">' + extras + '</div>' : '') +
        (p.origem === 'samsung' ? '<span class="small muted">' + (fora ? 'Fora do padrão' + (p.padraoManual ? ' (marcada por você)' : ' (feita fora das ' + JANELA.ini + 'h–' + JANELA.fim + 'h)') + ': não entra nas barras nem nos gráficos.' : 'Dentro do padrão' + (p.padraoManual ? ' (marcada por você)' : '') + '.') + '</span>' +
          '<div class="row-actions"><button type="button" class="btn sm" data-act="padraoMedida" data-arg="' + esc(p.id) + '">' + (fora ? 'Considerar dentro do padrão' : 'Marcar como fora do padrão') + '</button></div>' : '') +
        '<button type="button" class="link" data-act="excluirPeso" data-arg="' + esc(p.id) + '">Excluir este registro</button></div>' : '') + '</article>';
  }
  function gavetaAntigas() {
    var antigas = pesagensAntigas();
    if (!antigas.length) return '';
    return gaveta('pesagens-antigas', 'Registros anteriores (OKOK e manuais)', plural(antigas.length, 'registro', 'registros'),
      '<p class="small muted">Ficam guardados, mas não entram nos gráficos: vêm de outro aparelho e de outro método de medição.</p><div class="section">' + antigas.slice().reverse().map(itemPesagem).join('') + '</div>', false);
  }
  function vCorpo() {
    var html = cabecalho('Corpo', 'Composição corporal medida pelo Galaxy Watch.') + toastHtml() + avisoRelogio(true);
    var serie = diasCorpo(), medidas = medidasRelogio();
    var nFora = medidas.filter(foraDoPadrao).length;
    var avisoFora = nFora ? '<div class="cb-fora"><span class="small">' + (verTodas() ? 'Mostrando todas as medições, inclusive ' + plural(nFora, 'fora do padrão', 'fora do padrão') + '.' : plural(nFora, 'medição feita fora do padrão (antes das ' + JANELA.ini + 'h ou depois das ' + JANELA.fim + 'h) ficou', 'medições feitas fora do padrão (antes das ' + JANELA.ini + 'h ou depois das ' + JANELA.fim + 'h) ficaram') + ' fora das barras e dos gráficos.') + '</span>' +
      '<button type="button" class="btn sm ghost" aria-pressed="' + verTodas() + '" data-act="corpoTodas">' + (verTodas() ? 'Só as do padrão' : 'Mostrar todas') + '</button></div>' : '';
    var importar = '<button type="button" class="btn sm outline" data-act="importarRelogio">' + icon('upload', 16) + 'Importar</button>';
    if (!serie.length && medidas.length) {
      return html + '<section class="vazio card flat"><strong>Nenhuma medição dentro do padrão</strong><span class="small muted">Todas as medições foram feitas fora da janela da manhã (' + JANELA.ini + 'h–' + JANELA.fim + 'h).</span>' + avisoFora + '</section>' +
        gaveta('medicoes', 'Medições do relógio', plural(medidas.length, 'registro', 'registros'), '<div class="section">' + medidas.slice().reverse().map(itemPesagem).join('') + '</div>', false) + gavetaAntigas();
    }
    if (!serie.length) {
      return html + '<section class="vazio card flat"><strong>Nenhuma medição do relógio ainda</strong><span class="small muted">No relógio, abra Composição corporal, informe o peso da balança e faça a medição. Depois exporte no Samsung Health (menu › Configurações › Baixar dados pessoais) e importe aqui: vêm todas as medições já feitas.</span>' +
        '<button type="button" class="btn primary" data-act="importarRelogio">' + icon('upload', 18) + 'Importar do Samsung Health</button></section>' + gavetaAntigas();
    }
    var comBia = serie.filter(function (d) { return d.gordura != null; });
    var ref = comBia.length ? comBia[comBia.length - 1] : serie[serie.length - 1];
    var cab = '<div class="cb-cab"><div><span class="eyebrow">Última medição completa</span><b>' + esc(deKey(ref.dia).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })) + '</b>' +
      (ref.n > 1 ? '<span class="small muted">média de ' + ref.n + ' medições do dia</span>' : '') + '</div>' + importar + '</div>';
    var bars = MEDIDAS.map(function (md) { var s2 = md.k === 'peso' ? serie : comBia; return s2.length ? barraCorpo(md, s2) : ''; }).join('');
    var legenda = '<div class="legenda small"><span><i class="lg cb-l-atual"></i>Atual</span><span><i class="lg cb-l-sombra"></i>Medição anterior</span></div>';
    var secAtual = '<section class="section card flat" aria-labelledby="cb-t"><h2 class="section-title" id="cb-t">Composição corporal</h2>' + cab + '<div class="cb-lista">' + bars + '</div>' + legenda + avisoFora + '</section>';

    var desde = ui.corpoPeriodo ? diaKey(new Date(Date.now() - ui.corpoPeriodo * 86400000)) : '';
    var noPer = serie.filter(function (d) { return d.dia >= desde; });
    var per = [[90, '90 dias'], [180, '6 meses'], [365, '1 ano'], [0, 'Tudo']].map(function (o) { return '<button type="button" aria-pressed="' + (ui.corpoPeriodo === o[0]) + '" data-act="corpoPeriodo" data-arg="' + o[0] + '">' + o[1] + '</button>'; }).join('');
    var trio = [
      { k: 'peso', curto: 'Peso', nome: 'Peso', un: ' kg', casas: 1, id: 'corpo-peso' },
      { k: 'musculoEsq', curto: 'Músculo esq.', nome: 'Massa muscular esquelética', un: ' kg', casas: 1, id: 'corpo-musc' },
      { k: 'gordura', curto: 'Gordura', nome: 'Gordura corporal', un: '%', casas: 1, pp: true, id: 'corpo-gord' }
    ];
    function mudanca(md) {
      var pts = noPer.filter(function (d) { return d[md.k] != null; });
      if (pts.length < 2) return '<div><span class="muted small">' + esc(md.curto) + '</span><b>—</b><span class="small muted">poucos dados</span></div>';
      var dif = pts[pts.length - 1][md.k] - pts[0][md.k];
      return '<div><span class="muted small">' + esc(md.curto) + '</span><b>' + esc(difTxt(md, dif)) + '</b><span class="small muted">desde ' + ddmm(pts[0].dia) + '</span></div>';
    }
    var graficos = trio.map(function (md) {
      var pts = noPer.filter(function (d) { return d[md.k] != null; }).map(function (d) {
        return { x: ddmm(d.dia), t: deKey(d.dia).getTime(), y: Math.round(d[md.k] * 10) / 10, dica: deKey(d.dia).toLocaleDateString('pt-BR') + (d.n > 1 ? ' · média de ' + d.n + ' medições' : '') };
      });
      return '<h3 class="rel-sub">' + esc(md.nome) + '</h3>' + (pts.length ? window.Graficos.registrar(md.id, { tipo: 'linha', titulo: md.nome, pontos: pts, fmtY: function (v) { return kg(v, 1) + md.un; }, fmtEixo: function (v) { return kg(v, 1); }, altura: 180, colunas: ['Data', md.nome] }) : '<p class="small muted">Sem medições neste período.</p>');
    }).join('');
    var secEvo = '<section class="section card flat" aria-labelledby="ce-t"><h2 class="section-title" id="ce-t">Evolução</h2><div class="segmented quatro" role="group" aria-label="Período">' + per + '</div>' +
      '<div class="stats3">' + trio.map(mudanca).join('') + '</div>' + graficos +
      '<span class="small muted">Para a comparação valer, meça sempre nas mesmas condições: de manhã (entre ' + JANELA.ini + 'h e ' + JANELA.fim + 'h), em jejum, depois de ir ao banheiro e antes de treinar. A bioimpedância erra de 3 a 5 p.p. no valor absoluto; o que importa é a tendência.</span></section>';
    var lista = gaveta('medicoes', 'Medições do relógio', plural(medidas.length, 'registro', 'registros'), '<div class="section">' + medidas.slice().reverse().map(itemPesagem).join('') + '</div>', false);
    return html + secAtual + secEvo + lista + gavetaAntigas();
  }

  /* --- Ajustes --- */
  function vAjustes() {
    var u = sync.usuario, e = estadoSync();
    var conta;
    if (!sync.disponivel) conta = '<p class="small muted">A nuvem não carregou (sem internet ou bloqueio). O app continua salvando neste aparelho.</p>';
    else if (!u) conta = '<p class="small">Entre com sua conta Google para guardar treinos, pesagens e configurações na nuvem e usar o app no celular e no computador.</p><button type="button" class="btn primary block" data-act="entrar">' + icon('cloud', 18) + 'Entrar com Google</button>';
    else conta = '<div class="conta"><span class="small muted">Conectado como</span><b>' + esc(u.email || '') + '</b><span class="small">' + (e ? '<span class="sync-inline ' + e.cls + '"><span class="dot"></span>' + esc(e.txt) + '</span>' : '') + (sync.vinculado && sync.contagemNuvem !== null ? ' · ' + plural(sync.contagemNuvem, 'treino', 'treinos') + ' na nuvem' : '') + '</span></div>' +
      (!sync.vinculado && !sync.negado ? '<button type="button" class="btn primary block" data-act="revincular">Vincular dados a esta conta</button>' : '') +
      '<button type="button" class="btn block" data-act="sair">Sair da conta</button><span class="small muted">Ao sair, os dados continuam neste aparelho.</span>';
    var temas = [['auto', 'Automático', 'segue o sistema', '#101214', '#FF7A2F', '#FFFFFF', '#C8102E'], ['claro', 'Claro', 'branco e vermelho', '#FFFFFF', '#C8102E'], ['escuro', 'Escuro', 'preto e laranja', '#101214', '#FF7A2F']];
    var temaHtml = '<div class="temas tres" role="group" aria-labelledby="tema-lbl">' + temas.map(function (t) {
      var am = t[0] === 'auto' ? '<span class="amostra dupla" aria-hidden="true"><span style="background:#101214"><i style="background:#FF7A2F"></i></span><span style="background:#FFFFFF"><i style="background:#C8102E"></i></span></span>' : '<span class="amostra" style="background:' + t[3] + '" aria-hidden="true"><i style="background:' + t[4] + '"></i></span>';
      return '<button type="button" class="tema-op" aria-pressed="' + (D.tema === t[0]) + '" data-act="tema" data-arg="' + t[0] + '">' + am + '<span><b>' + t[1] + '</b><span class="small muted">' + t[2] + '</span></span></button>';
    }).join('') + '</div>';
    var estrita = D.regra === 'estrita';
    var bk = D.ultimoBackup ? 'Último backup: ' + new Date(D.ultimoBackup).toLocaleDateString('pt-BR') + '.' : 'Nenhum backup feito ainda.';
    var podeCompartilhar = !!(navigator.canShare && window.File);
    return cabecalho('Ajustes', null) + avisoNegado() + toastHtml() +
      '<section class="section card flat" aria-labelledby="conta-t"><h2 class="section-title" id="conta-t">Conta e nuvem</h2>' + conta + '</section>' +
      '<section class="section card flat"><h2 class="section-title" id="tema-lbl">Aparência</h2>' + temaHtml + '</section>' +
      '<section class="section card flat"><h2 class="section-title" id="regra-lbl">Sequência</h2><div class="segmented" role="group" aria-labelledby="regra-lbl"><button type="button" aria-pressed="' + !estrita + '" data-act="regra" data-arg="descanso">Até 2 descansos</button><button type="button" aria-pressed="' + estrita + '" data-act="regra" data-arg="estrita">Dias seguidos</button></div>' +
      '<span class="small muted">' + (estrita ? 'Cada dia sem treino zera a sequência.' : 'Até 2 dias de descanso seguidos não quebram a sequência; o 3º dia sem treino quebra. Só dias treinados contam.') + '</span></section>' +
      '<section class="section card flat"><h2 class="section-title">Relógio (Samsung Health)</h2><span class="small muted">' + (D.saude.length ? plural(D.saude.length, 'dia importado', 'dias importados') + ', de ' + ddmm(saudeOrdenada()[0].dia) + ' a ' + esc(deKey(saudeOrdenada()[D.saude.length - 1].dia).toLocaleDateString('pt-BR')) + '. Importar de novo só acrescenta ou atualiza dias.' : 'Nenhum dado importado.') + ' No Samsung Health: menu › Configurações › Baixar dados pessoais; aqui, escolha o .zip ou os .csv da pasta.</span>' +
      '<div class="row-actions"><button type="button" class="btn sm" data-act="importarRelogio">' + icon('upload', 18) + 'Importar dados do relógio</button></div>' +
      '<span class="small" id="lemb-lbl">Lembrete para sincronizar e importar</span><div class="segmented quatro" role="group" aria-labelledby="lemb-lbl">' + [[7, '7 dias'], [14, '14 dias'], [30, '30 dias'], [0, 'Desligado']].map(function (o) { return '<button type="button" aria-pressed="' + (lembreteDias() === o[0]) + '" data-act="lembreteDias" data-arg="' + o[0] + '">' + o[1] + '</button>'; }).join('') + '</div></section>' +
      '<section class="section card flat"><h2 class="section-title">Dados e backup</h2><span class="small muted">' + (armazenamentoOk ? 'Uma cópia dos dados fica sempre neste aparelho. ' : 'Este navegador está bloqueando o salvamento — exporte um backup. ') + esc(bk) + '</span>' +
      '<div class="row-actions">' + (podeCompartilhar ? '<button type="button" class="btn sm" data-act="compartilhar">' + icon('share', 18) + 'Enviar backup</button>' : '') +
      '<button type="button" class="btn sm" data-act="exportar">' + icon('download', 18) + 'Exportar backup</button><button type="button" class="btn sm" data-act="importar">' + icon('upload', 18) + 'Importar backup</button></div>' +
      (sync.vinculado ? '<span class="small muted">Com a nuvem ativa, importar um backup junta os registros pelo identificador, sem apagar nada.</span>' : '<button type="button" class="link" data-act="zerar">Apagar tudo deste aparelho e recomeçar</button>') + '</section>' +
      (eventoInstalar ? '<button type="button" class="btn primary block" data-act="instalar">Instalar app no celular</button>' : '') +
      '<p class="small muted center">Diário de Treino ' + VERSAO_APP + '</p>';
  }

  function vNav() {
    function tab(id, rot, ic) { return '<button type="button" class="tab" data-act="ir" data-arg="' + id + '"' + (ui.tela === id ? ' aria-current="page"' : '') + '>' + icon(ic, 22) + '<span>' + rot + '</span></button>'; }
    return tab('inicio', 'Início', 'home') + tab('treinar', 'Treinar', 'dumbbell') + tab('evolucao', 'Evolução', 'chart') + tab('historico', 'Histórico', 'cal') + tab('corpo', 'Corpo', 'body') + tab('ajustes', 'Ajustes', 'gear');
  }

  /* ---------- diálogos ---------- */
  function renderOverlay() {
    var c = ui.confirm;
    if (!c) { $overlay.innerHTML = ''; document.body.classList.remove('com-dialogo'); return; }
    document.body.classList.add('com-dialogo');
    var corpo;
    if (c.tipo === 'exSessao') {
      var tS = acharTreino(D.sessao.treinoId), exT = c.modo === 'trocar' ? D.sessao.exs[c.idx] : null;
      corpo = '<h2 id="dlg-t">' + (c.modo === 'add' ? 'Adicionar exercício' : 'Trocar ' + esc(exT.nome)) + '</h2>' +
        '<p id="dlg-d">' + (c.modo === 'add' ? 'Entra no fim da lista de hoje.' : 'O substituto fica no mesmo lugar, com as mesmas séries e repetições.' + (seriesOk(c.idx) ? ' As séries já marcadas deste exercício serão descartadas.' : '')) + '</p>' +
        '<label class="toggle"><input type="checkbox" data-act="exPerm"' + (c.perm ? ' checked' : '') + '> ' + (c.modo === 'add' ? 'Incluir também no treino ' : 'Trocar também no treino ') + esc(tS ? tS.letra : '') + ' (próximas vezes)</label>' +
        libHtml('escolherEx', D.sessao.exs.map(function (x) { return x.nome; })) +
        '<div class="field tight"><label for="ex-custom">Ou digite outro exercício</label><div class="linha-input"><input id="ex-custom" class="input" type="text" autocomplete="off" placeholder="ex.: Supino na Smith" enterkeyhint="done"><button type="button" class="btn sm" data-act="escolherEx" data-arg="">Usar</button></div></div>' +
        '<div class="acts"><button type="button" class="btn" data-act="fechar">Cancelar</button></div>';
    }
    else if (c.tipo === 'sessRemover') {
      var exR = D.sessao.exs[c.alvo], tR = acharTreino(D.sessao.treinoId);
      corpo = '<h2 id="dlg-t">Remover ' + esc(exR.nome) + '?</h2><p id="dlg-d">Sai do treino de hoje' + (seriesOk(c.alvo) ? ', junto com as ' + plural(seriesOk(c.alvo), 'série marcada', 'séries marcadas') : '') + '. Os registros antigos continuam no histórico.</p>' +
        '<label class="toggle"><input type="checkbox" data-act="exPerm"' + (c.perm ? ' checked' : '') + '> Remover também do treino ' + esc(tR ? tR.letra : '') + ' (próximas vezes)</label>' +
        '<div class="acts"><button type="button" class="btn" data-act="fechar">Manter</button><button type="button" class="btn danger" data-act="confirmar">Remover</button></div>';
    }
    else if (c.tipo === 'importarSaude') {
      var qtd = c.novos + c.mudados + c.medNovas + c.medMud;
      corpo = '<h2 id="dlg-t">Exportação do Samsung Health</h2><p id="dlg-d">' + plural(c.total, 'dia', 'dias') + (c.ini ? ', de ' + esc(deKey(c.ini).toLocaleDateString('pt-BR')) + ' a ' + esc(deKey(c.fim).toLocaleDateString('pt-BR')) : '') + ': ' +
        plural(c.novos, 'novo', 'novos') + ', ' + plural(c.mudados, 'atualizado', 'atualizados') + '.' + (c.medTotal ? ' Composição corporal: ' + plural(c.medTotal, 'medição', 'medições') + ' (' + plural(c.medNovas, 'nova', 'novas') + (c.medMud ? ', ' + plural(c.medMud, 'atualizada', 'atualizadas') : '') + ').' : '') + '</p>' +
        '<p class="small muted">Encontrado: ' + esc(c.achados.map(function (k) { return NOMES_ACHADOS[k] || k; }).join(', ')) + '. O app guarda só um resumo por dia' + (sync.vinculado ? ', também na sua conta' : '') + '; os arquivos originais não saem do aparelho. Nada do que você registrou no app é alterado.</p>' +
        '<div class="acts">' + (qtd ? '<button type="button" class="btn" data-act="fechar">Cancelar</button><button type="button" class="btn primary" data-act="confirmar">Importar</button>' : '<button type="button" class="btn primary" data-act="fechar">Nada novo · Fechar</button>') + '</div>';
    }
    else if (c.tipo === 'trocar') corpo = '<h2 id="dlg-t">Trocar o próximo treino</h2><p id="dlg-d">Escolha com qual treino seguir. Depois de treinar, o rodízio continua a partir dele.</p>' + letrasProximo(ativo(), proximoTreino(ativo())) +
      '<div class="acts"><button type="button" class="btn" data-act="fechar">Fechar</button></div>';
    else if (c.tipo === 'migrarConflito') corpo = '<h2 id="dlg-t">Há dados neste aparelho e na nuvem</h2><p id="dlg-d">Aparelho: ' + plural(c.nl, 'treino', 'treinos') + ', ' + plural(c.pl, 'pesagem', 'pesagens') + '. Nuvem: ' + plural(c.nr, 'treino', 'treinos') + ', ' + plural(c.pr, 'pesagem', 'pesagens') + '. Antes de qualquer opção, um backup deste aparelho será baixado.</p>' +
      '<div class="acts col"><button type="button" class="btn primary" data-act="confirmar" data-arg="juntar">Juntar os dois, sem duplicar</button><button type="button" class="btn" data-act="confirmar" data-arg="nuvem">Manter só o que está na nuvem</button><button type="button" class="btn" data-act="confirmar" data-arg="local">Substituir a nuvem pelos dados deste aparelho</button><button type="button" class="btn ghost" data-act="fechar">Decidir depois</button></div>';
    else {
      var ed = progEd(), te = treinoEd();
      var txt = {
        migrarEnviar: ['Enviar meus dados deste aparelho para a nuvem', 'Sua conta ainda não tem dados. Serão enviados ' + plural(vivos().length, 'treino', 'treinos') + ', ' + plural(pesagensVivas().length, 'pesagem', 'pesagens') + ' e suas divisões. Antes, um backup em arquivo será baixado. Nada é apagado deste aparelho.', 'Enviar para a nuvem', 'Agora não', false],
        finalizarParcial: ['Concluir com exercícios pendentes?', plural(c.pend || 0, 'exercício ficou', 'exercícios ficaram') + ' sem nenhuma série marcada e não entra' + ((c.pend || 0) === 1 ? '' : 'm') + ' no registro de hoje.', 'Concluir sessão', 'Voltar ao treino', false],
        descartar: ['Descartar este treino?', 'As séries marcadas não serão salvas e o dia não conta na sequência.', 'Descartar', 'Continuar treino', true],
        excluirHist: ['Excluir este registro?', 'Ele sai do histórico e pode reduzir sua sequência e medalhas do mês.' + (sync.vinculado ? ' A exclusão chega aos outros aparelhos.' : ''), 'Excluir', 'Manter', true],
        excluirPeso: ['Excluir esta pesagem?', 'Ela sai do acompanhamento e dos gráficos.', 'Excluir', 'Manter', true],
        excluirDiv: ['Excluir a divisão "' + (ed.nome || 'sem nome') + '"?', 'Os treinos configurados nela serão apagados. O histórico já registrado continua.', 'Excluir', 'Manter', true],
        removerTreino: ['Excluir o treino ' + te.letra + '?', 'Os exercícios configurados nele serão apagados. O histórico já registrado continua.', 'Excluir', 'Manter', true],
        removerEx: ['Remover "' + (c.nome || 'exercício') + '"?', 'Ele sai deste treino. Os registros antigos continuam no histórico.', 'Remover', 'Manter', true],
        importar: ['Importar este backup?', 'O backup tem ' + plural((c.dados && c.dados.historico.filter(function (h) { return !h.apagado; }).length) || 0, 'treino', 'treinos') + ' e ' + plural((c.dados && (c.dados.pesagens || []).length) || 0, 'pesagem', 'pesagens') + '. ' + (sync.vinculado ? 'Os registros serão juntados aos atuais, sem duplicar.' : 'Os dados atuais deste aparelho serão substituídos.'), 'Importar', 'Cancelar', !sync.vinculado],
        zerar: ['Apagar tudo e recomeçar?', 'Divisões, treinos, pesagens e todo o histórico deste aparelho serão apagados. Faça um backup antes se quiser guardar.', 'Apagar tudo', 'Cancelar', true]
      }[c.tipo];
      corpo = '<h2 id="dlg-t">' + esc(txt[0]) + '</h2><p id="dlg-d">' + esc(txt[1]) + '</p><div class="acts"><button type="button" class="btn" data-act="fechar">' + esc(txt[3]) + '</button><button type="button" class="btn ' + (txt[4] ? 'danger' : 'primary') + '" data-act="confirmar">' + esc(txt[2]) + '</button></div>';
    }
    $overlay.innerHTML = '<div class="overlay" data-fundo="1"><div class="sheet' + (c.tipo === 'exSessao' ? ' alta' : '') + '" role="dialog" aria-modal="true" aria-labelledby="dlg-t">' + corpo + '</div></div>';
    if (c.tipo === 'exSessao') aplicarBusca();
    var alvo = $overlay.querySelector('[autofocus]') || $overlay.querySelector('[data-act="fechar"]') || $overlay.querySelector('button');
    if (alvo && c.tipo !== 'exSessao') alvo.focus();
  }
  /* ---------- render ---------- */
  function preferenciaClara() { return D.tema === 'claro' || (D.tema === 'auto' && window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches); }
  function aplicarTema() {
    var claro = preferenciaClara();
    if (claro) document.documentElement.setAttribute('data-tema', 'claro'); else document.documentElement.removeAttribute('data-tema');
    var m = document.querySelector('meta[name="theme-color"]'); if (m) m.setAttribute('content', claro ? '#FFFFFF' : '#101214');
    try { localStorage.setItem('diario-treino-tema', D.tema); } catch (e) {}
  }
  function render() {
    renderPendente = false;
    aplicarTema();
    var emSessao = !!D.sessao && ui.tela === 'treinar';
    $view.classList.toggle('sessao', emSessao);
    $nav.innerHTML = vNav();
    var mapa = { inicio: vInicio, treinar: vTreinar, evolucao: vEvolucao, historico: vHistorico, corpo: vCorpo, ajustes: vAjustes };
    $view.innerHTML = (mapa[ui.tela] || vInicio)();
    aplicarBusca();
    if (window.Graficos) window.Graficos.desenharTodos($view);
    var nomes = { inicio: 'Início', treinar: emSessao ? 'Treinando' : 'Treinar', evolucao: 'Evolução', historico: 'Histórico', corpo: 'Corpo', ajustes: 'Ajustes' };
    document.title = (nomes[ui.tela] || 'Início') + ' · Diário de Treino';
    renderSync();
  }
  /* Atualizações vindas da nuvem não redesenham enquanto você digita num campo. */
  function renderSeguro() {
    var a = document.activeElement;
    if (a && $view.contains(a) && (a.tagName === 'INPUT' || a.tagName === 'SELECT' || a.tagName === 'TEXTAREA')) { renderPendente = true; return; }
    render();
  }

  function aplicarBusca() {
    var lib = document.getElementById('lib');
    if (!lib) return;
    var q = semAcento(ui.busca).trim(), algum = false, palavras = q.split(/\s+/).filter(Boolean); // cada palavra precisa aparecer, em qualquer ordem
    lib.querySelectorAll('.lib-grupo').forEach(function (sec) {
      var vis = 0;
      sec.querySelectorAll('[data-busca]').forEach(function (b) { var t = b.getAttribute('data-busca'); var ok = !q || palavras.every(function (p) { return t.indexOf(p) >= 0; }); b.hidden = !ok; if (ok) vis++; });
      sec.hidden = q ? vis === 0 : sec.getAttribute('data-grupo') !== ui.grupo;
      if (!sec.hidden) algum = true;
    });
    var vazio = document.getElementById('lib-vazio'); if (vazio) vazio.hidden = algum;
    document.querySelectorAll('.grupos').forEach(function (g) { g.hidden = !!q; });
  }

  /* ---------- eventos ---------- */
  document.addEventListener('click', function (e) {
    if (e.target.getAttribute && e.target.getAttribute('data-fundo')) { fecharConfirm(false); return; }
    var el = e.target.closest('[data-act]');
    if (!el || el.disabled) return;
    var fn = A[el.getAttribute('data-act')];
    if (!fn) return;
    if (el.type !== 'checkbox') e.preventDefault();
    fn(el.getAttribute('data-arg') || '', el);
  });
  document.addEventListener('change', function (e) {
    var el = e.target, k = el.getAttribute && el.getAttribute('data-change');
    if (k === 'evoEx') { ui.evoEx = el.value; render(); var s = document.getElementById('evo-ex'); if (s) s.focus(); }
    else if (k === 'filtroEx') { ui.filtroEx = el.value; render(); var f = document.getElementById('f-ex'); if (f) f.focus(); }
  });
  document.addEventListener('input', function (e) {
    var el = e.target, v = el.value;
    if (el.id === 'busca-ex') { ui.busca = v; aplicarBusca(); return; }
    var set = el.getAttribute('data-set');
    if (set && D.sessao) { var a = set.split(','); D.sessao.sets[+a[0]][+a[1]][a[2]] = v; salvar(); return; }
    var bind = el.getAttribute('data-bind');
    if (!bind) return;
    var parts = bind.split(':');
    if (parts[0] === 'progNome') progEd().nome = v;
    else if (parts[0] === 'treinoNome') treinoEd().nome = v;
    else if (parts[0] === 'exNome') treinoEd().exs[+parts[1]].nome = v;
    else if (parts[0] === 'exCarga') treinoEd().exs[+parts[1]].carga = v === '' ? 0 : num(v);
    else if (parts[0] === 'altura') { D.perfil.altura = v === '' ? null : num(v); salvar(); return; }
    marcarEdicao(); salvar();
  });
  document.addEventListener('focusout', function () { setTimeout(function () { if (renderPendente) renderSeguro(); }, 0); });
  document.addEventListener('focusin', function (e) {
    var el = e.target;
    if (!el.classList || !el.classList.contains('num')) return;
    try { el.select(); } catch (err) {}
    el.setAttribute('data-sel', '1');
  });
  ['mouseup', 'pointerup', 'touchend'].forEach(function (tipo) {
    document.addEventListener(tipo, function (e) {
      var el = e.target;
      if (el.getAttribute && el.getAttribute('data-sel')) {
        el.removeAttribute('data-sel');
        if (tipo !== 'touchend') e.preventDefault();
        setTimeout(function () { try { if (document.activeElement === el) el.select(); } catch (err) {} }, 0);
      }
    });
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && ui.confirm) { fecharConfirm(false); return; }
    if (e.key === 'Enter' && e.target.id === 'ex-custom') { e.preventDefault(); A.escolherEx(''); return; }
    if (e.key === 'Enter' && e.target.matches && e.target.matches('#view input[type="text"]')) e.target.blur();
  });

  $saudeFile.addEventListener('change', function () {
    if ($saudeFile.files && $saudeFile.files.length) lerSaude($saudeFile.files);
  });
  $import.addEventListener('change', function () {
    var f = $import.files && $import.files[0];
    if (!f) return;
    var r = new FileReader();
    r.onload = function () {
      try {
        var d = JSON.parse(r.result);
        if (!valido(d)) throw new Error('formato');
        abrirConfirm({ tipo: 'importar', dados: d });
      } catch (err) { mostrarToast('Esse arquivo não é um backup válido do Diário de Treino.'); render(); }
    };
    r.readAsText(f);
  });

  window.addEventListener('popstate', function (e) {
    if (ui.voltandoDialogo) { ui.voltandoDialogo = false; return; }
    if (ui.confirm) { ui.confirm = null; renderOverlay(); return; }
    ui.tela = (e.state && e.state.tela) || 'inicio';
    if (ui.tela !== 'treinar') ui.editor = false;
    ui.picker = false;
    render();
  });
  document.addEventListener('visibilitychange', function () {
    if (document.visibilityState === 'visible') { pedirTelaLigada(); if (!D.sessao) renderSeguro(); }
    else if (sync.timer) { clearTimeout(sync.timer); enviarDiferencas(); }
  });
  window.addEventListener('pagehide', function () { if (sync.timer) { clearTimeout(sync.timer); enviarDiferencas(); } });
  window.addEventListener('beforeunload', function (e) {
    if (sync.vinculado && (sync.pendentes > 0 || sync.timer)) { e.preventDefault(); e.returnValue = ''; }
  });
  window.addEventListener('online', function () { renderSync(); if (sync.usuario && !sync.vinculado && !sync.negado) iniciarVinculo(); });
  window.addEventListener('offline', renderSync);
  window.addEventListener('storage', function (e) {
    if (e.key === CHAVE && e.newValue && !sync.vinculado) { try { var d = JSON.parse(e.newValue); if (valido(d)) { D = normalizar(d); renderSeguro(); } } catch (err) {} }
  });
  if (window.matchMedia) {
    var mq = window.matchMedia('(prefers-color-scheme: light)');
    var aoMudar = function () { if (D.tema === 'auto') { aplicarTema(); if (window.Graficos) window.Graficos.desenharTodos($view); } };
    if (mq.addEventListener) mq.addEventListener('change', aoMudar); else if (mq.addListener) mq.addListener(aoMudar);
  }
  window.addEventListener('beforeinstallprompt', function (e) { e.preventDefault(); eventoInstalar = e; if (ui.tela === 'ajustes') render(); });
  window.addEventListener('appinstalled', function () { eventoInstalar = null; mostrarToast('App instalado. Abra pelo ícone "Treino".'); render(); });

  // nuvem
  window.addEventListener('nuvem-pronta', function () { sync.disponivel = true; if (ui.tela === 'ajustes') renderSeguro(); });
  window.addEventListener('nuvem-usuario', function (e) {
    var u = e.detail;
    if (!u) {
      if (sync.parar) sync.parar();
      sync.parar = null; sync.usuario = null; sync.vinculado = false; sync.negado = false; sync.erro = null; sync.contagemNuvem = null; sync.liveRemoto = null;
      sync.ultimo = { config: null, prefs: null, live: null, s: {}, w: {}, h: {} };
      renderSeguro(); return;
    }
    if (sync.usuario && sync.usuario.uid === u.uid) return;
    sync.usuario = u; sync.negado = false;
    iniciarVinculo();
  });
  window.addEventListener('nuvem-estado', function (e) { sync.pendentes = e.detail.pendentes; sync.erro = e.detail.erro; renderSync(); });
  window.addEventListener('nuvem-erro-login', function (e) {
    var c = e.detail && e.detail.codigo;
    if (c && c !== 'auth/popup-closed-by-user') { mostrarToast(c === 'auth/unauthorized-domain' ? 'Este endereço ainda não está autorizado no Firebase (Authentication › Domínios autorizados).' : 'Não foi possível concluir o login: ' + c); renderSeguro(); }
  });

  setInterval(function () { var el = document.getElementById('tempo'); if (el) el.textContent = tempoSessao(); }, 1000);

  /* ---------- início ---------- */
  D = carregar();
  ui.editId = D.ativoId;
  ui.editTreinoId = ativo().treinos[0].id;
  if (D.sessao) ui.tela = 'treinar';
  try { history.replaceState({ tela: ui.tela }, ''); } catch (e) {}
  render();
  if (D.sessao) pedirTelaLigada();
  if (window.Nuvem) { sync.disponivel = true; var u0 = window.Nuvem.usuario(); if (u0) { sync.usuario = u0; iniciarVinculo(); } }

  window.__treino = { estado: function () { return { D: D, sync: sync, ui: ui }; } }; // usado só nos testes automáticos

  if ('serviceWorker' in navigator && location.protocol !== 'file:') {
    var tinhaControle = !!navigator.serviceWorker.controller, recarregou = false;
    navigator.serviceWorker.addEventListener('controllerchange', function () {
      if (!tinhaControle || recarregou || D.sessao || ui.confirm || (sync.vinculado && sync.pendentes)) return;
      recarregou = true; location.reload();
    });
    window.addEventListener('load', function () { navigator.serviceWorker.register('sw.js').catch(function () {}); });
  }
})();
