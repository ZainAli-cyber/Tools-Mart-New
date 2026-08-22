export interface GroupTool {
  id: string;
  name: string;
  category: string;
  rating: number;
  price: number;
  originalPrice: number;
  discount: number;
  favicon: string;
  isPrivate?: boolean;
  isSemiPrivate?: boolean;
  /** When false, hidden from public homepage only. Default true. */
  showOnHome?: boolean;
  desc?: string;
  waText?: string;
  fullDesc?: string;
  features?: string[];
  useCases?: string[];
  faqs?: { q: string; a: string }[];
}

export const GROUP_BUY_TOOLS: GroupTool[] = [
  {
    id: 'envato-elements', name: 'Envato Elements', category: 'Design', rating: 4.9, price: 556, originalPrice: 2780, discount: 80,
    favicon: 'https://www.google.com/s2/favicons?sz=128&domain=envato.com',
    desc: 'Unlimited downloads of 16M+ creative assets — templates, fonts, photos, video, audio & more.',
    fullDesc: 'Envato Elements is the ultimate creative subscription — giving you unlimited downloads of millions of premium assets including website templates, WordPress themes, graphics, stock photos, fonts, video templates, and music tracks. Perfect for designers, developers, and content creators who need professional assets at scale.',
    features: ['16M+ creative assets', 'Unlimited downloads', 'Website & WordPress themes', 'Stock photos & videos', 'Fonts & graphics', 'Audio & music tracks', 'Commercial license included', 'New assets added daily'],
    useCases: ['Graphic design projects', 'Website development', 'Social media content', 'Video production', 'Presentation design', 'Print materials'],
    faqs: [
      { q: 'What is Envato Elements group buy?', a: 'You get shared access to a premium Envato Elements account at a fraction of the original price — unlimited downloads included.' },
      { q: 'Can I use downloads for client projects?', a: 'Yes, commercial use is included. You can use assets for client work, social media, websites, and print.' },
      { q: 'How many downloads can I make?', a: 'Unlimited downloads for the duration of your subscription.' },
    ],
  },
  {
    id: 'semrush', name: 'Semrush', category: 'SEO', rating: 4.9, price: 556, originalPrice: 2780, discount: 80,
    favicon: 'https://www.google.com/s2/favicons?sz=128&domain=semrush.com',
    desc: 'All-in-one SEO platform for keyword research, competitor analysis, backlink auditing & rank tracking.',
    fullDesc: 'Semrush is the world\'s leading SEO and digital marketing platform trusted by 10M+ marketing professionals. It covers everything from keyword research and competitor analysis to site audits, rank tracking, and content marketing — giving you the data you need to outrank competitors.',
    features: ['Keyword Research (20B+ keywords)', 'Competitor traffic analysis', 'Backlink audit & building', 'Site health audit', 'Rank tracking (daily updates)', 'Content marketing toolkit', 'Local SEO tools', 'Social media tracker'],
    useCases: ['SEO professionals', 'Digital marketing agencies', 'Content marketers', 'PPC managers', 'Bloggers & affiliate marketers', 'E-commerce businesses'],
    faqs: [
      { q: 'Which Semrush plan do I get access to?', a: 'You get access to a Guru-level account, giving you full access to all major Semrush features.' },
      { q: 'Can I do competitor analysis?', a: 'Yes — traffic analytics, keyword gap, backlink gap, and full domain overview are all included.' },
      { q: 'How many projects can I create?', a: 'Group buy accounts support limited projects. For heavy usage, consider our Premium plan.' },
    ],
  },
  {
    id: 'coursera', name: 'Coursera', category: 'Learning', rating: 4.9, price: 556, originalPrice: 2780, discount: 80,
    favicon: 'https://www.google.com/s2/favicons?sz=128&domain=coursera.org',
    desc: 'Access thousands of university-level courses, specializations and certificates from top institutions.',
    fullDesc: 'Coursera Plus gives you unlimited access to 7,000+ courses from world-renowned universities including Yale, Stanford, Google, Meta, and IBM. Earn verified certificates that are recognized by employers globally — in tech, business, data science, design, and more.',
    features: ['7,000+ online courses', 'University certificates (Yale, Stanford, Google)', 'Specializations & professional certificates', 'Hands-on projects', 'Flexible self-paced learning', 'Mobile & desktop access', 'Graded assignments', 'Peer-reviewed projects'],
    useCases: ['Career changers', 'Students & graduates', 'Professionals upskilling', 'Tech learners', 'Data science enthusiasts', 'Business professionals'],
    faqs: [
      { q: 'Can I earn a real Coursera certificate?', a: 'Yes — you can complete courses and earn shareable certificates recognized by top employers.' },
      { q: 'Are all courses available?', a: 'You get access to the full Coursera Plus catalog — 7,000+ courses and specializations.' },
      { q: 'Is this group buy account shared?', a: 'Yes, it is a shared group buy account. Avoid simultaneously active sessions for smooth access.' },
    ],
  },
  {
    id: 'ubersuggest', name: 'Ubersuggest', category: 'SEO', rating: 4.9, price: 556, originalPrice: 2780, discount: 80,
    favicon: 'https://www.google.com/s2/favicons?sz=128&domain=neilpatel.com',
    desc: 'Neil Patel\'s keyword research and SEO tool — traffic analyzer, backlink checker & content ideas.',
    fullDesc: 'Ubersuggest by Neil Patel is a powerful all-in-one SEO tool that helps you grow organic traffic. Track keyword rankings, analyze competitors\' strategies, find content gaps, and build backlinks — all in one intuitive dashboard designed for marketers of every level.',
    features: ['Keyword research & suggestions', 'Competitor domain analysis', 'Backlink data & checker', 'SEO audit reports', 'Content ideas generator', 'Rank tracking', 'Traffic analyzer', 'Chrome extension included'],
    useCases: ['Bloggers & content creators', 'SEO beginners', 'Small business owners', 'Freelance marketers', 'E-commerce stores', 'YouTube creators'],
    faqs: [
      { q: 'Is Ubersuggest good for beginners?', a: 'Yes — it has one of the most beginner-friendly interfaces among SEO tools, with clear visual reports.' },
      { q: 'Does the group buy include the Chrome extension?', a: 'Yes, you can use the Ubersuggest Chrome extension for on-page SEO analysis.' },
      { q: 'How many searches per day?', a: 'Group buy access allows moderate daily usage. Avoid bulk exports for uninterrupted access.' },
    ],
  },
  {
    id: 'vista-create', name: 'Vista Create', category: 'Design', rating: 4.9, price: 556, originalPrice: 2780, discount: 80,
    favicon: 'https://www.google.com/s2/favicons?sz=128&domain=vista.com',
    desc: 'Professional design tool with 150K+ templates for social media, marketing, and branding.',
    fullDesc: 'Vista Create (formerly Crello) is a powerful graphic design platform with 150,000+ ready-made templates for social media posts, stories, ads, presentations, posters, and more. With an intuitive drag-and-drop editor and a vast library of photos, videos, and animations — it\'s the perfect alternative to Canva.',
    features: ['150,000+ templates', 'Social media post & story designs', 'Animated graphics & GIFs', '70M+ stock photos & videos', 'Brand kit & logo maker', 'Drag-and-drop editor', 'Multi-format export (PNG, JPG, MP4, GIF)', 'Team collaboration'],
    useCases: ['Social media managers', 'Small business owners', 'Content creators', 'Marketing teams', 'Freelance designers', 'Bloggers'],
    faqs: [
      { q: 'Is Vista Create a good Canva alternative?', a: 'Yes — Vista Create offers similar functionality with a slightly different template library. Many designers use both.' },
      { q: 'Can I animate my designs?', a: 'Yes — Vista Create has animated templates and GIF export built in.' },
      { q: 'Does it include stock photos?', a: 'Yes — 70M+ royalty-free photos and videos are included in the Pro plan.' },
    ],
  },
  {
    id: 'udemy', name: 'Udemy', category: 'Learning', rating: 4.9, price: 556, originalPrice: 2780, discount: 80,
    favicon: 'https://www.google.com/s2/favicons?sz=128&domain=udemy.com',
    desc: 'Access 200,000+ online courses on tech, business, design, marketing, development & more.',
    fullDesc: 'Udemy is the world\'s largest online learning marketplace with 200,000+ courses taught by expert instructors. From Python and web development to graphic design, digital marketing, video editing, and finance — whatever skill you want to build, Udemy has a course for it.',
    features: ['200,000+ courses', 'Lifetime access to enrolled courses', 'Certificate of completion', 'Mobile & offline access', 'Subtitles in multiple languages', 'Q&A with instructors', 'Coding exercises & projects', 'New courses added weekly'],
    useCases: ['Students & job seekers', 'Developers & programmers', 'Designers', 'Digital marketers', 'Entrepreneurs', 'HR & management professionals'],
    faqs: [
      { q: 'Which courses can I access?', a: 'With our group buy, you get access to a wide range of top-rated premium courses. Specific course access depends on the account tier.' },
      { q: 'Is the certificate valid?', a: 'Udemy certificates of completion are widely recognized by employers and can be added to LinkedIn.' },
      { q: 'Can I download course videos?', a: 'Yes — Udemy allows video downloads for offline viewing via the mobile app.' },
    ],
  },
  {
    id: 'skillshare', name: 'SkillShare', category: 'Learning', rating: 4.9, price: 556, originalPrice: 2780, discount: 80,
    favicon: 'https://www.google.com/s2/favicons?sz=128&domain=skillshare.com',
    desc: 'Creative learning platform with 40,000+ classes on design, photography, video, business & more.',
    fullDesc: 'Skillshare is a creative learning community with 40,000+ classes taught by industry professionals. Whether you want to learn illustration, UI/UX design, photography, video editing, animation, or entrepreneurship — Skillshare offers short, project-based classes you can complete at your own pace.',
    features: ['40,000+ creative classes', 'Project-based learning', 'Offline downloads (mobile)', 'Class certificates', 'Community & workshops', 'New classes weekly', 'Beginner to advanced levels', 'Adobe, Figma & Procreate tutorials'],
    useCases: ['Creative professionals', 'Freelancers', 'Designers & illustrators', 'Photographers', 'Content creators', 'Entrepreneurs'],
    faqs: [
      { q: 'What topics does Skillshare cover?', a: 'Design, illustration, photography, film, video, music, writing, animation, UI/UX, and business.' },
      { q: 'Are classes self-paced?', a: 'Yes — all Skillshare classes are on-demand and self-paced. No deadlines.' },
      { q: 'Can I download classes offline?', a: 'Yes — via the Skillshare mobile app you can download classes for offline viewing.' },
    ],
  },
  {
    id: 'placeit', name: 'Placeit', category: 'Design', rating: 4.9, price: 556, originalPrice: 2780, discount: 80,
    favicon: 'https://www.google.com/s2/favicons?sz=128&domain=placeit.net',
    desc: 'Create professional mockups, logos, videos, and design templates directly in your browser.',
    fullDesc: 'Placeit by Envato is an all-in-one design tool that lets you create professional mockups, logos, promotional videos, and branded social media content — all directly in your browser with no software needed. Perfect for Shopify sellers, apparel brands, and digital marketers.',
    features: ['50,000+ mockup templates', 'Logo maker', 'Video intros & outros', 'T-shirt & apparel mockups', 'Social media templates', 'Gaming & Twitch templates', 'Brand kit builder', 'No design skills required'],
    useCases: ['Shopify & eCommerce sellers', 'Apparel & print-on-demand businesses', 'YouTubers & streamers', 'App developers', 'Social media marketers', 'Brand agencies'],
    faqs: [
      { q: 'What kind of mockups does Placeit offer?', a: 'T-shirts, hoodies, phone cases, books, devices, packaging, outdoor ads, and much more — 50,000+ in total.' },
      { q: 'Can I make a logo with Placeit?', a: 'Yes — Placeit has a logo maker with hundreds of customizable templates.' },
      { q: 'Do I need Photoshop?', a: 'No — everything works in your browser, no software installation needed.' },
    ],
  },
  {
    id: 'motion-array', name: 'Motion Array', category: 'Video', rating: 4.9, price: 556, originalPrice: 2780, discount: 80,
    favicon: 'https://www.google.com/s2/favicons?sz=128&domain=motionarray.com',
    desc: 'Premium video templates, music, SFX, stock footage & Premiere Pro/After Effects plugins.',
    fullDesc: 'Motion Array is a premium video production marketplace offering 500,000+ assets for video creators — including After Effects templates, Premiere Pro presets, stock footage, music, sound effects, and plugins. Everything a professional video editor needs in one subscription.',
    features: ['500,000+ video assets', 'After Effects & Premiere Pro templates', 'DaVinci Resolve templates', 'Stock footage library', 'Royalty-free music & SFX', 'Premiere Pro plugin included', 'Portfolio hosting', 'New assets daily'],
    useCases: ['Video editors', 'YouTubers & content creators', 'Filmmakers', 'Motion graphic designers', 'Social media video creators', 'Wedding videographers'],
    faqs: [
      { q: 'Which software is compatible with Motion Array assets?', a: 'After Effects, Premiere Pro, DaVinci Resolve, and Final Cut Pro.' },
      { q: 'Is the music royalty-free for YouTube?', a: 'Yes — all music on Motion Array is cleared for use on YouTube and social media.' },
      { q: 'Does it include stock footage?', a: 'Yes — a large library of HD and 4K stock footage clips is included.' },
    ],
  },
  {
    id: 'canva-pro', name: 'Canva Pro', category: 'Design', rating: 4.9, price: 556, originalPrice: 2780, discount: 80,
    favicon: 'https://www.google.com/s2/favicons?sz=128&domain=canva.com',
    desc: 'The world\'s most popular design platform — Magic AI, brand kit, background remover & premium templates.',
    fullDesc: 'Canva Pro is the world\'s leading design platform used by 170M+ people. With the Pro plan, you unlock Magic AI tools, a brand kit, background remover, premium templates, 100M+ stock assets, and unlimited folders — making it the go-to tool for marketers, creators, and businesses of all sizes.',
    features: ['Magic AI design tools', 'Brand kit & logo upload', 'Background remover (one click)', '100M+ premium stock photos & videos', '610,000+ premium templates', 'Unlimited storage', 'Content planner & scheduler', 'Resize designs instantly'],
    useCases: ['Social media managers', 'Marketing teams', 'Small businesses', 'Educators & teachers', 'Freelance designers', 'Non-profits'],
    faqs: [
      { q: 'What is the difference between Canva Free and Canva Pro?', a: 'Pro unlocks Magic AI, background remover, brand kit, premium templates, and 100M+ additional assets.' },
      { q: 'Can I use Canva Pro for commercial projects?', a: 'Yes — all Canva Pro designs can be used for commercial purposes including client work and resale.' },
      { q: 'Is it a shared account?', a: 'Yes — group buy accounts are shared. For a private dedicated seat, see our Private Tools section.' },
    ],
  },
  {
    id: 'capcut', name: 'Capcut', category: 'Video', rating: 4.9, price: 556, originalPrice: 2780, discount: 80,
    favicon: 'https://www.google.com/s2/favicons?sz=128&domain=capcut.com',
    desc: 'AI-powered video editor for TikTok, Reels & YouTube — effects, captions, and background removal.',
    fullDesc: 'CapCut is a powerful free-to-Pro AI video editor by ByteDance, loved by 300M+ creators worldwide. The Pro version unlocks advanced AI effects, auto-captions, background removal, commercial music, and an expanded asset library — perfect for TikTok, Instagram Reels, YouTube Shorts, and long-form content.',
    features: ['AI video effects & filters', 'Auto-captions & subtitles', 'Background removal (AI)', 'Commercial music library', 'Text-to-video AI', 'Speed curves & transitions', 'Keyframe animation', 'Multi-track timeline editor'],
    useCases: ['TikTok & Reels creators', 'YouTubers', 'Social media managers', 'Vloggers', 'E-commerce video ads', 'Podcast video editors'],
    faqs: [
      { q: 'What does CapCut Pro add over the free version?', a: 'Pro unlocks commercial music, AI effects, background removal without watermark, and an extended asset library.' },
      { q: 'Can I use CapCut on desktop?', a: 'Yes — CapCut has both a desktop app (Windows/Mac) and a mobile app (iOS/Android).' },
      { q: 'Is CapCut good for beginners?', a: 'Yes — it\'s one of the most beginner-friendly pro video editors available, with templates for every format.' },
    ],
  },
  {
    id: 'epidemic-sound', name: 'Epidemic Sound', category: 'Audio', rating: 4.9, price: 556, originalPrice: 2780, discount: 80,
    favicon: 'https://www.google.com/s2/favicons?sz=128&domain=epidemicsound.com',
    desc: 'The world\'s largest royalty-free music & sound effects library — cleared for YouTube, TikTok & streaming.',
    fullDesc: 'Epidemic Sound is the gold standard for royalty-free music used by 2M+ creators and 50,000+ brands. With 40,000+ tracks and 90,000+ sound effects — all pre-cleared for YouTube monetization, TikTok, Instagram, Twitch, podcasts, and commercial use — you\'ll never worry about copyright claims again.',
    features: ['40,000+ music tracks', '90,000+ sound effects', 'YouTube copyright claim cleared', 'TikTok & Instagram cleared', 'Twitch & podcast licensing', 'New music added weekly', 'Mood & genre filters', 'Download stems & tracks'],
    useCases: ['YouTubers & video creators', 'Podcasters', 'TikTok & Reels creators', 'Brands & agencies', 'Twitch streamers', 'Film & TV producers'],
    faqs: [
      { q: 'Will I get YouTube copyright strikes with Epidemic Sound?', a: 'No — all Epidemic Sound tracks are cleared for YouTube monetization. No copyright claims.' },
      { q: 'Can I use the music on TikTok and Instagram?', a: 'Yes — the subscription covers TikTok, Instagram, Facebook, YouTube, podcasts, and Twitch.' },
      { q: 'How many tracks can I download?', a: 'Unlimited downloads for the duration of your subscription.' },
    ],
  },
];

