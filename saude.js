/* Dados do relógio (exportação do Samsung Health) e relatório mensal sono × treino.
   Lê o .zip da exportação (ou os .csv soltos) direto no navegador: nada sai do aparelho
   além do resumo diário que o app grava na sua conta. */
(function () {
  'use strict';

  /* ---------- arquivos que interessam ---------- */
  var ALVOS = {
    sono: 'com.samsung.shealth.sleep.',
    vitalidade: 'com.samsung.shealth.vitality_score.',
    passos: 'com.samsung.shealth.tracker.pedometer_day_summary.',
    exercicio: 'com.samsung.shealth.exercise.',
    peso: 'com.samsung.health.weight.'
  };
  var TIPO_FORCA = 15002; // "treino de força" no Samsung Health

  function qualAlvo(nome) {
    var base = String(nome).split('/').pop();
    if (!/\.csv$/i.test(base)) return null;
    for (var k in ALVOS) {
      var p = ALVOS[k];
      // "com.samsung.shealth.exercise." também é prefixo de exercise.hr_zone etc.: exige que depois venha só o carimbo de data
      if (base.indexOf(p) === 0 && /^\d+\.csv$/i.test(base.slice(p.length))) return k;
    }
    return null;
  }

  /* ---------- leitor de .zip (sem biblioteca) ---------- */
  function u16(b, i) { return b[i] | (b[i + 1] << 8); }
  function u32(b, i) { return (b[i] | (b[i + 1] << 8) | (b[i + 2] << 16)) + b[i + 3] * 16777216; }
  function u64(b, i) { return u32(b, i) + u32(b, i + 4) * 4294967296; }

  function inflar(dados) {
    if (typeof DecompressionStream === 'undefined') return Promise.reject(new Error('sem-descompressao'));
    var ds = new DecompressionStream('deflate-raw');
    var stream = new Blob([dados]).stream().pipeThrough(ds);
    return new Response(stream).arrayBuffer().then(function (ab) { return new Uint8Array(ab); });
  }

  function lerZip(arquivo) {
    return arquivo.arrayBuffer().then(function (ab) {
      var b = new Uint8Array(ab), fim = -1;
      for (var i = b.length - 22; i >= Math.max(0, b.length - 65557); i--) {
        if (u32(b, i) === 0x06054b50) { fim = i; break; }
      }
      if (fim < 0) throw new Error('zip-invalido');
      var total = u16(b, fim + 10), cd = u32(b, fim + 16);
      if (cd === 0xffffffff || total === 0xffff) { // zip64
        var loc = fim - 20;
        if (u32(b, loc) !== 0x07064b50) throw new Error('zip-invalido');
        var z64 = u64(b, loc + 8);
        total = u64(b, z64 + 32); cd = u64(b, z64 + 48);
      }
      var tarefas = [], p = cd;
      for (var n = 0; n < total; n++) {
        if (u32(b, p) !== 0x02014b50) break;
        var metodo = u16(b, p + 10), comp = u32(b, p + 20), tam = u32(b, p + 24);
        var ln = u16(b, p + 28), le = u16(b, p + 30), lc = u16(b, p + 32), off = u32(b, p + 42);
        var nome = new TextDecoder().decode(b.subarray(p + 46, p + 46 + ln));
        if (comp === 0xffffffff || tam === 0xffffffff || off === 0xffffffff) { // campos zip64 no "extra"
          var e = p + 46 + ln, efim = e + le;
          while (e + 4 <= efim) {
            var id = u16(b, e), sz = u16(b, e + 2), q = e + 4;
            if (id === 1) {
              if (tam === 0xffffffff) { tam = u64(b, q); q += 8; }
              if (comp === 0xffffffff) { comp = u64(b, q); q += 8; }
              if (off === 0xffffffff) { off = u64(b, q); }
            }
            e += 4 + sz;
          }
        }
        p += 46 + ln + le + lc;
        var alvo = qualAlvo(nome);
        if (!alvo) continue;
        var ini = off + 30 + u16(b, off + 26) + u16(b, off + 28);
        var bruto = b.subarray(ini, ini + comp);
        tarefas.push((metodo === 0 ? Promise.resolve(bruto) : metodo === 8 ? inflar(bruto) : Promise.reject(new Error('zip-metodo')))
          .then((function (a) { return function (u8) { return { alvo: a, texto: new TextDecoder('utf-8').decode(u8) }; }; })(alvo)));
      }
      return Promise.all(tarefas);
    });
  }

  function lerArquivos(lista) {
    var arr = Array.prototype.slice.call(lista || []);
    var zip = arr.filter(function (f) { return /\.zip$/i.test(f.name); })[0];
    var base = zip ? lerZip(zip) : Promise.resolve([]);
    return base.then(function (doZip) {
      var soltos = arr.filter(function (f) { return qualAlvo(f.name); });
      return Promise.all(soltos.map(function (f) { return f.text().then(function (t) { return { alvo: qualAlvo(f.name), texto: t }; }); }))
        .then(function (r) { return doZip.concat(r); });
    }).then(function (textos) {
      var m = {};
      textos.forEach(function (t) { m[t.alvo] = t.texto; });
      return m;
    });
  }

  /* ---------- CSV ---------- */
  function linhasCsv(txt) {
    var out = [], linha = [], campo = '', aspas = false;
    if (txt.charCodeAt(0) === 0xfeff) txt = txt.slice(1);
    for (var i = 0; i < txt.length; i++) {
      var c = txt[i];
      if (aspas) {
        if (c === '"') { if (txt[i + 1] === '"') { campo += '"'; i++; } else aspas = false; }
        else campo += c;
      } else if (c === '"') aspas = true;
      else if (c === ',') { linha.push(campo); campo = ''; }
      else if (c === '\n' || c === '\r') {
        if (c === '\r' && txt[i + 1] === '\n') i++;
        linha.push(campo); out.push(linha); linha = []; campo = '';
      } else campo += c;
    }
    if (campo !== '' || linha.length) { linha.push(campo); out.push(linha); }
    return out;
  }
  /* 1ª linha: metadados; 2ª: cabeçalho com prefixos "com.samsung.health.xxx." */
  function tabela(txt) {
    var L = linhasCsv(txt);
    if (L.length < 2) return [];
    var cab = L[1].map(function (c) { return c.indexOf('com.samsung') === 0 ? c.split('.').pop() : c; });
    var idx = {};
    cab.forEach(function (c, i) { if (!(c in idx)) idx[c] = i; });
    return L.slice(2).filter(function (r) { return r.length > 1; }).map(function (r) {
      return { v: function (k) { var i = idx[k]; return i == null ? '' : (r[i] || ''); } };
    });
  }
  function n(v) { if (v === '' || v == null) return null; var x = parseFloat(v); return isFinite(x) ? x : null; }
  function pad(x) { return String(x).padStart(2, '0'); }
  /* horários vêm em UTC; "UTC-0300" diz o fuso de quando foi medido */
  function local(utc, fuso) {
    var m = /^(\d{4})-(\d\d)-(\d\d)[ T](\d\d):(\d\d):(\d\d)/.exec(utc || '');
    if (!m) return null;
    var t = Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], +m[6]);
    var f = /UTC([+-])(\d\d)(\d\d)/.exec(fuso || '') || [null, '-', '03', '00'];
    t += (f[1] === '-' ? -1 : 1) * (+f[2] * 60 + +f[3]) * 60000;
    var d = new Date(t);
    return { t: t, dia: d.getUTCFullYear() + '-' + pad(d.getUTCMonth() + 1) + '-' + pad(d.getUTCDate()), hm: pad(d.getUTCHours()) + ':' + pad(d.getUTCMinutes()) };
  }
  function soData(v) { var m = /^(\d{4}-\d\d-\d\d)/.exec(v || ''); return m ? m[1] : null; }
  function r1(x) { return x == null ? null : Math.round(x * 10) / 10; }

  /* ---------- resumo diário ----------
     Cada dia (data em que você acordou) vira um documento:
     { id: 'AAAA-MM-DD', dia, fonte, sono: { horas, nota, eficiencia, latenciaMin, deitou, acordou },
       fcSono, vfcSono, passos, treinosRelogio: [{ hora, min, fcMedia, fcMax, kcal }], corpo: { peso, gordura, musculo, agua } } */
  function resumir(textos) {
    var dias = {};
    function dia(k) { return dias[k] || (dias[k] = { id: k, dia: k, fonte: 'samsung-health' }); }
    var achados = [];

    if (textos.sono) {
      achados.push('sono');
      tabela(textos.sono).forEach(function (r) {
        var a = local(r.v('start_time'), r.v('time_offset')), b = local(r.v('end_time'), r.v('time_offset'));
        if (!a || !b) return;
        var h = (b.t - a.t) / 3600000;
        if (h < 3 || h > 16) return; // cochilos ficam de fora
        var d = dia(b.dia);
        if (d.sono && d.sono.horas >= h) return; // fica o sono mais longo da noite
        var ef = n(r.v('efficiency')), lat = n(r.v('sleep_latency'));
        d.sono = { horas: Math.round(h * 100) / 100, nota: n(r.v('sleep_score')), eficiencia: ef ? r1(ef) : null, latenciaMin: lat != null ? Math.round(lat / 60000) : null, deitou: a.hm, acordou: b.hm };
      });
    }
    if (textos.vitalidade) {
      achados.push('vitalidade');
      tabela(textos.vitalidade).forEach(function (r) {
        var k = soData(r.v('day_time')); if (!k) return;
        var fc = n(r.v('shr_value')), vfc = n(r.v('shrv_value'));
        if (fc > 0) dia(k).fcSono = r1(fc);
        if (vfc > 0) dia(k).vfcSono = r1(vfc);
      });
    }
    if (textos.passos) {
      achados.push('passos');
      tabela(textos.passos).forEach(function (r) {
        var k = soData(r.v('day_time')), p = n(r.v('step_count'));
        if (k && p != null && p > (dia(k).passos || 0)) dia(k).passos = Math.round(p);
      });
    }
    if (textos.exercicio) {
      achados.push('exercicio');
      tabela(textos.exercicio).forEach(function (r) {
        if (n(r.v('exercise_type')) !== TIPO_FORCA) return;
        var a = local(r.v('start_time'), r.v('time_offset')); if (!a) return;
        var d = dia(a.dia);
        (d.treinosRelogio = d.treinosRelogio || []).push({ hora: a.hm, min: Math.round((n(r.v('duration')) || 0) / 60000), fcMedia: Math.round(n(r.v('mean_heart_rate')) || 0) || null, fcMax: Math.round(n(r.v('max_heart_rate')) || 0) || null, kcal: Math.round(n(r.v('calorie')) || 0) || null });
        d.treinosRelogio.sort(function (x, y) { return x.hora < y.hora ? -1 : 1; });
      });
    }
    if (textos.peso) {
      achados.push('peso');
      tabela(textos.peso).forEach(function (r) {
        var a = local(r.v('start_time'), r.v('time_offset')), p = n(r.v('weight'));
        if (!a || !p) return;
        dia(a.dia).corpo = { hora: a.hm, peso: r1(p), gordura: r1(n(r.v('body_fat'))), musculo: r1(n(r.v('skeletal_muscle_mass'))), agua: r1(n(r.v('total_body_water'))) };
      });
    }
    var lista = Object.keys(dias).sort().map(function (k) { return dias[k]; });
    return { dias: lista, achados: achados };
  }

  function importar(arquivos) {
    return lerArquivos(arquivos).then(function (textos) {
      if (!Object.keys(textos).length) throw new Error('nada');
      return resumir(textos);
    });
  }

  /* ---------- relatório mensal ---------- */
  function chave(d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
  function deChave(k) { var p = k.split('-'); return new Date(+p[0], +p[1] - 1, +p[2]); }
  function mais(d, x) { return new Date(d.getFullYear(), d.getMonth(), d.getDate() + x); }
  function media(a) { return a.length ? a.reduce(function (s, x) { return s + x; }, 0) / a.length : null; }
  function desvio(a) { var m = media(a); return a.length > 1 ? Math.sqrt(a.reduce(function (s, x) { return s + (x - m) * (x - m); }, 0) / (a.length - 1)) : null; }
  function fmt(x, c) { return x == null ? '—' : Number(x).toLocaleString('pt-BR', { minimumFractionDigits: c || 0, maximumFractionDigits: c || 0 }); }
  function horasTxt(h) { var hh = Math.floor(h), mm = Math.round((h - hh) * 60); if (mm === 60) { hh++; mm = 0; } return hh + 'h' + pad(mm); }
  function pct(a, b) { return b ? Math.round(a / b * 100) : 0; }

  /* topo do exercício numa sessão: maior carga e, nela, mais repetições */
  function topo(ex) {
    return ex.sets.reduce(function (a, s) { return !a || s.carga > a.carga || (s.carga === a.carga && s.reps > a.reps) ? s : a; }, null);
  }
  /* compara cada exercício com a vez anterior em que ele foi feito */
  function progressaoDe(sessoes) {
    var ultimo = {}, porSessao = {};
    sessoes.forEach(function (h) {
      var r = { subiu: 0, igual: 0, caiu: 0, comparados: 0 };
      h.exs.forEach(function (ex) {
        var t = topo(ex); if (!t) return;
        var ant = ultimo[ex.nome];
        if (ant) {
          var vol = ex.sets.reduce(function (s, x) { return s + x.carga * x.reps; }, 0);
          r.comparados++;
          if (t.carga > ant.carga || (t.carga === ant.carga && (t.reps > ant.reps || vol > ant.vol * 1.05))) r.subiu++;
          else if (t.carga < ant.carga) r.caiu++;
          else r.igual++;
        }
        ultimo[ex.nome] = { carga: t.carga, reps: t.reps, vol: ex.sets.reduce(function (s, x) { return s + x.carga * x.reps; }, 0) };
      });
      porSessao[h.id] = r;
    });
    return porSessao;
  }

  /* referência pessoal: 60 dias antes da data, exige ao menos 14 noites */
  function referencia(saude, ate) {
    var lim = mais(ate, -60), lim0 = chave(lim), ate0 = chave(ate);
    var v = [], s = [];
    saude.forEach(function (d) {
      if (d.dia >= lim0 && d.dia < ate0) {
        if (d.vfcSono != null) v.push(d.vfcSono);
        if (d.sono && d.sono.horas != null) s.push(d.sono.horas);
      }
    });
    return { vfc: v.length >= 14 ? media(v) : null, vfcDp: v.length >= 14 ? desvio(v) : null, sono: s.length >= 14 ? media(s) : null, n: v.length };
  }

  /* semanas de segunda a domingo; a semana pertence ao mês em que cai a quinta-feira */
  function semanasDoMes(ano, mes) {
    var d = new Date(ano, mes, 1), seg = mais(d, -((d.getDay() + 6) % 7)), out = [];
    for (;;) {
      var qui = mais(seg, 3);
      if (qui.getFullYear() > ano || (qui.getFullYear() === ano && qui.getMonth() > mes)) break;
      if (qui.getMonth() === mes) out.push(seg);
      seg = mais(seg, 7);
    }
    return out;
  }

  function mensal(mesK, entrada) {
    var ano = +mesK.slice(0, 4), mes = +mesK.slice(5, 7) - 1;
    var sessoes = (entrada.sessoes || []).slice().sort(function (a, b) { return a.dia < b.dia ? -1 : a.dia > b.dia ? 1 : 0; });
    var saude = (entrada.saude || []).slice().sort(function (a, b) { return a.dia < b.dia ? -1 : 1; });
    var porDia = {}; saude.forEach(function (d) { porDia[d.dia] = d; });
    var prog = progressaoDe(sessoes);
    var hoje = entrada.hoje ? deChave(entrada.hoje) : new Date();
    var ultimoDado = saude.length ? saude[saude.length - 1].dia : null;

    function treinosEntre(a, b) { // [a, b)
      var A = chave(a), B = chave(b), dias = {};
      sessoes.forEach(function (h) { if (h.dia >= A && h.dia < B) { (dias[h.dia] = dias[h.dia] || { app: [], relogio: [] }).app.push(h); } });
      saude.forEach(function (d) { if (d.dia >= A && d.dia < B && d.treinosRelogio && d.treinosRelogio.length) (dias[d.dia] = dias[d.dia] || { app: [], relogio: [] }).relogio = d.treinosRelogio; });
      return dias;
    }
    function duracaoDia(t) {
      if (t.app.length) return t.app.reduce(function (s, h) { return s + (h.duracao || 0); }, 0);
      return t.relogio.reduce(function (s, r) { return s + (r.min || 0); }, 0);
    }

    var semanas = semanasDoMes(ano, mes).map(function (seg) {
      var fim = mais(seg, 7), A = chave(seg), B = chave(fim);
      var futura = seg > hoje;
      var tr = treinosEntre(seg, fim), diasT = Object.keys(tr);
      var durs = diasT.map(function (k) { return duracaoDia(tr[k]); }).filter(function (x) { return x > 0; });
      var p = { subiu: 0, igual: 0, caiu: 0, comparados: 0 }, volume = 0, sessApp = 0;
      diasT.forEach(function (k) {
        tr[k].app.forEach(function (h) {
          sessApp++;
          var r = prog[h.id]; p.subiu += r.subiu; p.igual += r.igual; p.caiu += r.caiu; p.comparados += r.comparados;
          h.exs.forEach(function (ex) { ex.sets.forEach(function (s) { volume += s.carga * s.reps; }); });
        });
      });
      // noites da semana: as que terminam de terça a segunda seguinte (refletem os dias seg–dom)
      var noites = [];
      for (var i = 1; i <= 7; i++) { var dd = porDia[chave(mais(seg, i))]; if (dd) noites.push(dd); }
      var hs = noites.filter(function (d) { return d.sono && d.sono.horas; }).map(function (d) { return d.sono.horas; });
      var vs = noites.filter(function (d) { return d.vfcSono != null; }).map(function (d) { return d.vfcSono; });
      var ref = referencia(saude, seg);
      var w = {
        inicio: A, fim: chave(mais(seg, 6)), futura: futura,
        treinos: diasT.length, sessoesApp: sessApp, duracao: durs.length ? Math.round(media(durs)) : null, volume: Math.round(volume),
        progressao: p, sono: hs.length ? media(hs) : null, nSono: hs.length, vfc: vs.length ? media(vs) : null, nVfc: vs.length,
        ref: ref, estadoVfc: null, frases: []
      };
      if (w.vfc != null && ref.vfc != null && vs.length >= 3) {
        var lim = Math.max(3, 0.4 * (ref.vfcDp || 0)), dif = w.vfc - ref.vfc;
        w.difVfc = dif;
        w.estadoVfc = dif < -lim ? 'abaixo' : dif > lim ? 'acima' : 'faixa';
      }
      return w;
    });

    // progressão média do mês, para dizer se uma semana avançou "menos que as outras"
    var compMes = semanas.reduce(function (s, w) { return s + w.progressao.comparados; }, 0);
    var subMes = semanas.reduce(function (s, w) { return s + w.progressao.subiu; }, 0);
    var taxaMes = compMes ? subMes / compMes : null;

    semanas.forEach(function (w) {
      var f = w.frases;
      if (w.futura) return;
      var poucos = w.nSono < 3;
      var alto = w.treinos >= 4, baixo = w.treinos <= 2;
      var pr = w.progressao, taxa = pr.comparados ? pr.subiu / pr.comparados : null;
      if (poucos) { f.push('Poucas noites registradas pelo relógio nesta semana — sem leitura de recuperação.'); }
      else if (w.estadoVfc === 'abaixo' && alto) f.push('Semana puxada e recuperação abaixo do seu normal: sugere carga acumulada. Se a próxima semana repetir o padrão, vale aliviar.');
      else if (w.estadoVfc === 'abaixo' && baixo) f.push('Recuperação abaixo do normal mesmo com poucos treinos: sugere que o cansaço veio de fora do treino (sono, rotina, estresse).');
      else if (w.estadoVfc === 'abaixo') f.push('Recuperação abaixo do seu normal. Vale observar a próxima semana antes de mudar o treino.');
      else if (w.estadoVfc === 'acima' && baixo) f.push('Semana leve e recuperação acima do normal: há espaço para treinar mais.');
      else if ((w.estadoVfc === 'faixa' || w.estadoVfc === 'acima') && alto) f.push('Volume alto sem queda de recuperação: o corpo absorveu bem a semana.');
      else if (w.estadoVfc === 'acima') f.push('Recuperação acima do seu normal.');
      else if (w.estadoVfc === 'faixa') f.push('Recuperação dentro do seu normal.');
      else if (w.vfc != null) f.push('Ainda sem histórico suficiente (14 noites) para comparar a VFC com o seu normal.');
      if (!poucos && w.sono != null && w.sono < 6.5) {
        var t = 'Sono curto (média de ' + horasTxt(w.sono) + ')';
        if (taxa != null && taxaMes != null && pr.comparados >= 3 && taxa < taxaMes - 0.1) t += ' e as cargas avançaram menos que nas outras semanas do mês — os dois costumam andar juntos.';
        else t += '.';
        f.push(t);
      }
      if (pr.comparados >= 3) f.push('Cargas ou repetições subiram em ' + pr.subiu + ' de ' + pr.comparados + ' exercícios' + (pr.caiu ? ' (' + pr.caiu + ' abaixo da vez anterior)' : '') + '.');
      if (!w.treinos) f.unshift('Nenhum treino registrado.');
    });

    /* ---- leituras do mês e dos últimos 90 dias ---- */
    var iniMes = new Date(ano, mes, 1), fimMes = new Date(ano, mes + 1, 1);
    var fim90 = fimMes < hoje ? fimMes : mais(hoje, 1), ini90 = mais(fim90, -90);
    var achados = [];
    var Ai = chave(ini90), Bi = chave(fim90);
    var noMesT = treinosEntre(iniMes, fimMes);
    var noitesMes = saude.filter(function (d) { return d.dia >= chave(iniMes) && d.dia < chave(fimMes); });
    var vMes = noitesMes.filter(function (d) { return d.vfcSono != null; }).map(function (d) { return d.vfcSono; });
    var sMes = noitesMes.filter(function (d) { return d.sono; }).map(function (d) { return d.sono.horas; });
    var refMes = referencia(saude, iniMes);

    // noite após treino × após descanso (no mês)
    var aposT = [], aposD = [];
    noitesMes.forEach(function (d) {
      if (d.vfcSono == null) return;
      var ontem = chave(mais(deChave(d.dia), -1));
      var treinou = sessoes.some(function (h) { return h.dia === ontem; }) || !!(porDia[ontem] && porDia[ontem].treinosRelogio && porDia[ontem].treinosRelogio.length);
      (treinou ? aposT : aposD).push(d.vfcSono);
    });
    if (aposT.length >= 3 && aposD.length >= 3) {
      var dd = media(aposT) - media(aposD);
      achados.push({ tit: 'Treino e recuperação', txt: 'Na noite depois de treinar, sua VFC ficou em ' + fmt(media(aposT)) + ' ms; depois de descanso, ' + fmt(media(aposD)) + ' ms (' + plural(aposT.length, 'noite', 'noites') + ' × ' + aposD.length + '). ' + (Math.abs(dd) < 3 ? 'Diferença pequena: os treinos não estão pesando na recuperação.' : dd < 0 ? 'Queda esperada após treinar; o que importa é ela voltar nos dias de descanso.' : 'Recuperação até melhor após treinar — comum quando o treino melhora o sono.') });
    }

    // sono da noite anterior × desempenho (90 dias)
    var bom = { n: 0, dur: [], sub: 0, comp: 0 }, curto = { n: 0, dur: [], sub: 0, comp: 0 };
    var tr90 = treinosEntre(ini90, fim90);
    Object.keys(tr90).forEach(function (k) {
      var noite = porDia[k]; if (!noite || !noite.sono) return;
      var g = noite.sono.horas < 6.5 ? curto : bom;
      g.n++;
      var du = duracaoDia(tr90[k]); if (du) g.dur.push(du);
      tr90[k].app.forEach(function (h) { var r = prog[h.id]; g.sub += r.subiu; g.comp += r.comparados; });
    });
    if (bom.n >= 3 && curto.n >= 3) {
      var t2 = 'Nos últimos 90 dias, depois de noites com menos de 6h30 você treinou ' + fmt(media(curto.dur)) + ' min em média (' + plural(curto.n, 'treino', 'treinos') + '); depois de noites maiores, ' + fmt(media(bom.dur)) + ' min (' + bom.n + ').';
      if (curto.comp >= 8 && bom.comp >= 8) t2 += ' As cargas subiram em ' + pct(curto.sub, curto.comp) + '% dos exercícios após noites curtas e em ' + pct(bom.sub, bom.comp) + '% após noites boas.';
      var difDur = media(curto.dur) - media(bom.dur);
      t2 += difDur < -5 ? ' Isso sugere que o sono curto encurta o treino.' : ' O sono curto não mudou muito a duração do treino.';
      achados.push({ tit: 'Sono e desempenho', txt: t2 });
    } else {
      achados.push({ tit: 'Sono e desempenho', txt: 'Ainda faltam treinos com dados de sono para comparar noites curtas e boas (são precisos ao menos 3 de cada nos últimos 90 dias).', fraco: true });
    }

    // pré-treino (90 dias, só sessões do app)
    var com = { v: [], e: [], s: [] }, sem = { v: [], e: [], s: [] }, nCom = 0, nSem = 0;
    sessoes.forEach(function (h) {
      if (h.dia < Ai || h.dia >= Bi) return;
      if (h.preTreino) nCom++; else nSem++;
      var noite = porDia[chave(mais(deChave(h.dia), 1))]; if (!noite) return;
      var g = h.preTreino ? com : sem;
      if (noite.vfcSono != null) g.v.push(noite.vfcSono);
      if (noite.sono && noite.sono.eficiencia) g.e.push(noite.sono.eficiencia);
      if (noite.sono) g.s.push(noite.sono.horas);
    });
    if (com.v.length >= 5 && sem.v.length >= 5) {
      var dv = media(com.v) - media(sem.v), de = com.e.length && sem.e.length ? media(com.e) - media(sem.e) : null;
      achados.push({ tit: 'Pré-treino', txt: 'Na noite após treinos com pré-treino: VFC ' + fmt(media(com.v)) + ' ms' + (com.e.length ? ', eficiência do sono ' + fmt(media(com.e)) + '%' : '') + ', sono de ' + horasTxt(media(com.s)) + '. Sem pré-treino: ' + fmt(media(sem.v)) + ' ms' + (sem.e.length ? ', ' + fmt(media(sem.e)) + '%' : '') + ', ' + horasTxt(media(sem.s)) + ' (' + com.v.length + ' × ' + sem.v.length + ' noites). ' +
        (dv < -3 || (de != null && de < -2) ? 'Sugere que o pré-treino atrapalha o sono — vale testar tomar mais cedo ou uma dose menor.' : 'Não aparece efeito relevante no sono.') });
    } else {
      achados.push({ tit: 'Pré-treino', txt: (nCom ? plural(nCom, 'treino marcado', 'treinos marcados') + ' com pré-treino nos últimos 90 dias. ' : 'Nenhum treino marcado com pré-treino ainda. ') + 'A comparação aparece quando houver ao menos 5 noites após treinos com e 5 sem (hoje: ' + com.v.length + ' e ' + sem.v.length + ').', fraco: true });
    }

    var falta = ultimoDado && ultimoDado < chave(mais(fimMes, -1)) && chave(iniMes) <= chave(hoje) ? ultimoDado : null;
    return {
      mes: mesK, semanas: semanas, achados: achados, ultimoDado: ultimoDado, faltaDepois: falta,
      totais: { treinos: Object.keys(noMesT).length, sono: sMes.length ? media(sMes) : null, nSono: sMes.length, vfc: vMes.length ? media(vMes) : null, refVfc: refMes.vfc }
    };
  }
  function plural(x, um, varios) { return x + ' ' + (x === 1 ? um : varios); }

  window.Saude = { importar: importar, lerArquivos: lerArquivos, resumir: resumir, mensal: mensal, horasTxt: horasTxt, _csv: tabela };
})();
