import { ToolItem } from '../types';

export const TOOLS: ToolItem[] = [
  // --- Category: Text Content & Analysis ---
  {
    id: 'plagiarism-checker',
    name: 'Plagiarism Checker',
    slug: 'plagiarism-checker',
    category: 'text',
    shortDesc: 'Scan text against billions of online sources for original content and similarity score.',
    fullDesc: 'Our free online Plagiarism Checker uses advanced AI algorithms to analyze your text line by line. Get instant duplicate detection percentages, highlighted plagiarized sentences, and similarity reports.',
    iconName: 'ShieldCheck',
    isPopular: true,
    isAiPowered: true,
    howToUseSteps: [
      'Paste your content or type directly into the text box.',
      'Click the "Check Plagiarism" button to initiate deep scanning.',
      'Review the uniqueness score percentage, clean sentences, and similarity breakdown.',
      'Copy or download the complete plagiarism analysis report.'
    ],
    whyUseFeatures: [
      { title: '100% Accuracy', desc: 'Powered by Gemini AI to detect direct matches and paraphrased content.' },
      { title: 'Sentence-Level Highlight', desc: 'Pinpoint specific duplicate sentences for fast editing.' },
      { title: 'Privacy Guaranteed', desc: 'Your uploaded text is never saved or indexed in public repositories.' }
    ],
    faqs: [
      { question: 'Is this Plagiarism Checker completely free?', answer: 'Yes! AI TOOLZ MART provides unlimited plagiarism scans at zero cost without mandatory sign-ups.' },
      { question: 'What is the maximum word limit per check?', answer: 'You can analyze up to 2,500 words per single check.' }
    ]
  },
  {
    id: 'article-rewriter',
    name: 'Article Rewriter',
    slug: 'article-rewriter',
    category: 'text',
    shortDesc: 'Rewrite articles, essays, and blog posts with AI to generate unique, readable content.',
    fullDesc: 'Transform existing text into fresh, human-sounding content while retaining its original meaning. Perfect for marketers, SEO specialists, and bloggers looking to repurpose articles effortlessly.',
    iconName: 'RefreshCw',
    isPopular: true,
    isAiPowered: true,
    howToUseSteps: [
      'Enter the article or passage you wish to rewrite.',
      'Select your preferred tone (SEO Optimized, Creative, Professional, or Casual).',
      'Click "Rewrite Article" to generate unique variations.',
      'Copy the output or export as a text document.'
    ],
    whyUseFeatures: [
      { title: 'Context-Aware AI', desc: 'Rephrases vocabulary intelligently without awkward synonym substitution.' },
      { title: 'SEO Optimized Output', desc: 'Produces readable content designed to rank naturally on Google.' },
      { title: 'Instant Processing', desc: 'Generates full article rewrites in under 5 seconds.' }
    ],
    faqs: [
      { question: 'Will rewritten articles pass plagiarism tests?', answer: 'Yes! Our AI rephrases structures thoroughly so rewritten content scores high on uniqueness.' }
    ]
  },
  {
    id: 'grammar-checker',
    name: 'Grammar Checker',
    slug: 'grammar-checker',
    category: 'text',
    shortDesc: 'Detect and fix grammatical mistakes, punctuation errors, and spelling slips.',
    fullDesc: 'Ensure error-free content before publishing. Our Grammar Checker analyzes sentence syntax, tone clarity, and offers instant one-click corrections.',
    iconName: 'CheckCircle2',
    isPopular: true,
    isAiPowered: true,
    howToUseSteps: [
      'Paste your content into the grammar editor.',
      'Click "Check Grammar".',
      'View highlighted spelling, grammar, and tone recommendations.',
      'Click "Apply Fixes" to rewrite corrected text.'
    ],
    whyUseFeatures: [
      { title: 'Real-time Corrections', desc: 'Catches complex grammar rules, subject-verb agreement, and typos.' },
      { title: 'Tone Suggestions', desc: 'Recommends punchier sentences for better reader engagement.' }
    ],
    faqs: [
      { question: 'Does it support international English variants?', answer: 'Yes, it handles US, UK, Canadian, and Australian English rules.' }
    ]
  },
  {
    id: 'word-counter',
    name: 'Word Counter',
    slug: 'word-counter',
    category: 'text',
    shortDesc: 'Count words, characters, sentences, paragraphs, reading time, and keyword density.',
    fullDesc: 'A powerful real-time text analysis tool for content creators, students, and copywriters. Measures word counts, character limits (with and without spaces), average reading speed, and keyword frequencies.',
    iconName: 'BarChart2',
    isPopular: true,
    howToUseSteps: [
      'Type or paste your text into the interactive editor.',
      'Watch real-time word, character, and sentence metrics update live.',
      'Examine the top keyword frequency table below the text field.'
    ],
    whyUseFeatures: [
      { title: 'Realtime Speed', desc: 'Calculates counts instantaneously as you type.' },
      { title: 'Reading & Speaking Estimates', desc: 'Provides accurate reading time (200 wpm) and speaking time (130 wpm).' }
    ],
    faqs: [
      { question: 'Does word counter count numbers and symbols?', answer: 'Words are calculated based on standard whitespace delimiters, while symbols are counted in character metrics.' }
    ]
  },
  {
    id: 'text-summarizer',
    name: 'Text Summarizer',
    slug: 'text-summarizer',
    category: 'text',
    shortDesc: 'Condense long articles, reports, or research documents into key takeaways.',
    fullDesc: 'Extract the core facts from lengthy documents using AI text summarization. Choose between bullet point summary or concise paragraph format.',
    iconName: 'FileSpreadsheet',
    isAiPowered: true,
    howToUseSteps: [
      'Paste long text or article into the summarizer.',
      'Select summary length (Short, Medium, or Detailed).',
      'Click "Summarize Text" to view key bullet points.'
    ],
    whyUseFeatures: [
      { title: 'Bullet & Paragraph Modes', desc: 'Tailor output format for rapid executive reading or research notes.' }
    ],
    faqs: [
      { question: 'Can it summarize technical documents?', answer: 'Yes, Gemini AI retains key technical terminology and core statistics.' }
    ]
  },
  {
    id: 'case-converter',
    name: 'Case Converter',
    slug: 'case-converter',
    category: 'text',
    shortDesc: 'Convert text between UPPERCASE, lowercase, Title Case, Sentence case, and Capitalized Case.',
    fullDesc: 'Easily alter text capitalization with a single click. Convert ALL CAPS headings into neat Title Case or Sentence case instantly.',
    iconName: 'Type',
    howToUseSteps: [
      'Paste your text into the text field.',
      'Click any case conversion button (Upper, Lower, Title, Sentence, Alternating).',
      'Copy the converted text to your clipboard.'
    ],
    whyUseFeatures: [
      { title: 'Instant Conversion', desc: 'Zero latency client-side string transformation.' }
    ],
    faqs: [
      { question: 'Is my text sent to a server for case conversion?', answer: 'No, case conversion runs 100% locally in your web browser.' }
    ]
  },
  {
    id: 'duplicate-line-remover',
    name: 'Duplicate Line Remover',
    slug: 'duplicate-line-remover',
    category: 'text',
    shortDesc: 'Remove repeated lines, empty lines, and deduplicate text lists effortlessly.',
    fullDesc: 'Clean up large data lists, keyword collections, or email records by stripping identical duplicate lines and unwanted blank spaces.',
    iconName: 'ListFilter',
    howToUseSteps: [
      'Paste line-separated text or list into the box.',
      'Select options (Case sensitive, trim spaces, remove blank lines).',
      'Click "Remove Duplicates" to get a clean deduplicated list.'
    ],
    whyUseFeatures: [
      { title: 'Clean Lists Instantaneously', desc: 'Saves hours of manual list cleaning.' }
    ],
    faqs: [
      { question: 'Will it preserve the order of remaining lines?', answer: 'Yes! The first instance of each line is preserved in original order.' }
    ]
  },

  // --- Category: Keyword Research & SERP ---
  {
    id: 'keyword-density-checker',
    name: 'Keyword Density Checker',
    slug: 'keyword-density-checker',
    category: 'keyword',
    shortDesc: 'Analyze keyword frequency percentages for 1, 2, and 3-word combinations.',
    fullDesc: 'Avoid keyword stuffing penalties and optimize on-page content density. Inspect the exact percentage breakdown of primary keywords across your copy.',
    iconName: 'PieChart',
    isPopular: true,
    howToUseSteps: [
      'Enter text or a target web page URL.',
      'Click "Analyze Density".',
      'Review total words, unique words, and density percentage tables for 1-word, 2-word, and 3-word phrases.'
    ],
    whyUseFeatures: [
      { title: 'Prevent Penalty', desc: 'Keep target keyword density within recommended 1% to 3% thresholds.' }
    ],
    faqs: [
      { question: 'What is ideal keyword density for Google?', answer: 'Most SEO experts recommend keeping target primary keywords around 1.5% to 2.5% of total word count.' }
    ]
  },
  {
    id: 'keyword-suggestion-generator',
    name: 'Keyword Suggestion Generator',
    slug: 'keyword-suggestion-generator',
    category: 'keyword',
    shortDesc: 'Generate hundreds of long-tail keyword ideas with search intent and volume indicators.',
    fullDesc: 'Uncover profitable long-tail keywords, buyer intent phrases, and question-based search queries for your content marketing campaigns.',
    iconName: 'Search',
    isPopular: true,
    isAiPowered: true,
    howToUseSteps: [
      'Enter a seed keyword (e.g. "seo tools").',
      'Select target market region.',
      'Click "Generate Keywords" to discover related long-tail search terms.'
    ],
    whyUseFeatures: [
      { title: 'Search Intent Tagging', desc: 'Categorizes keywords by Informational, Commercial, Navigational, or Transactional intent.' }
    ],
    faqs: [
      { question: 'Can I export the keyword list to CSV?', answer: 'Yes, click "Download CSV" to export all suggested keywords with estimated search metrics.' }
    ]
  },
  {
    id: 'keyword-position-checker',
    name: 'Keyword Position Checker',
    slug: 'keyword-position-checker',
    category: 'keyword',
    shortDesc: 'Check domain ranking positions on Google search results for target keywords.',
    fullDesc: 'Track where your website ranks on Google search engine results pages (SERPs) for specific keywords without manual searching.',
    iconName: 'TrendingUp',
    howToUseSteps: [
      'Enter your Website URL.',
      'Enter target keywords (one per line).',
      'Click "Check Position" to view estimated ranking positions.'
    ],
    whyUseFeatures: [
      { title: 'SERP Simulation', desc: 'Inspect search rankings across top 50 result positions.' }
    ],
    faqs: [
      { question: 'Does location affect ranking position?', answer: 'Yes, search rankings vary slightly by geographical region and device.' }
    ]
  },

  // --- Category: Meta Tags & On-Page SEO ---
  {
    id: 'meta-tag-generator',
    name: 'Meta Tag Generator',
    slug: 'meta-tag-generator',
    category: 'meta',
    shortDesc: 'Generate SEO Meta Title, Description, Keywords, Robots, and Social Open Graph tags.',
    fullDesc: 'Create search engine compliant meta tags to improve organic click-through rates (CTR) and ensure proper social sharing previews.',
    iconName: 'FileCode',
    isPopular: true,
    howToUseSteps: [
      'Fill in Site Title, Page Description, Target Keywords, and Author.',
      'Select Robots directives (Index/NoIndex, Follow/NoFollow).',
      'Click "Generate Meta Tags".',
      'Copy generated HTML code directly into your website <head> tag.'
    ],
    whyUseFeatures: [
      { title: 'Google SERP Snippet Preview', desc: 'See how your meta title and description will look on Google desktop & mobile screens.' }
    ],
    faqs: [
      { question: 'What is the optimal Meta Title length?', answer: 'Recommended Meta Title length is between 50 to 60 characters (approx. 580 pixels).' }
    ]
  },
  {
    id: 'meta-tags-analyzer',
    name: 'Meta Tags Analyzer',
    slug: 'meta-tags-analyzer',
    category: 'meta',
    shortDesc: 'Extract and analyze existing Meta tags, titles, descriptions, and Open Graph attributes.',
    fullDesc: 'Audit any web page to inspect whether its Meta tags are optimized correctly for search engines and social platforms.',
    iconName: 'Eye',
    howToUseSteps: [
      'Paste web page URL or raw HTML header code.',
      'Click "Analyze Meta Tags".',
      'Review title length, description character counts, canonical URL status, and missing tag warnings.'
    ],
    whyUseFeatures: [
      { title: 'Instant Audit', desc: 'Detect missing description tags or titles exceeding character limits.' }
    ],
    faqs: [
      { question: 'Why does Google rewrite my meta description?', answer: 'Google rewrites descriptions if they are missing, too short, repetitive, or irrelevant to the user search query.' }
    ]
  },
  {
    id: 'open-graph-generator',
    name: 'Open Graph Generator',
    slug: 'open-graph-generator',
    category: 'meta',
    shortDesc: 'Generate Facebook, LinkedIn, and Twitter Card social meta tags with interactive live preview.',
    fullDesc: 'Control how your website links appear when shared on Facebook, LinkedIn, Twitter/X, and messaging apps with high-converting Open Graph markup.',
    iconName: 'Share2',
    isPopular: true,
    howToUseSteps: [
      'Enter Article Title, Site Name, Description, and Feature Image URL.',
      'Preview real-time social card rendering for Facebook and Twitter.',
      'Copy `<meta property="og:...">` tags to your site.'
    ],
    whyUseFeatures: [
      { title: 'Realtime Visual Card Preview', desc: 'Verify image dimensions and snippet appearance before publishing.' }
    ],
    faqs: [
      { question: 'What image size is recommended for og:image?', answer: 'Use 1200 x 630 pixels for crisp high-resolution cards across all platforms.' }
    ]
  },
  {
    id: 'schema-markup-generator',
    name: 'Schema Markup Generator',
    slug: 'schema-markup-generator',
    category: 'meta',
    shortDesc: 'Create structured JSON-LD Schema markup for Articles, FAQs, Organizations, and Products.',
    fullDesc: 'Help search engines understand your content and qualify for rich snippets on Google search results pages using valid JSON-LD schema.',
    iconName: 'Layers',
    isPopular: true,
    isAiPowered: true,
    howToUseSteps: [
      'Select Schema Type (FAQPage, Article, Organization, Product, LocalBusiness).',
      'Fill in schema details and question/answer fields.',
      'Click "Generate JSON-LD Schema".',
      'Copy the script tag into your HTML code.'
    ],
    whyUseFeatures: [
      { title: '100% Valid JSON-LD', desc: 'Meets Google Schema.org structured data guidelines.' }
    ],
    faqs: [
      { question: 'Where should I place Schema markup in my code?', answer: 'Place the generated `<script type="application/ld+json">` inside the `<head>` or `<body>` tag.' }
    ]
  },
  {
    id: 'robots-txt-generator',
    name: 'Robots.txt Generator',
    slug: 'robots-txt-generator',
    category: 'meta',
    shortDesc: 'Create custom robots.txt files to manage search engine crawler access and sitemaps.',
    fullDesc: 'Direct Googlebot and Bingbot on which areas of your website to crawl or disallow with a properly configured robots.txt file.',
    iconName: 'Bot',
    howToUseSteps: [
      'Set default rule for all User-Agents (Allow or Refuse).',
      'Specify crawl delay and disallow directory paths (e.g. /admin/, /wp-admin/).',
      'Provide your XML Sitemap URL.',
      'Click "Generate Robots.txt" and download the file.'
    ],
    whyUseFeatures: [
      { title: 'Prevent Indexing Admin Paths', desc: 'Protect private directories from cluttering search results.' }
    ],
    faqs: [
      { question: 'Where must robots.txt be uploaded?', answer: 'Upload the robots.txt file to the root directory of your domain (e.g. yoursite.com/robots.txt).' }
    ]
  },
  {
    id: 'xml-sitemap-generator',
    name: 'XML Sitemap Generator',
    slug: 'xml-sitemap-generator',
    category: 'meta',
    shortDesc: 'Generate valid sitemap.xml files to ensure fast indexing of all website pages.',
    fullDesc: 'Create a clean, well-formatted XML sitemap containing all your website URLs, change frequency, and priority parameters for Google Search Console.',
    iconName: 'Network',
    isPopular: true,
    howToUseSteps: [
      'Paste your domain URL or list of page URLs.',
      'Set default Change Frequency (Daily, Weekly, Monthly) and Priority (0.1 to 1.0).',
      'Click "Generate XML Sitemap".',
      'Copy XML code or download as `sitemap.xml`.'
    ],
    whyUseFeatures: [
      { title: 'Google Search Console Ready', desc: 'Validates structure according to standard sitemaps.org protocol.' }
    ],
    faqs: [
      { question: 'How do I submit my sitemap to Google?', answer: 'Log into Google Search Console, navigate to Sitemaps, enter your sitemap URL (e.g., sitemap.xml), and click Submit.' }
    ]
  },

  // --- Category: Website Performance & IP ---
  {
    id: 'what-is-my-ip',
    name: 'What Is My IP Address',
    slug: 'what-is-my-ip',
    category: 'website',
    shortDesc: 'View your public IPv4/IPv6 address, ISP, User-Agent, screen resolution, and browser headers.',
    fullDesc: 'Detect your public network connection metrics instantly, including client IP address, operating system details, browser version, and header parameters.',
    iconName: 'Compass',
    isPopular: true,
    howToUseSteps: [
      'Open the tool to view your detected network information automatically.',
      'Copy your public IP or User-Agent string with one click.'
    ],
    whyUseFeatures: [
      { title: 'Complete Network Overview', desc: 'Displays IP, ISP, country, browser, screen dimensions, and HTTP headers.' }
    ],
    faqs: [
      { question: 'Is my IP address saved on AI TOOLZ MART?', answer: 'No, IP information is queried on-demand and never stored in server databases.' }
    ]
  },
  {
    id: 'domain-authority-checker',
    name: 'Domain Authority (DA) Checker',
    slug: 'domain-authority-checker',
    category: 'website',
    shortDesc: 'Check domain authority score, page authority, Moz rank, and spam score estimates.',
    fullDesc: 'Evaluate website authority metrics and domain strength to gauge ranking potential and SEO competition.',
    iconName: 'Award',
    isPopular: true,
    howToUseSteps: [
      'Enter target website URL.',
      'Click "Check Domain Authority".',
      'View calculated DA Score (1-100), PA Score, Spam Score %, and indexed links.'
    ],
    whyUseFeatures: [
      { title: 'Comprehensive Authority Metrics', desc: 'Analyzes DA, PA, Spam Score, and domain age.' }
    ],
    faqs: [
      { question: 'What is a good Domain Authority score?', answer: 'Scores above 40 are considered good, while scores over 60 represent high authority authority domains.' }
    ]
  },
  {
    id: 'page-speed-checker',
    name: 'Page Speed Checker',
    slug: 'page-speed-checker',
    category: 'website',
    shortDesc: 'Analyze web page loading speed, performance score, LCP, and optimization advice.',
    fullDesc: 'Test website loading performance and Core Web Vitals to improve user experience and SEO rankings.',
    iconName: 'Zap',
    howToUseSteps: [
      'Enter target web page URL.',
      'Click "Analyze Speed".',
      'View overall Performance Score, TTFB (Time to First Byte), and recommended speed optimizations.'
    ],
    whyUseFeatures: [
      { title: 'Core Web Vitals Indicators', desc: 'Pinpoint page weight, DOM load times, and image compression opportunities.' }
    ],
    faqs: [
      { question: 'Why is page speed important for SEO?', answer: 'Google uses page speed and Core Web Vitals as direct ranking signals for desktop and mobile search results.' }
    ]
  },
  {
    id: 'http-headers-checker',
    name: 'HTTP Headers Checker',
    slug: 'http-headers-checker',
    category: 'website',
    shortDesc: 'Inspect HTTP response status codes (200, 301, 404), redirect paths, and security headers.',
    fullDesc: 'Audit web server HTTP response headers to troubleshoot 301 redirects, server caching, Content Security Policies (CSP), and SSL headers.',
    iconName: 'Server',
    howToUseSteps: [
      'Enter website URL.',
      'Click "Inspect HTTP Headers".',
      'View status code, content-type, server software, cache controls, and redirect history.'
    ],
    whyUseFeatures: [
      { title: 'Detect Redirect Loops', desc: 'Examine complete redirect chains from HTTP to HTTPS or old URLs.' }
    ],
    faqs: [
      { question: 'What status code indicates a healthy URL?', answer: 'A 200 OK status code means the page loaded successfully.' }
    ]
  },

  // --- Category: Backlink & Link Analysis ---
  {
    id: 'backlink-checker',
    name: 'Backlink Checker',
    slug: 'backlink-checker',
    category: 'backlink',
    shortDesc: 'Check referring domains, dofollow vs nofollow backlink ratio, and top anchor phrases.',
    fullDesc: 'Analyze website backlink profiles to uncover link building opportunities, competitor link sources, and domain link equity.',
    iconName: 'Link2',
    isPopular: true,
    howToUseSteps: [
      'Enter target domain or URL.',
      'Click "Check Backlinks".',
      'Inspect total estimated backlinks, dofollow/nofollow breakdown, and top anchor texts.'
    ],
    whyUseFeatures: [
      { title: 'Dofollow Ratio Breakdown', desc: 'Ensure a natural link profile with balanced follow link distribution.' }
    ],
    faqs: [
      { question: 'What is a dofollow backlink?', answer: 'A dofollow link passes search engine link equity (PageRank) from the referring site to your domain.' }
    ]
  },
  {
    id: 'broken-links-finder',
    name: 'Broken Links Finder',
    slug: 'broken-links-finder',
    category: 'backlink',
    shortDesc: 'Scan web page text or link list to identify dead, 404, or unreachable URLs.',
    fullDesc: 'Fix broken links on your website to protect user experience and prevent SEO crawl budget waste.',
    iconName: 'Unlink',
    howToUseSteps: [
      'Paste HTML content or list of links.',
      'Click "Find Broken Links".',
      'Review status of each link (200 OK vs 404 Not Found / Timeout).'
    ],
    whyUseFeatures: [
      { title: 'Protect User Experience', desc: 'Identify dead links before your site visitors encounter 404 pages.' }
    ],
    faqs: [
      { question: 'Do broken links hurt SEO?', answer: 'Yes, excessive broken links signal poor site maintenance and waste crawler budget.' }
    ]
  },

  // --- Category: Image & Visual Utilities ---
  {
    id: 'qr-code-generator',
    name: 'QR Code Generator',
    slug: 'qr-code-generator',
    category: 'image',
    shortDesc: 'Generate custom downloadable QR codes for URLs, WiFi, Contact VCards, and text.',
    fullDesc: 'Create high-resolution downloadable QR codes (PNG/SVG) with custom foreground and background colors.',
    iconName: 'QrCode',
    isPopular: true,
    howToUseSteps: [
      'Select QR Code type (Website URL, Plain Text, WiFi Network, or Contact VCard).',
      'Enter details and customize colors.',
      'Click "Generate QR Code".',
      'Download as PNG image.'
    ],
    whyUseFeatures: [
      { title: 'Custom Colors & Sizes', desc: 'Adjust canvas resolution and color themes for print or digital media.' }
    ],
    faqs: [
      { question: 'Do these QR codes expire?', answer: 'No! Static QR codes generated here never expire and remain functional indefinitely.' }
    ]
  },
  {
    id: 'image-compressor',
    name: 'Image Compressor & Resizer',
    slug: 'image-compressor',
    category: 'image',
    shortDesc: 'Compress and resize JPG, PNG, and WebP images locally without quality loss.',
    fullDesc: 'Shrink image file sizes by up to 80% directly in your browser to boost page loading speed and pass Web Vitals tests.',
    iconName: 'Minimize2',
    isPopular: true,
    howToUseSteps: [
      'Upload image file (JPG, PNG, WebP).',
      'Adjust compression slider and target dimensions.',
      'Click "Compress Image".',
      'Download optimized image file.'
    ],
    whyUseFeatures: [
      { title: '100% Local Privacy', desc: 'Images are processed inside your browser without uploading to external servers.' }
    ],
    faqs: [
      { question: 'What file formats are supported?', answer: 'Supports JPG, JPEG, PNG, and WebP image formats.' }
    ]
  },

  // --- Category: Developer & Code Utilities ---
  {
    id: 'html-minifier',
    name: 'HTML Minifier & Formatter',
    slug: 'html-minifier',
    category: 'developer',
    shortDesc: 'Minify HTML markup to compress file size, or beautify code with clean indentation.',
    fullDesc: 'Remove unnecessary whitespaces, comments, and line breaks from HTML code to improve web server response speed.',
    iconName: 'Code2',
    howToUseSteps: [
      'Paste raw HTML markup into the editor.',
      'Choose "Minify HTML" to compress or "Beautify HTML" to format.',
      'Copy transformed output to clipboard.'
    ],
    whyUseFeatures: [
      { title: 'Instant Compression', desc: 'Reduces HTML document byte sizes significantly.' }
    ],
    faqs: [
      { question: 'Does minification break JavaScript tags inside HTML?', answer: 'No, valid HTML minification strips only redundant whitespace outside code strings.' }
    ]
  },
  {
    id: 'json-validator-formatter',
    name: 'JSON Formatter & Validator',
    slug: 'json-validator-formatter',
    category: 'developer',
    shortDesc: 'Validate syntax, beautify indented JSON data, or minify JSON objects.',
    fullDesc: 'Format raw unindented JSON strings into readable structured trees and catch syntax errors instantly.',
    iconName: 'FileJson',
    isPopular: true,
    howToUseSteps: [
      'Paste raw JSON code.',
      'Click "Format JSON" or "Minify JSON".',
      'Inspect syntax validation errors or copy clean output.'
    ],
    whyUseFeatures: [
      { title: 'Syntax Error Detection', desc: 'Highlights precise line numbers for missing quotes or misplaced trailing commas.' }
    ],
    faqs: [
      { question: 'Is my JSON data kept private?', answer: 'Yes, formatting is calculated locally in your browser session.' }
    ]
  },
  {
    id: 'hash-generator',
    name: 'MD5 / SHA-256 Hash Generator',
    slug: 'hash-generator',
    category: 'developer',
    shortDesc: 'Generate cryptographic MD5, SHA-1, SHA-256, and SHA-512 hashes from input text.',
    fullDesc: 'Compute secure cryptographic checksums for data integrity verification, password hashing tests, and string security.',
    iconName: 'KeyRound',
    howToUseSteps: [
      'Enter text or string.',
      'View generated MD5, SHA-1, SHA-256, and SHA-512 hashes simultaneously.',
      'Copy target hash with one click.'
    ],
    whyUseFeatures: [
      { title: 'Multi-Algorithm Hashes', desc: 'Displays MD5, SHA-1, SHA-256, and SHA-512 outputs instantly.' }
    ],
    faqs: [
      { question: 'Can an MD5 hash be reversed?', answer: 'Hashes are one-way cryptographic functions and cannot be mathematically reversed directly.' }
    ]
  },
  {
    id: 'base64-encoder-decoder',
    name: 'Base64 Encoder / Decoder',
    slug: 'base64-encoder-decoder',
    category: 'developer',
    shortDesc: 'Encode plain text or binary strings into Base64 format, or decode Base64 strings.',
    fullDesc: 'Convert plain text strings or code data into Base64 encoded format for API payloads and data URIs, or decode Base64 back into readable text.',
    iconName: 'Binary',
    howToUseSteps: [
      'Enter text in input box.',
      'Click "Encode to Base64" or "Decode from Base64".',
      'Copy result.'
    ],
    whyUseFeatures: [
      { title: 'UTF-8 String Compatibility', desc: 'Supports special characters and multi-language UTF-8 strings.' }
    ],
    faqs: [
      { question: 'What is Base64 encoding used for?', answer: 'Base64 is used to encode binary data into ASCII text for safe transmission over text-based protocols like HTTP or Email.' }
    ]
  },

  // --- Category: URL & Utility Tools ---
  {
    id: 'slug-generator',
    name: 'URL Slug Generator',
    slug: 'slug-generator',
    category: 'utility',
    shortDesc: 'Convert article titles into clean, SEO-friendly, lowercase URL slugs.',
    fullDesc: 'Transform headline titles with special characters or spaces into clean URL permalinks (e.g. "My SEO Title! #2026" -> "my-seo-title-2026").',
    iconName: 'Link',
    howToUseSteps: [
      'Enter headline title or sentence.',
      'Watch real-time slug creation with hyphen separators.',
      'Copy clean slug.'
    ],
    whyUseFeatures: [
      { title: 'SEO Permalink Standards', desc: 'Removes accents, punctuation, and uppercase characters.' }
    ],
    faqs: [
      { question: 'Are hyphens better than underscores in URL slugs?', answer: 'Yes, Google recommends hyphens (-) over underscores (_) as word separators in URLs.' }
    ]
  },
  {
    id: 'lorem-ipsum-generator',
    name: 'Lorem Ipsum Generator',
    slug: 'lorem-ipsum-generator',
    category: 'utility',
    shortDesc: 'Generate custom placeholder paragraphs, words, or lists for web design mockups.',
    fullDesc: 'Create customizable dummy text for website wireframes, design mockups, and layout testing.',
    iconName: 'AlignLeft',
    howToUseSteps: [
      'Select count (number of Paragraphs, Words, or List items).',
      'Click "Generate Text".',
      'Copy placeholder text.'
    ],
    whyUseFeatures: [
      { title: 'Classic & Modern Variations', desc: 'Choose standard Latin Cicero passage or modern tech dummy text.' }
    ],
    faqs: [
      { question: 'Why is Lorem Ipsum used in web design?', answer: 'It provides neutral character distribution so reviewers focus on layout aesthetics rather than readable content.' }
    ]
  }
];
