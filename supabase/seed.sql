-- Elysian Celebrations — Seed Data
-- Run after schema.sql to populate initial data.

-- ─── Vendor Categories ───────────────────────────────────────

insert into vendor_categories (name, slug, sort_order) values
  ('Photography & Videography', 'photography', 0),
  ('Decor & Design', 'decor', 1),
  ('Catering', 'catering', 2),
  ('Makeup & Styling', 'makeup', 3),
  ('Entertainment & Music', 'entertainment', 4),
  ('Wedding Planning', 'planning', 5),
  ('Mehendi Artist', 'mehendi', 6),
  ('Invitations & Stationery', 'invitations', 7),
  ('Jewellery & Accessories', 'jewellery', 8),
  ('Travel & Logistics', 'travel', 9);

-- ─── Destinations ────────────────────────────────────────────

insert into destinations (name, slug, country, tagline, description, starting_price, venue_count, sort_order) values
  ('Udaipur', 'udaipur', 'India', 'The City of Lakes', 'Palatial venues on serene lakefronts. Udaipur offers a regal canvas of marble palaces, shimmering lakes, and Aravalli sunsets.', 2500000, 12, 0),
  ('Jaipur', 'jaipur', 'India', 'The Pink City', 'Grand forts and havelis draped in history. Jaipur brings royal Rajasthani grandeur to every celebration.', 2000000, 10, 1),
  ('Goa', 'goa', 'India', 'Sun, Sand & Celebration', 'Beachside ceremonies and tropical charm. Goa blends laid-back coastal beauty with vibrant celebration energy.', 1500000, 8, 2),
  ('Kerala', 'kerala', 'India', 'God''s Own Country', 'Backwaters, hill stations, and lush green venues. Kerala offers an intimate, nature-wrapped wedding experience.', 1800000, 6, 3),
  ('Jodhpur', 'jodhpur', 'India', 'The Blue City', 'Dramatic desert fortresses and open skies. Jodhpur delivers epic scale and unforgettable panoramas.', 2200000, 7, 4),
  ('Mussoorie', 'mussoorie', 'India', 'Queen of the Hills', 'Misty mountain retreats and colonial-era elegance. Mussoorie offers cool-climate celebrations with Himalayan views.', 1600000, 5, 5),
  ('Rishikesh', 'rishikesh', 'India', 'Adventure Meets Serenity', 'Riverside ceremonies against the Ganges and foothills. Rishikesh blends spiritual calm with natural beauty.', 1200000, 4, 6);

-- ─── Venues ──────────────────────────────────────────────────

