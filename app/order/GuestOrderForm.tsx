'use client';

import { useMemo, useState } from 'react';
import { createGuestOrder } from '@/app/dashboard/orders/actions';
import { useFormStatus } from 'react-dom';

type Package = { id:string; name:string; price:number; productId:string; productName:string };
type Product = { id:string; name:string; packages:Package[] };

function SubmitButton(){
 const {pending}=useFormStatus();
 return <button className="adminPrimaryBtn orderSubmitBtn" disabled={pending} type="submit">{pending?'Submitting order...':'Submit order →'}</button>;
}

export default function GuestOrderForm({products}:{products:Product[]}){
 const [identifierType,setIdentifierType]=useState('in_game_id');
 const [items,setItems]=useState<any[]>([]);
 const [paymentMethod,setPaymentMethod]=useState('kpay');
 const total=useMemo(()=>items.reduce((s,i)=>s+i.price*i.quantity,0),[items]);
 const addItem=()=>{const p=products.find(x=>x.packages.length); const pkg=p?.packages[0]; if(p&&pkg)setItems([...items,{productId:p.id,packageId:pkg.id,productName:p.name,packageName:pkg.name,price:pkg.price,quantity:1}]);};
 return <form action={createGuestOrder} className="orderBuilder" encType="multipart/form-data">
 <div className="orderBuilderTop"><div><span className="miniLabel">NEW CUSTOMER ORDER</span><h2>Create your order</h2><p>Order with B2C pricing without reseller login.</p></div><div className="invoiceBrandMark">JBE</div></div>
 <section className="orderStep"><div className="orderStepHead"><b>01</b><span>Customer / game details</span></div><div className="orderMetaGrid">
 <label>Customer type<select name="identifier_type" value={identifierType} onChange={e=>setIdentifierType(e.target.value)}><option value="in_game_id">In-game ID</option><option value="email">Email</option></select></label>
 <label>{identifierType==='email'?'Email':'In-game ID'}<input name="customer_identifier" required /></label>
 <label className="orderFullField">{identifierType==='email'?'Client name':'In-game name'}<input name="customer_name" required /></label>
 </div></section>
 <section className="orderStep"><div className="orderStepHead"><b>02</b><span>Products & packages</span><button type="button" className="invoiceAddBtn" onClick={addItem}>+ Add package</button></div>
 <div className="orderItems">{items.map((i,n)=><div className="orderItemRow" key={n}><div><span>Product</span><strong>{i.productName}</strong></div><div><span>Package</span><strong>{i.packageName}</strong></div><div><span>Qty</span><input name="quantity" value={i.quantity} readOnly /></div><div><span>Total</span><strong>{(i.price*i.quantity).toLocaleString()} Ks</strong></div></div>)}</div>
 <input type="hidden" name="items" value={JSON.stringify(items.map(i=>({product_id:i.productId,package_id:i.packageId,quantity:i.quantity})))} /><div className="invoiceTotal"><span>Total B2C amount</span><strong>{total.toLocaleString()} Ks</strong></div></section>
 <section className="orderStep"><div className="orderStepHead"><b>03</b><span>Payment</span></div><div className="orderPaymentGrid"><label>Payment method<select name="payment_method" value={paymentMethod} onChange={e=>setPaymentMethod(e.target.value)}><option value="kpay">KPay</option><option value="aya_pay">AYA Pay</option></select></label><label>Transaction last 6 digits<input name="transaction_last6" maxLength={6} required /></label><label className="orderFullField">Transaction screenshot<input name="screenshot" type="file" accept="image/jpeg,image/png,image/webp" required /></label></div></section>
 <SubmitButton />
 </form>;
}
