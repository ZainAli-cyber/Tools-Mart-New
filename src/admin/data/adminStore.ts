// ── Admin data store — pure localStorage ──────────────────────────────────
// To connect Supabase: replace read/write functions with Supabase queries.

export interface Order { id:string; invoiceNo:string; orderDate:string; customerName:string; customerEmail:string; customerPhone:string; customerCity:string; whatsapp:string; tool:string; duration:number; amount:number; discount:number; finalAmount:number; status:string; paymentMethod:string; paymentStatus:string; transactionId:string; notes:string; adminNotes:string; subStatus:string; activationDate:string; expiryDate:string; daysLeft:number; screenshot:string|null; }
export interface Customer { id:string; name:string; email:string; phone:string; country:string; city:string; totalOrders:number; totalSpend:number; joinDate:string; status:string; tools:string[]; notes:string; }
export type ToolAccessMethod = 'extension' | 'one_click';
export interface Tool { id:string; name:string; category:string; rating:number; price:number; originalPrice:number; discount:number; favicon:string; desc:string; fullDesc?:string; features?:string[]; useCases?:string[]; faqs?:{q:string;a:string}[]; waText?:string; isPrivate?:boolean; isSemiPrivate?:boolean; badge?:string; showOnHome?:boolean; accessMethod?:ToolAccessMethod; toolUrl?:string; cookiesJson?:string; panelReferrer?:string; }
export interface Coupon { id:string; code:string; type:string; value:number; usageLimit:number; usedCount:number; expiry:string; active:boolean; minPurchase:number; }
export interface Ticket { id:string; customerName:string; customerEmail:string; subject:string; message:string; status:string; priority:string; createdAt:string; replies:{from:string;message:string;time:string}[]; }
export interface Notification { id:string; type:string; title:string; message:string; time:string; read:boolean; }
export interface Settings { siteName:string; contactEmail:string; whatsapp:string; currency:string; invoicePrefix:string; taxPercent:string; maintenanceMode:boolean; easypaisa:string; jazzcash:string; paypalEmail:string; bankName:string; bankAccount:string; }
export interface Banner { id:string; imageUrl:string; link:string; active:boolean; order:number; }

const SEED_TOOLS: Tool[] = [
  { id:'semrush', name:'Semrush', category:'SEO', rating:4.9, price:556, originalPrice:2780, discount:80, favicon:'https://www.google.com/s2/favicons?sz=128&domain=semrush.com', desc:'All-in-one SEO platform for keyword research, competitor analysis, backlink auditing & rank tracking.', fullDesc:"Semrush is the world's leading SEO and digital marketing platform trusted by 10M+ professionals.", features:['Keyword Research (20B+ keywords)','Competitor traffic analysis','Backlink audit & building','Site health audit','Rank tracking','Content marketing toolkit'], useCases:['SEO professionals','Digital marketing agencies','Content marketers','Bloggers'], faqs:[{q:'Which plan?',a:'Guru-level access with full features.'},{q:'Competitor analysis?',a:'Yes, fully included.'}], waText:'Semrush', badge:'Best Seller' },
  { id:'canva-pro', name:'Canva Pro', category:'Design', rating:4.9, price:556, originalPrice:2780, discount:80, favicon:'https://www.google.com/s2/favicons?sz=128&domain=canva.com', desc:"The world's most popular design platform — Magic AI, brand kit & premium templates.", fullDesc:'Canva Pro is used by 170M+ people worldwide with Magic AI tools and 100M+ assets.', features:['Magic AI design tools','Brand kit & logo upload','Background remover','100M+ premium assets','610,000+ templates','Unlimited storage'], useCases:['Social media managers','Marketing teams','Small businesses','Freelance designers'], faqs:[{q:'Canva Free vs Pro?',a:'Pro unlocks Magic AI, background remover and premium templates.'},{q:'Commercial use?',a:'Yes, all Pro designs can be used commercially.'}], waText:'Canva Pro', badge:'Popular' },
  { id:'envato-elements', name:'Envato Elements', category:'Design', rating:4.9, price:556, originalPrice:2780, discount:80, favicon:'https://www.google.com/s2/favicons?sz=128&domain=envato.com', desc:'Unlimited downloads of 16M+ creative assets — templates, fonts, photos, video, audio & more.', features:['16M+ creative assets','Unlimited downloads','Website themes','Stock photos & videos','Fonts & graphics','Commercial license'], useCases:['Graphic designers','Web developers','Content creators','Video producers'], faqs:[{q:'Is this genuine?',a:'Yes, 100% verified group buy access.'},{q:'How fast?',a:'Within 5 minutes of payment.'}], waText:'Envato Elements' },
  { id:'chatgpt-plus', name:'ChatGPT Plus', category:'AI', rating:4.9, price:1668, originalPrice:8340, discount:80, favicon:'https://www.google.com/s2/favicons?sz=128&domain=openai.com', desc:'GPT-4o, image generation, custom GPTs & code interpreter — semi-private seat.', features:['GPT-4o access','DALL·E 3 image generation','Advanced Data Analysis','Custom GPTs','Code Interpreter','Priority access'], useCases:['Content writers','Developers','Data analysts','Researchers'], faqs:[{q:'Semi-private?',a:'2-3 users share the seat for near-private speed.'},{q:'GPT-4o included?',a:'Yes, fully accessible.'}], waText:'ChatGPT Plus', isSemiPrivate:true, badge:'Trending' },
  { id:'capcut-pro', name:'CapCut Pro', category:'Video', rating:4.9, price:1390, originalPrice:6950, discount:80, favicon:'https://www.google.com/s2/favicons?sz=128&domain=capcut.com', desc:'AI-powered video editor — effects, captions, background removal.', features:['AI video effects','Auto-captions','Background removal','Commercial music','Text-to-video AI','No watermark'], useCases:['TikTok creators','YouTubers','Social media managers'], faqs:[{q:'Pro vs Free?',a:'Pro unlocks commercial music, AI effects, removes watermarks.'},{q:'Desktop?',a:'Yes, Windows and Mac.'}], waText:'CapCut Pro', isPrivate:true },
  { id:'udemy', name:'Udemy', category:'Learning', rating:4.9, price:556, originalPrice:2780, discount:80, favicon:'https://www.google.com/s2/favicons?sz=128&domain=udemy.com', desc:'Access 200,000+ online courses on tech, business, design & more.', features:['200,000+ courses','Lifetime access','Certificate of completion','Mobile & offline','Multiple languages'], useCases:['Students','Developers','Designers','Marketers'], faqs:[{q:'Which courses?',a:'Top-rated premium courses across all topics.'},{q:'Valid certificate?',a:'Yes, recognized by employers.'}], waText:'Udemy' },
];