insert into venues (destination_id, name, slug, description, capacity, price_range, amenities) values
  ((select id from destinations where slug = 'udaipur'), 'Taj Lake Palace', 'taj-lake-palace', 'A floating marble palace on Lake Pichola — one of the most iconic wedding venues in the world.', 200, '₹50L–₹1.5Cr', array['Lake View', 'Heritage Suites', 'Royal Dining', 'Boat Service']),
  ((select id from destinations where slug = 'udaipur'), 'Oberoi Udaivilas', 'oberoi-udaivilas', 'Sprawling luxury on the banks of Lake Pichola with private courtyards and semi-private pools.', 350, '₹40L–₹1.2Cr', array['Poolside', 'Garden Lawns', 'Spa', 'Lakefront']),
  ((select id from destinations where slug = 'udaipur'), 'Leela Palace Udaipur', 'leela-palace-udaipur', 'Modern luxury meets Mewar heritage on the shores of Lake Pichola.', 300, '₹35L–₹1Cr', array['Ballroom', 'Lake Terrace', 'Royal Spa', 'Private Jetty']),
  ((select id from destinations where slug = 'jaipur'), 'Rambagh Palace', 'rambagh-palace', 'Former residence of the Maharaja of Jaipur, now a Taj property with opulent Mughal gardens.', 400, '₹45L–₹1.3Cr', array['Mughal Gardens', 'Polo Ground', 'Heritage Suites', 'Indoor Banquet']),
  ((select id from destinations where slug = 'jaipur'), 'Samode Palace', 'samode-palace', 'A 475-year-old palace with mirror-work halls and terraced gardens in the Aravalli foothills.', 250, '₹30L–₹80L', array['Sheesh Mahal', 'Courtyard', 'Pool Garden', 'Rooftop Terrace']),
  ((select id from destinations where slug = 'goa'), 'W Goa', 'w-goa', 'Contemporary beachside luxury on Vagator cliffs with panoramic Arabian Sea views.', 200, '₹20L–₹60L', array['Beach Access', 'Cliff-top Lawns', 'Infinity Pool', 'Sunset Deck']),
  ((select id from destinations where slug = 'goa'), 'Grand Hyatt Goa', 'grand-hyatt-goa', 'Indo-Portuguese architecture spread across 28 acres along Bambolim Bay.', 500, '₹25L–₹75L', array['Ballroom', 'Beach Lawn', 'Multiple Pools', 'Spa Village']),
  ((select id from destinations where slug = 'kerala'), 'Kumarakom Lake Resort', 'kumarakom-lake-resort', 'Heritage lakeside resort on the Vembanad backwaters with traditional Kerala architecture.', 150, '₹15L–₹50L', array['Backwater View', 'Houseboat', 'Ayurvedic Spa', 'Kerala Cuisine']);

-- ─── Package Tiers ───────────────────────────────────────────

insert into package_tiers (name, slug, tagline, description, starting_price, inclusions, sort_order) values
  ('Essential', 'essential', 'A Beautiful Beginning', 'Everything you need for a stunning destination wedding, thoughtfully curated without excess.', 1500000, array['Venue coordination', 'Basic decor styling', 'Photography coverage', 'Day-of coordination', 'Guest accommodation assistance'], 0),
  ('Curated', 'curated', 'Full Curation', 'End-to-end planning with premium vendors, bespoke design, and white-glove coordination.', 3500000, array['Everything in Essential', 'Custom decor design', 'Premium photographer & videographer', 'Full planning & coordination', 'Vendor management', 'Guest experience curation', 'Pre-wedding shoot'], 1),
  ('Bespoke', 'bespoke', 'Bespoke Luxury', 'A fully custom experience — your vision, realized without compromise.', 7500000, array['Everything in Curated', 'Dedicated wedding architect', 'International vendor sourcing', 'Private event spaces', 'Luxury transport fleet', 'Celebrity entertainment options', 'Multi-day event design', 'Post-wedding brunch planning'], 2);

-- ─── Blog Posts ───────────────────────────────────────────────

insert into blog_posts (title, slug, excerpt, content, author, tags, is_published, published_at) values
  ('Why Destination Weddings Feel Different', 'why-destination-weddings-feel-different', 'A destination wedding isn''t just a change of venue — it''s a different way to gather the people you love.', 'Content placeholder for blog post about destination weddings.', 'Elysian Editorial', array['destination', 'planning', 'editorial'], true, now() - interval '14 days'),
  ('Udaipur Palace Weddings: Light and Shadow', 'udaipur-palace-weddings-light-and-shadow', 'Inside the palatial venues of Udaipur — where every corridor tells a story and every sunset is earned.', 'Content placeholder for blog post about Udaipur weddings.', 'Elysian Editorial', array['udaipur', 'venue', 'luxury'], true, now() - interval '10 days'),
  ('Budgeting Without the Spreadsheet Anxiety', 'budgeting-without-the-spreadsheet-anxiety', 'Your budget is a creative tool, not a cage. Here''s how to approach wedding finances with clarity.', 'Content placeholder for blog post about wedding budgeting.', 'Elysian Editorial', array['budget', 'planning', 'guide'], true, now() - interval '7 days'),
  ('The Art of the Guest Experience', 'the-art-of-the-guest-experience', 'Your wedding guests are traveling for you. Here''s how to make every moment of their journey intentional.', 'Content placeholder for blog post about guest experience.', 'Elysian Editorial', array['guests', 'planning', 'experience'], true, now() - interval '5 days'),
  ('Monsoon Weddings: Embracing the Rain', 'monsoon-weddings-embracing-the-rain', 'Rain on your wedding day isn''t bad luck — it''s an atmosphere. Planning tips for monsoon celebrations.', 'Content placeholder for blog post about monsoon weddings.', 'Elysian Editorial', array['monsoon', 'planning', 'seasonal'], true, now() - interval '3 days'),
  ('Choosing Vendors Who Understand Your Vision', 'choosing-vendors-who-understand-your-vision', 'The right vendor doesn''t just deliver a service — they co-create your vision with you.', 'Content placeholder for blog post about vendor selection.', 'Elysian Editorial', array['vendors', 'planning', 'guide'], true, now() - interval '1 day');

