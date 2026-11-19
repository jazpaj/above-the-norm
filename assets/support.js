'use strict';

const serviceLinks = [
  ['help','Customer care'], ['track','Track an order'], ['size-guide','Size guide'],
  ['shipping','Shipping'], ['returns','Returns & refunds'], ['contact','Contact ATN']
];

const shippingPolicy = window.ATN_COMMERCE_POLICY.shipping;

const fitTables = [
  ['Tees and tops',['Size','Chest, pit to pit','Body length','Sleeve'],[
    ['S','20','28','8.5'],['M','21','29','9'],['L','22','30','9.5'],['XL','23.5','31','10'],['2XL','25','32','10.5']]],
  ['Pants and shorts',['Size','Waist','Inseam (pants)','Hip'],[
    ['S','28–30','30','41'],['M','31–33','31','42'],['L','34–36','32','43'],['XL','37–39','32','44'],['2XL','40–42','33','45']]]
];

const customerPages = {
  track:['Track your order.','Use the tracking number from the email we sent when your order shipped.'],
  'size-guide':['Find your fit.','Compare ATN’s size guide with the measurements of a piece you already wear.'],
  contact:['Contact ATN.','Get help with an order, product measurements, or a privacy request.']
};

const contactTopics = {
  general:'General question', fit:'Size or product information', checkout:'Checkout or payment',
  tracking:'Shipping or tracking', returns:'Damaged, defective or incorrect item',
  cancellation:'Order cancellation', privacy:'Privacy request'
};

function serviceNav(route) {
  return `<nav class="service-nav" aria-label="Customer care">${serviceLinks.map(([path,label])=>`<a href="/${path}/"${path===route?' aria-current="page"':''}>${label}</a>`).join('')}</nav>`;
}

function renderHelp(main) {
  const topics=[
    ['orders','Orders &amp; payment',[
      ['How do I place an order?','Choose your size and add the item to your bag. At checkout, enter your contact and address details, select shipping, then accept the <a href="/terms/">Terms of Service</a> and continue to the card form when payment is available. Review the final total before submitting payment.'],
      ['How do I know my payment went through?','Use the confirmation and order reference shown after payment. If the status is pending or your bank shows a charge without a confirmation, <a href="/contact/?topic=checkout">contact ATN</a> with your checkout email and any order reference before trying again.'],
      ['How do I use the welcome discount?',`Apply <strong>${welcome.code}</strong> to your first order and use the email address from your ATN sign-up. The ${welcome.percent}% discount applies to merchandise before shipping and tax. <a href="/terms/#welcome-offer">Read the offer terms</a>.`]
    ]],
    ['delivery','Shipping &amp; tracking',[
      ['When will my order arrive?',`Orders normally ship within ${shippingPolicy.processing}. After dispatch, Standard U.S. shipping takes ${shippingPolicy.standard.transit} and Express takes ${shippingPolicy.express.transit}. <a href="/shipping/">See the shipping policy</a>.`],
      ['What does shipping cost?',`Standard U.S. shipping costs ${money(shippingPolicy.standard.rate/100)} and is free at ${money(shippingPolicy.standard.freeAt/100)} after discounts. Express costs ${money(shippingPolicy.express.rate/100)}. Select your method at checkout.`],
      ['Where is my tracking number?','Look for the shipping email, then paste the number into <a href="/track/">Track an order</a>. Check spam or promotions if the email is missing. If the carrier has stopped scanning your package or marks it delivered and you cannot locate it, <a href="/shipping/#tracking">follow the delivery help steps</a>.']
    ]],
    ['order-issues','Returns &amp; order changes',[
      ['What if an item is damaged or incorrect?','Contact ATN within seven days of delivery. Send your order reference, a description and clear photos of the item and packaging. <a href="/returns/#claim">Read the claim instructions</a>.'],
      ['Can I change my address or cancel?','Contact ATN within 24 hours with your order reference and checkout email. Cancellations can be reviewed before production starts. <a href="/shipping/#address-changes">Address changes</a> · <a href="/returns/#cancellation">Cancellation requests</a>'],
      ['When will an approved refund appear?','ATN issues approved refunds to the original payment method within three business days. Your bank or card issuer may need another 5–10 business days. <a href="/returns/#refund-timing">Read about refund timing</a>.']
    ]],
    ['fit-and-stock','Sizing &amp; availability',[
      ['How do I choose a size?','Open Size Chart on the product page to see its listed sizes and any measurements or fit notes. Compare those with a piece you own using the <a href="/size-guide/">general size guide</a>.'],
      ['Can I get an alert for an unavailable size?','If a size is unavailable, choose it in the restock form on the product page. ATN saves the request for that item and size and can send an email when it returns.'],
      ['Can I exchange a piece that doesn’t fit?','Sales are final for a change of mind or fit. Ask ATN about measurements before you order. See <a href="/returns/#final-sale">final sale and sizing</a> for the full policy.']
    ]]
  ];
  main.innerHTML=pageIntro('','Customer care.','Get help with an order, delivery, returns, or finding the right size.',true)+
    `<div class="help-page customer-help content-width">${serviceNav('help')}
      <nav class="help-topic-links" aria-label="Help topics">${topics.map(([id,title])=>`<a href="#${id}">${title}</a>`).join('')}</nav>
      <div class="help-topic-grid">${topics.map(([id,title,questions])=>`<section class="help-topic" id="${id}" aria-labelledby="${id}-title">
        <h2 id="${id}-title">${title}</h2><div class="help-items">${questions.map(([q,a])=>`<details><summary>${q}</summary><p>${a}</p></details>`).join('')}</div>
      </section>`).join('')}</div>
      <div class="help-bottom"><div><h2>Contact ATN</h2><p>For order help, have your order reference and checkout email ready.</p></div>
        <div class="help-actions"><a class="button dark" href="/contact/">Contact support</a><a class="button outline" href="/track/">Track an order</a></div></div>
      <nav class="service-nav" aria-label="Store policies"><a href="/terms/">Terms of Service</a><a href="/privacy/">Privacy Policy</a><a href="/shipping/">Shipping Policy</a><a href="/returns/">Returns &amp; Refunds</a><a href="/trademark/">Trademark</a></nav>
    </div>`;
  const anchor=location.hash.slice(1);
  if(anchor) document.getElementById(anchor)?.scrollIntoView();
}

