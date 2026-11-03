"""All business facts, settings and policy values for the Above The Norm site.

Edit here, then run:  python3 _generator/build.py
Products live in products.json next to this file.
"""

BIZ = {
    "brand": "Above The Norm",
    "legal": "Above The Norm LLC",
    "entity": "a Missouri limited liability company",
    "street": "6122 Sterling Ave",
    "city": "Raytown",
    "state": "MO",
    "zip": "64133",
    "country": "United States",
    "email": "support@abovethenorm.us",
    # Most payment processors expect a customer-service phone number. Add one here
    # and it appears in the footer, contact page and policies automatically.
    "phone": "",
    "hours": "Monday to Friday, 10am to 5pm Central Time",
    "founded": 2019,
    # From the Articles of Organization / Statement of Organizer and the IRS CP 575 notice.
    "state_of_org": "Missouri",
    "organized": "August 11, 2021",
    "owner": "Ramson Harris",
    "owner_title": "Sole Member",
    # From the USPTO registration certificate.
    "tm_reg": "6,698,259",
    "tm_date": "April 12, 2022",
    "tm_class": "International Class 25: headwear, pants, shirts, bottoms and tops",
    "instagram": "https://www.instagram.com/abovethenorm.us",
    "facebook": "https://www.facebook.com/AboveTheNormATN/",
    "x": "https://x.com/abovethenormal",
}

UPDATED = "October 30, 2026"

SHIP = {
    "processing": "7 to 14 business days",
    "processing_short": "7–14 business days",
    "standard_rate": 8.00,
    "free_over": 125.00,
    "standard_time": "3–7 working days once shipped",
    "express_rate": 20.00,
    "express_time": "1–3 working days once shipped",
    "claim_days": 7,
    "cancel_hours": 24,
}

# Customer reviews collected and confirmed real by the owner (2026-11-03). Written to assets/js/reviews.js.
REVIEWS_PUBLIC = True
REVIEWS = [
    {"name": "Tyler Brooks", "stars": 5, "title": "Worth adding to the rotation",
     "text": "Got the Sent From Above hoodie and I'm really happy with it. Comfortable fit, clean design, and looks great with pretty much anything."},
    {"name": "DeAndre Williams", "stars": 5, "title": "Definitely stands out",
     "text": "The graphics are crazy in a good way. Wore my tee out over the weekend and had two people ask where I got it."},
    {"name": "Kayla Robinson", "stars": 4, "title": "Great piece overall",
     "text": "Really happy with the shirt. The print looks sharp and the fabric feels good. I'd just recommend checking the size guide before ordering."},
    {"name": "Brianna Mitchell", "stars": 5, "title": "My new favorite hoodie",
     "text": "The material has a nice weight to it without feeling uncomfortable. I like how the design speaks for itself without being too much."},
    {"name": "Anthony Rivera", "stars": 5, "title": "Clean from top to bottom",
     "text": "Picked up a tee and a hat. Both look great together and the details are really nice. Simple ordering process too."},
    {"name": "Ashley Morgan", "stars": 4, "title": "Really nice fit",
     "text": "Love the oversized look and the overall quality. Shipping took a little longer than I expected, but the hoodie was worth it."},
]

# Welcome offer shown in the first-visit pop-up and redeemable in the bag/checkout.
COUPON = {
    "code": "ABOVE10",
    "pct": 10,
    "image": "levitate-above-the-norm-hoodie-white-3.webp",  # pop-up photo, from the real catalogue
    "terms": "10% off the merchandise subtotal of your first order. One code per order, "
             "can't be combined with other offers, and doesn't apply to shipping or tax.",
}

CATS = [
    ("tops", "Tees & Tops"),
    ("bottoms", "Pants & Shorts"),
    ("headwear", "Hats & Caps"),
    ("accessories", "Extras"),
]

GENDERS = [("men", "Men"), ("women", "Women")]

FAQ = [
    ("Do you have a discount code?",
     f"Yes. New customers can use {COUPON['code']} for {COUPON['pct']}% off their first order. "
     "Enter it in your bag or at checkout. It applies to the merchandise subtotal only, one code per order, "
     "and can't be combined with other offers."),
    ("How long until my order ships?",
     f"Every piece is printed and finished in limited batches, so orders leave us within {SHIP['processing']}. "
     "You'll get an email with tracking the moment your package is handed to the carrier."),
    ("What does shipping cost?",
     f"Standard U.S. delivery is ${SHIP['standard_rate']:.0f}, and it's on us once your order reaches ${SHIP['free_over']:.0f} after discounts. "
     f"Express is ${SHIP['express_rate']:.0f}. The exact cost is always shown before you pay."),
    ("Can I return or exchange something?",
     "Every sale is final, so have a look at the size guide first. If a piece turns up broken, faulty or not what you chose, "
     f"write to us no later than {SHIP['claim_days']} days after it arrives and we'll send a new one or refund you."),
    ("Can I cancel my order?",
     f"Yes, within {SHIP['cancel_hours']} hours of placing it, as long as it hasn't started production. "
     "Email us with your order number and you'll receive a full refund to your original payment method."),
    ("How do your pieces fit?",
     "Most tops and hoodies have a relaxed fit with dropped shoulders. Order your usual size, or go up one size for a looser feel. "
     "Each product page lists its fit, and the size guide has full measurements."),
    ("Which payment methods do you accept?",
     "Visa, Mastercard, American Express and Discover, credit or debit. Card payments are encrypted, and your complete card number is never saved on our site."),
    ("Can you deliver outside the U.S.?",
     "Right now we only deliver inside the United States. Live somewhere else? Write to us before you order and we'll see what's possible."),
    ("How should I wash my pieces?",
     "Turn them inside out and use a cold machine wash. Hang to dry, or pick the dryer's lowest heat. Keep the iron away from graphics, puff print and stitching."),
]

# Turn on only once a payment gateway approves charges: checkout then places the order and emails the confirmation.
ORDERS_LIVE = False
