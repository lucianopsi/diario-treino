/* Diário de Treino — PWA. Dados ficam no aparelho (localStorage) com backup em arquivo. */
(function () {
  'use strict';

  var CHAVE = 'diario-treino-v1';
  var LETRAS = 'ABCDEFG';
  var BIBLIOTECA = ['Supino reto (barra)', 'Supino inclinado (halteres)', 'Crucifixo (máquina)', 'Crossover', 'Flexão de braço', 'Puxada frontal', 'Remada curvada', 'Remada baixa', 'Barra fixa', 'Pulldown (corda)', 'Agachamento livre', 'Leg press 45°', 'Cadeira extensora', 'Mesa flexora', 'Stiff', 'Panturrilha em pé', 'Desenvolvimento (halteres)', 'Elevação lateral', 'Rosca direta', 'Tríceps corda'];
  var MEDALHAS = [{ n: 3, nome: 'Largada' }, { n: 5, nome: 'Ritmo' }, { n: 7, nome: 'Semana cheia' }, { n: 12, nome: 'Imparável' }, { n: 20, nome: 'Lenda do mês' }];

  var $view = document.getElementById('view');
  var $nav = document.getElementById('nav');
  var $overlay = document.getElementById('overlay');
  var $shell = document.querySelector('.shell');
  var $import = document.getElementById('importFile');

  var D = null;               // dados salvos
  var armazenamentoOk = false;
  var persistenciaPedida = false;
  var ui = { tela: 'treinar', editId: null, editTreinoId: null, picker: false, toast: '', confirm: null, abertoHist: null, evoTreino: null };
  var toastT = null;
  var wakeLock = null;
  var eventoInstalar = null;
  var focoAntesDialogo = null;

  /* ---------- utilidades ---------- */
  function uid(p) { return p + Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function kg(n) { return Number(n || 0).toLocaleString('pt-BR', { maximumFractionDigits: 2 }); }
  function pad(n) { return String(n).padStart(2, '0'); }
  function diaKey(d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
  function addDias(d, n) { return new Date(d.getFullYear(), d.getMonth(), d.getDate() + n); }
  function deKey(k) { var p = k.split('-'); return new Date(+p[0], +p[1] - 1, +p[2]); }
  function ddmm(k) { var p = k.split('-'); return p[2] + '/' + p[1]; }
  function plural(n, um, varios) { return n + ' ' + (n === 1 ? um : varios); }
  function num(v) { var x = parseFloat(String(v).replace(',', '.')); return isFinite(x) ? x : 0; }

  function icon(nome, tam) {
    var s = tam || 20;
    var p = {
      check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
      play: '<path d="M7 4.5v15l12-7.5z" fill="currentColor" stroke="none"/>',
      plus: '<path d="M12 5v14M5 12h14"/>',
      trash: '<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>',
      chev: '<path d="M9 6l6 6-6 6"/>',
      dumbbell: '<path d="M6 7v10M3 9.5v5M18 7v10M21 9.5v5M6 12h12"/>',
      cal: '<rect x="4" y="5" width="16" height="15" rx="2"/><path d="M4 10h16M9 3v4M15 3v4"/>',
      sliders: '<path d="M4 6h9M17 6h3M4 12h3M11 12h9M4 18h11M19 18h1"/><circle cx="15" cy="6" r="2"/><circle cx="9" cy="12" r="2"/><circle cx="17" cy="18" r="2"/>',
      download: '<path d="M12 4v11M7 10l5 5 5-5M5 20h14"/>',
      upload: '<path d="M12 20V9M7 14l5-5 5 5M5 4h14"/>',
      share: '<circle cx="18" cy="5" r="2.5"/><circle cx="6" cy="12" r="2.5"/><circle cx="18" cy="19" r="2.5"/><path d="M8.2 10.8l7.6-4.4M8.2 13.2l7.6 4.4"/>'
    }[nome];
    return '<svg width="' + s + '" height="' + s + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + p + '</svg>';
  }

  /* ---------- dados ---------- */
  function exemplo() {
    function e(nome, series, reps, carga) { return { id: uid('e'), nome: nome, series: series, reps: reps, carga: carga }; }
    function t(letra, nome, exs) { return { id: uid('t'), letra: letra, nome: nome, exs: exs }; }
    var abc = { id: uid('p'), nome: 'ABC', treinos: [
      t('A', 'Peito', [e('Supino reto (barra)', 4, 10, 0), e('Supino inclinado (halteres)', 3, 12, 0), e('Crucifixo (máquina)', 3, 12, 0), e('Crossover', 3, 15, 0)]),
      t('B', 'Costas', [e('Puxada frontal', 4, 10, 0), e('Remada curvada', 4, 10, 0), e('Remada baixa', 3, 12, 0), e('Pulldown (corda)', 3, 15, 0)]),
      t('C', 'Pernas', [e('Agachamento livre', 4, 10, 0), e('Leg press 45°', 4, 12, 0), e('Cadeira extensora', 3, 12, 0), e('Mesa flexora', 3, 12, 0), e('Panturrilha em pé', 4, 15, 0)])
    ] };
    return { v: 1, programas: [abc], ativoId: abc.id, historico: [], regra: 'descanso', sessao: null, ultimoBackup: null };
  }

  function valido(d) {
    return d && Array.isArray(d.programas) && d.programas.length > 0 && Array.isArray(d.historico) &&
      d.programas.every(function (p) { return p && p.id && Array.isArray(p.treinos) && p.treinos.length > 0; });
  }

  function carregar() {
    try {
      localStorage.setItem('__teste', '1');
      localStorage.removeItem('__teste');
      armazenamentoOk = true;
      var raw = localStorage.getItem(CHAVE);
      if (raw) {
        var d = JSON.parse(raw);
        if (valido(d)) return normalizar(d);
      }
    } catch (err) {
      armazenamentoOk = false;
    }
    return exemplo();
  }

  function normalizar(d) {
    d.v = 1;
    d.regra = d.regra === 'estrita' ? 'estrita' : 'descanso';
    if (!d.programas.some(function (p) { return p.id === d.ativoId; })) d.ativoId = d.programas[0].id;
    if (d.sessao && !acharTreinoEm(d.programas, d.sessao.treinoId)) d.sessao = null;
    return d;
  }

  function salvar() {
    if (!armazenamentoOk) return;
    try {
      localStorage.setItem(CHAVE, JSON.stringify(D));
    } catch (err) {
      armazenamentoOk = false;
      mostrarToast('Não foi possível salvar neste aparelho. Exporte um backup.');
    }
    if (!persistenciaPedida && navigator.storage && navigator.storage.persist) {
      persistenciaPedida = true;
      navigator.storage.persist().catch(function () {});
    }
  }

  function acharTreinoEm(progs, id) {
    for (var i = 0; i < progs.length; i++) {
      for (var j = 0; j < progs[i].treinos.length; j++) if (progs[i].treinos[j].id === id) return progs[i].treinos[j];
    }
    return null;
  }
  function acharTreino(id) { return acharTreinoEm(D.programas, id); }
  function ativo() { return D.programas.find(function (p) { return p.id === D.ativoId; }) || D.programas[0]; }
  function progEd() { return D.programas.find(function (p) { return p.id === ui.editId; }) || ativo(); }
  function treinoEd() { var p = progEd(); return p.treinos.find(function (t) { return t.id === ui.editTreinoId; }) || p.treinos[0]; }

  function proximoTreino(p) {
    for (var i = D.historico.length - 1; i >= 0; i--) {
      var ix = p.treinos.findIndex(function (t) { return t.id === D.historico[i].treinoId; });
      if (ix >= 0) return p.treinos[(ix + 1) % p.treinos.length];
    }
    return p.treinos[0];
  }

  function ultimoDe(nome) {
    for (var i = D.historico.length - 1; i >= 0; i--) {
      var ex = D.historico[i].exs.find(function (x) { return x.nome === nome; });
      if (ex && ex.sets.length) {
        var b = ex.sets.reduce(function (a, x) { return x.carga > a.carga ? x : a; }, ex.sets[0]);
        return 'Última vez (' + ddmm(D.historico[i].dia) + '): ' + kg(b.carga) + ' kg × ' + b.reps;
      }
    }
    return '';
  }

  /* Sequência do mês. Regra "descanso": até 2 dias sem treino seguidos não quebram; o 3º quebra. */
  function sequencia(hist, regra) {
    var hoje = new Date();
    var Y = hoje.getFullYear(), M = hoje.getMonth(), Dd = hoje.getDate();
    var feitos = {};
    hist.forEach(function (h) { feitos[h.dia] = true; });
    function T(d) { return !!feitos[diaKey(new Date(Y, M, d))]; }
    var estrita = regra === 'estrita';
    var run = 0, gap = 0, melhor = 0, ate = [0], dias = 0;
    for (var d = 1; d <= Dd; d++) {
      if (T(d)) { run++; gap = 0; dias++; } else { gap++; if (estrita || gap >= 3) run = 0; }
      if (run > melhor) melhor = run;
      ate[d] = run;
    }
    var hojeFeito = T(Dd);
    var atual = estrita ? (hojeFeito ? ate[Dd] : (ate[Dd - 1] || 0)) : ate[Dd];
    var status;
    if (hojeFeito) status = 'Treino de hoje registrado.';
    else if (atual > 0) {
      if (estrita) status = 'Treine hoje para manter a sequência.';
      else if (gap === 1) status = 'Descanso 1 de 2: pode descansar hoje e amanhã.';
      else status = 'Descanso 2 de 2: treine amanhã para manter a sequência.';
    } else status = 'Treine hoje para começar uma sequência.';
    return { atual: atual, melhor: melhor, dias: dias, status: status, feitos: feitos, Y: Y, M: M, D: Dd };
  }

  function melhorDoMes(chavesOrdenadas, regra) {
    var best = 0, run = 0, prev = null;
    chavesOrdenadas.forEach(function (k) {
      var dt = deKey(k);
      var dif = prev ? Math.round((dt - prev) / 86400000) : 99;
      run = dif <= (regra === 'estrita' ? 1 : 3) ? run + 1 : 1;
      if (run > best) best = run;
      prev = dt;
    });
    return best;
  }

  /* ---------- ações ---------- */
  function mostrarToast(msg) {
    ui.toast = msg;
    clearTimeout(toastT);
    toastT = setTimeout(function () { ui.toast = ''; if (ui.tela === 'treinar' && !D.sessao) render(); }, 6000);
  }

  function irPara(tela, empurrar) {
    ui.tela = tela;
    ui.picker = false;
    if (empurrar !== false) { try { history.pushState({ tela: tela }, ''); } catch (e) {} }
    render();
    window.scrollTo(0, 0);
  }

  function novaSessao(t) {
    return {
      treinoId: t.id, inicio: Date.now(),
      sets: t.exs.map(function (ex) {
        var arr = [];
        for (var k = 0; k < ex.series; k++) arr.push({ carga: String(ex.carga), reps: String(ex.reps), ok: false });
        return arr;
      })
    };
  }

  function pedirTelaLigada() {
    if (!('wakeLock' in navigator) || !D.sessao || document.visibilityState !== 'visible') return;
    navigator.wakeLock.request('screen').then(function (w) { wakeLock = w; }).catch(function () {});
  }
  function liberarTela() { if (wakeLock) { wakeLock.release().catch(function () {}); wakeLock = null; } }

  function finalizar() {
    var s = D.sessao;
    var t = acharTreino(s.treinoId);
    if (!t) { D.sessao = null; salvar(); render(); return; }
    var total = 0;
    var p = D.programas.find(function (pp) { return pp.treinos.indexOf(t) >= 0; });
    var reg = { id: uid('h'), dia: diaKey(new Date()), treinoId: t.id, letra: t.letra, nome: t.nome, divisao: p ? p.nome : '', duracao: Math.max(1, Math.round((Date.now() - s.inicio) / 60000)), exs: [] };
    t.exs.forEach(function (ex, i) {
      var feitas = (s.sets[i] || []).filter(function (x) { return x.ok; }).map(function (x) { return { carga: num(x.carga), reps: parseInt(x.reps, 10) || 0 }; });
      total += feitas.length;
      if (!feitas.length) return;
      reg.exs.push({ nome: ex.nome, sets: feitas });
      ex.carga = feitas.reduce(function (a, x) { return x.carga > a ? x.carga : a; }, 0);
    });
    if (!total) return;
    var antes = sequencia(D.historico, D.regra);
    D.historico.push(reg);
    var depois = sequencia(D.historico, D.regra);
    var novas = MEDALHAS.filter(function (m) { return antes.melhor < m.n && depois.melhor >= m.n; });
    D.sessao = null;
    salvar();
    liberarTela();
    var msg = 'Treino ' + t.letra + ' salvo · ' + plural(total, 'série', 'séries') + ' · sequência de ' + plural(depois.atual, 'dia', 'dias') + '.';
    if (novas.length) msg += ' Medalha "' + novas[novas.length - 1].nome + '" conquistada!';
    mostrarToast(msg);
    irPara('treinar', false);
  }

  function exportar(modo) {
    var nome = 'treino-backup-' + diaKey(new Date()) + '.json';
    var conteudo = JSON.stringify(Object.assign({ app: 'diario-treino', exportadoEm: new Date().toISOString() }, D), null, 2);
    var blob = new Blob([conteudo], { type: 'application/json' });
    function marcar() { D.ultimoBackup = new Date().toISOString(); salvar(); render(); }
    if (modo === 'compartilhar' && navigator.canShare) {
      var arq = new File([blob], nome, { type: 'application/json' });
      if (navigator.canShare({ files: [arq] })) {
        navigator.share({ files: [arq], title: 'Backup do Diário de Treino' }).then(marcar).catch(function () {});
        return;
      }
    }
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url; a.download = nome;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 2000);
    marcar();
  }

  function abrirConfirm(c) {
    focoAntesDialogo = document.activeElement;
    ui.confirm = c;
    try { history.pushState({ tela: ui.tela, dialogo: true }, ''); } catch (e) {}
    renderOverlay();
  }
  function fecharConfirm(viaVoltar) {
    ui.confirm = null;
    renderOverlay();
    if (!viaVoltar) { try { history.back(); } catch (e) {} }
    if (focoAntesDialogo && document.contains(focoAntesDialogo)) focoAntesDialogo.focus();
  }

  function confirmar() {
    var c = ui.confirm;
    if (!c) return;
    ui.confirm = null;
    renderOverlay();
    try { history.back(); } catch (e) {}
    if (c.tipo === 'descartar') { D.sessao = null; liberarTela(); }
    else if (c.tipo === 'excluirHist') { D.historico = D.historico.filter(function (h) { return h.id !== c.alvo; }); ui.abertoHist = null; }
    else if (c.tipo === 'excluirDiv') {
      D.programas = D.programas.filter(function (p) { return p.id !== ui.editId; });
      var a = ativo(); ui.editId = a.id; ui.editTreinoId = a.treinos[0].id; ui.picker = false;
    } else if (c.tipo === 'removerTreino') {
      var p = progEd(), cur = treinoEd();
      var ix = p.treinos.indexOf(cur);
      p.treinos.splice(ix, 1);
      p.treinos.forEach(function (t, i) { t.letra = LETRAS[i]; });
      ui.editTreinoId = p.treinos[Math.max(0, ix - 1)].id; ui.picker = false; ui.evoTreino = null;
    } else if (c.tipo === 'removerEx') {
      treinoEd().exs.splice(c.alvo, 1);
    } else if (c.tipo === 'importar') {
      D = normalizar(c.dados); delete D.app; delete D.exportadoEm;
      var a2 = ativo(); ui.editId = a2.id; ui.editTreinoId = a2.treinos[0].id; ui.abertoHist = null; ui.evoTreino = null;
      mostrarToast('Backup importado: ' + plural(D.historico.length, 'treino', 'treinos') + ' no histórico.');
    } else if (c.tipo === 'zerar') {
      D = exemplo(); ui.editId = D.ativoId; ui.editTreinoId = D.programas[0].treinos[0].id; ui.abertoHist = null; ui.evoTreino = null;
    }
    salvar();
    render();
  }

  var A = {
    ir: function (tela) { irPara(tela); },
    iniciar: function (id) {
      var t = acharTreino(id);
      if (!t || !t.exs.length) return;
      ui.toast = '';
      D.sessao = novaSessao(t);
      salvar(); pedirTelaLigada(); render(); window.scrollTo(0, 0);
    },
    cancelar: function () {
      var algum = D.sessao.sets.some(function (a) { return a.some(function (x) { return x.ok; }); });
      if (algum) abrirConfirm({ tipo: 'descartar' });
      else { D.sessao = null; salvar(); liberarTela(); render(); }
    },
    toggleSet: function (arg) {
      var ij = arg.split(','), x = D.sessao.sets[+ij[0]][+ij[1]];
      x.ok = !x.ok; salvar(); render();
    },
    addSet: function (i) {
      var arr = D.sessao.sets[+i], u = arr[arr.length - 1] || { carga: '0', reps: '10' };
      arr.push({ carga: u.carga, reps: u.reps, ok: false }); salvar(); render();
    },
    finalizar: finalizar,
    regra: function (r) { D.regra = r === 'estrita' ? 'estrita' : 'descanso'; salvar(); render(); },
    abrirHist: function (id) { ui.abertoHist = ui.abertoHist === id ? null : id; render(); },
    excluirHist: function (id) { abrirConfirm({ tipo: 'excluirHist', alvo: id }); },
    evo: function (id) { ui.evoTreino = id; render(); },
    pickProg: function (id) { var p = D.programas.find(function (x) { return x.id === id; }); ui.editId = id; ui.editTreinoId = p.treinos[0].id; ui.picker = false; render(); },
    novaDivisao: function () {
      var t = { id: uid('t'), letra: 'A', nome: 'Novo treino', exs: [] };
      var p = { id: uid('p'), nome: 'Nova divisão', treinos: [t] };
      D.programas.push(p); ui.editId = p.id; ui.editTreinoId = t.id; ui.picker = false;
      salvar(); render();
      var el = document.getElementById('nome-divisao'); if (el) { el.focus(); el.select(); }
    },
    usar: function () { D.ativoId = progEd().id; ui.evoTreino = null; salvar(); render(); },
    excluirDiv: function () { abrirConfirm({ tipo: 'excluirDiv' }); },
    pickTreino: function (id) { ui.editTreinoId = id; ui.picker = false; render(); },
    addTreino: function () {
      var p = progEd(); if (p.treinos.length >= 7) return;
      var t = { id: uid('t'), letra: LETRAS[p.treinos.length], nome: 'Novo treino', exs: [] };
      p.treinos.push(t); ui.editTreinoId = t.id; ui.picker = false; salvar(); render();
    },
    removerTreino: function () { abrirConfirm({ tipo: 'removerTreino' }); },
    step: function (arg) {
      var a = arg.split(','), ex = treinoEd().exs[+a[0]], campo = a[1], d = +a[2];
      var max = campo === 'series' ? 10 : 50;
      ex[campo] = Math.min(max, Math.max(1, ex[campo] + d)); salvar(); render();
    },
    removerEx: function (i) { abrirConfirm({ tipo: 'removerEx', alvo: +i, nome: treinoEd().exs[+i].nome }); },
    picker: function () { ui.picker = !ui.picker; render(); },
    addEx: function (nome) {
      treinoEd().exs.push({ id: uid('e'), nome: nome || 'Novo exercício', series: 3, reps: 12, carga: 0 });
      ui.picker = false; salvar(); render();
      if (!nome) { var ins = document.querySelectorAll('[data-bind^="exNome:"]'); var el = ins[ins.length - 1]; if (el) { el.focus(); el.select(); } }
    },
    exportar: function () { exportar('arquivo'); },
    compartilhar: function () { exportar('compartilhar'); },
    importar: function () { $import.value = ''; $import.click(); },
    zerar: function () { abrirConfirm({ tipo: 'zerar' }); },
    instalar: function () {
      if (!eventoInstalar) return;
      eventoInstalar.prompt();
      eventoInstalar.userChoice.finally(function () { eventoInstalar = null; render(); });
    },
    fechar: function () { fecharConfirm(false); },
    confirmar: confirmar
  };

  /* ---------- telas ---------- */
  function vTreinar() {
    var p = ativo(), seq = sequencia(D.historico, D.regra), prox = proximoTreino(p);
    var hoje = new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' });
    var cards = p.treinos.map(function (t) {
      var ehProx = t.id === prox.id;
      var series = t.exs.reduce(function (a, x) { return a + x.series; }, 0);
      var nomes = t.exs.map(function (x) { return x.nome; });
      var ult = null;
      for (var k = D.historico.length - 1; k >= 0; k--) if (D.historico[k].treinoId === t.id) { ult = D.historico[k]; break; }
      var semCarga = t.exs.length && t.exs.every(function (x) { return !x.carga; });
      return '<article class="card' + (ehProx ? ' next' : '') + '">' +
        '<div class="card-top"><div class="badge" aria-hidden="true">' + esc(t.letra) + '</div><div class="info">' +
        (ehProx ? '<span class="eyebrow accent">Próximo da sequência</span>' : '') +
        '<h2><span class="sr-only">Treino ' + esc(t.letra) + ': </span>' + esc(t.nome || 'Sem nome') + '</h2>' +
        '<span class="small muted">' + plural(t.exs.length, 'exercício', 'exercícios') + ' · ' + plural(series, 'série', 'séries') + '</span></div></div>' +
        '<p class="preview">' + (nomes.length ? esc(nomes.slice(0, 3).join(' · ')) + (nomes.length > 3 ? ' · +' + (nomes.length - 3) : '') : 'Sem exercícios — configure na aba Montar.') + '</p>' +
        (semCarga ? '<p class="small muted">Cargas ainda em 0 kg — ajuste no treino ou em Montar.</p>' : '') +
        '<div class="card-foot"><span class="small muted">' + (ult ? 'Último: ' + ddmm(ult.dia) : 'Ainda não realizado') + '</span>' +
        '<button type="button" class="btn sm ' + (ehProx ? 'primary' : '') + '" data-act="iniciar" data-arg="' + t.id + '"' + (t.exs.length ? '' : ' disabled') + ' aria-label="Iniciar treino ' + esc(t.letra) + '">' + icon('play', 14) + 'Iniciar</button></div>' +
        '</article>';
    }).join('');

    var dias = D.ultimoBackup ? Math.floor((Date.now() - new Date(D.ultimoBackup)) / 86400000) : null;
    var lembrete = D.historico.length >= 5 && (dias === null || dias >= 14)
      ? '<div class="notice"><strong>Faça um backup</strong><span class="small muted">' + (dias === null ? 'Você ainda não salvou uma cópia do histórico.' : 'Seu último backup foi há ' + dias + ' dias.') + ' Se o celular for trocado ou os dados do navegador forem apagados, o histórico se perde.</span><button type="button" class="btn sm" data-act="compartilhar">' + icon('share', 18) + 'Salvar backup agora</button></div>'
      : '';

    return '<header class="page-head"><span class="eyebrow">' + esc(hoje) + '</span><h1>Treinar</h1>' +
      '<p class="sub">Divisão <strong>' + esc(p.nome || 'Sem nome') + '</strong> · ' + plural(p.treinos.length, 'treino', 'treinos') + '</p></header>' +
      (ui.toast ? '<div class="toast" role="status">' + icon('check', 18) + '<span>' + esc(ui.toast) + '</span></div>' : '') +
      '<button type="button" class="streak" data-act="ir" data-arg="historico"><span class="ring">' + seq.atual + '</span><span class="txt"><strong>' + plural(seq.atual, 'dia', 'dias') + ' na sequência do mês</strong><span class="small muted">' + esc(seq.status) + '</span></span>' + icon('chev', 18) + '</button>' +
      lembrete +
      '<div class="grid-cards">' + cards + '</div>';
  }

  function vSessao() {
    var s = D.sessao, t = acharTreino(s.treinoId), tot = 0, ok = 0;
    var exs = t.exs.map(function (ex, i) {
      var sets = s.sets[i] || [];
      var okEx = sets.filter(function (x) { return x.ok; }).length;
      tot += sets.length; ok += okEx;
      var u = ultimoDe(ex.nome);
      var linhas = sets.map(function (x, j) {
        var rot = esc(ex.nome) + ', série ' + (j + 1);
        return '<div class="set-grid set-row' + (x.ok ? ' ok' : '') + '">' +
          '<span class="set-n">' + (j + 1) + '</span>' +
          '<input class="num" type="number" inputmode="decimal" step="0.5" min="0" enterkeyhint="next" aria-label="' + rot + ': carga em kg" value="' + esc(x.carga) + '" data-set="' + i + ',' + j + ',carga">' +
          '<input class="num" type="number" inputmode="numeric" min="0" enterkeyhint="done" aria-label="' + rot + ': repetições" value="' + esc(x.reps) + '" data-set="' + i + ',' + j + ',reps">' +
          '<button type="button" class="check" aria-pressed="' + x.ok + '" aria-label="' + (x.ok ? 'Desmarcar ' : 'Concluir ') + rot + '" data-act="toggleSet" data-arg="' + i + ',' + j + '">' + icon('check', 20) + '</button>' +
          '</div>';
      }).join('');
      return '<section class="ex-card"><div class="ex-head"><h3>' + esc(ex.nome) + '</h3><span class="small muted">' + okEx + '/' + sets.length + '</span></div>' +
        '<div class="ex-meta"><span>Meta ' + ex.series + ' × ' + ex.reps + ' · ' + kg(ex.carga) + ' kg</span>' + (u ? '<span class="ult">' + esc(u) + '</span>' : '') + '</div>' +
        '<div class="set-grid set-labels" aria-hidden="true"><span>Série</span><span>Carga (kg)</span><span>Reps</span><span></span></div>' +
        linhas +
        '<button type="button" class="link" style="text-decoration:none;display:inline-flex;align-items:center;gap:6px;color:var(--text-2)" data-act="addSet" data-arg="' + i + '">' + icon('plus', 16) + 'Adicionar série</button></section>';
    }).join('');
    var pct = tot ? Math.round(ok / tot * 100) : 0;
    return '<div class="sess-head"><div class="sess-row"><button type="button" class="link" style="text-decoration:none;color:var(--text-2);font-size:15px" data-act="cancelar">Cancelar</button>' +
      '<span class="timer" id="tempo" role="timer" aria-label="Tempo de treino">' + tempoSessao() + '</span></div>' +
      '<div class="sess-title"><div class="badge on" aria-hidden="true">' + esc(t.letra) + '</div><div style="display:flex;flex-direction:column;gap:2px;min-width:0"><span class="eyebrow">Em andamento · salvo automaticamente</span><h1>' + esc(t.nome) + '</h1></div></div>' +
      '<div class="sess-row"><div class="progress" role="progressbar" aria-valuemin="0" aria-valuemax="' + tot + '" aria-valuenow="' + ok + '" aria-label="Séries concluídas"><span style="width:' + pct + '%"></span></div><span class="small" style="color:var(--text-2);white-space:nowrap">' + ok + ' de ' + tot + ' séries</span></div></div>' +
      '<div class="sess-list">' + exs + '</div>' +
      '<div class="sess-foot"><div class="sess-foot-inner">' + (ok ? '' : '<span class="hint">Marque ao menos uma série para salvar.</span>') +
      '<button type="button" class="btn primary block" data-act="finalizar"' + (ok ? '' : ' disabled') + '>Finalizar e salvar treino</button></div></div>';
  }

  function tempoSessao() {
    if (!D.sessao) return '00:00';
    var sec = Math.max(0, Math.floor((Date.now() - D.sessao.inicio) / 1000));
    var h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), s = sec % 60;
    return (h ? h + ':' : '') + pad(m) + ':' + pad(s);
  }

  function vHistorico() {
    var seq = sequencia(D.historico, D.regra), agora = new Date();
    var primeiro = new Date(seq.Y, seq.M, 1), nDias = new Date(seq.Y, seq.M + 1, 0).getDate();
    var cal = '';
    for (var b = 0; b < primeiro.getDay(); b++) cal += '<span class="day vazio" aria-hidden="true"></span>';
    for (var d = 1; d <= nDias; d++) {
      var feito = !!seq.feitos[diaKey(new Date(seq.Y, seq.M, d))], hoje = d === seq.D, fut = d > seq.D;
      var cls = 'day' + (feito ? ' feito' : '') + (hoje ? ' hoje' : '') + (fut ? ' futuro' : '');
      cal += '<span class="' + cls + '" aria-label="Dia ' + d + (feito ? ', treinou' : (fut ? '' : ', sem treino')) + (hoje ? ', hoje' : '') + '">' + d + '</span>';
    }
    var medalhas = MEDALHAS.map(function (m) {
      var on = seq.melhor >= m.n;
      return '<div class="medal' + (on ? ' on' : '') + '" aria-label="' + m.nome + ': ' + m.n + ' dias de sequência, ' + (on ? 'conquistada' : 'bloqueada') + '"><div class="disc" aria-hidden="true">' + m.n + '</div><span class="nm" aria-hidden="true">' + m.nome + '</span></div>';
    }).join('');
    var prox = MEDALHAS.find(function (m) { return seq.melhor < m.n; });
    var proxTxt = prox ? 'Faltam ' + plural(prox.n - seq.atual, 'dia', 'dias') + ' de sequência para "' + prox.nome + '"' : 'Todas as medalhas do mês conquistadas.';
    var proxPct = prox ? Math.round(Math.min(1, seq.atual / prox.n) * 100) : 100;

    var mesAtual = diaKey(agora).slice(0, 7), meses = {};
    D.historico.forEach(function (h) { var mk = h.dia.slice(0, 7); if (mk !== mesAtual) { (meses[mk] = meses[mk] || {})[h.dia] = true; } });
    var anteriores = Object.keys(meses).sort().reverse().slice(0, 6).map(function (mk) {
      var ks = Object.keys(meses[mk]).sort(), best = melhorDoMes(ks, D.regra);
      var ganhas = MEDALHAS.filter(function (m) { return best >= m.n; }).length;
      return '<div class="list-row"><div><span class="nome">' + esc(deKey(mk + '-01').toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })) + '</span><span class="small muted">' + plural(ks.length, 'treino', 'treinos') + ' · melhor sequência ' + best + '</span></div><span class="delta' + (ganhas ? ' up' : '') + '">' + plural(ganhas, 'medalha', 'medalhas') + '</span></div>';
    }).join('');

    var p = ativo(), evoT = p.treinos.find(function (t) { return t.id === ui.evoTreino; }) || p.treinos[0];
    var evo = evoT.exs.map(function (ex) {
      var pts = [];
      D.historico.forEach(function (h) { var e = h.exs.find(function (x) { return x.nome === ex.nome; }); if (e && e.sets.length) pts.push(Math.max.apply(null, e.sets.map(function (x) { return x.carga; }))); });
      if (!pts.length) return '';
      var dl = pts[pts.length - 1] - pts[0];
      return '<div class="list-row"><div><span class="nome">' + esc(ex.nome) + '</span><span class="small muted">' + kg(pts[0]) + ' → ' + kg(pts[pts.length - 1]) + ' kg · ' + plural(pts.length, 'registro', 'registros') + '</span></div><span class="delta' + (dl > 0 ? ' up' : '') + '">' + (dl > 0 ? '+' + kg(dl) + ' kg' : dl < 0 ? '−' + kg(-dl) + ' kg' : 'estável') + '</span></div>';
    }).join('');

    var sessoes = D.historico.slice().reverse().slice(0, 30).map(function (h) {
      var n = h.exs.reduce(function (a, x) { return a + x.sets.length; }, 0);
      var vol = h.exs.reduce(function (a, x) { return a + x.sets.reduce(function (b2, y) { return b2 + y.carga * y.reps; }, 0); }, 0);
      var aberto = ui.abertoHist === h.id;
      return '<article class="sess-item"><button type="button" aria-expanded="' + aberto + '" data-act="abrirHist" data-arg="' + h.id + '">' +
        '<span class="mini" aria-hidden="true">' + esc(h.letra) + '</span><span class="mid"><b>Treino ' + esc(h.letra) + ' · ' + esc(h.nome) + '</b><span class="small muted">' + h.duracao + ' min · ' + plural(n, 'série', 'séries') + ' · ' + Math.round(vol).toLocaleString('pt-BR') + ' kg de volume</span></span>' +
        '<span class="dt">' + esc(deKey(h.dia).toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit' })) + '</span></button>' +
        (aberto ? '<div class="sess-det">' + h.exs.map(function (x) { return '<div class="ex"><b>' + esc(x.nome) + '</b><span>' + x.sets.map(function (y) { return kg(y.carga) + '×' + y.reps; }).join('  ·  ') + '</span></div>'; }).join('') +
          '<button type="button" class="link" data-act="excluirHist" data-arg="' + h.id + '">Excluir este registro</button></div>' : '') +
        '</article>';
    }).join('');

    var estrita = D.regra === 'estrita';
    return '<header class="page-head"><h1>Histórico</h1><p class="sub">Sequência do mês, evolução e treinos feitos.</p></header>' +
      '<div class="hist-cols"><div class="section" style="gap:22px">' +
      '<section class="card flat" aria-label="Sequência do mês"><div class="seq-top"><div style="display:flex;flex-direction:column;gap:2px"><span class="eyebrow">' + esc(agora.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })) + '</span>' +
      '<span class="seq-big">' + seq.atual + ' <small>' + (seq.atual === 1 ? 'dia' : 'dias') + ' de sequência</small></span><span class="small muted">' + esc(seq.status) + '</span></div>' +
      '<div class="seq-side"><span class="small muted">Melhor do mês</span><b>' + plural(seq.melhor, 'dia', 'dias') + '</b><span class="small muted">' + plural(seq.dias, 'treino no mês', 'treinos no mês') + '</span></div></div>' +
      '<div class="cal-head" aria-hidden="true"><span>D</span><span>S</span><span>T</span><span>Q</span><span>Q</span><span>S</span><span>S</span></div><div class="cal">' + cal + '</div>' +
      '<div class="field"><span class="label" id="regra-lbl">Regra da sequência</span><div class="segmented" role="group" aria-labelledby="regra-lbl">' +
      '<button type="button" aria-pressed="' + !estrita + '" data-act="regra" data-arg="descanso">Até 2 descansos</button><button type="button" aria-pressed="' + estrita + '" data-act="regra" data-arg="estrita">Dias seguidos</button></div>' +
      '<span class="small muted">' + (estrita ? 'Cada dia sem treino zera a sequência.' : 'Até 2 dias de descanso seguidos não quebram a sequência; o 3º dia sem treino quebra. Só dias treinados contam.') + '</span></div></section>' +
      '<section class="section"><h2 class="section-title">Recompensas do mês</h2><div class="medals">' + medalhas + '</div>' +
      '<div class="card flat" style="gap:8px"><strong style="font-size:15px">' + esc(proxTxt) + '</strong><div class="progress" style="flex:none" aria-hidden="true"><span style="width:' + proxPct + '%"></span></div><span class="small muted">As medalhas recomeçam no dia 1º. Os meses anteriores ficam registrados abaixo.</span></div>' +
      (anteriores ? '<div class="list">' + anteriores + '</div>' : '') + '</section></div>' +
      '<div class="section" style="gap:22px"><section class="section"><h2 class="section-title">Evolução de carga · divisão ' + esc(p.nome) + '</h2><div class="chips">' +
      p.treinos.map(function (t) { return '<button type="button" class="letter" style="width:48px;height:44px;font-size:22px" aria-pressed="' + (t.id === evoT.id) + '" aria-label="Evolução do treino ' + esc(t.letra) + ', ' + esc(t.nome) + '" data-act="evo" data-arg="' + t.id + '">' + esc(t.letra) + '</button>'; }).join('') +
      '</div><div class="list">' + (evo || '<p class="small muted" style="padding:14px 0">Ainda não há registros deste treino.</p>') + '</div></section>' +
      '<section class="section"><h2 class="section-title">Treinos realizados</h2>' + (sessoes || '<p class="muted">Nenhum treino registrado ainda. Finalize um treino para ele aparecer aqui.</p>') + '</section></div></div>';
  }

  function vMontar() {
    var ed = progEd(), te = treinoEd(), emUso = ed.id === D.ativoId;
    var chips = D.programas.map(function (p) {
      return '<button type="button" class="chip" aria-pressed="' + (p.id === ed.id) + '" data-act="pickProg" data-arg="' + p.id + '"><span class="nome">' + esc(p.nome || 'Sem nome') + '</span>' + (p.id === D.ativoId ? '<span class="tag">· em uso</span>' : '') + '</button>';
    }).join('');
    var letras = ed.treinos.map(function (t) {
      return '<button type="button" class="letter" aria-pressed="' + (t.id === te.id) + '" aria-label="Treino ' + esc(t.letra) + ', ' + esc(t.nome || 'sem nome') + '" data-act="pickTreino" data-arg="' + t.id + '">' + esc(t.letra) + '</button>';
    }).join('');
    var exs = te.exs.map(function (ex, i) {
      return '<div class="ex-edit"><div class="ex-edit-top"><span class="idx" aria-hidden="true">' + (i + 1) + '</span>' +
        '<input class="input" type="text" aria-label="Nome do exercício ' + (i + 1) + '" value="' + esc(ex.nome) + '" data-bind="exNome:' + i + '" enterkeyhint="done">' +
        '<button type="button" class="icon-btn" aria-label="Remover ' + esc(ex.nome) + '" data-act="removerEx" data-arg="' + i + '">' + icon('trash', 18) + '</button></div>' +
        '<div class="ex-edit-grid">' +
        '<div class="field" style="gap:4px"><span class="mini-label" id="s' + i + '">Séries</span><div class="stepper" role="group" aria-labelledby="s' + i + '"><button type="button" aria-label="Menos uma série" data-act="step" data-arg="' + i + ',series,-1">−</button><output>' + ex.series + '</output><button type="button" aria-label="Mais uma série" data-act="step" data-arg="' + i + ',series,1">+</button></div></div>' +
        '<div class="field" style="gap:4px"><span class="mini-label" id="r' + i + '">Reps</span><div class="stepper" role="group" aria-labelledby="r' + i + '"><button type="button" aria-label="Menos uma repetição" data-act="step" data-arg="' + i + ',reps,-1">−</button><output>' + ex.reps + '</output><button type="button" aria-label="Mais uma repetição" data-act="step" data-arg="' + i + ',reps,1">+</button></div></div>' +
        '<div class="field" style="gap:4px"><label class="mini-label" for="c' + i + '">Carga kg</label><input id="c' + i + '" class="num" type="number" inputmode="decimal" step="0.5" min="0" value="' + esc(ex.carga) + '" data-bind="exCarga:' + i + '"></div>' +
        '</div></div>';
    }).join('');
    var lib = BIBLIOTECA.map(function (n) { return '<button type="button" class="chip square" data-act="addEx" data-arg="' + esc(n) + '">' + esc(n) + '</button>'; }).join('');
    var bk = D.ultimoBackup ? 'Último backup: ' + new Date(D.ultimoBackup).toLocaleDateString('pt-BR') + '.' : 'Nenhum backup feito ainda.';
    var podeCompartilhar = !!(navigator.canShare && window.File);

    return '<header class="page-head"><h1>Montar</h1><p class="sub">Divisões, treinos, séries e cargas.</p></header>' +
      '<div class="montar-cols"><div class="section" style="gap:22px">' +
      '<section class="section"><h2 class="section-title">Divisões</h2><div class="chips">' + chips +
      '<button type="button" class="chip dashed" data-act="novaDivisao">' + icon('plus', 16) + 'Nova divisão</button></div>' +
      '<div class="card flat"><div class="field"><label for="nome-divisao">Nome da divisão</label><input id="nome-divisao" class="input" type="text" value="' + esc(ed.nome) + '" data-bind="progNome" enterkeyhint="done"></div>' +
      '<button type="button" class="btn ' + (emUso ? '' : 'primary') + ' block" data-act="usar"' + (emUso ? ' disabled' : '') + '>' + (emUso ? 'Esta é a divisão em uso no Treinar' : 'Usar esta divisão no Treinar') + '</button>' +
      (!emUso && D.programas.length > 1 ? '<button type="button" class="link" data-act="excluirDiv">Excluir esta divisão</button>' : '') + '</div></section>' +
      '<section class="section"><h2 class="section-title">Treinos da divisão</h2><div class="chips">' + letras +
      (ed.treinos.length < 7 ? '<button type="button" class="letter add" aria-label="Adicionar treino à divisão" data-act="addTreino">' + icon('plus', 20) + '</button>' : '') + '</div></section>' +
      '<section class="section"><h2 class="section-title">Dados e backup</h2><div class="card flat" style="gap:10px">' +
      '<span class="small muted">' + (armazenamentoOk ? 'Os dados ficam salvos neste aparelho. ' : 'Este navegador está bloqueando o salvamento — exporte um backup antes de fechar. ') + esc(bk) + '</span>' +
      '<div class="row-actions">' + (podeCompartilhar ? '<button type="button" class="btn sm" data-act="compartilhar">' + icon('share', 18) + 'Enviar backup</button>' : '') +
      '<button type="button" class="btn sm" data-act="exportar">' + icon('download', 18) + 'Baixar backup</button>' +
      '<button type="button" class="btn sm" data-act="importar">' + icon('upload', 18) + 'Importar backup</button></div>' +
      (eventoInstalar ? '<button type="button" class="btn primary block" data-act="instalar">Instalar app no celular</button>' : '') +
      '<button type="button" class="link" data-act="zerar">Apagar tudo e recomeçar</button></div></section>' +
      '</div>' +
      '<section class="card flat" style="gap:14px" aria-label="Editar treino ' + esc(te.letra) + '"><div class="field"><label for="foco-treino">Treino ' + esc(te.letra) + ' · foco</label><input id="foco-treino" class="input title" type="text" value="' + esc(te.nome) + '" data-bind="treinoNome" enterkeyhint="done"></div>' +
      (exs || '<p class="muted">Nenhum exercício neste treino ainda.</p>') +
      '<button type="button" class="btn outline block" aria-expanded="' + ui.picker + '" data-act="picker">' + icon('plus', 18) + 'Adicionar exercício</button>' +
      (ui.picker ? '<div class="picker"><span class="label">Toque para adicionar</span><div class="chips">' + lib + '<button type="button" class="chip square dashed" data-act="addEx" data-arg="">Outro (personalizado)</button></div></div>' : '') +
      (ed.treinos.length > 1 ? '<button type="button" class="link" data-act="removerTreino">Excluir treino ' + esc(te.letra) + '</button>' : '') +
      '</section></div>';
  }

  function vNav() {
    function tab(id, rot, ic) { return '<button type="button" class="tab" data-act="ir" data-arg="' + id + '"' + (ui.tela === id ? ' aria-current="page"' : '') + '>' + icon(ic, 22) + rot + '</button>'; }
    return tab('treinar', 'Treinar', 'dumbbell') + tab('historico', 'Histórico', 'cal') + tab('montar', 'Montar', 'sliders');
  }

  function renderOverlay() {
    var c = ui.confirm;
    if (!c) { $overlay.innerHTML = ''; return; }
    var ed = progEd(), te = treinoEd();
    var txt = {
      descartar: ['Descartar este treino?', 'As séries marcadas não serão salvas e o dia não conta na sequência.', 'Descartar', 'Continuar treino'],
      excluirHist: ['Excluir este registro?', 'Ele sai do histórico e pode reduzir sua sequência e medalhas do mês.', 'Excluir', 'Manter'],
      excluirDiv: ['Excluir a divisão "' + (ed.nome || 'sem nome') + '"?', 'Os treinos configurados nela serão apagados. O histórico já registrado continua.', 'Excluir', 'Manter'],
      removerTreino: ['Excluir o treino ' + te.letra + '?', 'Os exercícios configurados nele serão apagados. O histórico já registrado continua.', 'Excluir', 'Manter'],
      removerEx: ['Remover "' + (c.nome || 'exercício') + '"?', 'Ele sai deste treino. Os registros antigos continuam no histórico.', 'Remover', 'Manter'],
      importar: ['Substituir pelos dados do backup?', 'O backup tem ' + plural((c.dados && c.dados.historico.length) || 0, 'treino', 'treinos') + ' no histórico e ' + plural((c.dados && c.dados.programas.length) || 0, 'divisão', 'divisões') + '. Os dados atuais deste aparelho serão substituídos.', 'Substituir', 'Cancelar'],
      zerar: ['Apagar tudo e recomeçar?', 'Divisões, treinos e todo o histórico deste aparelho serão apagados. Faça um backup antes se quiser guardar.', 'Apagar tudo', 'Cancelar']
    }[c.tipo];
    $overlay.innerHTML = '<div class="overlay" data-fundo="1"><div class="sheet" role="dialog" aria-modal="true" aria-labelledby="dlg-t" aria-describedby="dlg-d">' +
      '<h2 id="dlg-t">' + esc(txt[0]) + '</h2><p id="dlg-d">' + esc(txt[1]) + '</p>' +
      '<div class="acts"><button type="button" class="btn" data-act="fechar">' + esc(txt[3]) + '</button><button type="button" class="btn danger" data-act="confirmar">' + esc(txt[2]) + '</button></div></div></div>';
    var primeiro = $overlay.querySelector('[data-act="fechar"]');
    if (primeiro) primeiro.focus();
  }

  function render() {
    var emSessao = !!D.sessao;
    $nav.hidden = emSessao;
    $shell.classList.toggle('com-nav', !emSessao);
    $view.classList.toggle('sessao', emSessao);
    if (!emSessao) $nav.innerHTML = vNav();
    var html = emSessao ? vSessao() : ui.tela === 'historico' ? vHistorico() : ui.tela === 'montar' ? vMontar() : vTreinar();
    $view.innerHTML = html;
    document.title = (emSessao ? 'Treinando' : ui.tela === 'historico' ? 'Histórico' : ui.tela === 'montar' ? 'Montar' : 'Treinar') + ' · Diário de Treino';
    renderOverlay();
  }

  /* ---------- eventos ---------- */
  document.addEventListener('click', function (e) {
    if (e.target.getAttribute && e.target.getAttribute('data-fundo')) { fecharConfirm(false); return; }
    var el = e.target.closest('[data-act]');
    if (!el || el.disabled) return;
    var fn = A[el.getAttribute('data-act')];
    if (!fn) return;
    e.preventDefault();
    fn(el.getAttribute('data-arg') || '', el);
  });

  document.addEventListener('input', function (e) {
    var el = e.target, v = el.value;
    var set = el.getAttribute('data-set');
    if (set && D.sessao) {
      var a = set.split(','); D.sessao.sets[+a[0]][+a[1]][a[2]] = v; salvar(); return;
    }
    var bind = el.getAttribute('data-bind');
    if (!bind) return;
    var parts = bind.split(':');
    if (parts[0] === 'progNome') progEd().nome = v;
    else if (parts[0] === 'treinoNome') treinoEd().nome = v;
    else if (parts[0] === 'exNome') treinoEd().exs[+parts[1]].nome = v;
    else if (parts[0] === 'exCarga') treinoEd().exs[+parts[1]].carga = v === '' ? 0 : num(v);
    salvar();
  });

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && ui.confirm) { fecharConfirm(false); return; }
    if (e.key === 'Enter' && e.target.matches && e.target.matches('input[type="text"]')) e.target.blur();
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
      } catch (err) {
        mostrarToast('Esse arquivo não é um backup válido do Diário de Treino.');
        irPara('treinar');
      }
    };
    r.readAsText(f);
  });

  window.addEventListener('popstate', function (e) {
    if (ui.confirm) { ui.confirm = null; renderOverlay(); return; }
    if (D.sessao) return;
    ui.tela = (e.state && e.state.tela) || 'treinar';
    ui.picker = false;
    render();
  });

  document.addEventListener('visibilitychange', function () {
    if (document.visibilityState === 'visible') {
      pedirTelaLigada();
      if (!D.sessao) render(); // atualiza sequência se o dia virou
    }
  });

  window.addEventListener('storage', function (e) {
    if (e.key === CHAVE && e.newValue) { try { var d = JSON.parse(e.newValue); if (valido(d)) { D = normalizar(d); render(); } } catch (err) {} }
  });

  window.addEventListener('beforeinstallprompt', function (e) { e.preventDefault(); eventoInstalar = e; if (ui.tela === 'montar') render(); });
  window.addEventListener('appinstalled', function () { eventoInstalar = null; mostrarToast('App instalado. Abra pelo ícone "Treino".'); render(); });

  setInterval(function () { var el = document.getElementById('tempo'); if (el) el.textContent = tempoSessao(); }, 1000);

  /* ---------- início ---------- */
  D = carregar();
  ui.editId = D.ativoId;
  ui.editTreinoId = ativo().treinos[0].id;
  try { history.replaceState({ tela: 'treinar' }, ''); } catch (e) {}
  render();
  if (D.sessao) pedirTelaLigada();

  if ('serviceWorker' in navigator && location.protocol !== 'file:') {
    window.addEventListener('load', function () { navigator.serviceWorker.register('sw.js').catch(function () {}); });
  }
})();