const trackingCarriers = {
  usps:['USPS','https://tools.usps.com/go/TrackConfirmAction?tLabels='],
  ups:['UPS','https://www.ups.com/track?tracknum='],
  fedex:['FedEx','https://www.fedex.com/fedextrack/?trknbr=']
};

function trackCarrier(number) {
  if (/^1Z[0-9A-Z]{16}$/.test(number)) return 'ups';
  if (/^(9[2-5]\d{18,20}|420\d{5}(?:\d{4})?9\d{21}|[A-Z]{2}\d{9}US)$/.test(number)) return 'usps';
  if (/^(96\d{20}|\d{12}|\d{15})$/.test(number)) return 'fedex';
  return '';
}

function fitTable([title,headers,rows]) {
  return `<section class="fit-section"><h2>${title}</h2><div class="table-wrap" tabindex="0" aria-label="${title} size chart"><table class="measure-table"><thead><tr>${headers.map(t=>`<th scope="col">${t}</th>`).join('')}</tr></thead><tbody>${rows.map(([size,...values])=>`<tr><th scope="row">${size}</th>${values.map(v=>`<td>${v}</td>`).join('')}</tr>`).join('')}</tbody></table></div></section>`;
}

function fitContent() {
  return `<p>Measurements are in inches. These charts are a general comparison for ATN clothing. Individual styles may have a different cut, so check the product’s Size Chart and fit notes before choosing a size.</p>
  ${fitTables.map(fitTable).join('')}
  <h2>How to measure a garment</h2>
  <ol class="service-list"><li><strong>Tees and tops.</strong> Lay a similar piece flat. Measure chest width from armpit to armpit and length from the top of the shoulder to the hem.</li><li><strong>Pants and shorts.</strong> Compare the waist and hip with a garment you own. Measure inseam from the crotch seam to the hem along the inside of the leg.</li><li><strong>Headwear.</strong> Measure around your head where the hat will sit. Check the item page for any fit range or adjustment information.</li></ol>
  <h2>Between sizes?</h2><p>Compare the cut with a piece you already wear and check any model details on the item page. For product-specific measurements or sizes outside the chart, <a href="/contact/?topic=fit">ask ATN about fit</a> before placing your order.</p>`;
}

