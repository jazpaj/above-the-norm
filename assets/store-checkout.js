'use strict';

function bagTotals() {
  const subtotal=bag.reduce((sum,line)=>sum+Math.round(productIndex.get(line.id).variants[line.size]*100)*line.quantity,0);
  const savings=offerApplied?Math.round(subtotal*welcome.percent/100):0;
  const net=subtotal-savings;
  const options=[
    {id:'standard',...shippingPolicy.standard,rate:net>=shippingPolicy.standard.freeAt?0:shippingPolicy.standard.rate},
    {id:'express',...shippingPolicy.express}
  ];
  return {subtotal,savings,net,options,delivery:options.find(option=>option.id===shippingMethod)};
}

function shippingFieldset(options) {
  return `<fieldset class="bag-shipping"><legend>U.S. shipping</legend>
    ${options.map(option=>`<label class="bag-shipping-option">
      <input type="radio" name="shipping-method" value="${option.id}" ${option.id===shippingMethod?'checked':''}>
      <span class="shipping-option-copy"><strong>${option.label}</strong><small>${option.transit} after dispatch</small></span>
      <strong class="shipping-option-price">${option.rate?money(option.rate/100):'Free'}</strong>
    </label>`).join('')}
  </fieldset>`;
}

function checkoutSummary() {
  const {subtotal,savings,net,delivery}=bagTotals();
  return `<ul class="checkout-items">${bag.map(line=>{
    const product=productIndex.get(line.id);
    return `<li><a class="checkout-item-link" href="${itemPath(product)}"><img src="${imagePath(product.images[0])}" alt="" width="64" height="64">
      <span><strong>${h(product.name)}</strong><small>${h([product.color,line.size].filter(Boolean).join(' · '))} · Qty ${line.quantity}${isAvailable(product,line.size)?'':' · Unavailable'}</small></span>
    </a><strong>${money(product.variants[line.size]*line.quantity)}</strong></li>`;
  }).join('')}</ul>
  <div class="bag-total"><span>Merchandise subtotal</span><span>${money(subtotal/100)}</span></div>
  ${savings?`<div class="bag-total"><span>${welcome.code} · 10% off</span><span>−${money(savings/100)}</span></div><button class="text-button" type="button" id="checkout-remove-discount">Remove discount</button>`:''}
  <div class="bag-total"><span>${delivery.label} U.S. shipping</span><span>${delivery.rate?money(delivery.rate/100):'Free'}</span></div>
  <div class="bag-total bag-grand-total"><span>Estimated total before tax</span><strong>${money((net+delivery.rate)/100)}</strong></div>`;
}

function refreshCheckout() {
  if (!/^\/checkout\/?$/.test(location.pathname)) return;
  if ($('#checkout-fields:disabled')) return;
  const form=$('#checkout-form');
  if (!form && !bag.length) return;
  if (!form || !bag.length) { renderCheckout($('#main-content')); return; }
  $('#checkout-summary').innerHTML=checkoutSummary();
  $('.checkout-shipping',form).innerHTML=shippingFieldset(bagTotals().options);
  $('#checkout-welcome-note').hidden=!offerApplied;
}

function addressFields(kind) {
  const shipping=kind==='shipping';
  const commerce=window.ATN_COMMERCE_POLICY;
  const regionNames=new Intl.DisplayNames(['en'],{type:'region'});
  const countries=shipping ? '<option value="US">United States</option>' :
    '<option value="US">United States</option>'+commerce.billingCountries.filter(code=>code!=='US')
      .map(code=>[code,regionNames.of(code)]).sort((a,b)=>a[1].localeCompare(b[1]))
      .map(([code,name])=>`<option value="${code}">${h(name)}</option>`).join('');
  const region=shipping ? `<select name="${kind}-state" autocomplete="${kind} address-level1" required>
    <option value="">Select a state</option>${Object.entries(commerce.shippingStates).map(([code,name])=>`<option value="${code}">${name}</option>`).join('')}</select>` :
    `<input name="${kind}-state" autocomplete="${kind} address-level1" maxlength="80" required>`;
  return `<div class="checkout-address-grid">
    <label class="checkout-full">Country or region<select name="${kind}-country" autocomplete="${kind} country" required>${countries}</select></label>
    <label class="checkout-full">Street address<input name="${kind}-line1" autocomplete="${kind} address-line1" maxlength="200" required></label>
    <label class="checkout-full">Apartment, suite, etc. <span>(optional)</span><input name="${kind}-line2" autocomplete="${kind} address-line2" maxlength="200"></label>
    <label class="checkout-local">City<input name="${kind}-city" autocomplete="${kind} address-level2" maxlength="100" required></label>
    <label class="checkout-local">${shipping?'State':'State or province'}${region}</label>
    <label class="checkout-local checkout-postal">${shipping?'ZIP code':'ZIP or postal code'}<input name="${kind}-postalCode" autocomplete="${kind} postal-code" maxlength="${shipping?10:16}" ${shipping?'inputmode="numeric" pattern="[0-9]{5}(-[0-9]{4})?"':''} required></label>
  </div>`;
}

