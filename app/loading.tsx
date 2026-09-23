export default function Loading() {
  return (
    <main className="pageLoading" aria-busy="true" aria-label="Loading">
      <div className="pageLoadingCard">
        <div className="pageLoadingBrand"><span className="skeletonBlock skeletonLogo" /><span className="skeletonBlock skeletonBrand" /></div>
        <div className="skeletonBlock skeletonLabel" />
        <div className="skeletonBlock skeletonTitle" />
        <div className="skeletonBlock skeletonLine" />
        <div className="pageLoadingGrid">
          <span className="skeletonBlock skeletonCard" />
          <span className="skeletonBlock skeletonCard" />
          <span className="skeletonBlock skeletonCard" />
        </div>
      </div>
    </main>
  );
}
