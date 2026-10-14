/* Gráficos em SVG próprio: linha (evolução) e barras (volume/frequência).
   Uma série por gráfico, cor do tema, grade discreta, tooltip ao tocar/passar e tabela de dados. */
(function () {
  'use strict';
  var specs = {};
  var NS = 'http://www.w3.org/2000/svg';

  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }

  function ticks(min, max, n) {
    if (min === max) { min -= 1; max += 1; }
    var passo = Math.pow(10, Math.floor(Math.log10((max - min) / n)));
    var err = (max - min) / n / passo;
    passo *= err >= 7.5 ? 10 : err >= 3.5 ? 5 : err >= 1.5 ? 2 : 1;
    var ini = Math.floor(min / passo) * passo, fim = Math.ceil(max / passo) * passo, out = [];
    for (var v = ini; v <= fim + passo / 2; v += passo) out.push(Math.round(v * 1000) / 1000);
    return out;
  }

  /* spec: { tipo:'linha'|'barras', titulo, pontos:[{x(label curto), y, dica}], fmtY(v), zeroBase, altura, colunas:[cab1, cab2] } */
  function registrar(id, spec) {
    specs[id] = spec;
    var linhas = spec.pontos.map(function (p) { return '<tr><td>' + esc(p.x) + '</td><td>' + esc(spec.fmtY(p.y)) + '</td></tr>'; }).join('');
    return '<figure class="grafico-fig"><div class="grafico" data-grafico="' + esc(id) + '" tabindex="0" role="img" aria-label="' + esc(spec.titulo + ': ' + resumo(spec)) + '"></div>' +
      '<details class="tabela-dados"><summary>Ver dados</summary><table><thead><tr><th>' + esc((spec.colunas || ['Data', 'Valor'])[0]) + '</th><th>' + esc((spec.colunas || ['Data', 'Valor'])[1]) + '</th></tr></thead><tbody>' + linhas + '</tbody></table></details></figure>';
  }
  function resumo(s) {
    if (!s.pontos.length) return 'sem dados';
    var a = s.pontos[0], b = s.pontos[s.pontos.length - 1];
    return s.pontos.length + ' pontos, de ' + s.fmtY(a.y) + ' (' + a.x + ') a ' + s.fmtY(b.y) + ' (' + b.x + ')';
  }

  function mk(tag, at, pai) {
    var e = document.createElementNS(NS, tag);
    for (var k in at) e.setAttribute(k, at[k]);
    if (pai) pai.appendChild(e);
    return e;
  }

  function desenhar(div, s) {
    if (!s) return;
    div.innerHTML = '';
    var W = Math.max(240, div.clientWidth), H = s.altura || 200;
    var L = 44, R = 14, T = 14, B = 28;
    var pw = W - L - R, ph = H - T - B;
    var ys = s.pontos.map(function (p) { return p.y; });
    var min = Math.min.apply(null, ys), max = Math.max.apply(null, ys);
    if (s.tipo === 'barras' || s.zeroBase) min = 0;
    if (s.tipo === 'linha' && !s.zeroBase) { var folga = (max - min) * 0.15 || Math.max(1, max * 0.05); min -= folga; max += folga; }
    var tk = ticks(min, max, 4);
    var y0 = tk[0], y1 = tk[tk.length - 1];
    function Y(v) { return T + ph - (v - y0) / (y1 - y0 || 1) * ph; }
    var n = s.pontos.length;
    var banda = pw / Math.max(1, n);
    // linha com "t" (tempo em ms) em todos os pontos: eixo X proporcional às datas, sem esconder intervalos longos
    var tempo = s.tipo === 'linha' && n > 1 && s.pontos.every(function (p) { return typeof p.t === 'number'; });
    var t0 = tempo ? s.pontos[0].t : 0, tSpan = tempo ? (s.pontos[n - 1].t - t0) || 1 : 1;
    function X(i) { return s.tipo === 'barras' ? L + banda * i + banda / 2 : (n === 1 ? L + pw / 2 : tempo ? L + pw * (s.pontos[i].t - t0) / tSpan : L + pw * i / (n - 1)); }

    var svg = mk('svg', { width: W, height: H, viewBox: '0 0 ' + W + ' ' + H, 'aria-hidden': 'true' });
    tk.forEach(function (v) {
      mk('line', { x1: L, x2: W - R, y1: Y(v), y2: Y(v), 'class': 'g-grade' }, svg);
      var t = mk('text', { x: L - 8, y: Y(v) + 4, 'class': 'g-eixo', 'text-anchor': 'end' }, svg);
      t.textContent = s.fmtEixo ? s.fmtEixo(v) : v.toLocaleString('pt-BR');
    });
    var idxX = n <= 1 ? [0] : n === 2 ? [0, 1] : [0, Math.floor((n - 1) / 2), n - 1];
    if (tempo && n > 2) { // rótulo do meio: o ponto mais perto do centro, se não encostar nas pontas
      var meio = 0, md = Infinity;
      for (var q = 1; q < n - 1; q++) { var dq = Math.abs(X(q) - (L + pw / 2)); if (dq < md) { md = dq; meio = q; } }
      idxX = meio && X(meio) - L > 60 && L + pw - X(meio) > 60 ? [0, meio, n - 1] : [0, n - 1];
    }
    if (s.tipo === 'barras' && n <= 12) idxX = s.pontos.map(function (p, i) { return i; }).filter(function (i) { return n <= 6 || i % 2 === (n - 1) % 2; });
    idxX.forEach(function (i) {
      var anc = s.tipo === 'barras' ? 'middle' : i === 0 && n > 1 ? 'start' : i === n - 1 && n > 1 ? 'end' : 'middle';
      var t = mk('text', { x: X(i), y: H - 8, 'class': 'g-eixo', 'text-anchor': anc }, svg);
      t.textContent = s.pontos[i].x;
    });

    if (s.tipo === 'barras') {
      var bw = Math.max(4, Math.min(28, banda * 0.62));
      s.pontos.forEach(function (p, i) {
        var h = Math.max(0, Y(y0) - Y(p.y));
        if (p.y > 0) {
          var x = X(i) - bw / 2, y = Y(p.y), r = Math.min(4, bw / 2, h);
          mk('path', { d: 'M' + x + ',' + Y(y0) + 'V' + (y + r) + 'Q' + x + ',' + y + ' ' + (x + r) + ',' + y + 'H' + (x + bw - r) + 'Q' + (x + bw) + ',' + y + ' ' + (x + bw) + ',' + (y + r) + 'V' + Y(y0) + 'Z', 'class': 'g-barra', 'data-i': i }, svg);
        }
      });
    } else {
      var d = s.pontos.map(function (p, i) { return (i ? 'L' : 'M') + X(i).toFixed(1) + ',' + Y(p.y).toFixed(1); }).join('');
      mk('path', { d: d, 'class': 'g-linha' }, svg);
      if (n <= 40) s.pontos.forEach(function (p, i) { mk('circle', { cx: X(i), cy: Y(p.y), r: 4, 'class': 'g-ponto' }, svg); });
      var ul = n - 1, lt = mk('text', { x: Math.min(X(ul), W - R), y: Y(s.pontos[ul].y) - 10, 'class': 'g-rotulo', 'text-anchor': n > 1 ? 'end' : 'middle' }, svg);
      lt.textContent = s.fmtY(s.pontos[ul].y);
    }

    var guia = mk('line', { x1: 0, x2: 0, y1: T, y2: T + ph, 'class': 'g-guia', visibility: 'hidden' }, svg);
    var foco = mk('circle', { r: 6, 'class': 'g-foco', visibility: 'hidden' }, svg);
    var dica = document.createElement('div');
    dica.className = 'g-dica'; dica.hidden = true;
    div.appendChild(svg); div.appendChild(dica);

    var atual = -1;
    function mostrar(i) {
      if (i < 0 || i >= n) return;
      atual = i;
      var p = s.pontos[i], x = X(i), y = Y(p.y);
      guia.setAttribute('x1', x); guia.setAttribute('x2', x); guia.setAttribute('visibility', 'visible');
      if (s.tipo === 'linha') { foco.setAttribute('cx', x); foco.setAttribute('cy', y); foco.setAttribute('visibility', 'visible'); }
      svg.querySelectorAll('.g-barra').forEach(function (bar) { bar.classList.toggle('ativa', +bar.getAttribute('data-i') === i); });
      dica.innerHTML = '<b>' + esc(s.fmtY(p.y)) + '</b><span>' + esc(p.dica || p.x) + '</span>';
      dica.hidden = false;
      var dw = dica.offsetWidth;
      dica.style.left = Math.min(W - dw - 4, Math.max(4, x - dw / 2)) + 'px';
      dica.style.top = Math.max(0, y - 54) + 'px';
    }
    function esconder() {
      atual = -1; dica.hidden = true; guia.setAttribute('visibility', 'hidden'); foco.setAttribute('visibility', 'hidden');
      svg.querySelectorAll('.g-barra.ativa').forEach(function (b) { b.classList.remove('ativa'); });
    }
    function perto(ev) {
      var r = svg.getBoundingClientRect(), px = ev.clientX - r.left, best = 0, bd = Infinity;
      for (var i = 0; i < n; i++) { var dd = Math.abs(X(i) - px); if (dd < bd) { bd = dd; best = i; } }
      return best;
    }
    svg.addEventListener('pointermove', function (ev) { mostrar(perto(ev)); });
    svg.addEventListener('pointerdown', function (ev) { mostrar(perto(ev)); });
    svg.addEventListener('pointerleave', function (ev) { if (ev.pointerType === 'mouse') esconder(); });
    div.onkeydown = function (ev) {
      if (ev.key === 'ArrowRight') { mostrar(Math.min(n - 1, atual + 1)); ev.preventDefault(); }
      else if (ev.key === 'ArrowLeft') { mostrar(Math.max(0, atual < 0 ? n - 1 : atual - 1)); ev.preventDefault(); }
      else if (ev.key === 'Escape') esconder();
    };
    div.onblur = esconder;
  }

  function desenharTodos(raiz) {
    (raiz || document).querySelectorAll('[data-grafico]').forEach(function (div) { desenhar(div, specs[div.getAttribute('data-grafico')]); });
  }
  var t = null;
  window.addEventListener('resize', function () { clearTimeout(t); t = setTimeout(function () { desenharTodos(); }, 150); });

  window.Graficos = { registrar: registrar, desenharTodos: desenharTodos };
})();
