export function GuideLoading({
  label = "문서를 불러오고 있습니다.",
}: {
  label?: string;
}) {
  return (
    <section
      aria-label={label}
      aria-busy="true"
      data-guide-loading
      data-loading-placeholder="true"
      className="min-h-64 min-w-0 py-4"
    >
      <p role="status" className="text-sm leading-6 text-text-muted">
        {label}
      </p>
    </section>
  );
}
