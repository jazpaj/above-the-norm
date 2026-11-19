const palette = {
  ink: '#161614',
  paper: '#eeede3',
  white: '#f9f8f0',
  muted: '#52514a',
  line: '#ceccc0',
  blue: '#2437ce',
  lime: '#e1f34b'
};
const type = 'Arial, Helvetica, sans-serif';
const mono = "'Courier New', Courier, monospace";
const display = "'Arial Black', Arial, Helvetica, sans-serif";

const escape = value => String(value ?? '').replace(/[&<>"']/g, char =>
  ({'&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'})[char]);
const minor = value => Number.isSafeInteger(value) && value >= 0;
const sum = values => values.reduce((total, value) => total + value, 0);
const required = (value, label) => {
  if (typeof value !== 'string' || !value.trim()) throw Error(label + ' is required.');
  return value.trim();
};
const safeLink = value => {
  if (!value) return '';
  let url;
  try { url = new URL(value); } catch { throw Error('An HTTPS URL is required.'); }
  if (url.protocol !== 'https:' || url.username || url.password) throw Error('An HTTPS URL is required.');
  return url.href;
};
const photoLink = (value, preview) => preview && /^data:image\/(?:jpeg|png);base64,[a-zA-Z0-9+/=]+$/.test(value || '')
  ? value : safeLink(value);
const valueRow = (label, value) => [label, value];
const labeled = rows => rows.filter(([, value]) => value !== undefined && value !== null && value !== '');
const moneyFormat = currency => {
  if (!/^[A-Z]{3}$/.test(currency || '')) throw Error('Use an ISO 4217 currency code.');
  const formatter = new Intl.NumberFormat('en-US', {style: 'currency', currency});
  const scale = 10 ** formatter.resolvedOptions().maximumFractionDigits;
  return minorUnits => {
    if (!minor(minorUnits)) throw Error('Amounts must be nonnegative integer minor units.');
    return formatter.format(minorUnits / scale);
  };
};
const dateText = (value, timeZone) => {
  if (typeof value !== 'string' || !/T/.test(value) || !/(Z|[+-]\d{2}:\d{2})$/.test(value)) {
    throw Error('Use an ISO date and time with an explicit offset.');
  }
  const instant = new Date(value);
  if (!Number.isFinite(instant.getTime())) throw Error('Invalid date.');
  return new Intl.DateTimeFormat('en-US', {
    month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit',
    timeZone, timeZoneName: 'short'
  }).format(instant);
};
function paymentText(method) {
  if (!method) return '';
  const label = required(method.label, 'Payment method display label');
  if (!/^[\p{L}][\p{L} &'.()-]{0,49}$/u.test(label)) {
    throw Error('Payment method labels may contain names such as Visa or Apple Pay.');
  }
  if (method.last4 == null || method.last4 === '') return label;
  if (!/^\d{4}$/.test(method.last4)) throw Error('Only the last four payment digits are allowed.');
  return label + ' ending in ' + method.last4;
}
function addressText(address) {
  if (!address) return '';
  const city = [
    required(address.city, 'City'),
    [address.region, address.postalCode].filter(Boolean).join(' ')
  ].filter(Boolean).join(', ');
  return [
    required(address.name, 'Address recipient'),
    required(address.line1, 'Street address'),
    address.line2, city, required(address.country, 'Address country')
  ].filter(Boolean).join('\n');
}
function itemCards(items, formatMoney, preview, refunded) {
  if (!Array.isArray(items) || (!refunded && !items.length)) throw Error('Order line items are required.');
  return items.map(item => {
    if (!Number.isSafeInteger(item.quantity) || item.quantity < 1) throw Error('Invalid item quantity.');
    const quantityLabel = refunded ? 'Qty refunded' : 'Qty';
    const title = required(item.name, 'Item name');
    return {
      title, image: photoLink(item.imageUrl, preview),
      details: [
        item.color, item.size && 'Size ' + item.size, item.sku && 'SKU ' + item.sku,
        quantityLabel + ' ' + item.quantity,
        !refunded && formatMoney(item.unitAmount) + ' each'
      ].filter(Boolean).join(' · '),
      amount: formatMoney(refunded ? item.amount : item.unitAmount * item.quantity)
    };
  });
}

function render(model, options) {
  const {preview = false, origin, logoUrl, timeZone = 'America/New_York',
    supportEmail = 'support@abovethenorm.us'} = options;
  const shop = new URL(required(safeLink(origin), 'Storefront origin')).origin;
  const logo = photoLink(logoUrl, preview);
  if (!/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(supportEmail)) throw Error('Invalid support email.');
  const emailHref = 'mailto:' + supportEmail;
  const h2 = title => '<h2 style="margin:0 0 14px;font:800 20px/1.2 '+type+';color:'+palette.ink+';">'+escape(title)+'</h2>';
  const field = ([label,value]) => '<tr><th scope="row" align="left" valign="top" style="width:38%;padding:9px 12px 9px 0;border-top:1px solid '+palette.line+';font:600 14px/1.45 '+type+';color:'+palette.muted+';">'+escape(label)+'</th><td valign="top" style="padding:9px 0;border-top:1px solid '+palette.line+';font:600 15px/1.45 '+type+';word-break:break-word;overflow-wrap:anywhere;">'+escape(value).replaceAll('\n','<br>')+'</td></tr>';
  const fields = section => h2(section.title)+'<table width="100%" cellspacing="0" cellpadding="0" border="0" style="border-collapse:collapse;">'+section.rows.map(field).join('')+'</table>';
  const items = section => h2(section.title)+section.items.map(item => {
    const image = item.image ? '<td width="68" valign="middle" style="padding:0 12px 0 0;"><img width="56" height="56" alt="" src="'+escape(item.image)+'" style="display:block;width:56px;height:56px;border:0;object-fit:cover;background:'+palette.paper+';"></td>' : '';
    return '<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="border-collapse:collapse;border-top:1px solid '+palette.line+';"><tr><td style="padding:12px 0;"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0"><tr>'+image+'<td valign="middle" style="padding-right:10px;overflow-wrap:anywhere;"><strong style="font:800 16px/1.3 '+type+';">'+escape(item.title)+'</strong><br><span style="font:400 13px/1.45 '+type+';color:'+palette.muted+';">'+escape(item.details)+'</span></td><td align="right" valign="middle" style="white-space:nowrap;font:700 15px/1.25 '+type+';">'+escape(item.amount)+'</td></tr></table></td></tr></table>';
  }).join('');
  const amounts = section => h2(section.title)+'<table width="100%" cellspacing="0" cellpadding="0" border="0" style="border-collapse:collapse;">'+section.rows.map(([label,value,emphasis]) => {
    const style = emphasis
      ? 'border-top:2px solid '+palette.ink+';background:'+palette.paper+';font:800 18px/1.3 '+type+';'
      : 'border-top:1px solid '+palette.line+';font:400 15px/1.35 '+type+';';
    return '<tr><th scope="row" align="left" style="padding:9px 9px;'+style+'">'+escape(label)+'</th><td align="right" style="padding:9px 9px;white-space:nowrap;'+style+'">'+escape(value)+'</td></tr>';
  }).join('')+'</table>';
  const box = content => '<tr><td class="pad" style="padding:24px 30px 0;">'+content+'</td></tr>';
  const lime = model.kind === 'refund' || model.kind === 'alert';
  const heroInk = lime ? palette.ink : '#ffffff';
  const heroPaper = lime ? palette.lime : palette.blue;
  const heroTag = lime ? palette.ink : palette.lime;
  const helpLabel = 'Contact customer care';
  const cta = model.action?.url ? model.action : {label:helpLabel,url:shop+'/contact/'};
  const ctaSecondary = cta.label === helpLabel ? '' : ' &nbsp;·&nbsp; <a href="'+shop+'/contact/" style="color:'+palette.ink+';">Customer care</a>';
  const statusDate = dateText(model.at, timeZone);
  const firstName = required(model.name, 'Customer name');
  const headingStyle = 'margin:9px 0 12px;font:900 46px/.94 '+display+';letter-spacing:-2.6px;text-transform:uppercase;color:'+heroInk+';';
  const previewTag = preview ? '<tr><td class="pad" style="background:'+palette.ink+';color:'+palette.lime+';padding:9px 30px;font:700 12px/1.4 '+mono+';">DESIGN PREVIEW · SAMPLE DATA</td></tr>' : '';
  const wordmark = '<span style="font:900 18px/1 '+display+';letter-spacing:-.4px;color:'+palette.ink+';">ABOVE THE NORM®</span>';
  const logoCell = logo ? '<td width="42" style="padding-right:8px;"><img width="34" height="34" alt="" src="'+escape(logo)+'" style="display:block;border:0;"></td>' : '';
  const receiptStamp = model.kind === 'alert' ? 'STORE ALERT' : model.kind === 'refund' ? 'REFUND RECEIPT' : 'ORDER RECEIPT';
  const heroTitle = model.title.split(' ').map(escape).join('<br class="hero-break">');
  const html = '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light"><meta name="supported-color-schemes" content="light"><title>'+escape(model.subject)+'</title>'+
  '<style>a:hover{text-decoration:underline!important} a:focus-visible{outline:2px solid #2437ce;outline-offset:3px} @media(max-width:480px){.outer{padding:0!important}.pad{padding-left:17px!important;padding-right:17px!important}.headline{font-size:40px!important}.stamp{font-size:10px!important}}</style></head>'+
  '<body style="margin:0;background:'+palette.paper+';color:'+palette.ink+';font:400 16px/1.5 '+type+';"><div style="display:none;visibility:hidden;max-height:0;overflow:hidden;mso-hide:all;">'+escape(model.preheader)+'</div>'+
  '<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" bgcolor="'+palette.paper+'"><tr><td align="center" class="outer" style="padding:26px 12px;">'+
  '<!--[if mso]><table role="presentation" width="616" align="center"><tr><td><![endif]--><table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" bgcolor="'+palette.white+'" style="max-width:616px;border:1px solid '+palette.ink+';border-collapse:collapse;">'+
  previewTag+'<tr><td class="pad" style="padding:14px 30px;"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0"><tr>'+logoCell+'<td>'+wordmark+'</td><td align="right" class="stamp" style="font:700 12px/1 '+mono+';color:'+palette.muted+';">'+receiptStamp+'</td></tr></table></td></tr>'+
  '<tr><td class="pad" bgcolor="'+heroPaper+'" style="padding:24px 30px 25px;border-top:1px solid '+palette.ink+';border-bottom:1px solid '+palette.ink+';"><p style="margin:0;font:700 12px/1.3 '+mono+';letter-spacing:1px;color:'+heroTag+';">'+escape(model.status.toUpperCase())+'</p>'+
  '<h1 class="headline" style="'+headingStyle+'">'+heroTitle+'</h1>'+
  (model.heroAmount ? '<p style="margin:0 0 11px;font:900 26px/1.1 '+type+';color:'+heroInk+';">'+escape(model.heroAmount)+'</p>' : '')+
  '<p style="margin:0;font:600 15px/1.5 '+type+';color:'+heroInk+';overflow-wrap:anywhere;">'+escape(model.reference)+' &nbsp;·&nbsp; '+escape(statusDate)+'</p></td></tr>'+
  box('<p style="margin:0;font:400 16px/1.55 '+type+';">Hi '+escape(firstName)+', '+escape(model.message)+'</p>')+
  model.sections.map(section => box(section.items ? items(section) : section.money ? amounts(section) : fields(section))).join('')+
  box((model.note ? '<p style="margin:0 0 18px;font:400 15px/1.55 '+type+';">'+escape(model.note)+'</p>' : '')+
  '<table role="presentation" cellspacing="0" cellpadding="0" border="0"><tr><td bgcolor="'+palette.ink+'" style="mso-padding-alt:12px 16px;"><a href="'+escape(cta.url)+'" style="display:inline-block;background:'+palette.ink+';color:#ffffff;padding:12px 16px;text-decoration:none;font:800 14px/1.2 '+type+';">'+escape(cta.label)+'</a></td></tr></table>'+
  (model.kind === 'alert' ? '<p style="margin:15px 0 24px;font:400 14px/1.6 '+type+';color:'+palette.muted+';">Sent automatically by '+escape(new URL(shop).host)+' when an order is placed.</p>'
    : '<p style="margin:15px 0 24px;font:400 14px/1.6 '+type+';">Questions? <a href="'+escape(emailHref)+'" style="color:'+palette.ink+';word-break:break-word;">'+escape(supportEmail)+'</a>'+ctaSecondary+'</p>'))+
  '<tr><td class="pad" bgcolor="'+palette.ink+'" style="padding:18px 30px;color:#ffffff;"><p style="margin:0 0 8px;font:700 12px/1.35 '+mono+';letter-spacing:.65px;color:'+palette.lime+';">REFUSE TO BE NORMAL.</p>'+
  '<p style="margin:0;font:400 13px/1.6 '+type+';">Above The Norm LLC &nbsp;·&nbsp; <a href="'+shop+'/privacy/" style="color:#ffffff;">Privacy</a> &nbsp;·&nbsp; <a href="'+shop+'/terms/" style="color:#ffffff;">Terms</a></p></td></tr></table><!--[if mso]></td></tr></table><![endif]--></td></tr></table></body></html>\n';
  const sectionText = section => section.title+'\n'+(section.items
    ? section.items.map(item=>item.title+' | '+item.details+' | '+item.amount)
    : section.rows.map(([label,value])=>label+': '+value.replaceAll('\n',', '))).join('\n');
  const text = [
    preview && 'DESIGN PREVIEW · SAMPLE DATA',
    'ABOVE THE NORM®', model.title+'\n'+model.status+'\n'+model.reference+' · '+statusDate,
    'Hi '+firstName+', '+model.message, ...model.sections.map(sectionText),
    model.note, cta.label+': '+cta.url, 'Questions? '+supportEmail, 'REFUSE TO BE NORMAL.\nAbove The Norm LLC'
  ].filter(Boolean).join('\n\n')+'\n';
  return {subject: model.subject, preheader:model.preheader, html, text};
}

// status 'paid' is the full receipt for a verified payment. status 'received' is for orders taken
// while no payment gateway is connected: same layout, but it never says the order was paid.
export function orderConfirmation(order, options) {
  const paid = order.status === 'paid';
  if (!paid && order.status !== 'received') throw Error('An order confirmation requires a paid or received order.');
  const reference = required(order.reference, 'Order reference');
  const formatMoney = moneyFormat(order.currency);
  const placed = dateText(order.placedAt, options.timeZone ?? 'America/New_York');
  const shipping = order.shipping;
  const pricing = order.totals;
  const payment = paid ? paymentText(order.payment.method) : '';
  const cards = itemCards(order.items, formatMoney, options.preview, false);
  const displayMoney = cents => formatMoney(cents) + ' ' + order.currency;
  if (paid && !payment) throw Error('A payment method is required.');
  if (![pricing.subtotal,pricing.discount,pricing.shipping,pricing.tax,pricing.total].every(minor)
    || pricing.subtotal !== sum(order.items.map(item => item.unitAmount * item.quantity))
    || pricing.discount > pricing.subtotal
    || pricing.subtotal - pricing.discount + pricing.shipping + pricing.tax !== pricing.total) {
    throw Error('Order line items and totals do not reconcile.');
  }
  const orderUrl = safeLink(order.orderUrl);
  const trackingUrl = safeLink(shipping.trackingUrl);
  const fulfillment = required(shipping.status, 'Fulfillment status');
  const sections = [
    {title:'Items ordered', items:cards},
    {title:'Order summary', money:true, rows:labeled([
      valueRow('Subtotal',formatMoney(pricing.subtotal)),
      valueRow(pricing.discountCode ? 'Discount · '+pricing.discountCode : 'Discount',pricing.discount ? '−'+formatMoney(pricing.discount):''),
      valueRow('Shipping',pricing.shipping ? formatMoney(pricing.shipping) : 'Free'),
      valueRow('Sales tax',formatMoney(pricing.tax)),
      [paid ? 'Total paid' : 'Order total',displayMoney(pricing.total),true]
    ])},
    paid ? {title:'Payment details', rows:labeled([
      valueRow('Order placed',placed),
      valueRow('Payment status','Paid'),
      valueRow('Method',payment),
      valueRow('Payment reference',order.payment.reference),
      valueRow('Paid on',order.payment.paidAt && dateText(order.payment.paidAt,options.timeZone ?? 'America/New_York')),
      valueRow('Billing address',addressText(order.billingAddress))
    ])} : {title:'Order details', rows:labeled([
      valueRow('Order number',reference),
      valueRow('Order placed',placed)
    ])},
    {title:'Delivery & contact', rows:labeled([
      valueRow('Fulfillment status',fulfillment),
      valueRow('Shipping method',required(shipping.method,'Shipping method')),
      valueRow('Ships within',shipping.processingWindow),
      valueRow('Transit estimate',shipping.transitWindow),
      valueRow('Ship to',addressText(shipping.address) || required('', 'Shipping address')),
      valueRow('Carrier',shipping.carrier),
      valueRow('Tracking number',shipping.trackingNumber),
      valueRow('Email',required(order.customer.email,'Customer email')),
      valueRow('Phone',order.customer.phone)
    ])}
  ];
  return render({
    kind:'order',title:'Order confirmed',status:paid ? 'Payment confirmed' : 'Order received',name:order.customer.name,reference,at:order.placedAt,
    subject:'Order confirmed · '+reference+' | Above The Norm',
    preheader:(paid ? 'Payment received for ' : 'We received order ')+reference+'. See your items, total, and delivery details.',
    message:paid ? 'we received your payment. Here’s your order receipt and delivery information.'
      : 'thanks for your order. Here’s your receipt and delivery information.',
    sections,
    action:orderUrl ? {label:'View order',url:orderUrl} : trackingUrl ? {label:'Track shipment',url:trackingUrl} : null
  }, options);
}

// Internal "new order" alert for the support inbox, in the same design as the customer receipt.
export function orderAlert(order, options) {
  const reference = required(order.reference, 'Order reference');
  const formatMoney = moneyFormat(order.currency);
  const timeZone = options.timeZone ?? 'America/New_York';
  const pricing = order.totals;
  const cards = itemCards(order.items, formatMoney, options.preview, false);
  const shipping = order.shipping;
  const customerName = required(order.customer.name, 'Customer name');
  const email = required(order.customer.email, 'Customer email');
  const sections = [
    {title:'Customer', rows:labeled([
      valueRow('Name',customerName),
      valueRow('Email',email),
      valueRow('Phone',order.customer.phone),
      valueRow('Order placed',dateText(order.placedAt,timeZone))
    ])},
    {title:'Items to pack', items:cards},
    {title:'Order summary', money:true, rows:labeled([
      valueRow('Subtotal',formatMoney(pricing.subtotal)),
      valueRow(pricing.discountCode ? 'Discount · '+pricing.discountCode : 'Discount',pricing.discount ? '−'+formatMoney(pricing.discount):''),
      valueRow('Shipping',pricing.shipping ? formatMoney(pricing.shipping) : 'Free'),
      valueRow('Sales tax',formatMoney(pricing.tax)),
      ['Order total',formatMoney(pricing.total)+' '+order.currency,true]
    ])},
    {title:'Payment', rows:labeled([valueRow('Status',required(order.paymentNote,'Payment note'))])},
    {title:'Ship to', rows:labeled([
      valueRow('Shipping method',required(shipping.method,'Shipping method')),
      valueRow('Address',addressText(shipping.address) || required('', 'Shipping address'))
    ])}
  ];
  return render({
    kind:'alert',title:'New order',status:'Order placed on the store',name:'ATN team',reference,at:order.placedAt,
    heroAmount:formatMoney(pricing.total)+' '+order.currency,
    subject:'New order '+reference+' · '+formatMoney(pricing.total)+' from '+customerName,
    preheader:customerName+' placed order '+reference+' for '+formatMoney(pricing.total)+'.',
    message:customerName+' just placed an order. Here’s everything needed to pack and ship it.',
    sections,
    action:{label:'Reply to '+customerName.split(' ')[0],url:'mailto:'+email+'?subject='+encodeURIComponent('Your Above The Norm order '+reference)}
  }, options);
}
