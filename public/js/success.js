(function () {
  const { api, $, money, qs } = window.VD;

  const STATUS = {
    yeni: "Yeni sipariş — hazırlanıyor",
    hazirlaniyor: "Hazırlanıyor",
    kargoda: "Kargoya verildi",
    teslim_edildi: "Teslim edildi",
    iptal: "İptal edildi"
  };

  async function init() {
    const id = qs("order");
    const pending = qs("pending") === "1";
    let order = null;
    try { order = JSON.parse(sessionStorage.getItem("vd_last_order")); } catch {}
    if (!order && id) {
      try { order = await api("/api/orders/" + encodeURIComponent(id)); } catch {}
    }
    if (!order) {
      $("#title").textContent = "Sipariş Bulunamadı";
      $("#oid").textContent = "";
      return;
    }

    $("#oid").textContent = "Sipariş No: " + order.id;
    if (pending) {
      $("#mark").textContent = "!";
      $("#mark").style.borderColor = "var(--warn)";
      $("#mark").style.color = "var(--warn)";
      $("#title").textContent = "Sipariş Kaydedildi";
      $("#rows").innerHTML = `<div><span>Ödeme</span><span>Shopier yapılandırması bekleniyor</span></div>`;
    }

    const itemsHTML = order.items.map((i) => `<div><span>${i.name} · ${i.size || ""} × ${i.qty}</span><span>${money(i.price * i.qty)}</span></div>`).join("");
    const ship = order.totals.shipping === 0 ? "Ücretsiz" : money(order.totals.shipping);

    $("#rows").innerHTML += `
      <div><span>Müşteri</span><span>${order.customer.name}</span></div>
      ${itemsHTML}
      <div><span>Ara toplam</span><span>${money(order.totals.subtotal)}</span></div>
      <div><span>Kargo</span><span>${ship}</span></div>
      <div><span><b>Toplam</b></span><span><b>${money(order.totals.total)}</b></span></div>
      <div><span>Durum</span><span>${STATUS[order.status] || order.status}</span></div>`;
  }
  init();
})();
