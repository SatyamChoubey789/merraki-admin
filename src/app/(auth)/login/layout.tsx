import { Suspense } from "react";

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  // useSearchParams() in a Client Component requires a Suspense boundary
  return <Suspense fallback={null}>{children}</Suspense>;
}