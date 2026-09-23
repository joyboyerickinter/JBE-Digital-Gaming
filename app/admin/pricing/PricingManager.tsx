'use client';

import { useMemo, useState } from 'react';
import { saveProductPrices } from './actions';
import { useFormStatus } from 'react-dom';

type Package = {
  id: string;
  product_id: string;
  name: string;
  active: boolean;
  sort_order: number;
  b2c_price: number;
  reseller_price: number;
  b2c_active: boolean;
  reseller_active: boolean;
};

type Product = {
  id: string;
  name: string;
  active: boolean;
  packages: Package[];
};

function SaveButton() {
  const { pending } = useFormStatus();
  return (
    <button className="adminPrimaryBtn pricingBulkSaveBtn" type="submit" disabled={pending}>
      {pending ? <><span className="buttonSpinner" aria-hidden="true" />Saving...</> : 'Save all prices'}
    </button>
  );
}

export default function PricingManager({ products }: { products: Product[] }) {
  const [selectedId, setSelectedId] = useState(products[0]?.id ?? '');
  const product = useMemo(() => products.find(item => item.id === selectedId), [products, selectedId]);
  const [values, setValues] = useState<Record<string, {
    b2c_price: string;
    reseller_price: string;
    b2c_active: boolean;
    reseller_active: boolean;
  }>>(() => Object.fromEntries(products.flatMap(p => p.packages).map(pkg => [
    pkg.id,
    {
      b2c_price: String(pkg.b2c_price),
      reseller_price: String(pkg.reseller_price),
      b2c_active: pkg.b2c_active,
      reseller_active: pkg.reseller_active,
    }
  ])));

  const update = (id: string, key: string, value: string | boolean) => {
    setValues(current => ({
      ...current,
      [id]: { ...current[id], [key]: value },
    }));
  };

  const selectedItems = product?.packages.map(pkg => ({
    package_id: pkg.id,
    b2c_price: Number(values[pkg.id]?.b2c_price ?? 0),
    reseller_price: Number(values[pkg.id]?.reseller_price ?? 0),
    b2c_active: values[pkg.id]?.b2c_active ?? true,
    reseller_active: values[pkg.id]?.reseller_active ?? true,
  })) ?? [];

  return (
    <div className="pricingManager">
      <div className="pricingProductPicker">
        <label>
          <span>Select product</span>
          <select value={selectedId} onChange={e => setSelectedId(e.target.value)}>
            {products.map(item => (
              <option key={item.id} value={item.id}>{item.name}</option>
            ))}
          </select>
        </label>
        {product && <div className="pricingPickerMeta">{product.packages.length} packages • edit all below, then save once</div>}
      </div>

      {product && (
        <form action={saveProductPrices} className="pricingBulkForm">
          <input type="hidden" name="product_id" value={product.id} />
          <input type="hidden" name="items" value={JSON.stringify(selectedItems)} />

          <div className="pricingBulkHead">
            <div>
              <span className="miniLabel">{product.active ? 'ACTIVE PRODUCT' : 'INACTIVE PRODUCT'}</span>
              <h3>{product.name}</h3>
            </div>
            <SaveButton />
          </div>

          <div className="pricingBulkRows">
            {product.packages.map(pkg => {
              const value = values[pkg.id];
              return (
                <div className="pricingBulkRow" key={pkg.id}>
                  <div className="adminPricePackage">
                    <strong>{pkg.name}</strong>
                    <span>{pkg.active ? 'Active package' : 'Inactive package'} • #{pkg.sort_order}</span>
                  </div>

                  <label className="priceField">
                    <span>B2C (MMK)</span>
                    <input
                      type="number" min="0" step="0.01" value={value?.b2c_price ?? '0'}
                      onChange={e => update(pkg.id, 'b2c_price', e.target.value)} required
                    />
                  </label>

                  <label className="priceField">
                    <span>Reseller (MMK)</span>
                    <input
                      type="number" min="0" step="0.01" value={value?.reseller_price ?? '0'}
                      onChange={e => update(pkg.id, 'reseller_price', e.target.value)} required
                    />
                  </label>

                  <div className="priceStatus">
                    <label><input type="checkbox" checked={value?.b2c_active ?? true} onChange={e => update(pkg.id, 'b2c_active', e.target.checked)} /> B2C</label>
                    <label><input type="checkbox" checked={value?.reseller_active ?? true} onChange={e => update(pkg.id, 'reseller_active', e.target.checked)} /> Reseller</label>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="pricingBulkFooter">
            <span>Update any number of packages above, then save once.</span>
            <SaveButton />
          </div>
        </form>
      )}
    </div>
  );
}