-- ─── Testimonials ────────────────────────────────────────────

insert into testimonials (couple_name, destination, quote, sort_order) values
  ('Priya & Arjun', 'Udaipur', 'They didn''t just plan our wedding — they understood the feeling we wanted to create. Every lake reflection, every lit archway, every quiet moment between the grand ones.', 0),
  ('Meera & Vikram', 'Jaipur', 'We wanted something that felt like us — not a template. Elysian gave us a wedding that our guests still talk about, two years later.', 1),
  ('Aisha & Rohan', 'Goa', 'The sunset ceremony on the cliff was beyond anything we imagined. They handled every detail so we could just be present.', 2),
  ('Kavya & Siddharth', 'Kerala', 'From the backwater welcome dinner to the hilltop ceremony — every transition felt effortless. That takes extraordinary coordination.', 3);

-- ─── Relational Test Data ────────────────────────────────────

insert into users (id, email, name, role) values
  ('seed-admin-elysian', 'admin@elysian.test', 'Elysian Admin', 'ADMIN'),
  ('seed-manager-deeksha', 'deeksha@elysian.test', 'Deeksha Reddy', 'MANAGER'),
  ('seed-client-priya', 'priya@elysian.test', 'Priya Sharma', 'CLIENT'),
  ('seed-client-aisha', 'aisha@elysian.test', 'Aisha Khan', 'CLIENT'),
  ('seed-vendor-saffron', 'hello@saffronfilms.test', 'Saffron Films', 'VENDOR'),
  ('seed-vendor-amber', 'bookings@amberflora.test', 'Amber Flora Atelier', 'VENDOR'),
  ('seed-vendor-wave', 'events@wavemotion.test', 'Wave Motion DJs', 'VENDOR');

insert into client_profiles (user_id, partner_name, wedding_date, estimated_budget, guest_count, notes) values
  ('seed-client-priya', 'Priya & Arjun', now() + interval '120 days', 4200000, 180, 'Primary cloud-testing workspace with an active planning flow.'),
  ('seed-client-aisha', 'Aisha & Rohan', now() + interval '75 days', 2600000, 110, 'Secondary couple used for admin metrics and inquiry conversions.');

insert into vendor_profiles (
  user_id, business_name, slug, category_id, description, short_bio, city, state, country,
  experience, is_verified, is_featured, rating, review_count
) values
  (
    'seed-vendor-saffron',
    'Saffron Films',
    'saffron-films',
    (select id from vendor_categories where slug = 'photography'),
    'Editorial wedding films and stills for multi-day destination celebrations.',
    'Documentary-led storytelling with cinematic coverage across events.',
    'Udaipur',
    'Rajasthan',
    'India',
    9,
    true,
    true,
    4.9,
    18
  ),
  (
    'seed-vendor-amber',
    'Amber Flora Atelier',
    'amber-flora-atelier',
    (select id from vendor_categories where slug = 'decor'),
    'Large-format floral styling, mandap design, and reception environments.',
    'Known for layered floral installations and soft luxury styling.',
    'Jaipur',
    'Rajasthan',
    'India',
    11,
    true,
    true,
    4.8,
    14
  ),
  (
    'seed-vendor-wave',
    'Wave Motion DJs',
    'wave-motion-djs',
    (select id from vendor_categories where slug = 'entertainment'),
    'Sangeet sound design, live edits, DJ sets, and after-party programming.',
    'High-energy programming for sangeet, cocktail, and after-party nights.',
    'Goa',
    'Goa',
    'India',
    7,
    false,
    false,
    4.6,
    9
  );

