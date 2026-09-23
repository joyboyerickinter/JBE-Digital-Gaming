'use client';

import { useEffect } from 'react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="errorPage">
      <section className="errorCard">
        <span className="miniLabel">JBE DIGITAL + GAMING</span>
        <h1>Something went wrong.</h1>
        <p>We could not load this page correctly. Please try again.</p>
        <div className="errorActions">
          <button className="adminPrimaryBtn" type="button" onClick={() => reset()}>Try again</button>
          <a className="resellerSecondaryBtn" href="/">Back to home</a>
        </div>
      </section>
    </main>
  );
}