function readCheckoutAddress(fields,kind) {
  return Object.fromEntries(['country','line1','line2','city','state','postalCode']
    .map(name=>[name,String(fields.get(kind+'-'+name)||'').trim()]));
}

function renderCheckout(main) {
  main.innerHTML=pageIntro('', 'Checkout.', 'Review your order before entering payment details.',true);
  if (!bag.length) {
    main.insertAdjacentHTML('beforeend','<div class="content-width service-page"><p>Your bag is empty.</p><a class="button dark" href="/shop/">Shop ATN</a></div>');
    return;
  }
  const connected=checkoutPayment.isAvailable();
  main.insertAdjacentHTML('beforeend',`<div class="content-width service-page checkout-layout">
    <div class="checkout-steps">
      <form id="checkout-form" method="post" action="/api/checkout">
        <fieldset class="checkout-fields" id="checkout-fields">
          <section class="support-form checkout-section" aria-labelledby="checkout-contact-title">
            <h2 id="checkout-contact-title">Contact information</h2>
            <div class="checkout-address-grid">
              <label class="checkout-full">Full name<input name="name" autocomplete="name" maxlength="150" required></label>
              <label>Email for your order<input name="email" type="email" maxlength="254" autocomplete="email" required></label>
              <label>Phone number<input name="phone" type="tel" autocomplete="tel" minlength="7" maxlength="40" required></label>
            </div>
            <p id="checkout-welcome-note" ${offerApplied?'':'hidden'}>Use the email you joined the ATN list with to claim your first-order discount.</p>
            <p class="checkout-privacy"><a href="/privacy/#collection" target="_blank" rel="noopener">How ATN uses your checkout information</a></p>
          </section>
          <section class="support-form checkout-section" aria-labelledby="checkout-shipping-title">
            <h2 id="checkout-shipping-title">Shipping address</h2>
            ${addressFields('shipping')}
            <div class="checkout-shipping">${shippingFieldset(bagTotals().options)}</div>
            <p>Orders ship in ${shippingPolicy.processing}.</p>
          </section>
          <section class="support-form checkout-section" aria-labelledby="checkout-billing-title">
            <h2 id="checkout-billing-title">Billing address</h2>
            <div class="checkout-consent"><input type="checkbox" id="same-billing" name="sameBilling" checked aria-controls="billing-fields"><label for="same-billing">Use shipping address for billing</label></div>
            <fieldset class="checkout-fields" id="billing-fields" aria-label="Separate billing address" hidden disabled>${addressFields('billing')}</fieldset>
          </section>
        </fieldset>
      </form>
      <section class="support-form checkout-section" id="checkout-payment" aria-labelledby="checkout-payment-title">
        <h2 id="checkout-payment-title" tabindex="-1">Card information</h2>
        <div id="payment-box" aria-labelledby="checkout-payment-title">
          <div class="checkout-payment-placeholder">
            <div class="checkout-card-fields" aria-describedby="card-setup-note">
              <label class="checkout-card-number" for="card-number">Card number<input id="card-number" type="text" placeholder="0000 0000 0000 0000" disabled></label>
              <label for="card-expiration">Expiration date<input id="card-expiration" type="text" placeholder="MM / YY" disabled></label>
              <label for="card-cvv">CVV<input id="card-cvv" type="text" placeholder="123" disabled></label>
            </div>
            <p id="card-setup-note">Card entry opens when the payment provider is connected.</p>
          </div>
        </div>
        <div id="checkout-payment-actions">
          <div class="checkout-consent"><input type="checkbox" id="accept-terms" name="terms" form="checkout-form" required><label for="accept-terms">I accept the <a href="/terms/" target="_blank" rel="noopener">Terms of Service</a>.</label></div>
          <button type="submit" form="checkout-form" class="button dark" id="checkout-continue" ${connected?'':'disabled'}>${connected?'Place order':'Continue to payment'}</button>
          <p role="status" id="checkout-status"></p>
        </div>
        <div id="checkout-edit-area" hidden>
          <button type="button" class="button outline" id="checkout-edit">Edit checkout details</button>
          <p role="status" id="checkout-edit-status"></p>
        </div>
      </section>
    </div>
    <section class="support-form checkout-summary" aria-labelledby="order-summary-title">
      <h2 id="order-summary-title">Order summary</h2><div id="checkout-summary">${checkoutSummary()}</div>
    </section>
  </div>`);
  const form=$('#checkout-form'), summary=$('#checkout-summary'), status=$('#checkout-status'), button=$('#checkout-continue');
  const billing=$('#billing-fields'), sameBilling=$('#same-billing'), fieldsGroup=$('#checkout-fields'), terms=$('#accept-terms');
  const paymentBox=$('#payment-box'), actions=$('#checkout-payment-actions'), editArea=$('#checkout-edit-area');
  const edit=$('#checkout-edit'), editStatus=$('#checkout-edit-status');
  const paymentPlaceholder=$('.checkout-payment-placeholder',paymentBox);
  let previousDetails='', attemptId='';
  let payment;

  function toggleBilling() {
    billing.disabled=sameBilling.checked;
    billing.hidden=sameBilling.checked;
    const domestic=form.elements['billing-country'].value==='US';
    form.elements['billing-state'].required=domestic;
    const postal=form.elements['billing-postalCode'];
    postal.required=domestic;
    if(domestic) postal.pattern='[0-9]{5}(-[0-9]{4})?';
    else postal.removeAttribute('pattern');
  }

  function lockReview(locked) {
    fieldsGroup.disabled=locked;
    terms.disabled=locked;
    button.disabled=locked || !connected;
    const removeDiscount=$('#checkout-remove-discount');
    if (removeDiscount) removeDiscount.disabled=locked;
  }

  form.addEventListener('change',event=>{
    if (event.target===sameBilling || event.target===form.elements['billing-country']) toggleBilling();
    if(event.target.name!=='shipping-method') return;
    shippingMethod=event.target.value;
    localPreference(shippingKey,shippingMethod);
    summary.innerHTML=checkoutSummary();
  });
  summary.addEventListener('click',event=>{
    if(event.target.id!=='checkout-remove-discount') return;
    setWelcomeOffer(false);
    form.elements.email.focus();
  });
  form.addEventListener('submit',async event=>{
    event.preventDefault();
    if (button.disabled) return;
    if(bag.some(line=>!isAvailable(productIndex.get(line.id),line.size))){
      status.textContent='Remove unavailable sizes from your bag before continuing.';
      return;
    }
    const detailsForm=new FormData(form);
    const shippingAddress=readCheckoutAddress(detailsForm,'shipping');
    const fields={
      name:form.elements.name.value.trim(),email:form.elements.email.value.trim(),phone:form.elements.phone.value.trim(),
      shippingAddress,billingAddress:sameBilling.checked?{...shippingAddress}:readCheckoutAddress(detailsForm,'billing'),
      items:bag.map(({id,size,quantity})=>({id,size,quantity})),
      shipping:shippingMethod,welcome:offerApplied,
      acceptedTerms:terms.checked,termsVersion:window.ATN_COMMERCE_POLICY.termsVersion
    };
    const details=JSON.stringify(fields);
    if (details!==previousDetails) {
      attemptId=crypto.randomUUID();
      previousDetails=details;
    }
    lockReview(true);
    status.textContent='Placing your order…';
    try {
      paymentPlaceholder.remove();
      payment=await checkoutPayment.mount(paymentBox,{...fields,id:attemptId});
      try {sessionStorage.setItem('atn-pending-order',JSON.stringify({id:attemptId,bag:JSON.stringify(fields.items)}));} catch {}
      actions.hidden=true;
      editArea.hidden=false;
      $('#checkout-payment-title').focus();
    } catch (error) {
      paymentBox.replaceChildren(paymentPlaceholder);
      status.textContent=error.message||'Payment is temporarily unavailable. Your bag is saved.';
      lockReview(false);
      refreshCheckout();
    }
  });
  edit.addEventListener('click',async ()=>{
    edit.disabled=true;
    editStatus.textContent='Returning to your order details…';
    try {
      const {returnUrl}=await payment.cancel();
      if(returnUrl) {
        location.assign(returnUrl);
        return;
      }
      payment.destroy();
      payment=null;
      paymentBox.replaceChildren(paymentPlaceholder);
      actions.hidden=false;
      editArea.hidden=true;
      previousDetails='';
      lockReview(false);
      status.textContent='';
      editStatus.textContent='';
      refreshCheckout();
      $('#checkout-form input[type=email]')?.focus();
    } catch(error) { editStatus.textContent=error.message||'Couldn’t change this checkout. Try again.'; }
    finally { edit.disabled=false; }
  });
}

