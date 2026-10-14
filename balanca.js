/* Leitura experimental de balanças com o app OKOK (Chipsea) pelo Bluetooth do Chrome.
   Essas balanças não aceitam conexão: o peso (e a impedância, em alguns modelos) vai no próprio
   anúncio Bluetooth, no campo "dados do fabricante". O formato dos quadros foi documentado pelo
   projeto open source openScale (github.com/oliexdev/openScale); este código é uma implementação própria.
   Ler anúncios ainda é recurso experimental do Chrome: exige ligar
   chrome://flags/#enable-experimental-web-platform-features. */
(function () {
  'use strict';

  var V20 = 0x20CA, V11 = 0x11CA, VF0 = 0xF0FF;
  var IDS = [V20, V11, VF0];
  for (var h = 0; h < 256; h++) IDS.push((h << 8) | 0xC0); // família "C0": byte baixo 0xC0

  function bytes(dv) { return new Uint8Array(dv.buffer, dv.byteOffset, dv.byteLength); }
  function u16(a, b) { return (a << 8) | b; }
  function hex(arr) { return Array.prototype.map.call(arr, function (x) { return ('0' + x.toString(16)).slice(-2); }).join(' '); }
  function xor(ini, b, ate) { var c = ini; for (var i = 0; i < ate; i++) c ^= b[i]; return c & 0xFF; }
  function divisor(bits) { return bits === 1 ? 1 : bits === 2 ? 100 : 10; }
  function emKg(valor, unidade, b0, b1, div) {
    if (unidade === 0) return valor / div;          // kg
    if (unidade === 1) return valor / div / 2;      // jin
    if (unidade === 2) return valor / div / 2.204623; // lb
    return b0 * 6.350293 + (b1 / div) * 0.453592;   // st:lb
  }

  /* Recebe o Map(companyId -> DataView) do evento e devolve a leitura ou null.
     final = leitura estável informada pela própria balança (quando o modelo informa). */
  function interpretar(mapa) {
    var r = null;
    mapa.forEach(function (dv, id) {
      if (r) return;
      var b = bytes(dv);
      if (id === V20 && b.length === 19) {
        if (xor(0x20, b, 12) !== b[12]) return;
        var div = (b[6] & 0x04) ? 100 : 10;
        r = { variante: 'V20', peso: u16(b[8], b[9]) / div, impedancia: u16(b[10], b[11]) / 10, final: !!(b[6] & 0x01), informaEstavel: true };
      } else if (id === V11 && b.length === 23) {
        if (xor(0xCA ^ 0x11, b, 16) !== b[16]) return;
        var p = b[9];
        r = { variante: 'V11', peso: emKg(u16(b[3], b[4]), (p >> 3) & 3, b[3], b[4], divisor((p >> 1) & 3)), impedancia: 0, final: false, informaEstavel: false };
      } else if (id === VF0 && b.length >= 4) {
        r = { variante: 'VF0', peso: u16(b[3], b[2]) / 10, impedancia: 0, final: false, informaEstavel: false };
      } else if ((id & 0xFF) === 0xC0 && b.length >= 13) {
        var at = b[6];
        r = { variante: 'C0', peso: emKg(u16(b[0], b[1]), (at >> 3) & 3, b[0], b[1], divisor((at >> 1) & 3)), impedancia: u16(b[2], b[3]) / 10, final: !!(at & 0x01), informaEstavel: true };
      }
    });
    if (r) {
      r.peso = Math.round(r.peso * 100) / 100;
      r.impedancia = Math.round(r.impedancia * 10) / 10;
      if (!(r.peso > 0 && r.peso < 400)) return null;
    }
    return r;
  }

  function suporte() {
    var bt = !!(navigator.bluetooth && navigator.bluetooth.requestDevice);
    var anuncios = !!(window.BluetoothDevice && BluetoothDevice.prototype && 'watchAdvertisements' in BluetoothDevice.prototype);
    return { bluetooth: bt, anuncios: anuncios };
  }

  function filtros() {
    var f = [{ manufacturerData: [{ companyIdentifier: V20 }] }, { manufacturerData: [{ companyIdentifier: V11 }] }, { manufacturerData: [{ companyIdentifier: VF0 }] },
      { name: 'ADV' }, { name: 'Chipsea-BLE' }, { namePrefix: 'Yoda' }];
    for (var h = 0; h < 256; h++) f.push({ manufacturerData: [{ companyIdentifier: (h << 8) | 0xC0 }] });
    return f;
  }

  /* Abre o seletor de dispositivos do Chrome. todos=true mostra qualquer aparelho (diagnóstico). */
  function escolher(todos) {
    var base = { optionalManufacturerData: IDS };
    var op = todos ? Object.assign({ acceptAllDevices: true }, base) : Object.assign({ filters: filtros() }, base);
    return navigator.bluetooth.requestDevice(op).catch(function (e) {
      if (!todos && e && e.name === 'TypeError') return navigator.bluetooth.requestDevice(Object.assign({ acceptAllDevices: true }, base));
      throw e;
    });
  }

  /* Escuta anúncios. aoQuadro({leitura, bruto}) a cada anúncio; aoEstavel(leitura) uma vez.
     Modelos que não informam estabilidade: considera estável após 3 leituras iguais seguidas. */
  function ouvir(device, aoQuadro, aoEstavel) {
    var iguais = 0, ultimo = null, feito = false;
    function onAd(ev) {
      var bruto = [];
      ev.manufacturerData.forEach(function (dv, id) { bruto.push({ id: id, hex: hex(bytes(dv)), tam: dv.byteLength }); });
      var l = interpretar(ev.manufacturerData);
      aoQuadro({ leitura: l, bruto: bruto, rssi: ev.rssi, nome: ev.name || device.name || '' });
      if (!l || feito) return;
      if (l.informaEstavel) {
        if (l.final) { feito = true; aoEstavel(l); }
      } else {
        iguais = ultimo !== null && Math.abs(ultimo - l.peso) < 0.05 ? iguais + 1 : 1;
        ultimo = l.peso;
        if (iguais >= 3) { feito = true; aoEstavel(l); }
      }
    }
    device.addEventListener('advertisementreceived', onAd);
    var ctrl = window.AbortController ? new AbortController() : null;
    var p = device.watchAdvertisements(ctrl ? { signal: ctrl.signal } : undefined);
    return p.then(function () {
      return function parar() {
        device.removeEventListener('advertisementreceived', onAd);
        try { if (ctrl) ctrl.abort(); else if (device.unwatchAdvertisements) device.unwatchAdvertisements(); } catch (e) {}
      };
    });
  }

  window.Balanca = { suporte: suporte, escolher: escolher, ouvir: ouvir, interpretar: interpretar, hex: hex };
})();