insert into vendor_services (vendor_profile_id, name, description, base_price, max_price, unit) values
  (
    (select id from vendor_profiles where slug = 'saffron-films'),
    'Full Wedding Photography',
    'Two-day photography coverage with lead and associate shooters.',
    240000,
    340000,
    'per event'
  ),
  (
    (select id from vendor_profiles where slug = 'saffron-films'),
    'Cinematic Wedding Film',
    'Feature film edit with teaser, reels, and drone coverage.',
    180000,
    260000,
    'per event'
  ),
  (
    (select id from vendor_profiles where slug = 'amber-flora-atelier'),
    'Mandap Design',
    'Custom floral mandap with entry styling and aisle treatment.',
    320000,
    520000,
    'per event'
  ),
  (
    (select id from vendor_profiles where slug = 'amber-flora-atelier'),
    'Reception Floral Styling',
    'Reception stage, table florals, and ambient room detailing.',
    280000,
    480000,
    'per event'
  ),
  (
    (select id from vendor_profiles where slug = 'wave-motion-djs'),
    'Sangeet DJ Set',
    'DJ, sound engineer, wireless mics, and dance floor programming.',
    95000,
    180000,
    'per event'
  );

insert into vendor_destinations (vendor_profile_id, destination_id) values
  ((select id from vendor_profiles where slug = 'saffron-films'), (select id from destinations where slug = 'udaipur')),
  ((select id from vendor_profiles where slug = 'saffron-films'), (select id from destinations where slug = 'jaipur')),
  ((select id from vendor_profiles where slug = 'amber-flora-atelier'), (select id from destinations where slug = 'jaipur')),
  ((select id from vendor_profiles where slug = 'amber-flora-atelier'), (select id from destinations where slug = 'udaipur')),
  ((select id from vendor_profiles where slug = 'wave-motion-djs'), (select id from destinations where slug = 'goa'));

insert into weddings (client_profile_id, name, date, destination_id, package_tier_id, status) values
  (
    (select id from client_profiles where user_id = 'seed-client-priya'),
    'Priya & Arjun Wedding',
    now() + interval '120 days',
    (select id from destinations where slug = 'udaipur'),
    (select id from package_tiers where slug = 'curated'),
    'PLANNING'
  ),
  (
    (select id from client_profiles where user_id = 'seed-client-aisha'),
    'Aisha & Rohan Wedding',
    now() + interval '75 days',
    (select id from destinations where slug = 'goa'),
    (select id from package_tiers where slug = 'essential'),
    'CONFIRMED'
  );

insert into wedding_events (wedding_id, name, date, venue, notes, sort_order) values
  (
    (select id from weddings where name = 'Priya & Arjun Wedding'),
    'Welcome Dinner',
    now() + interval '118 days',
    'Leela Palace Udaipur',
    'Guest arrival dinner with family introductions.',
    0
  ),
  (
    (select id from weddings where name = 'Priya & Arjun Wedding'),
    'Mehendi Brunch',
    now() + interval '119 days',
    'Oberoi Udaivilas',
    'Poolside lunch and mehendi artists.',
    1
  ),
  (
    (select id from weddings where name = 'Priya & Arjun Wedding'),
    'Wedding Ceremony',
    now() + interval '120 days',
    'Taj Lake Palace',
    'Sunset pheras followed by lakefront dinner.',
    2
  ),
  (
    (select id from weddings where name = 'Aisha & Rohan Wedding'),
    'Beach Ceremony',
    now() + interval '75 days',
    'W Goa',
    'Cliffside vows at sunset.',
    0
  );