function showProductSizeChart(product, sizes, fit) {
  const guide = {tops:fitTables[0],bottoms:fitTables[1]}[product.category];
  const listed = guide && guide[2].filter(([size])=>sizes.includes(size));
  $('#size-chart-content').innerHTML = `<p><strong>${h(product.name)}</strong></p>
    <p>Listed sizes ${sizes.map(h).join(', ')}.</p>
    ${fit.length ? `<ul>${fit.map(note=>`<li>${h(note.replace(/^Fit:\s*/i,''))}</li>`).join('')}</ul>` : ''}
    ${listed?.length ? '<p>General ATN measurements in inches, taken laid flat. Use this piece’s fit notes when available.</p>'+fitTable([guide[0],guide[1],listed]) : ''}
    <p><a href="/size-guide/">Full size guide</a> · <a href="/contact/?topic=fit">Ask about measurements</a></p>`;
  openDialog('size-chart');
}

function renderCustomerPage(main, route) {
  const [title,description] = customerPages[route];
  const content={
    track:()=>`<div class="support-panels">
      <form id="tracking-form" class="support-form">
        <h2>Look up a package</h2>
        <label>Tracking number<input name="number" placeholder="From your shipping email" autocomplete="off" autocapitalize="characters" maxlength="48" required></label>
        <label>Carrier<select name="carrier"><option value="">Detect automatically</option><option value="usps">USPS</option><option value="ups">UPS</option><option value="fedex">FedEx</option></select></label>
        <button class="button dark">Find tracking</button>
        <p id="tracking-message" role="status"></p>
        <a id="carrier-link" class="button outline" target="_blank" rel="noopener noreferrer" hidden></a>
      </form>
      <div class="support-form"><h2>Waiting on an update?</h2>
        <p>Orders usually ship within ${shippingPolicy.processing}. Look for the shipping email in your inbox, spam, or promotions folder. After dispatch, carriers can take up to 24 hours to post a scan.</p>
        <p>If you need help with a confirmed order, include your order reference and checkout email.</p>
        <a class="button outline" href="/contact/?topic=tracking">Get order help</a>
      </div></div>
      <h2>After dispatch</h2><p>Standard U.S. delivery usually takes ${shippingPolicy.standard.transit}. Express usually takes ${shippingPolicy.express.transit}. Tracking scans are shown by the carrier when you open the result link.</p>
      <h2>Missing package or scan</h2><p>If the carrier has not posted a scan for seven days or the package is marked delivered and you cannot locate it, <a href="/contact/?topic=tracking">contact ATN</a> with your order reference and tracking number. Review the <a href="/shipping/#tracking">shipping policy</a> for next steps.</p>`,
    'size-guide':fitContent,
    contact:()=>`<div class="support-panels"><form id="support-form" class="support-form"><h2>Tell us what you need</h2>
      <label>Topic<select name="topic">${Object.entries(contactTopics).map(([key,label])=>`<option value="${key}">${label}</option>`).join('')}</select></label>
      <label>Order reference <span>(if you have one)</span><input name="order" maxlength="60"></label>
      <label>Your message<textarea name="message" rows="4" maxlength="2000" required></textarea></label>
      <p>The button opens a draft in your email app. Send the draft there to reach ATN.</p>
      <button class="button dark">Open email draft</button><p id="support-message" role="status"></p>
      </form><div class="support-form"><h2>Email ATN</h2><p><a href="mailto:${support}">${support}</a></p>
      <ul class="service-list"><li>For order help, send from the email you used at checkout and include your order reference.</li><li>For a damaged or incorrect item, attach photos of the piece and packaging.</li><li>For a sizing question, include the product link and the sizes you’re comparing.</li></ul>
      <p>Keep card numbers and security codes out of your message.</p>
      <h2>Hours</h2><p>Monday to Friday, 10am to 5pm Central Time. Expect a reply in 1–2 business days.</p>
      <h2>Mailing address</h2><p>Above The Norm LLC<br>6122 Sterling Ave<br>Raytown, MO 64133<br>United States</p><p>Online store only. This address is for correspondence and isn’t open to the public.</p>
      <p>Instagram: <a href="https://www.instagram.com/abovethenorm.us" target="_blank" rel="noopener">@abovethenorm.us</a></p>
      <div class="help-actions"><a class="button dark" href="/track/">Track your order</a></div><p><a href="/partners/">Wholesale &amp; partnership inquiries</a> · <a href="/privacy/#privacy-requests">Privacy requests</a></p></div></div>`
  };
  main.innerHTML=pageIntro('Customer care',title,description,true)+`<div class="content-width service-page customer-help">${serviceNav(route)}<div class="service-copy">${content[route]()}</div></div>`;
  if(route==='track'){
    const form=$('#tracking-form'), status=$('#tracking-message'), link=$('#carrier-link');
    form.addEventListener('input',()=>{status.textContent='';link.hidden=true;link.removeAttribute('href');});
    form.addEventListener('submit',event=>{
      event.preventDefault();
      const number=form.elements.number.value.replace(/[\s-]/g,'').toUpperCase();
      if(!/^[A-Z0-9]{6,40}$/.test(number)){
        status.textContent='Enter the tracking number from your shipping email.';return;
      }
      const carrier=trackingCarriers[form.elements.carrier.value || trackCarrier(number)];
      if(!carrier){status.textContent='Choose the carrier shown in your shipping email.';form.elements.carrier.focus();return;}
      status.textContent='Shipment scans are available from '+carrier[0]+'.';
      link.href=carrier[1]+encodeURIComponent(number);
      link.textContent='View '+carrier[0]+' tracking';
      link.hidden=false;
    });
  }
  if(route==='contact'){
    const form=$('#support-form');
    const topic=new URLSearchParams(location.search).get('topic');
    if(Object.hasOwn(contactTopics,topic)) form.elements.topic.value=topic;
    form.addEventListener('submit',event=>{
      event.preventDefault();
      const message=form.elements.message.value.trim();
      if(!message){$('#support-message').textContent='Enter a message.';return;}
      const order=form.elements.order.value.trim();
      const subject='ATN support: '+form.elements.topic.selectedOptions[0].textContent;
      const body=(order?'Order reference '+order+'\n\n':'')+message;
      location.href='mailto:'+support+'?subject='+encodeURIComponent(subject)+'&body='+encodeURIComponent(body);
      $('#support-message').textContent='Your email app can open the draft. Send it there when you’re ready.';
    });
  }
}

