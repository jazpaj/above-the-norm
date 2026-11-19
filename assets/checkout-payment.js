'use strict';

// Places the order on our server, which prices it from the catalog and emails the confirmation.
// No card is charged here: when a payment gateway is approved, charge first in mount() and only
// place the order once the payment succeeds. storeState.checkout comes from ordersLive in
// _generator/site/commerce-config.mjs.
const checkoutPayment = {
  isAvailable() {
    return storeState.checkout===true;
  },

  async mount(element,order) {
    const response=await fetch('/api/place-order',{
      method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(order)
    });
    const result=await response.json().catch(()=>({}));
    if (!response.ok || !result.ok) throw Error(result.error||'We couldn’t place your order. Please try again.');
    try {sessionStorage.setItem('atn_last_order',JSON.stringify(result.order));} catch {}
    bag=[]; saveBag(); setWelcomeOffer(false);
    location.assign('/checkout/complete/');
    return {destroy(){}, async cancel(){return {returnUrl:'/checkout/complete/'};}};
  }
};
