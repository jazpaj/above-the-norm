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
    "email": "family@abovethenorm.us",
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
    "free_over": 150.00,
    "standard_time": "3 to 7 business days after dispatch",
    "express_rate": 20.00,
    "express_time": "1 to 3 business days after dispatch",
    "claim_days": 7,
    "cancel_hours": 24,
}

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
     f"Every piece is printed and finished in small runs, so orders leave us within {SHIP['processing']}. "
     "You'll get an email with tracking the moment your package is handed to the carrier."),
    ("What does shipping cost?",
     f"Standard U.S. shipping is ${SHIP['standard_rate']:.0f}, and free on orders of ${SHIP['free_over']:.0f} or more after discounts. "
     f"Express is ${SHIP['express_rate']:.0f}. The exact cost is always shown before you pay."),
    ("Can I return or exchange something?",
     "All sales are final, so please check the size guide before ordering. If your order arrives damaged, "
     f"defective or isn't what you ordered, email us within {SHIP['claim_days']} days of delivery and we'll replace it or refund you."),
    ("Can I cancel my order?",
     f"Yes, within {SHIP['cancel_hours']} hours of placing it, as long as it hasn't started production. "
     "Email us with your order number and you'll receive a full refund to your original payment method."),
    ("How do your pieces fit?",
     "Most tops and hoodies are cut boxy with dropped shoulders. They're true to size; size up for an oversized look. "
     "Each product page lists its fit, and the size guide has full measurements."),
    ("Which payment methods do you accept?",
     "Major credit and debit cards. Payments are processed over an encrypted connection and we never store your full card number."),
    ("Do you ship internationally?",
     "We currently ship within the United States. Email us before ordering if you're outside the U.S. and we'll tell you whether we can reach you."),
    ("How do I care for my garments?",
     "Wash cold, inside out, and air dry or tumble dry low. Don't iron directly over prints, puff or embroidery."),
]
