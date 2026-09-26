import Link from 'next/link';
import { getCatalog } from '@/lib/catalog';
import GuestOrderForm from './GuestOrderForm';

export default async function GuestOrderPage(){
 const catalog=await getCatalog();
 const products=catalog.filter((p:any)=>!p.slug.includes('outline')).map((p:any)=>({id:p.id,name:p.name,packages:p.packages.map((x:any)=>({id:x.id,name:x.name,productId:p.id,productName:p.name,price:Number(x.b2c_price)}))}));
 return <main className="adminPage"><div className="adminWrap"><section className="adminHero"><div><span className="miniLabel">CUSTOMER ORDER</span><h1>Place your order.</h1><p>Choose multiple packages at B2C pricing, then submit payment proof for processing.</p></div><Link href="/" className="backBtn">← Home</Link></section><GuestOrderForm products={products}/></div></main>;
}