function renderPartners(main) {
  main.innerHTML = pageIntro('Above The Norm', 'Work with ATN.', 'Wholesale, retail partnerships, and commission-based product features.',true) + `
    <div class="content-width service-page partner-layout">
      <section class="partner-options" aria-labelledby="partner-options-title">
        <h2 id="partner-options-title">Bring ATN to your customers.</h2>
        <dl>
          <dt>Wholesale pricing</dt><dd>Request pricing and availability for your shop. Tell us which pieces or collections you’re interested in and your estimated order size.</dd>
          <dt>Retail partnerships</dt><dd>Tell us about your store, showroom, or marketplace and how you’d carry ATN.</dd>
          <dt>Affiliate &amp; commission</dt><dd>Pitch a product feature on your website, newsletter, or platform and ask about earning commission on referred sales.</dd>
        </dl>
      </section>
      <form id="partner-form" class="support-form" method="post" action="/api/partner-inquiries" aria-labelledby="partner-form-title">
        <h2 id="partner-form-title">Send an inquiry.</h2>
        <div class="partner-fields">
          <label>Your name<input name="name" autocomplete="name" maxlength="100" required></label>
          <label>Company or shop<input name="company" autocomplete="organization" maxlength="160" required></label>
          <label>Business email<input name="email" type="email" autocomplete="email" maxlength="254" required></label>
          <label>Website <span>(optional)</span><input name="website" autocomplete="url" inputmode="url" maxlength="255" placeholder="example.com"></label>
        </div>
        <label>I’m interested in<select name="kind" required>
          <option value="">Select an inquiry type</option><option value="wholesale">Wholesale pricing</option><option value="retail">Retail partnership</option><option value="affiliate">Affiliate or commission</option>
        </select></label>
        <label>Tell us about your proposal<textarea name="message" rows="5" maxlength="3000" required></textarea></label>
        <p class="partner-privacy">ATN uses the details you share to review and respond to your inquiry. <a href="/privacy/">Privacy</a></p>
        <button class="button dark">Send inquiry</button><p id="partner-status" role="status"></p>
      </form>
    </div>`;
  const form = $('#partner-form');
  const button = $('button', form);
  const status = $('#partner-status');
  form.addEventListener('submit', async event => {
    event.preventDefault();
    if (button.disabled) return;
    const inquiry = Object.fromEntries(new FormData(form));
    button.disabled = true;
    status.textContent = 'Sending your inquiry…';
    try {
      const response = await fetch(form.action, {
        method: 'POST',
        headers: {'content-type':'application/json'},
        body: JSON.stringify(inquiry)
      });
      const result = await response.json();
      if (!response.ok || result.received !== true) {
        status.textContent = result.error || 'We couldn’t send your inquiry. Please try again.';
        return;
      }
      form.reset();
      status.textContent = 'Your inquiry reached ATN. We’ll follow up at the email address you provided.';
    } catch {
      status.textContent = 'We couldn’t confirm your submission. Please try again.';
    } finally {
      button.disabled = false;
    }
  });
}

