'use client';

import { useMemo, useState } from 'react';
import { createOrder } from './actions';
import { useFormStatus } from 'react-dom';

type Package = { id:string; name:string; price:number; productId:string; productName:string };
type Product = { id:string; name:string; packages:Package[] };

function SubmitButton() {
  const { pending } = useFormStatus();
  return <button className="adminPrimaryBtn orderSubmitBtn" disabled={pending} type="submit">{pending ? <><span className="buttonSpinner" aria-hidden="true" />Submitting order...</> : 'Submit order →'}</button>;
}

export default function OrderForm({ products }: { products:Product[] }) {
  const [identifierType,setIdentifierType] = useState('in_game_id');
  const [identifier,setIdentifier] = useState('');
  const [customerName,setCustomerName] = useState('');
  const [paymentMethod,setPaymentMethod] = useState('kpay');
  const [items,setItems] = useState<Array<{productId:string;packageId:string;productName:string;packageName:string;price:number;quantity:number}>>([]);

  const addItem = () => {
    const firstProduct=products[0], firstPackage=products[0]?.packages[0];
    if (!firstProduct || !firstPackage) return;
    if (items.some(i=>i.packageId===firstPackage.id)) return;
    setItems(current=>[...current,{productId:firstProduct.id,packageId:firstPackage.id,productName:firstProduct.name,packageName:firstPackage.name,price:firstPackage.price,quantity:1}]);
  };

  const updateProduct=(index:number,value:string)=>{
    setItems(current=>current.map((item,i)=>{
      if(i!==index)return item;
      const product=products.find(p=>p.id===value), pkg=product?.packages[0];
      return product&&pkg?{...item,productId:product.id,packageId:pkg.id,productName:product.name,packageName:pkg.name,price:pkg.price}:item;
    }));
  };

  const updatePackage=(index:number,value:string)=>{
    setItems(current=>current.map((item,i)=>{
      if(i!==index)return item;
      const pkg=products.flatMap(p=>p.packages).find(p=>p.id===value);
      return pkg?{...item,packageId:pkg.id,packageName:pkg.name,productId:pkg.productId,productName:pkg.productName,price:pkg.price}:item;
    }));
  };

  const total=useMemo(()=>items.reduce((sum,item)=>sum+item.price*item.quantity,0),[items]);

  return <form action={createOrder} className="orderBuilder" encType="multipart/form-data">
    <div className="orderBuilderTop"><div><span className="miniLabel">NEW RESELLER ORDER</span><h2>Place an order</h2><p>Select multiple products and packages, then submit payment proof.</p></div><div className="invoiceBrandMark">JBE</div></div>

    <section className="orderStep"><div className="orderStepHead"><b>01</b><span>Customer / game details</span></div>
      <div className="orderMetaGrid">
        <label>Customer type<select name="identifier_type" value={identifierType} onChange={e=>setIdentifierType(e.target.value)}><option value="in_game_id">In-game ID</option><option value="email">Email</option></select></label>
        <label>{identifierType==='email'?'Email':'In-game ID'}<input name="customer_identifier" value={identifier} onChange={e=>setIdentifier(e.target.value)} placeholder={identifierType==='email'?'customer@email.com':'12345678'} required /></label>
        <label className="orderFullField">{identifierType==='email'?'Client name':'In-game name'}<input name="customer_name" value={customerName} onChange={e=>setCustomerName(e.target.value)} placeholder={identifierType==='email'?'Client name':'In-game name'} required /></label>
      </div>
    </section>

    <section className="orderStep"><div className="orderStepHead"><b>02</b><span>Products & packages</span><button type="button" className="invoiceAddBtn" onClick={addItem}>+ Add package</button></div>
      <div className="orderItems">
        {items.length===0&&<div className="invoiceEmpty">No packages selected yet.</div>}
        {items.map((item,index)=>{
          const product=products.find(p=>p.id===item.productId);
          return <div className="orderItemRow" key={index}>
            <div><span>Product</span><select value={item.productId} onChange={e=>updateProduct(index,e.target.value)}>{products.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select></div>
            <div><span>Package</span><select value={item.packageId} onChange={e=>updatePackage(index,e.target.value)}>{(product?.packages??[]).map(p=><option key={p.id} value={p.id}>{p.name} — {p.price.toLocaleString('en-US')} Ks</option>)}</select></div>
            <div><span>Qty</span><input type="number" min="1" step="1" value={item.quantity} onChange={e=>setItems(current=>current.map((x,i)=>i===index?{...x,quantity:Math.max(1,Number(e.target.value)||1)}:x))}/></div>
            <div><span>Line total</span><strong>{(item.price*item.quantity).toLocaleString('en-US')} Ks</strong></div>
            <button type="button" className="invoiceRemoveBtn" onClick={()=>setItems(current=>current.filter((_,i)=>i!==index))}>Remove</button>
          </div>;
        })}
      </div>
      <input type="hidden" name="items" value={JSON.stringify(items.map(i=>({product_id:i.productId,package_id:i.packageId,quantity:i.quantity})))} />
      <div className="invoiceTotal"><span>Total reseller amount</span><strong>{total.toLocaleString('en-US')} Ks</strong></div>
    </section>

    <section className="orderStep"><div className="orderStepHead"><b>03</b><span>Payment</span></div>
      <div className="orderPaymentGrid">
        <label>Payment method<select name="payment_method" value={paymentMethod} onChange={e=>setPaymentMethod(e.target.value)}><option value="kpay">KPay</option><option value="aya_pay">AYA Pay</option></select></label>
        <label>Transaction last 6 digits<input name="transaction_last6" inputMode="numeric" maxLength={6} pattern="[0-9]{6}" placeholder="123456" required /></label>
        <label className="orderFullField">Transaction screenshot<input name="screenshot" type="file" accept="image/jpeg,image/png,image/webp" required /></label>
      </div>
      <p className="orderPaymentHint">Upload the KPay / AYA Pay transaction screenshot. Maximum 8MB.</p>
    </section>

    <SubmitButton />
  </form>;
}