insert into budgets (client_profile_id, name, total_budget) values
  (
    (select id from client_profiles where user_id = 'seed-client-priya'),
    'Priya & Arjun Master Budget',
    4200000
  );

insert into budget_categories (budget_id, name, allocated, sort_order) values
  (
    (select id from budgets where name = 'Priya & Arjun Master Budget'),
    'Venue & Hospitality',
    1176000,
    0
  ),
  (
    (select id from budgets where name = 'Priya & Arjun Master Budget'),
    'Decor & Design',
    756000,
    1
  ),
  (
    (select id from budgets where name = 'Priya & Arjun Master Budget'),
    'Photography & Video',
    504000,
    2
  );

insert into budget_items (budget_category_id, name, estimated_cost, actual_cost, quantity, is_paid, notes, sort_order) values
  (
    (select id from budget_categories where name = 'Venue & Hospitality' and budget_id = (select id from budgets where name = 'Priya & Arjun Master Budget')),
    'Wedding Venue',
    520000,
    560000,
    1,
    true,
    'Lakefront ceremony venue confirmed with deposit paid.',
    0
  ),
  (
    (select id from budget_categories where name = 'Venue & Hospitality' and budget_id = (select id from budgets where name = 'Priya & Arjun Master Budget')),
    'Hotel Rooms (Guests)',
    380000,
    null,
    1,
    false,
    'Room block under negotiation for two nights.',
    1
  ),
  (
    (select id from budget_categories where name = 'Decor & Design' and budget_id = (select id from budgets where name = 'Priya & Arjun Master Budget')),
    'Mandap Decoration',
    310000,
    null,
    1,
    false,
    'Amber Flora concept deck shortlisted.',
    0
  ),
  (
    (select id from budget_categories where name = 'Photography & Video' and budget_id = (select id from budgets where name = 'Priya & Arjun Master Budget')),
    'Wedding Photography',
    240000,
    240000,
    1,
    true,
    'Saffron Films retained for core coverage.',
    0
  );

insert into guest_lists (client_profile_id, name) values
  (
    (select id from client_profiles where user_id = 'seed-client-priya'),
    'Primary Guest List'
  );

insert into guests (guest_list_id, name, email, phone, side, rsvp_status, meal_pref, plus_one, table_number, notes) values
  (
    (select id from guest_lists where name = 'Primary Guest List'),
    'Neha Sharma',
    'neha@example.com',
    '+919999999001',
    'BRIDE',
    'CONFIRMED',
    'Jain',
    false,
    2,
    'Bride''s cousin arriving from Delhi.'
  ),
  (
    (select id from guest_lists where name = 'Primary Guest List'),
    'Rohan Mehta',
    'rohan@example.com',
    '+919999999002',
    'GROOM',
    'PENDING',
    'No onion garlic',
    true,
    null,
    'Needs airport transfer.'
  ),
  (
    (select id from guest_lists where name = 'Primary Guest List'),
    'Meera Kapoor',
    'meera@example.com',
    '+919999999003',
    'MUTUAL',
    'CONFIRMED',
    'Vegetarian',
    false,
    5,
    'Present for mehendi and wedding day only.'
  );

insert into timeline_items (wedding_id, title, description, due_date, is_completed, sort_order) values
  (
    (select id from weddings where name = 'Priya & Arjun Wedding'),
    'Lock venue rooming grid',
    'Finalize room allocations and VIP suite upgrades with the hospitality team.',
    now() + interval '40 days',
    false,
    0
  ),
  (
    (select id from weddings where name = 'Priya & Arjun Wedding'),
    'Approve mandap concept',
    'Review floral palette, stage elevation, and aisle lighting references.',
    now() + interval '32 days',
    false,
    1
  ),
  (
    (select id from weddings where name = 'Priya & Arjun Wedding'),
    'Share transport manifest',
    'Send flight arrival sheet to logistics team and confirm airport pickups.',
    now() + interval '20 days',
    false,
    2
  );

