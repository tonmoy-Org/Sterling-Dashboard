export default function HeroBanner({ status, updatedAt }) {
  const isDegraded = status === 'DEGRADED';
  const isLoading  = status === null;

  const bgClass = isDegraded
    ? 'bg-amber-600'
    : isLoading
      ? 'bg-[#1565C0]'
      : 'bg-[#1565C0]';

  const headingText = isLoading
    ? 'Checking Sterling Services…'
    : isDegraded
      ? 'Some Services Are Disrupted'
      : 'Sterling Services Are OPERATIONAL';

  return (
    <section className={`${bgClass} py-14 text-center text-white transition-colors duration-700`}>
      {/* animated dot indicator */}
      <div className="flex justify-center mb-4">
        {/* <span className="relative flex h-3 w-3">
          <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${isDegraded ? 'bg-amber-300' : 'bg-green-300'}`} />
          <span className={`relative inline-flex rounded-full h-3 w-3 ${isDegraded ? 'bg-amber-200' : 'bg-green-400'}`} />
        </span> */}
      </div>

      <h1 className="text-3xl font-semibold mb-2">{headingText}</h1>
      <p className="text-sm mb-6 opacity-80">{updatedAt}</p>
      <p className="max-w-4xl mx-auto text-sm leading-relaxed opacity-80 px-4">
        Welcome to the Sterling Septic &amp; Plumbing LLC Status Page. Bookmark or subscribe to
        this page for the latest on service performance and any major issues affecting your plumbing
        needs. We'll do our best to post updates immediately, but please note there may be a delay
        as we diagnose problems.
      </p>
    </section>
  );
}
