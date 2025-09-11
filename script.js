/* script.js
   Funcionalidades:
   - Render de produtos (dados locais)
   - Filtro por categoria
   - Modal do produto (visual + adicionar ao carrinho)
   - Carrinho: abrir/fechar, adicionar, remover, alterar qtd, limpar
   - Total do carrinho e persistência em localStorage
   - Checkout avançado com Delivery, Retirada e Pedido na Mesa
*/

(() => {
  // ---------- dados de exemplo ----------
  const PRODUCTS = [
    { id: 1, name: "Burguer Clássico", desc: "Pão briochi, Blend 100gm, Cebola caramelizada, Alface Americana, Tomate, Queijo cheddar.", price: 20.0, img: "img/burguer-1.jpg", cat: "classicos" },
    { id: 2, name: "Burguer Bacon", desc: "Bacon crocante, cheddar, cebola caramelizada, Pão briochi, Blend 100gm, Molho barbecue, Alface Americana, Tomate, Queijo Chedda.", price: 20.0, img: "img/burguer-2.jpg", cat: "bacon", badge: "Mais pedido" },
    { id: 3, name: "Burguer Cheddar", desc: "Pão Briochi, Blend 100gm, Cebola Caramelizada, Alface, Tomate, Molho Cheddar", price: 20.0, img: "img/burguer-3.jpg", cat: "Cheddar" },
    { id: 4, name: "Smashe Burguer", desc: "2 carne Prensada, 2 Fatias de Queijo cheddar, Salada Americana, Molho Barbecue.", price: 25.0, img: "img/burguer-4.jpg", cat: "Cheddar", promo: true },
    { id: 5, name: "Combo batata Frita+", desc: "batata + Bacon + Cheddar + refrigerante", price: 20.0, img: "img/batata-frita.jpg", cat: "promo" },
    { id: 6, name: "Fanta Laranja", desc: "", price: 6.0, img: "img/fanta-laranja.jpg", cat: "" },
    { id: 7, name: "Coca Cola ", desc: "", price: 6.0, img: "img/coca-cola.jpg", cat: "promo" },
    { id: 8, name: "Guaraná Antarctica", desc: "", price: 6.0, img: "img/guarana.jpg", cat: "promo" },
  
  ];

  // ---------- helpers ----------
  const $ = sel => document.querySelector(sel);
  const $$ = sel => Array.from(document.querySelectorAll(sel));
  const formatPrice = (v) => {
    const cents = Math.round(v * 100);
    return "R$ " + (cents / 100).toFixed(2).replace(".", ",");
  };

  // ---------- estado ----------
  let state = {
    products: PRODUCTS,
    filter: 'all',
    cart: JSON.parse(localStorage.getItem('garage_cart') || "{}") // {productId: qty}
  };

  // ---------- elementos ----------
  const grid = $('#grid');
  const nores = $('#nores');
  const chips = $$('#filters .chip'); 
  const openCartBtn = $('#openCart');
  const cartCountEl = $('#cartCount');
  const drawer = $('#drawer');
  const closeDrawerBtn = $('#closeDrawer');
  const cartItemsEl = $('#cartItems');
  const cartTotalEl = $('#cartTotal');
  const clearCartBtn = $('#clearCart');
  const checkoutBtn = $('#checkoutBtn');

  const overlay = $('#overlay');
  const modalTitle = $('#modalTitle');
  const modalImg = $('#modalImg');
  const modalDesc = $('#modalDesc');
  const modalPrice = $('#modalPrice');
  const modalQty = $('#modalQty');
  const addModalCart = $('#addModalCart');
  const closeModal = $('#closeModal');

  let currentModalProduct = null;

  // ---------- render products ----------
  function renderProducts() {
    const filtered = state.products.filter(p => state.filter === 'all' ? true : p.cat === state.filter);
    grid.innerHTML = '';
    if (filtered.length === 0) {
      nores.style.display = 'block';
      return;
    } else {
      nores.style.display = 'none';
    }
    filtered.forEach(p => {
      const card = document.createElement('div');
      card.className = 'card';

      const img = document.createElement('img');
      img.src = p.img;
      img.alt = p.name;

      const titleRow = document.createElement('div');
      titleRow.className = 'meta';
      const left = document.createElement('div');
      left.innerHTML = `<strong>${p.name}</strong><div class="desc">${p.desc}</div>`;
      const right = document.createElement('div');
      right.innerHTML = `<div class="price">${formatPrice(p.price)}</div>${p.badge ? `<div class="badge">${p.badge}</div>` : ''}`;
      titleRow.appendChild(left);
      titleRow.appendChild(right);

      const actions = document.createElement('div');
      actions.className = 'actions';
      const btnView = document.createElement('button');
      btnView.className = 'btn';
      btnView.textContent = 'Ver';
      btnView.addEventListener('click', () => openModal(p.id));
      const btnAdd = document.createElement('button');
      btnAdd.className = 'btn primary';
      btnAdd.textContent = 'Adicionar';
      btnAdd.addEventListener('click', () => addToCart(p.id, 1));
      actions.appendChild(btnView);
      actions.appendChild(btnAdd);

      card.appendChild(img);
      card.appendChild(titleRow);
      card.appendChild(actions);
      grid.appendChild(card);
    });
  }

  // ---------- modal ----------
  function openModal(id) {
    const p = state.products.find(x => x.id === id);
    if (!p) return;
    currentModalProduct = p;
    modalTitle.textContent = p.name;
    modalImg.src = p.img;
    modalDesc.textContent = p.desc;
    modalPrice.textContent = formatPrice(p.price);
    modalQty.value = 1;
    overlay.classList.add('show');
    overlay.setAttribute('aria-hidden', 'false');
  }
  function closeModalFn() {
    overlay.classList.remove('show');
    overlay.setAttribute('aria-hidden', 'true');
  }

  addModalCart.addEventListener('click', () => {
    if (!currentModalProduct) return;
    const qty = Math.max(1, parseInt(modalQty.value || 1, 10));
    addToCart(currentModalProduct.id, qty);
    closeModalFn();
    openDrawer();
  });
  closeModal.addEventListener('click', closeModalFn);
  overlay.addEventListener('click', (e) => { if (e.target === overlay) closeModalFn(); });

  // ---------- filtros ----------
  chips.forEach(ch => {
    ch.addEventListener('click', () => {
      chips.forEach(c => c.classList.remove('active'));
      ch.classList.add('active');
      state.filter = ch.dataset.cat;
      renderProducts();
    });
  });

  // ---------- carrinho ----------
  function saveCart() { localStorage.setItem('garage_cart', JSON.stringify(state.cart)); }
  function cartTotalCount() { return Object.values(state.cart).reduce((s,n) => s+n, 0); }
  function cartTotalPrice() {
    let totalCents = 0;
    for (const [idStr, qty] of Object.entries(state.cart)) {
      const p = state.products.find(x => x.id === Number(idStr));
      if (p) totalCents += Math.round(p.price * 100) * qty;
    }
    return totalCents / 100;
  }
  function updateCartBadge() {
    const count = cartTotalCount();
    cartCountEl.style.display = count ? 'inline-block' : 'none';
    if (count) cartCountEl.textContent = count;
  }

  function renderCartItems() {
    cartItemsEl.innerHTML = '';
    const keys = Object.keys(state.cart);
    if (!keys.length) {
      cartItemsEl.innerHTML = '<div class="empty">Seu carrinho está vazio.</div>';
      cartTotalEl.textContent = formatPrice(0);
      updateCartBadge();
      return;
    }
    keys.forEach(idStr => {
      const id = Number(idStr);
      const qty = state.cart[id];
      const p = state.products.find(x => x.id === id);
      if (!p) return;

      const row = document.createElement('div');
      row.className = 'cart-item';

      const img = document.createElement('img');
      img.src = p.img;
      img.alt = p.name;

      const info = document.createElement('div');
      info.style.flex = '1';
      info.innerHTML = `<div><strong>${p.name}</strong></div><div class="muted">${formatPrice(p.price)} x ${qty}</div>`;

      const qtyWrap = document.createElement('div');
      qtyWrap.className = 'qty';

      const minus = document.createElement('button');
      minus.className = 'btn';
      minus.textContent = '-';
      minus.addEventListener('click', () => changeQty(id, Math.max(0, state.cart[id]-1)));

      const qtyLabel = document.createElement('div');
      qtyLabel.textContent = qty;
      qtyLabel.style.minWidth='24px';
      qtyLabel.style.textAlign='center';

      const plus = document.createElement('button');
      plus.className='btn';
      plus.textContent='+';
      plus.addEventListener('click', ()=>changeQty(id, state.cart[id]+1));

      const remove = document.createElement('button');
      remove.className='btn';
      remove.textContent='Remover';
      remove.style.marginLeft='8px';
      remove.addEventListener('click', ()=>removeFromCart(id));

      qtyWrap.append(minus, qtyLabel, plus, remove);
      row.append(img, info, qtyWrap);
      cartItemsEl.appendChild(row);
    });
    cartTotalEl.textContent = formatPrice(cartTotalPrice());
    updateCartBadge();
  }

  function addToCart(id, qty=1) { state.cart[id] = (state.cart[id]||0) + qty; saveCart(); renderCartItems(); }
  function changeQty(id, qty) { if(qty<=0) delete state.cart[id]; else state.cart[id]=qty; saveCart(); renderCartItems(); }
  function removeFromCart(id){ delete state.cart[id]; saveCart(); renderCartItems(); }
  function clearCart(){ state.cart={}; saveCart(); renderCartItems(); }

  function openDrawer(){ drawer.classList.remove('hidden'); drawer.style.top='50%'; drawer.style.left='50%'; drawer.style.transform='translate(-50%,-50%)'; drawer.setAttribute('aria-hidden','false'); }
  function closeDrawer(){ drawer.classList.add('hidden'); drawer.setAttribute('aria-hidden','true'); }

  openCartBtn.addEventListener('click', ()=>{ renderCartItems(); openDrawer(); });
  closeDrawerBtn.addEventListener('click', closeDrawer);
  clearCartBtn.addEventListener('click', ()=>{ if(confirm('Deseja limpar todo o carrinho?')) clearCart(); });

  // ---------- Checkout avançado ----------
  checkoutBtn.textContent='COMPRAR';
  checkoutBtn.addEventListener('click', ()=>{
    if(!cartTotalCount()){ alert('Seu carrinho está vazio.'); return; }
    openOrderModal();
  });

  // ---------- Modal de pedido ----------
  const orderOverlay = document.createElement('div');
  orderOverlay.className='order-overlay';
  orderOverlay.setAttribute('aria-hidden','true');
  document.body.appendChild(orderOverlay);

  function openOrderModal(){
    orderOverlay.innerHTML=`
      <div class="order-modal">
        <h2>Escolha o tipo de pedido</h2>
        <div class="order-options">
          <button id="orderDelivery">Delivery</button>
          <button id="orderRetirada">Retirada</button>
          <button id="orderMesa">Estou na mesa</button>
        </div>
        <div id="orderFormContainer"></div>
      </div>`;
    orderOverlay.classList.add('show'); orderOverlay.setAttribute('aria-hidden','false');

    document.getElementById('orderDelivery').addEventListener('click', ()=>showOrderForm('delivery'));
    document.getElementById('orderRetirada').addEventListener('click', ()=>showOrderForm('retirada'));
    document.getElementById('orderMesa').addEventListener('click', ()=>showOrderForm('mesa'));

    orderOverlay.addEventListener('click',(e)=>{ if(e.target===orderOverlay) closeOrderModal(); });
  }

  function closeOrderModal(){
    orderOverlay.classList.remove('show'); orderOverlay.setAttribute('aria-hidden','true');
  }

  function showOrderForm(tipo){
    const container = document.getElementById('orderFormContainer');
    let html = '<h3>Preencha as informações</h3><form class="order-form">';
    if(tipo==='delivery'){
      html+=`
        <input type="text" placeholder="Nome completo / Apelido" required id="pedidoNome"/>
        <input type="text" placeholder="CEP" required id="pedidoCEP"/>
        <input type="text" placeholder="Rua" required id="pedidoRua"/>
        <input type="text" placeholder="Número" required id="pedidoNum"/>
        <input type="text" placeholder="Complemento" id="pedidoComp"/>
        <select id="pedidoPagamento">
          <option value="PIX">Pix</option>
          <option value="debito">Cartão débito</option>
          <option value="credito">Cartão crédito</option>
          <option value="dinheiro">Dinheiro</option>
        </select>
        <input type="number" placeholder="Valor em espécie para troco" id="pedidoTroco" style="display:none;"/>
      `;
    } else if(tipo==='retirada'){
      html+=`<input type="text" placeholder="Nome completo" required id="pedidoNome"/>`;
    } else if(tipo==='mesa'){
      html+=`
        <label>Escolha sua mesa:</label>
        <div class="order-options">
          <button type="button">Mesa 1</button>
          <button type="button">Mesa 2</button>
          <button type="button">Mesa 3</button>
          <button type="button">Mesa 4</button>
        </div>
        <input type="hidden" id="pedidoNome"/>
      `;
    }
    html+=`<button type="submit" class="finalizar">FINALIZAR PEDIDO</button></form>`;
    container.innerHTML=html;

    const form=container.querySelector('form');
    const pagamento=document.getElementById('pedidoPagamento');
    const troco=document.getElementById('pedidoTroco');
    if(pagamento) pagamento.addEventListener('change',()=>{ troco.style.display=pagamento.value==='dinheiro'?'block':'none'; });

    if(tipo==='mesa'){
      const mesaBtns = container.querySelectorAll('.order-options button');
      mesaBtns.forEach(btn=>{
        btn.addEventListener('click',()=>{
          document.getElementById('pedidoNome').value = btn.textContent;
        });
      });
    }

    form.addEventListener('submit',(e)=>{
      e.preventDefault();
      let mensagem=`*Pedido Hamburgueria*\n`;
      if(tipo==='delivery'){
        const nome=document.getElementById('pedidoNome').value;
        const cep=document.getElementById('pedidoCEP').value;
        const rua=document.getElementById('pedidoRua').value;
        const num=document.getElementById('pedidoNum').value;
        const comp=document.getElementById('pedidoComp').value;
        const pag=document.getElementById('pedidoPagamento').value;
        const trocoVal=document.getElementById('pedidoTroco').value;
        mensagem+=`Tipo: Delivery\nCliente: ${nome}\nEndereço: ${rua}, Nº${num}, ${comp}, CEP: ${cep}\nPagamento: ${pag}\n`;
        if(trocoVal) mensagem+=`Troco: R$ ${trocoVal}\n`;
      } else if(tipo==='retirada'){
        const nome=document.getElementById('pedidoNome').value;
        mensagem+=`Tipo: Retirada\nCliente: ${nome}\n`;
      } else if(tipo==='mesa'){
        const mesa=document.getElementById('pedidoNome').value||'não selecionada';
        mensagem+=`Tipo: Pedido no Restaurante\nMesa: ${mesa}\n`;
      }
      mensagem+=`Itens do pedido:\n`;
      Object.entries(state.cart).forEach(([idStr,qty])=>{
        const p=state.products.find(x=>x.id===Number(idStr));
        if(p) mensagem+=`- ${p.name} x${qty} = ${formatPrice(p.price*qty)}\n`;
      });
      mensagem+=`Total: ${formatPrice(cartTotalPrice())}`;

      alert('Você será redirecionado para o WhatsApp com seu pedido.');
      const numeroWhats='5591985621372';
      const url=`https://wa.me/${numeroWhats}?text=${encodeURIComponent(mensagem)}`;
      window.open(url,'_blank');
      closeOrderModal();
    });
  }

  window.addEventListener('beforeunload', saveCart);

  function init(){ renderProducts(); renderCartItems(); }

  init();
})();