export const PRIVATE_TOOLS: GroupTool[] = [
  {
    id: 'chatgpt-plus', name: 'ChatGPT Plus (Semi-Private)', category: 'AI', rating: 4.9, price: 1668, originalPrice: 8340, discount: 80,
    favicon: 'https://www.google.com/s2/favicons?sz=128&domain=openai.com', isSemiPrivate: true,
    desc: 'GPT-4o, image generation, custom GPTs & code interpreter — semi-private seat.',
    waText: 'ChatGPT Plus (Semi-Private)',
    fullDesc: 'ChatGPT Plus gives you access to GPT-4o — OpenAI\'s most capable model — along with DALL·E 3 image generation, Advanced Data Analysis, custom GPTs, and the Code Interpreter. Semi-private means very few users share the seat, giving you near-private performance.',
    features: ['GPT-4o access', 'DALL·E 3 image generation', 'Advanced Data Analysis', 'Custom GPTs marketplace', 'Code Interpreter', 'Faster response times', 'Priority access during peak hours', 'File upload & analysis'],
    useCases: ['Content writers & bloggers', 'Developers & coders', 'Data analysts', 'Researchers', 'Digital marketers', 'Customer support teams'],
    faqs: [
      { q: 'What does semi-private mean?', a: 'A very small number of users (2-3) share the seat, so you get near-private speed and performance.' },
      { q: 'Can I use GPT-4o?', a: 'Yes — GPT-4o is fully accessible with the ChatGPT Plus subscription.' },
      { q: 'Is DALL·E 3 included?', a: 'Yes — image generation via DALL·E 3 is included in ChatGPT Plus.' },
    ],
  },
  {
    id: 'capcut-pro', name: 'CapCut Pro', category: 'Video', rating: 4.9, price: 1390, originalPrice: 6950, discount: 80,
    favicon: 'https://www.google.com/s2/favicons?sz=128&domain=capcut.com', isPrivate: true,
    desc: 'Full CapCut Pro editor — premium effects, filters, AI tools & cloud collab.',
    waText: 'CapCut Pro',
    fullDesc: 'CapCut Pro private account gives you a dedicated login with the full suite of Pro features — AI effects, commercial music, background removal, text-to-video, and cloud collaboration tools — all under your own private credentials.',
    features: ['Private dedicated login', 'All Pro AI effects', 'Commercial music cleared', 'Background removal AI', 'Text-to-video generation', 'Cloud storage & sync', 'No watermark on exports', 'Priority rendering'],
    useCases: ['Professional video editors', 'Content agencies', 'Brand video production', 'TikTok marketing teams', 'YouTubers requiring clean exports'],
    faqs: [
      { q: 'Why choose private over group buy CapCut?', a: 'Private gives you your own login — no session conflicts, no other users, full control of your workspace.' },
      { q: 'Is the account safe to store my projects?', a: 'Yes — private accounts are dedicated to you so your projects and data remain private.' },
    ],
  },
  {
    id: 'canva-pro-private', name: 'Canva Pro', category: 'Design', rating: 4.9, price: 1112, originalPrice: 5560, discount: 80,
    favicon: 'https://www.google.com/s2/favicons?sz=128&domain=canva.com', isPrivate: true,
    desc: 'Canva Pro with Magic AI, brand kit and premium templates — private dedicated seat.',
    waText: 'Canva Pro',
    fullDesc: 'Canva Pro private seat gives you your own dedicated login — meaning you can set up your own brand kit, save designs permanently, and use all Magic AI tools without any session conflicts or other users accessing your workspace.',
    features: ['Private dedicated login', 'Persistent brand kit', 'Magic AI suite', '100M+ premium assets', 'Background remover', 'Unlimited folders & storage', 'No shared session conflicts', 'Commercial use rights'],
    useCases: ['Brand designers', 'Marketing agencies', 'Freelancers with multiple clients', 'Businesses with brand guidelines'],
    faqs: [
      { q: 'Why is private Canva Pro more expensive than group buy?', a: 'You get your own dedicated account — no sharing, full brand kit control, and all your designs are permanently saved.' },
      { q: 'Can I invite team members?', a: 'The private seat is for one user. For teams, contact us for multi-seat arrangements.' },
    ],
  },
  {
    id: 'lovable-pro', name: 'Lovable Pro', category: 'AI Dev', rating: 4.9, price: 3336, originalPrice: 16680, discount: 80,
    favicon: 'https://www.google.com/s2/favicons?sz=128&domain=lovable.dev', isPrivate: true,
    desc: 'Build full-stack apps with AI — Lovable Pro monthly access.',
    waText: 'Lovable Pro',
    fullDesc: 'Lovable is the AI-powered full-stack app builder that lets you build production-ready web apps by describing them in plain English. Lovable Pro gives you increased message limits, custom domains, private projects, and the ability to connect your own Supabase and GitHub.',
    features: ['AI full-stack app builder', 'Increased monthly message credits', 'Private project visibility', 'Custom domain support', 'GitHub integration', 'Supabase backend connection', 'React + Tailwind output', 'Production deployment'],
    useCases: ['Indie developers & makers', 'Startup founders', 'No-code/low-code builders', 'Freelancers building MVPs', 'Agencies prototyping apps'],
    faqs: [
      { q: 'What kind of apps can Lovable build?', a: 'SaaS apps, dashboards, landing pages, CRUD apps, portfolios, and more — all with React and Supabase.' },
      { q: 'Do I need coding knowledge?', a: 'No — you describe what you want in plain English and Lovable writes the code.' },
    ],
  },
  {
    id: 'vidiq-boost', name: 'vidIQ Boost', category: 'YouTube', rating: 4.9, price: 973, originalPrice: 4865, discount: 80,
    favicon: 'https://www.google.com/s2/favicons?sz=128&domain=vidiq.com', isPrivate: true,
    desc: 'YouTube growth toolkit — keyword research, competitor tracking & AI title/thumbnail coach.',
    waText: 'vidIQ Boost',
    fullDesc: 'vidIQ Boost is the most powerful YouTube growth tool — used by 20M+ creators. It gives you AI-powered title and description suggestions, keyword research, competitor channel tracking, trend alerts, and a daily ideas feed to help you grow your channel faster.',
    features: ['YouTube keyword research', 'AI title & description writer', 'Competitor channel tracker', 'Trend alerts & viral video finder', 'Thumbnail A/B insights', 'SEO score per video', 'Daily video ideas feed', 'Channel audit & scorecard'],
    useCases: ['YouTubers at every stage', 'Content strategists', 'Brand YouTube channels', 'Agencies managing YouTube', 'Educators & course creators'],
    faqs: [
      { q: 'Does vidIQ help with YouTube SEO?', a: 'Yes — it gives every video an SEO score and recommends tags, titles, and descriptions to improve ranking.' },
      { q: 'Can I track competitor channels?', a: 'Yes — Boost lets you track unlimited competitor channels and see their top-performing videos.' },
    ],
  },
  {
    id: 'udemy-private', name: 'Udemy', category: 'Learning', rating: 4.9, price: 1390, originalPrice: 6950, discount: 80,
    favicon: 'https://www.google.com/s2/favicons?sz=128&domain=udemy.com', isPrivate: true,
    desc: 'Unlock 200,000+ premium Udemy courses — private dedicated seat.',
    waText: 'Udemy',
    fullDesc: 'A private dedicated Udemy account gives you your own login with permanent access to any enrolled courses — no sharing, no session conflicts, and your learning progress is always saved.',
    features: ['Private dedicated login', '200,000+ course access', 'Permanent progress saved', 'Certificates of completion', 'Offline mobile downloads', 'No session conflicts', 'Instructor Q&A access', 'Course notes & bookmarks'],
    useCases: ['Serious learners with long-term goals', 'Professionals building portfolios', 'Students tracking certifications'],
    faqs: [
      { q: 'Why choose private Udemy over group buy?', a: 'Your progress, bookmarks, notes, and certificates are permanently saved under your private account.' },
    ],
  },
  {
    id: 'google-ai-pro', name: 'Google AI Pro', category: 'AI', rating: 4.9, price: 1112, originalPrice: 5560, discount: 80,
    favicon: 'https://www.google.com/s2/favicons?sz=128&domain=gemini.google.com', isPrivate: true,
    desc: 'Gemini Advanced with 2M-token context, Deep Research, and Google AI Pro features.',
    waText: 'Google AI Pro',
    fullDesc: 'Google AI Pro (formerly Google One AI Premium) gives you access to Gemini Advanced — Google\'s most capable AI model with a 2 million token context window, Deep Research mode, Gemini in Google Docs/Sheets/Gmail, and NotebookLM Plus for advanced document analysis.',
    features: ['Gemini Advanced (most capable model)', '2M token context window', 'Deep Research mode', 'Gemini in Gmail, Docs, Sheets', 'NotebookLM Plus', 'Image generation (Imagen 3)', 'Priority access to new features', '2TB Google One storage'],
    useCases: ['Researchers & analysts', 'Writers & journalists', 'Business professionals', 'Students & academics', 'Developers using Google Workspace'],
    faqs: [
      { q: 'What is the 2M token context window?', a: 'It means Gemini Advanced can process and understand up to 2 million tokens of text — roughly 1,500 pages — in a single conversation.' },
      { q: 'Does it include Google Workspace AI features?', a: 'Yes — Gemini appears inside Gmail, Google Docs, Sheets, Slides, and Meet.' },
    ],
  },
  {
    id: 'freepik-premium', name: 'Freepik Premium', category: 'Design', rating: 4.9, price: 1112, originalPrice: 5560, discount: 80,
    favicon: 'https://www.google.com/s2/favicons?sz=128&domain=freepik.com', isPrivate: true,
    desc: 'Unlimited Freepik Premium downloads — photos, vectors, PSDs, icons & AI tools.',
    waText: 'Freepik Premium',
    fullDesc: 'Freepik Premium unlocks unlimited downloads from the world\'s largest stock resource library — 100M+ photos, vectors, PSD files, icons, and AI-generated images. Plus access to AI tools including Freepik AI Image Generator, background remover, and upscaler.',
    features: ['100M+ premium assets', 'Unlimited daily downloads', 'Stock photos & vectors', 'PSD & editable files', 'Icon packs & illustrations', 'AI image generator', 'Background remover AI', 'No attribution required (Premium)'],
    useCases: ['Graphic designers', 'Marketing teams', 'Web developers', 'Content creators', 'UI/UX designers', 'Print & packaging designers'],
    faqs: [
      { q: 'Do Premium downloads require attribution?', a: 'No — Freepik Premium removes the attribution requirement. You can use assets freely in commercial projects.' },
      { q: 'Are AI-generated images included?', a: 'Yes — Freepik\'s AI Image Generator is included with the Premium subscription.' },
    ],
  },
];

export const HERO_TICKER_TOOLS = [
  { name: 'ChatGPT', domain: 'openai.com' },
  { name: 'Canva Pro', domain: 'canva.com' },
  { name: 'Semrush', domain: 'semrush.com' },
  { name: 'Envato', domain: 'envato.com' },
  { name: 'CapCut', domain: 'capcut.com' },
  { name: 'Grammarly', domain: 'grammarly.com' },
  { name: 'Jasper', domain: 'jasper.ai' },
  { name: 'Helium 10', domain: 'helium10.com' },
  { name: 'QuillBot', domain: 'quillbot.com' },
  { name: 'SpyFu', domain: 'spyfu.com' },
];

export const ALL_TOOLS = [...GROUP_BUY_TOOLS, ...PRIVATE_TOOLS];