function renderOrderStatus(main) {
  let order=null;
  try {order=JSON.parse(sessionStorage.getItem('atn_last_order')||'null');} catch {}
  if (!order || !order.number) {
    main.innerHTML=pageIntro('','Order status.','',true)+`<div class="content-width service-page">
      <p>We couldn’t find a recent order in this browser. Your confirmation email has your order number and details.</p>
      <p><a href="/contact/">Contact ATN</a> · <a href="/track/">Track an order</a> · <a href="/shop/">Continue shopping</a></p></div>`;
    return;
  }
  const productFor=id=>productIndex.get(id);
  main.innerHTML=pageIntro('Order '+h(order.number),'Thank you, '+h(order.first)+'.','Your order is in. We sent a confirmation to '+h(order.email)+'.',true)+`
  <div class="content-width service-page checkout-layout">
    <div class="checkout-steps">
      <section class="support-form checkout-section">
        <h2>What happens next</h2>
        <ul class="service-list">
          <li>Orders are made and shipped within ${shippingPolicy.processing}.</li>
          <li>We email your tracking number as soon as the carrier has your package.</li>
          <li>Need to change something? Email <a href="mailto:${h(window.ATN_SUPPORT_EMAIL||'support@abovethenorm.us')}">${h(window.ATN_SUPPORT_EMAIL||'support@abovethenorm.us')}</a> within 24 hours with your order number.</li>
        </ul>
        <div class="help-actions"><a class="button dark" href="/shop/">Continue shopping</a><a class="button outline" href="/track/">Track an order</a></div>
      </section>
      <section class="support-form checkout-section">
        <h2>Shipping to</h2>
        <p>${h(order.name)}<br>${h(order.address1)}${order.address2?'<br>'+h(order.address2):''}<br>${h(order.cityLine)}<br>${h(order.country)}</p>
        <p>${order.ship==='express'?'Express':'Standard'} U.S. shipping · Placed ${h(order.date)}</p>
      </section>
    </div>
    <section class="support-form checkout-summary" aria-labelledby="order-summary-title">
      <h2 id="order-summary-title">Order summary</h2>
      <ul class="checkout-items">${order.items.map(item=>{
        const product=productFor(item.id);
        const image=product?`<img src="${imagePath(product.images[0])}" alt="" width="64" height="64">`:'';
        const inner=`${image}<span><strong>${h(item.name)}</strong><small>${h(item.variant)} · Qty ${item.qty}</small></span>`;
        return `<li>${product?`<a class="checkout-item-link" href="${itemPath(product)}">${inner}</a>`:`<span class="checkout-item-link">${inner}</span>`}<strong>${money(item.total)}</strong></li>`;
      }).join('')}</ul>
      <div class="bag-total"><span>Merchandise subtotal</span><span>${money(order.subtotal)}</span></div>
      ${order.discount?`<div class="bag-total"><span>${h(order.couponCode)} · 10% off</span><span>−${money(order.discount)}</span></div>`:''}
      <div class="bag-total"><span>${order.ship==='express'?'Express':'Standard'} U.S. shipping</span><span>${order.shipping?money(order.shipping):'Free'}</span></div>
      <div class="bag-total bag-grand-total"><span>Total</span><strong>${money(order.total)}</strong></div>
    </section>
  </div>`;
}

