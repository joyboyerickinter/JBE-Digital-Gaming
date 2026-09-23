'use client';

import { useEffect, useRef, useState } from 'react';

type Props = { currentUrl?: string | null; inputId: string; allowRemove?: boolean };

export default function ProductImageField({ currentUrl, inputId, allowRemove = false }: Props) {
  const [preview, setPreview] = useState<string | null>(currentUrl ?? null);
  const [removeImage, setRemoveImage] = useState(false);
  const objectUrlRef = useRef<string | null>(null);

  useEffect(() => {
    setPreview(currentUrl ?? null);
    setRemoveImage(false);
  }, [currentUrl]);

  const handleChange = (file?: File) => {
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) return;
    if (file.size > 5 * 1024 * 1024) return;
    if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
    objectUrlRef.current = URL.createObjectURL(file);
    setPreview(objectUrlRef.current);
    setRemoveImage(false);
  };

  return (
    <div className="productImageField">
      <div className="productImagePreview">
        {preview && !removeImage ? <img src={preview} alt="Product preview" /> : <div className="productImageFallback"><span>JBE</span><small>No image</small></div>}
      </div>
      <div className="productImageControls">
        <label htmlFor={inputId} className="productImageUploadBtn">{preview && !removeImage ? 'Replace image' : 'Upload image'}</label>
        <input id={inputId} name="image" type="file" accept="image/jpeg,image/png,image/webp" onChange={(e) => handleChange(e.target.files?.[0])} />
        {allowRemove && currentUrl && <label className="productImageRemove"><input name="remove_image" type="checkbox" checked={removeImage} onChange={(e) => { setRemoveImage(e.target.checked); }} /> Remove image</label>}
        <span>JPG, PNG or WEBP • Max 5MB</span>
      </div>
    </div>
  );
}
