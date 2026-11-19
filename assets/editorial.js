'use strict';

const cloudLookbook = [
  ['editorial/clouds-1.webp','First look from the 2026 In the Clouds campaign'],
  ['editorial/clouds-2.webp','Second look from the 2026 In the Clouds campaign'],
  ['editorial/clouds-3.webp','Third look from the 2026 In the Clouds campaign'],
  ['editorial/clouds-4.webp','Fourth look from the 2026 In the Clouds campaign'],
  ['editorial/clouds-5.webp','Fifth look from the 2026 In the Clouds campaign']
];
const cloudCredit = 'Photography by Irrelevant. Graphics by Liv. Models Derek and Gage. Creative direction by Token and Liv. Styling by Token and Liliana.';
const originalLookbook = 'https://www.abovethenorm.co/pages/about';

const additionalReleases = [
  {
    id:'trippy-mind', name:'Trippy Mind', date:'2026', type:'Design series',
    summary:'A graphic hoodie, matching sweats, and a puff-print tee from the original ATN catalog.',
    copy:['The Trippy Mind artwork appears across three pieces on the original storefront. ATN photographed the hoodie with the matching sweats and showed the sweats both straight and cuffed. The tee carries the same title in a different format.', 'These are archive pieces from the original catalog. Browse the photos for how the graphic reads on fleece and a tee.'],
    media:[['editorial/trippy-1.jpg','Trippy Mind hoodie and sweatpants from the original ATN gallery'],['editorial/trippy-2.jpg','Front of the Trippy Mind Sweatpants'],['editorial/trippy-3.jpg','Front of the Trippy Mind Tee']],
    sources:[['Original hoodie gallery','https://www.abovethenorm.co/products/trippy-mind-hoodie'],['Original tee gallery','https://www.abovethenorm.co/products/trippy-mind-tee']]
  },
  {
    id:'hazard', name:'Hazard', date:'2026', type:'Design series',
    summary:'ATN’s Hazard artwork across a graphic tee, dad hat, and distressed yellow sweats.',
    copy:['The Hazard group brings the same naming and graphic language to a tee, a black dad hat, and a yellow distressed zip jacket and sweatpants. The original storefront documents the jacket and sweats as separate pieces.','The tee and cap link to the matching listings in this shop. The distressed set appears here as an archive reference.'],
    media:[['editorial/hazard-3.jpg','Hazard Tee in official ATN product photography'],['editorial/hazard-4.jpg','Hazard Dad Hat in official ATN product photography'],['editorial/hazard-1.jpg','Front of the yellow Hazard Distressed Zip Jacket'],['editorial/hazard-2.jpg','Front of the yellow Hazard Distressed Sweatpants']],
    sources:[['Original Hazard Tee','https://www.abovethenorm.co/products/biohazard-tee'],['Original Hazard Jacket','https://www.abovethenorm.co/products/atn-hazard-distressed-zip-jacket-pre-order']],
    products:['biohazard-tee','atn-hazard-dad-hat']
  },
  {
    id:'black-jesus', name:'Black Jesus', date:'Undated', type:'Design series',
    summary:'A front-print hoodie and the same named graphic series on two trucker hats.',
    copy:['ATN’s Black Jesus listings span a 14 oz cotton hoodie and snapback trucker hats in black and red. The original brand storefront records the red trucker as part of its accessories range.'],
    media:[['products/black-jesus-hoodie-black-1.webp','Black Jesus Hoodie from the ATN product gallery'],['products/black-jesus-trucker-hat-red-1.webp','Black Jesus Trucker Hat in red'],['products/black-jesus-trucker-hat-black-1.webp','Black Jesus Trucker Hat in black']],
    sources:[['Original ATN accessories gallery','https://www.abovethenorm.co/collections/accessories']],
    products:['black-jesus-hoodie-black','black-jesus-trucker-hat-red','black-jesus-trucker-hat-black']
  },
  {
    id:'inhale-exhale', name:'Inhale Exhale', date:'Undated', type:'Design series',
    summary:'A brown full-zip jacket and coordinated sweatpants.',
    copy:['Inhale Exhale pairs a screen-printed zip jacket with sweats in the same brown colorway. The original brand records the jacket in its tops collection. The front and back product frames show how the graphic is placed across the two pieces.'],
    media:[['products/inhale-exhale-full-zip-jacket-brown-1.webp','Inhale Exhale brown full-zip jacket'],['products/inhale-exhale-sweats-brown-1.webp','Inhale Exhale brown sweatpants'],['products/inhale-exhale-full-zip-jacket-brown-2.webp','Additional view of the Inhale Exhale jacket']],
    sources:[['Original ATN tops collection','https://www.abovethenorm.co/collections/tops']],
    products:['inhale-exhale-full-zip-jacket-brown','inhale-exhale-sweats-brown']
  },
  {
    id:'hoop-dream', name:'Hoop Dream', date:'Undated', type:'Design series',
    summary:'Retired Hoop Dream sweats in black, grey, and camo, alongside the convertible 2.0 pair.',
    copy:['The Hoop Dream section brings together four pieces listed in the shop: the Retired Hoop Dream sweats in black, grey, and camo, plus the Convertible Hoop Dream Sweats 2.0. View each version on its own product page for fit, available sizes and construction.'],
    media:[['products/retired-hoop-dream-sweats-black-1.webp','Retired Hoop Dream Sweats in black'],['products/retired-hoop-dream-sweats-camo-1.webp','Retired Hoop Dream Sweats in camo'],['products/retired-hoop-dream-sweats-grey-1.webp','Retired Hoop Dream Sweats in grey'],['products/convertible-hoop-dream-sweats-grey-1.webp','Convertible Hoop Dream Sweats 2.0']],
    sources:[],
    products:['retired-hoop-dream-sweats-black','retired-hoop-dream-sweats-camo','retired-hoop-dream-sweats-grey','convertible-hoop-dream-sweats-grey']
  },
  {
    id:'zumiez-early-releases', name:'The Zumiez years', date:'2021–2022', type:'Retail history',
    summary:'Token’s account of the first exclusive retail deal and the early follow-up.',
    copy:['In his November 2022 CanvasRebel interview, Token says ATN landed its first Zumiez deal in 2021, putting the label in more than 30 stores at the time. He recalls that first release selling through and a second exclusive collection following in 2022.', 'The interviews and retail listings show the story from two sides: how Token built the relationship, and how ATN’s graphic tees appeared on the retailer’s shelves. The portrait here accompanies the founder interview.'],
    media:[['press-canvas.jpg','RJ “Token” Harris photographed for CanvasRebel',true]],
    credit:'Interview portrait by Austin “Irrelevant” Smith, edited by Travis Baker.',
    sources:[['Token’s CanvasRebel interview','https://canvasrebel.com/meet-rj-token-harris/'],['Above The Norm at Zumiez','https://www.zumiez.com/brands/above-the-norm'],['Adoption Center tee at Zumiez','https://www.zumiez.com/above-the-norm-adoption-center-black-t-shirt.html']],
    products:['adoption-center-tee-black','norm-splatter-tee','wing-tee-white']
  }
];
