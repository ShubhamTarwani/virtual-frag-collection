<div align="center">
  <h1 align="center" style="font-size: 3rem;">✨🧴✨</h1>

  # Virtual Fragrance Shelf

  <p align="center">
    <strong>A premium, editorial-style inventory management system and social platform for perfume enthusiasts.</strong>
    <br />
    <a href="https://personal-perfume.vercel.app/"><strong>Explore the Live Platform »</strong></a>
  </p>

<<<<<<< Updated upstream
REddit post:
https://www.reddit.com/r/DesiFragranceAddicts/comments/1tnejq8/made_a_free_fragrance_collection_tracker_for/?utm_source=share&utm_medium=web3x&utm_name=web3xcss&utm_term=1&utm_content=share_button

---
=======
  <p align="center">
    <a href="https://github.com/ShubhamTarwani/virtual-frag-collection/stargazers"><img src="https://img.shields.io/github/stars/ShubhamTarwani/virtual-frag-collection?style=for-the-badge&color=c8aa64" alt="Stars" /></a>
    <a href="https://github.com/ShubhamTarwani/virtual-frag-collection/network/members"><img src="https://img.shields.io/github/forks/ShubhamTarwani/virtual-frag-collection?style=for-the-badge&color=c8aa64" alt="Forks" /></a>
    <a href="https://github.com/ShubhamTarwani/virtual-frag-collection/issues"><img src="https://img.shields.io/github/issues/ShubhamTarwani/virtual-frag-collection?style=for-the-badge&color=c8aa64" alt="Issues" /></a>
    <a href="https://github.com/ShubhamTarwani/virtual-frag-collection/blob/main/LICENSE"><img src="https://img.shields.io/github/license/ShubhamTarwani/virtual-frag-collection?style=for-the-badge&color=c8aa64" alt="License" /></a>
  </p>
</div>
>>>>>>> Stashed changes

<br />

## 📸 The Experience

| **Interactive 3D Shelf** | **Master Wall View** |
|:---:|:---:|
| <img src="./public/shelf-mockup.png" alt="3D Shelf UI" width="100%"> | <img src="./public/grid-mockup.png" alt="Master Wall UI" width="100%"> |
| *Visualize collections segmented by concentration on premium physical-style shelves.* | *A dense, seamless grid displaying all cataloged fragrances.* |

---

## ✨ Features

- **Interactive 3D-styled Shelf UI**: A stunning visual display of your fragrance collection with multiple premium themes (e.g., Brushed Metal, Carrara Marble, Dark Wood).
- **Master Wall View**: An editorial masonry grid display of all perfumes for a curated experience.
- **AI Wardrobe Assistant**: Get contextual, hyper-personalized fragrance recommendations based on your local weather and occasion.
- **AI-Powered Autofill**: Seamlessly fetch notes, family, projection, and longevity using Google Gemini API.
- **Auto Background Removal**: Upload raw photos straight from your phone; images are downscaled and stripped of backgrounds instantly via Cloudinary AI.
- **Community & Social Hub**: Follow other collectors, share daily wear logs, and discover trending scents globally in a clean, ad-free ecosystem.
- **Admin Dashboard**: Safe administration tools with strict server-side guards for managing platform metadata.
- **Rate-Limiting Security**: Custom sliding-window Postgres rate limits protecting costly AI and Cloudinary endpoints.

---

## 🧠 Smart Recommendation Engine

The AI Wardrobe uses a multi-stage deterministic scoring engine paired with a Gemini API re-ranker.

### 1. Contextual Scoring Factors
Fragrances are scored dynamically from **0 to 100+** based on:
- **Temperature & Humidity**:
  - Fresh/Citrus/Aquatic scents receive **+30 points** when temp > 30°C.
  - Heavy Gourmand/Oriental scents receive **-20 points** in hot weather.
  - Woody/Oriental scents receive **+25 points** when temp < 15°C.
  - Beast projection is penalized by **-20 points** in high (>75%) humidity.
- **Occasion Matching**:
  - Office: Moderate projection gets **+25 points**; beast projection gets **-40 points** (office-safe guard).
  - Date Night: Sensual character gets **+30 points**.
- **Time of Day & Season**:
  - Matching ideal seasons (e.g. Winter, Summer) gets **+30 points**.
  - Morning openings favor Fresh/Citrus (+20 points) while night openings favor Oriental/Woody (+20 points).
- **Recency & Variety**:
  - **-30 points** penalty if the fragrance was worn less than 2 days ago.
  - **+10 points** bonus if not worn for more than 14 days (variety/rotation boost).
  - **-15 points** penalty if worn 3 or more times in the current week.
- **User Rating**: Rated scale points added directly (`rating * 5`).

### 2. LLM Re-Ranking
Once the top 5 candidates are scored:
1. The engine constructs a context profile (weather condition, humidity, temp, selected mood, occasion, setting, and companion).
2. The candidates are sent to **Google Gemini** to pick the absolute best match for today and suggest alternative selections with personalized reasoning.

---

## 🛠 Tech Stack

- **Framework**: [Next.js 16](https://nextjs.org/) (App Router, Turbopack)
- **Database**: [Supabase](https://supabase.com/) (PostgreSQL with RLS Enabled)
- **Image Processing**: [Cloudinary](https://cloudinary.com/) (AI Background Removal, downscale chaining)
- **AI Integration**: [Google Gemini API](https://deepmind.google/technologies/gemini/)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/) & CSS Variables

---

## 🚀 Getting Started

### 1. Clone the repository and install dependencies
```bash
git clone https://github.com/ShubhamTarwani/virtual-frag-collection.git
cd virtual-frag-collection
npm install
```

### 2. Configure Environment Variables
Create a `.env.local` file in the root folder using the provided template:
```bash
cp .env.example .env.local
```

Ensure the following variables are populated:
```env
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=your-cloudinary-name
NEXT_PUBLIC_CLOUDINARY_API_KEY=your-cloudinary-api-key
CLOUDINARY_API_SECRET=your-cloudinary-secret
GEMINI_API_KEY=your-gemini-api-key
ADMIN_EMAIL=your-admin-email
```

### 3. Run the development server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) to see the application running.

---

## 🗺 Roadmap

- [x] **Phase 1**: Authentication, 3D Shelf, & Profile creation.
- [x] **Phase 2**: Social Hub (Discover feed, profile searches, likes, notifications).
- [x] **Phase 3**: AI Wardrobe (Weather context integration, Gemini re-ranking).
- [x] **Phase 4**: Hardening (Postgres rate-limiting, Cloudinary background removal downscale optimization).
- [ ] **Phase 5**: Advanced Shelf Categorization (Niche, Designer, Middle Eastern partitions).
- [ ] **Phase 6**: Comprehensive mobile responsive design audit and certification.

---

## 📄 License

Distributed under the MIT License. See [LICENSE](LICENSE) for more information.

<div align="center">
  <p>Crafted with elegance for collectors by <a href="https://github.com/shubhamtarwani">Shubham Tarwani</a>.</p>
</div>
