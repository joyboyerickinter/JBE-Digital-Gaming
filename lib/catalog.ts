import { createClient } from './supabase/client';

export type CatalogPackage = {
  id: string;
  name: string;
  b2c_price: number;
  active: boolean;
  sort_order: number;
};

export type CatalogProduct = {
  id: string;
  name: string;
  slug: string;
  icon: string | null;
  active: boolean;
  sort_order: number;
  packages: CatalogPackage[];
};

const DEMO: CatalogProduct[] = [
  { id:'demo-mlbb', name:'Mobile Legends', slug:'mlbb', icon:'M', active:true, sort_order:1, packages:[
    {id:'mlbb-1',name:'Twilight Pass',b2c_price:35100,active:true,sort_order:1},
    {id:'mlbb-2',name:'Weekly Pass',b2c_price:6300,active:true,sort_order:2},
    {id:'mlbb-3',name:'86 Diamonds',b2c_price:5100,active:true,sort_order:3},
    {id:'mlbb-4',name:'172 Diamonds',b2c_price:10200,active:true,sort_order:4},
    {id:'mlbb-5',name:'257 Diamonds',b2c_price:14900,active:true,sort_order:5},
    {id:'mlbb-6',name:'9288 Diamonds',b2c_price:509000,active:true,sort_order:6},
  ]},
  { id:'demo-pubg', name:'PUBG Mobile', slug:'pubg-mobile', icon:'P', active:true, sort_order:2, packages:[
    {id:'pubg-1',name:'60 UC',b2c_price:4500,active:true,sort_order:1},
    {id:'pubg-2',name:'325 UC',b2c_price:22000,active:true,sort_order:2},
    {id:'pubg-3',name:'660 UC',b2c_price:45000,active:true,sort_order:3},
    {id:'pubg-4',name:'8100 UC',b2c_price:440000,active:true,sort_order:4},
  ]},
  { id:'demo-magic', name:'Magic Chess', slug:'magic-chess', icon:'✦', active:true, sort_order:3, packages:[
    {id:'magic-1',name:'86 Diamonds',b2c_price:5500,active:true,sort_order:1},
    {id:'magic-2',name:'344 Diamonds',b2c_price:21600,active:true,sort_order:2},
    {id:'magic-3',name:'9288 Diamonds',b2c_price:541450,active:true,sort_order:3},
  ]},
  { id:'demo-chatgpt', name:'ChatGPT', slug:'chatgpt', icon:'AI', active:true, sort_order:4, packages:[
    {id:'chatgpt-1',name:'Plus - 1 Month (Share)',b2c_price:25000,active:true,sort_order:1},
    {id:'chatgpt-2',name:'Plus - 1 Month (Private)',b2c_price:110000,active:true,sort_order:2},
    {id:'chatgpt-3',name:'Go - 1 Month (Private)',b2c_price:32000,active:true,sort_order:3},
  ]},
  { id:'demo-canva', name:'Canva', slug:'canva', icon:'C', active:true, sort_order:5, packages:[
    {id:'canva-1',name:'Education Plan - 1 Year',b2c_price:2500,active:true,sort_order:1},
    {id:'canva-2',name:'Education Plan - Lifetime',b2c_price:6500,active:true,sort_order:2},
    {id:'canva-3',name:'Business Plan - 12 Months',b2c_price:79000,active:true,sort_order:3},
  ]},
  { id:'demo-engnovate', name:'Engnovate', slug:'engnovate', icon:'E', active:true, sort_order:6, packages:[
    {id:'eng-1',name:'Premium - 1 Month',b2c_price:60000,active:true,sort_order:1},
  ]},
  { id:'demo-outline', name:'Outline VPN', slug:'outline-vpn', icon:'VPN', active:true, sort_order:7, packages:[
    {id:'vpn-1',name:'1 Month 50 GB',b2c_price:0,active:true,sort_order:1},
    {id:'vpn-2',name:'1 Month 100 GB',b2c_price:0,active:true,sort_order:2},
    {id:'vpn-3',name:'1 Month Unlimited GB',b2c_price:0,active:true,sort_order:3},
  ]},
];

export async function getCatalog(): Promise<CatalogProduct[]> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key || url.includes('YOUR_PROJECT_REF') || key.includes('xxxxxxxx')) return DEMO;

  try {
    const supabase = createClient();
    const { data: products, error } = await supabase
      .from('products')
      .select('id,name,slug,icon,active,sort_order,packages(id,name,active,sort_order,prices!inner(price,customer_type,active))')
      .eq('active', true)
      .order('sort_order');

    if (error || !products) return DEMO;

    return (products as any[]).map((p) => ({
      ...p,
      packages: (p.packages ?? [])
        .map((x: any) => {
          const b2c = Array.isArray(x.prices)
            ? x.prices.find((price: any) => price.customer_type === 'b2c' && price.active)
            : null;
          return { id:x.id, name:x.name, active:x.active, sort_order:x.sort_order, b2c_price:Number(b2c?.price ?? 0) };
        })
        .filter((x: CatalogPackage) => x.active)
        .sort((a: CatalogPackage, b: CatalogPackage) => a.sort_order - b.sort_order),
    }));
  } catch {
    return DEMO;
  }
}

export function formatKs(value:number) {
  return value > 0 ? `${value.toLocaleString('en-US')} Ks` : 'Contact for price';
}