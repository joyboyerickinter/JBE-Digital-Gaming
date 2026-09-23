'use client';

import { useEffect } from 'react';

export default function GlobalActionLoading() {
  useEffect(() => {
    const handleSubmit = (event: Event) => {
      const form = event.target as HTMLFormElement | null;
      if (!form || form.dataset.noLoading === 'true') return;

      const submitter = (event as SubmitEvent).submitter as HTMLButtonElement | HTMLInputElement | null;
      const button = submitter ?? form.querySelector<HTMLButtonElement | HTMLInputElement>('button[type="submit"], input[type="submit"]');
      if (!button || button.disabled || button.dataset.noLoading === 'true') return;

      button.dataset.globalLoading = 'true';
      button.disabled = true;
      button.setAttribute('aria-busy', 'true');
    };

    document.addEventListener('submit', handleSubmit, true);
    return () => document.removeEventListener('submit', handleSubmit, true);
  }, []);

  return null;
}
