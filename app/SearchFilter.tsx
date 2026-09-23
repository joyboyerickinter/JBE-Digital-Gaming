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
  const [resultCount, setResultCount] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = ref.current;
    if (!root) return;

    const cards = Array.from(root.querySelectorAll<HTMLElement>('[data-searchable]'));
    const normalizedQuery = query.trim().toLowerCase();
    let visible = 0;

    cards.forEach((card) => {
      const text = (card.dataset.searchable || '').toLowerCase();
      const cardStatus = (card.dataset.status || '').toLowerCase();
      const matchesQuery = !normalizedQuery || text.includes(normalizedQuery);
      const matchesStatus = !status || cardStatus === status.toLowerCase();
      const matches = matchesQuery && matchesStatus;

      card.hidden = !matches;
      if (matches) visible += 1;
    });

    setTotalCount(cards.length);
    setResultCount(visible);
  }, [query, status, children]);

  const hasFilter = Boolean(query.trim() || status);
  const showNoResults = hasFilter && totalCount > 0 && resultCount === 0;

  return (
    <div className="searchFilterWrap" ref={ref}>
      <div className="searchFilterBar">
        <div className="searchInputWrap">
          <span>⌕</span>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={placeholder}
            aria-label="Search"
          />
          {query && (
            <button type="button" onClick={() => setQuery('')} aria-label="Clear search">
              ×
            </button>
          )}
        </div>

        {statuses.length > 0 && (
          <select value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Filter">
            <option value="">All status</option>
            {statuses.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
        )}
      </div>

      {hasFilter && totalCount > 0 && (
        <div
          className="searchFilterMeta"
          aria-live="polite"
          style={{ fontSize: 9, color: '#667085', padding: '0 2px' }}
        >
          {resultCount} result{resultCount === 1 ? '' : 's'}
        </div>
      )}

      {showNoResults && (
        <div
          className="searchFilterEmpty"
          style={{
            display: 'grid',
            gap: 4,
            padding: '24px 16px',
            textAlign: 'center',
            background: '#fff',
            border: '1px solid #e4e7ec',
            borderRadius: 14,
            color: '#667085',
          }}
        >
          <strong style={{ color: '#101828', fontSize: 11 }}>No matching results</strong>
          <span style={{ fontSize: 9 }}>Try a different search term or filter.</span>
        </div>
      )}

      {children}
    </div>
  );
}
