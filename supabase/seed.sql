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
