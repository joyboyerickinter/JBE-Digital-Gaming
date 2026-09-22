'use client';

import { useMemo, useState } from 'react';
import { useFormStatus } from 'react-dom';
import { createInvoice } from './actions';

type Package = { id:string; name:string; b2c:number; reseller:number };
type Product = { id:string; name:string; packages:Package[] };

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button className="adminPrimaryBtn invoiceGenerateBtn" type="submit" disabled={pending}>
      {pending ? <><span className="buttonSpinner" aria-hidden="true" />Generating invoice...</> : 'Generate invoice →'}
    </button>
  );
}

export default function InvoiceForm({ products }: { products: Product[] }) {
  const [customer, setCustomer] = useState('');
  const [payment, setPayment] = useState('unpaid');
  const [items, setItems] = useState<Array<{productId:string;packageId:string;product_name:string;package_name:string;price:number}>>([]);

  const addItem = () => {
    const product = products[0];
    const pkg = product?.packages[0];
    if (!product || !pkg) return;
    setItems(current => [...current, { productId:product.id, packageId:pkg.id, product_name:product.name, package_name:pkg.name, price:pkg.reseller || pkg.b2c }]);
  };

  const updateItem = (index:number, field:string, value:string) => {
    setItems(current => current.map((item,i) => {
      if (i !== index) return item;
      if (field === 'productId') {
        const product = products.find(p => p.id === value);
        const pkg = product?.packages[0];
        return product && pkg ? {...item, productId:product.id, packageId:pkg.id, product_name:product.name, package_name:pkg.name, price:pkg.reseller || pkg.b2c} : item;
      }
      if (field === 'packageId') {
        const pkg = products.flatMap(p => p.packages).find(p => p.id === value);
        return pkg ? {...item, packageId:pkg.id, package_name:pkg.name, price:pkg.reseller || pkg.b2c} : item;
      }
      if (field === 'price') return {...item, price:Number(value) || 0};
      return item;
    }));
  };

  const total = useMemo(() => items.reduce((sum,item)=>sum + (Number(item.price)||0),0), [items]);

  return (
    <form action={createInvoice} className="invoiceBuilder">
      <div className="invoiceBuilderTop">
        <div>
          <span className="miniLabel">NEW INVOICE</span>
          <h2>Create invoice</h2>
          <p>Add one or more products, set the customer and payment status.</p>
        </div>
        <div className="invoiceBrandMark">JBE</div>
      </div>

      <div className="invoiceMetaGrid">
        <label>Customer name<input name="customer_name" value={customer} onChange={e=>setCustomer(e.target.value)} placeholder="Customer name" required /></label>
        <label>Payment status<select name="payment_status" value={payment} onChange={e=>setPayment(e.target.value)}><option value="unpaid">Unpaid</option><option value="paid">Paid</option></select></label>
      </div>

      <div className="invoiceItemsHead"><span>ITEMS</span><button type="button" className="invoiceAddBtn" onClick={addItem}>+ Add item</button></div>

      <div className="invoiceItems">
        {items.length === 0 && <div className="invoiceEmpty">No items yet. Add a product to start the invoice.</div>}
        {items.map((item,index) => {
          const product = products.find(p=>p.id===item.productId);
          return <div className="invoiceItemRow" key={index}>
            <div><span>Product</span><select value={item.productId} onChange={e=>updateItem(index,'productId',e.target.value)}>{products.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select></div>
            <div><span>Package</span><select value={item.packageId} onChange={e=>updateItem(index,'packageId',e.target.value)}>{(product?.packages ?? []).map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select></div>
            <div><span>Price (Ks)</span><input type="number" min="0" step="1" value={item.price} onChange={e=>updateItem(index,'price',e.target.value)} /></div>
            <button type="button" className="invoiceRemoveBtn" onClick={()=>setItems(current=>current.filter((_,i)=>i!==index))}>Remove</button>
          </div>
        })}
      </div>

      <input type="hidden" name="items" value={JSON.stringify(items.map((item,index)=>({product_name:item.product_name,package_name:item.package_name,price:Number(item.price)||0,sort_order:index})))} />

      <div className="invoiceTotal"><span>Total</span><strong>{total.toLocaleString('en-US')} Ks</strong></div>
      <SubmitButton />
    </form>
  );
}
