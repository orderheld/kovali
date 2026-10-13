import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { Container } from "@/components/ui/container";
import { JsonLd } from "@/components/seo/json-ld";
import { breadcrumbJsonLd } from "@/lib/seo";

export function LegalPage({
  title,
  path,
  updated,
  children,
}: {
  title: string;
  path: string;
  updated: string;
  children: React.ReactNode;
}) {
  const crumbs = [
    { name: "Start", path: "/" },
    { name: title, path },
  ];
  return (
    <>
      <div className="border-b border-line bg-mist">
        <Container className="pb-12 pt-10 md:pt-12">
          <Breadcrumbs items={crumbs} />
          <h1 className="mt-12 text-h1 font-semibold md:mt-16">{title}</h1>
          <p className="mt-4 text-sm text-slate">Stand: {updated}</p>
        </Container>
      </div>
      <Container className="py-14 md:py-20">
        <div className="prose-kovali">{children}</div>
      </Container>
      <JsonLd data={breadcrumbJsonLd(crumbs)} />
    </>
  );
}
