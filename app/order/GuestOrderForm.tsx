'use client';

import { useMemo, useState } from 'react';
import { createGuestOrder } from '@/app/dashboard/orders/actions';
import { useFormStatus } from 'react-dom';

type Package = { id:string; name:string; price:number; productId:string; productName:string };
type Product = { id:string; name:string; packages:Package[] };
type OrderItem = { productId:string; packageId:string; productName:string; packageName:string; price:number; quantity:number };

function SubmitButton(){
 const {pending}=useFormStatus();
 return <button className="adminPrimaryBtn orderSubmitBtn" disabled={pending} type="submit">{pending?'Submitting order...':'Submit order →'}</button>;
}

export default function GuestOrderForm({products}:{products:Product[]}){
 const [identifierType,setIdentifierType]=useState('in_game_id');
 const [items,setItems]=useState<OrderItem[]>([]);
 const [paymentMethod,setPaymentMethod]=useState('kpay');
 const [selectedProduct,setSelectedProduct]=useState('');
 const [selectedPackage,setSelectedPackage]=useState('');

 const selectedPackages = products.find(p=>p.id===selectedProduct)?.packages ?? [];
 const total=useMemo(()=>items.reduce((s,i)=>s+i.price*i.quantity,0),[items]);

 const addItem=()=>{
   const product=products.find(p=>p.id===selectedProduct);
   const pkg=product?.packages.find(p=>p.id===selectedPackage);
   if(!product || !pkg) return;
   setItems([...items,{productId:product.id,packageId:pkg.id,productName:product.name,packageName:pkg.name,price:pkg.price,quantity:1}]);
   setSelectedPackage('');
 };

 const removeItem=(index:number)=>setItems(items.filter((_,i)=>i!==index));

 return <form action={createGuestOrder} className="orderBuilder guestOrderBuilder" encType="multipart/form-data">
 <div className="orderBuilderTop"><div><span className="miniLabel">NEW CUSTOMER ORDER</span><h2>Create your order</h2><p>Choose your products, review the B2C total, then complete payment.</p></div><div className="invoiceBrandMark">JBE</div></div>

 <section className="orderStep">
  <div className="orderStepHead"><b>01</b><div><span>Customer / game details</span><small>Enter the details used to deliver your order.</small></div></div>
  <div className="orderMetaGrid">
   <label>Customer type<select name="identifier_type" value={identifierType} onChange={e=>setIdentifierType(e.target.value)}><option value="in_game_id">In-game ID</option><option value="email">Email</option></select></label>
   <label>{identifierType==='email'?'Email':'In-game ID'}<input name="customer_identifier" required placeholder={identifierType==='email'?'you@example.com':'Enter your game ID'} /></label>
   <label className="orderFullField">{identifierType==='email'?'Client name':'In-game name'}<input name="customer_name" required placeholder={identifierType==='email'?'Customer name':'Enter your in-game name'} /></label>
  </div>
 </section>

 <section className="orderStep">
  <div className="orderStepHead"><b>02</b><div><span>Products & packages</span><small>Select a product first, then choose its package.</small></div></div>
  <div className="orderSelectGrid">
   <label>Product<select value={selectedProduct} onChange={e=>{setSelectedProduct(e.target.value);setSelectedPackage('')}}><option value="">Select product</option>{products.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select></label>
   <label>Package<select value={selectedPackage} disabled={!selectedProduct} onChange={e=>setSelectedPackage(e.target.value)}><option value="">{selectedProduct?'Select package':'Select a product first'}</option>{selectedPackages.map(p=><option key={p.id} value={p.id}>{p.name} · {p.price.toLocaleString()} Ks</option>)}</select></label>
  </div>
  <div className="guestPackageActions"><button type="button" className="invoiceAddBtn" disabled={!selectedProduct || !selectedPackage} onClick={addItem}>+ Add package</button><span>{items.length} package{items.length===1?'':'s'} selected</span></div>
  {items.length>0 ? <div className="orderItems">{items.map((i,n)=><div className="orderItemRow" key={i.packageId + '-' + n}><div><span>Product</span><strong>{i.productName}</strong></div><div><span>Package</span><strong>{i.packageName}</strong></div><div><span>Qty</span><span className="guestQty">1</span></div><div><span>Total</span><strong>{(i.price*i.quantity).toLocaleString()} Ks</strong></div><button type="button" className="invoiceRemoveBtn" onClick={()=>removeItem(n)} aria-label={'Remove ' + i.packageName}>Remove</button></div>)}</div> : <div className="guestEmptyPackages"><strong>No packages added yet.</strong><span>Select a product and package above, then click Add package.</span></div>}
  <input type="hidden" name="items" value={JSON.stringify(items.map(i=>({product_id:i.productId,package_id:i.packageId,quantity:i.quantity})))} />
  <div className="invoiceTotal"><span>Total B2C amount</span><strong>{total.toLocaleString()} Ks</strong></div>
 </section>

 <section className="orderStep">
  <div className="orderStepHead"><b>03</b><div><span>Payment</span><small>Use the same payment method shown for your order total.</small></div></div>
  <div className="orderPaymentGrid"><label>Payment method<select name="payment_method" value={paymentMethod} onChange={e=>setPaymentMethod(e.target.value)}><option value="kpay">KPay</option><option value="aya_pay">AYA Pay</option></select></label><label>Transaction last 6 digits<input name="transaction_last6" inputMode="numeric" pattern="[0-9]{6}" maxLength={6} placeholder="000000" required /></label><label className="orderFullField">Transaction screenshot<input name="screenshot" type="file" accept="image/jpeg,image/png,image/webp" required /></label></div>
 </section>

 <SubmitButton />
 </form>;
}