insert into mood_boards (client_profile_id, name) values
  (
    (select id from client_profiles where user_id = 'seed-client-priya'),
    'Priya & Arjun Inspiration'
  );

insert into mood_board_items (mood_board_id, category, image_url, caption, source_url, sort_order) values
  (
    (select id from mood_boards where name = 'Priya & Arjun Inspiration'),
    'Decor',
    'https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=1200&q=80',
    'Soft sunset florals with layered candlelight.',
    'https://unsplash.com/photos/JmuyB_LibRo',
    0
  ),
  (
    (select id from mood_boards where name = 'Priya & Arjun Inspiration'),
    'Venue',
    'https://images.unsplash.com/photo-1519225421980-715cb0215aed?auto=format&fit=crop&w=1200&q=80',
    'Lakeside seating with ivory draping and warm brass accents.',
    'https://unsplash.com/photos/B4TjXnI0Y2c',
    1
  ),
  (
    (select id from mood_boards where name = 'Priya & Arjun Inspiration'),
    'Outfits',
    'https://images.unsplash.com/photo-1529636798458-92182e662485?auto=format&fit=crop&w=1200&q=80',
    'Muted gold styling direction for couple portraits.',
    'https://unsplash.com/photos/4_jhDO54BYg',
    2
  );

insert into bookings (client_profile_id, vendor_profile_id, vendor_service_id, wedding_event_id, status, event_date, total_amount, paid_amount, notes) values
  (
    (select id from client_profiles where user_id = 'seed-client-priya'),
    (select id from vendor_profiles where slug = 'saffron-films'),
    (select id from vendor_services where vendor_profile_id = (select id from vendor_profiles where slug = 'saffron-films') and name = 'Full Wedding Photography'),
    (select id from wedding_events where wedding_id = (select id from weddings where name = 'Priya & Arjun Wedding') and name = 'Wedding Ceremony'),
    'CONFIRMED',
    now() + interval '120 days',
    240000,
    120000,
    'Lead team locked. Need final shot list by 2 weeks before wedding.'
  ),
  (
    (select id from client_profiles where user_id = 'seed-client-priya'),
    (select id from vendor_profiles where slug = 'amber-flora-atelier'),
    (select id from vendor_services where vendor_profile_id = (select id from vendor_profiles where slug = 'amber-flora-atelier') and name = 'Mandap Design'),
    (select id from wedding_events where wedding_id = (select id from weddings where name = 'Priya & Arjun Wedding') and name = 'Wedding Ceremony'),
    'QUOTE_SENT',
    now() + interval '120 days',
    320000,
    0,
    'Quote shared with two floral scale options.'
  ),
  (
    (select id from client_profiles where user_id = 'seed-client-aisha'),
    (select id from vendor_profiles where slug = 'wave-motion-djs'),
    (select id from vendor_services where vendor_profile_id = (select id from vendor_profiles where slug = 'wave-motion-djs') and name = 'Sangeet DJ Set'),
    (select id from wedding_events where wedding_id = (select id from weddings where name = 'Aisha & Rohan Wedding') and name = 'Beach Ceremony'),
    'INQUIRY',
    now() + interval '75 days',
    95000,
    0,
    'Need a hybrid Bollywood and Afrobeats set for the after-party.'
  );

insert into reviews (client_profile_id, vendor_profile_id, rating, title, content, is_published) values
  (
    (select id from client_profiles where user_id = 'seed-client-aisha'),
    (select id from vendor_profiles where slug = 'saffron-films'),
    5,
    'Felt completely effortless',
    'They moved with the family beautifully and never made the coverage feel staged.',
    true
  ),
  (
    (select id from client_profiles where user_id = 'seed-client-priya'),
    (select id from vendor_profiles where slug = 'amber-flora-atelier'),
    5,
    'Incredible floral direction',
    'The concept work was calm, responsive, and highly detailed even before production.',
    true
  );

