(function () {
  const { api, $, money, toast, Cart } = window.VD;

  function renderSummary() {
    const items = Cart.list();
    if (!items.length) {
      $("#sum-items").innerHTML = `<div class="empty" style="padding:32px 16px;border:0;background:none">
        <p>Sepetin boş</p><a class="btn btn-sm" href="/shop.html" style="margin-top:16px">Koleksiyona Dön</a></div>`;
      $("#pay-btn").disabled = true;
    } else {
      $("#sum-items").innerHTML = items.map((i) => `
        <div class="sum-row">
          <img src="${i.image}" alt="">
          <div><div class="n">${i.name}</div><div class="m">${i.size || ""} ${i.color ? "· " + i.color : ""} · ${i.qty} adet</div></div>
          <div class="p">${money(i.price * i.qty)}</div>
        </div>`).join("");
    }
    const sub = Cart.subtotal();
    const cfg = window.SHIPPING || { freeOver: 2500, fee: 89 };
    const ship = sub === 0 ? 0 : sub >= cfg.freeOver ? 0 : cfg.fee;
    $("#sum-sub").textContent = money(sub);
    $("#sum-ship").innerHTML = sub === 0 ? "—" : ship === 0 ? '<span class="free">Ücretsiz</span>' : money(ship);
    $("#sum-total").textContent = money(sub + ship);
  }

  function getForm() {
    const f = $("#order-form");
    const data = {};
    ["name", "phone", "address", "city", "district", "note"].forEach((k) => {
      data[k] = (f.elements[k].value || "").trim();
    });
    return data;
  }

  function validate(c) {
    const fields = {
      name: c.name.length >= 3,
      phone: /^[0-9 ()+-]{10,}$/.test(c.phone),
      address: c.address.length >= 10,
      city: c.city.length >= 2,
      district: c.district.length >= 2
    };
    let ok = true;
    Object.entries(fields).forEach(([k, valid]) => {
      const el = $(`.field[data-f="${k}"]`);
      el.classList.toggle("bad", !valid);
      if (!valid) ok = false;
    });
    return ok;
  }

  async function submit(e) {
    e.preventDefault();
    const items = Cart.list();
    if (!items.length) { toast("Sepet boş", "err"); return; }
    const customer = getForm();
    if (!validate(customer)) { toast("Eksik veya hatalı bilgi var", "err"); return; }

    const btn = $("#pay-btn");
    btn.disabled = true;
    btn.textContent = "İşleniyor...";
    try {
      const data = await api("/api/orders", {
        method: "POST",
        body: { customer, items: items.map((i) => ({ id: i.id, size: i.size, qty: i.qty, color: i.color })) }
      });
      sessionStorage.setItem("vd_last_order", JSON.stringify(data.order));
      if (data.paymentUrl) {
        Cart.clear();
        toast("Shopier ödeme sayfasına yönlendiriliyorsun...");
        setTimeout(() => { location.href = data.paymentUrl; }, 1200);
      } else {
        Cart.clear();
        location.href = "/success.html?order=" + encodeURIComponent(data.order.id) + "&pending=1";
      }
    } catch (err) {
      toast(err.message, "err");
    } finally {
      btn.disabled = false;
      btn.textContent = "Shopier ile Güvenli Öde";
    }
  }

  function init() {
    renderSummary();
    document.addEventListener("cart:change", renderSummary);
    $("#order-form").addEventListener("submit", submit);
  }
  init();
})();
