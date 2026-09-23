'use client';

import type { ReactNode } from 'react';
import { useEffect, useRef, useState } from 'react';

type Props = {
  placeholder?: string;
  statuses?: { value: string; label: string }[];
  children: ReactNode;
};

export default function SearchFilter({ placeholder = 'Search...', statuses = [], children }: Props) {
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('');
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = ref.current;
    if (!root) return;

    const cards = Array.from(root.querySelectorAll<HTMLElement>('[data-searchable]'));
    const normalizedQuery = query.trim().toLowerCase();

    cards.forEach((card) => {
      const text = (card.dataset.searchable || '').toLowerCase();
      const cardStatus = (card.dataset.status || '').toLowerCase();
      const matchesQuery = !normalizedQuery || text.includes(normalizedQuery);
      const matchesStatus = !status || cardStatus === status.toLowerCase();
      card.hidden = !(matchesQuery && matchesStatus);
    });
  }, [query, status, children]);

  return (
    <div className="searchFilterWrap" ref={ref}>
      <div className="searchFilterBar">
        <div className="searchInputWrap">
          <span>⌕</span>
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={placeholder} aria-label="Search" />
          {query && <button type="button" onClick={() => setQuery('')} aria-label="Clear search">×</button>}
        </div>
        {statuses.length > 0 && (
          <select value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Filter">
            <option value="">All status</option>
            {statuses.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
          </select>
        )}
      </div>
      {children}
    </div>
  );
}
