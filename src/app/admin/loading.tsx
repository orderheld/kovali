export default function Loading() {
  return (
    <div aria-busy="true" className="flex flex-1 items-center justify-center">
      <span className="sr-only">Wird geladen …</span>
      <span aria-hidden className="size-6 animate-spin rounded-full border-2 border-line border-t-blue" />
    </div>
  );
}
