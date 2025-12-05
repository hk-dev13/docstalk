import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Changelog",
  description:
    "Follow our journey as we build the best documentation assistant.",
};

export default function ChangelogLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