insert into messages (sender_id, booking_id, content, is_read, created_at) values
  (
    'seed-client-priya',
    (select id from bookings where client_profile_id = (select id from client_profiles where user_id = 'seed-client-priya') and vendor_profile_id = (select id from vendor_profiles where slug = 'saffron-films')),
    'We''d love a few more intimate family portrait moments during the welcome dinner as well.',
    true,
    now() - interval '2 days'
  ),
  (
    'seed-vendor-saffron',
    (select id from bookings where client_profile_id = (select id from client_profiles where user_id = 'seed-client-priya') and vendor_profile_id = (select id from vendor_profiles where slug = 'saffron-films')),
    'Absolutely. We''ll add a dedicated 30-minute portrait window to the arrival evening.',
    false,
    now() - interval '1 day'
  ),
  (
    'seed-client-aisha',
    (select id from bookings where client_profile_id = (select id from client_profiles where user_id = 'seed-client-aisha') and vendor_profile_id = (select id from vendor_profiles where slug = 'wave-motion-djs')),
    'Can you also handle a quieter welcome playlist during dinner before the party starts?',
    false,
    now() - interval '5 hours'
  );

insert into notifications (user_id, type, title, message, link, is_read, created_at) values
  (
    'seed-client-priya',
    'BOOKING_UPDATE',
    'Photography booking confirmed',
    'Saffron Films confirmed the core wedding-day coverage and captured your deposit.',
    '/client/bookings',
    false,
    now() - interval '1 day'
  ),
  (
    'seed-client-priya',
    'SYSTEM',
    'Timeline reminder',
    'Approve your mandap concept deck this week to stay on schedule.',
    '/client/timeline',
    false,
    now() - interval '12 hours'
  ),
  (
    'seed-vendor-saffron',
    'MESSAGE',
    'New client note',
    'Priya & Arjun added a note to their photography booking.',
    '/vendor/messages',
    false,
    now() - interval '8 hours'
  );

insert into saved_vendors (client_profile_id, vendor_profile_id) values
  (
    (select id from client_profiles where user_id = 'seed-client-priya'),
    (select id from vendor_profiles where slug = 'saffron-films')
  ),
  (
    (select id from client_profiles where user_id = 'seed-client-priya'),
    (select id from vendor_profiles where slug = 'amber-flora-atelier')
  );

insert into vendor_profile_views (vendor_profile_id, viewer_user_id, created_at) values
  (
    (select id from vendor_profiles where slug = 'saffron-films'),
    'seed-client-priya',
    now() - interval '3 days'
  ),
  (
    (select id from vendor_profiles where slug = 'saffron-films'),
    'seed-client-aisha',
    now() - interval '1 day'
  ),
  (
    (select id from vendor_profiles where slug = 'wave-motion-djs'),
    'seed-client-aisha',
    now() - interval '2 hours'
  );

insert into contact_inquiries (client_profile_id, name, email, phone, destination, wedding_date, guest_count, message, status) values
  (
    (select id from client_profiles where user_id = 'seed-client-aisha'),
    'Aisha Khan',
    'aisha@elysian.test',
    '+919999999099',
    'Goa',
    to_char(now() + interval '75 days', 'YYYY-MM-DD'),
    '110',
    'Looking for end-to-end guest experience planning and venue logistics support.',
    'NEW'
  ),
  (
    null,
    'Niharika Verma',
    'niharika@example.com',
    '+919999999100',
    'Jaipur',
    to_char(now() + interval '180 days', 'YYYY-MM-DD'),
    '220',
    'Exploring a large-format palace wedding with two evenings of entertainment programming.',
    'CONTACTED'
  );