const DEFAULT_SETTINGS: Settings = {
  siteName:'AI TOOLZ MART', contactEmail:'emaan@aitoolsmart.com', whatsapp:'+923275855578',
  currency:'PKR', invoicePrefix:'INV', taxPercent:'0', maintenanceMode:false,
  easypaisa:'03XX-XXXXXXX', jazzcash:'03XX-XXXXXXX', paypalEmail:'payments@aitoolzmart.com',
  bankName:'Meezan Bank', bankAccount:'0123456789',
};

// ── localStorage helpers ───────────────────────────────────────────────────
function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem('atm_' + key);
    return raw ? JSON.parse(raw) : fallback;
  } catch { return fallback; }
}
function write<T>(key: string, data: T): void {
  try { localStorage.setItem('atm_' + key, JSON.stringify(data)); } catch {}
}

// ── Seed only tools + settings on first run ────────────────────────────────
function ensureSeed() {
  // Version bump clears old sample data on existing installs
  if (localStorage.getItem('atm_seeded') !== '2') {
    // Clear old keys first
    ['atm_orders','atm_customers','atm_coupons','atm_tickets','atm_notifications','atm_activity'].forEach(k => localStorage.removeItem(k));
    write('tools', SEED_TOOLS);
    write('settings', DEFAULT_SETTINGS);
    write('orders', []);
    write('customers', []);
    write('coupons', []);
    write('tickets', []);
    write('notifications', []);
    write('activity', []);
    write('banners', []);
    localStorage.setItem('atm_seeded', '2');
  }
}
ensureSeed();