function restockForm(product,sizes) {
  const unavailable=sizes.filter(size=>!isAvailable(product,size));
  if(!unavailable.length) return '';
  return `<details class="restock-details" ${unavailable.length===sizes.length?'open':''}>
    <summary>Get a restock alert</summary>
    <form id="restock-form" class="support-form" method="post" action="/api/restock">
      <label>Size<select name="size" required>${unavailable.map(size=>`<option value="${h(size)}">${h(size)}</option>`).join('')}</select></label>
      <label>Email<input type="email" name="email" autocomplete="email" maxlength="254" required></label>
      <button type="submit" class="button dark">Email me when it’s back</button>
      <p id="restock-status" role="status"></p>
    </form></details>`;
}

function connectRestockForm(product) {
  const form=$('#restock-form');
  if(!form) return;
  const status=$('#restock-status'),button=$('button',form);
  form.addEventListener('submit',async event=>{
    event.preventDefault();
    if(button.disabled) return;
    const size=form.elements.size.value;
    button.disabled=true;
    status.textContent='Saving your alert…';
    try {
      const response=await fetch(form.action,{
        method:'POST',headers:{'content-type':'application/json'},
        body:JSON.stringify({productId:product.id,size,email:form.elements.email.value,consent:true})
      });
      const result=await response.json();
      status.textContent=response.ok && result.received
        ? 'Alert saved for '+size+'.' : result.error||'Couldn’t save your alert. Try again.';
      if(response.ok && result.received) form.reset();
    } catch { status.textContent='Couldn’t save your alert. Try again.'; }
    finally { button.disabled=false; }
  });
}