// ── Public API ─────────────────────────────────────────────────────────────
export const db = {
  // Tools
  getTools:  (): Tool[]  => read('tools', SEED_TOOLS),
  saveTools: (v: Tool[]) => write('tools', v),
  saveTool(tool: Tool) {
    const all = this.getTools();
    const i = all.findIndex(t => t.id === tool.id);
    const prev = i >= 0 ? all[i] : undefined;
    const merged: Tool = {
      ...tool,
      showOnHome: tool.showOnHome !== false,
      accessMethod: tool.accessMethod ?? prev?.accessMethod,
      toolUrl: tool.toolUrl ?? prev?.toolUrl,
      cookiesJson: tool.cookiesJson ?? prev?.cookiesJson,
      panelReferrer: tool.panelReferrer ?? prev?.panelReferrer,
    };
    i >= 0 ? all.splice(i, 1, merged) : all.push(merged);
    this.saveTools(all);
  },
  deleteTool(id: string) { this.saveTools(this.getTools().filter(t => t.id !== id)); },

  // Orders — empty by default
  getOrders:  (): Order[]  => read('orders', []),
  saveOrders: (v: Order[]) => write('orders', v),
  updateOrder(id: string, patch: Partial<Order>) {
    const all = this.getOrders();
    const i = all.findIndex(o => o.id === id);
    if (i >= 0) { all[i] = { ...all[i], ...patch }; this.saveOrders(all); return all[i]; }
    return null;
  },
  addOrder(order: Order) { const all = this.getOrders(); all.unshift(order); this.saveOrders(all); },
  deleteOrder(id: string) { this.saveOrders(this.getOrders().filter(o => o.id !== id)); },

  // Customers — empty by default
  getCustomers:  (): Customer[]  => read('customers', []),
  saveCustomers: (v: Customer[]) => write('customers', v),
  updateCustomer(id: string, patch: Partial<Customer>) {
    const all = this.getCustomers();
    const i = all.findIndex(c => c.id === id);
    if (i >= 0) { all[i] = { ...all[i], ...patch }; this.saveCustomers(all); }
  },
  deleteCustomer(id: string) { this.saveCustomers(this.getCustomers().filter(c => c.id !== id)); },

  // Coupons — empty by default
  getCoupons:  (): Coupon[]  => read('coupons', []),
  saveCoupons: (v: Coupon[]) => write('coupons', v),
  addCoupon(c: Coupon) { const all = this.getCoupons(); all.unshift(c); this.saveCoupons(all); },
  updateCoupon(id: string, patch: Partial<Coupon>) {
    const all = this.getCoupons();
    const i = all.findIndex(c => c.id === id);
    if (i >= 0) { all[i] = { ...all[i], ...patch }; this.saveCoupons(all); }
  },
  deleteCoupon(id: string) { this.saveCoupons(this.getCoupons().filter(c => c.id !== id)); },

  // Tickets — empty by default
  getTickets:  (): Ticket[]  => read('tickets', []),
  saveTickets: (v: Ticket[]) => write('tickets', v),
  addTicket(t: Ticket) { const all = this.getTickets(); all.unshift(t); this.saveTickets(all); },
  updateTicket(id: string, patch: Partial<Ticket>) {
    const all = this.getTickets();
    const i = all.findIndex(t => t.id === id);
    if (i >= 0) { all[i] = { ...all[i], ...patch }; this.saveTickets(all); }
  },
  replyTicket(id: string, message: string) {
    const all = this.getTickets();
    const i = all.findIndex(t => t.id === id);
    if (i >= 0) { all[i].replies.push({ from:'admin', message, time: new Date().toISOString().slice(0,10) }); this.saveTickets(all); }
  },

  // Notifications — empty by default
  getNotifications:  (): Notification[]  => read('notifications', []),
  saveNotifications: (v: Notification[]) => write('notifications', v),
  markAllRead() { this.saveNotifications(this.getNotifications().map(n => ({...n, read:true}))); },
  markRead(id: string) {
    const all = this.getNotifications();
    const i = all.findIndex(n => n.id === id);
    if (i >= 0) { all[i].read = true; this.saveNotifications(all); }
  },
  addNotification(n: Omit<Notification,'id'>) {
    const all = this.getNotifications();
    all.unshift({ ...n, id: Date.now().toString() });
    this.saveNotifications(all.slice(0, 50));
  },

  // Settings
  getSettings:  (): Settings  => read('settings', DEFAULT_SETTINGS),
  saveSettings: (v: Settings) => write('settings', v),

  // Activity
  getActivity: (): any[] => read('activity', []),
  log(action: string, detail: string) {
    const all = this.getActivity();
    all.unshift({ id: Date.now().toString(), action, detail, time: new Date().toISOString() });
    write('activity', all.slice(0, 100));
  },
};

// Tools accessible to customer-facing pages
export function loadTools(): Tool[] { return db.getTools(); }

// Banner store
export const bannerDb = {
  get: (): Banner[] => read('banners', []),
  save: (v: Banner[]) => write('banners', v),
  add(b: Omit<Banner,'id'>) { const all=this.get(); all.push({...b,id:`BNR${Date.now()}`}); this.save(all); },
  update(id: string, patch: Partial<Banner>) {
    const all=this.get(); const i=all.findIndex(b=>b.id===id);
    if(i>=0){all[i]={...all[i],...patch};this.save(all);}
  },
  remove(id: string) { this.save(this.get().filter(b=>b.id!==id)); },
};

export function nameToId(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}
export function blankTool(): Tool {
  return { id:'', name:'', category:'SEO', rating:4.9, price:556, originalPrice:2780, discount:80, favicon:'', desc:'', fullDesc:'', features:['Feature 1','Feature 2','Feature 3','Feature 4'], useCases:['Freelancers','Agencies','Marketers'], faqs:[{q:'Is this genuine?',a:'Yes, 100% verified.'},{q:'How fast?',a:'Within 5 minutes.'}], waText:'', showOnHome:true };
}
