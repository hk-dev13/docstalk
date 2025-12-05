import type { Metadata } from "next";
import Link from "next/link";
import { GridPattern, cn, Button } from "@docstalk/ui";

export const metadata: Metadata = {
  title: "Terms of Service",
};

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-background text-foreground relative overflow-hidden flex flex-col">
      <GridPattern
        width={50}
        height={50}
        x={-1}
        y={-1}
        className={cn(
          "mask-[linear-gradient(to_bottom_right,white,transparent,transparent)]",
          "opacity-50"
        )}
      />

      {/* Header */}
      <header className="fixed top-0 w-full z-50 glass-header px-6 py-4 border-b border-border/50">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 font-bold text-xl">
            DocsTalk
          </Link>
          <Link href="/chat">
            <Button variant="ghost">Back to Chat</Button>
          </Link>
        </div>
      </header>

      <main className="flex-1 pt-32 pb-20 px-4 relative z-10">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-4 text-center">
            Terms of Service
          </h1>
          <p className="text-muted-foreground mb-12 text-center">
            Last updated: December 6, 2025
          </p>

        <div className="prose prose-invert max-w-none space-y-8">
          <section>
            <h2 className="text-2xl font-bold mb-4">1. Acceptance of Terms</h2>
            <p className="text-muted-foreground leading-relaxed">
              By accessing and using DocsTalk ("the Service"), you agree to be
              bound by these Terms of Service. If you do not agree to these
              terms, please do not use our Service.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">
              2. Description of Service
            </h2>
            <p className="text-muted-foreground leading-relaxed">
              DocsTalk provides an AI-powered documentation assistant that
              allows users to query technical documentation using natural
              language. The Service includes a chat interface, API access, and
              related features.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">3. User Accounts</h2>
            <p className="text-muted-foreground leading-relaxed">
              To access certain features, you may need to register for an
              account. You are responsible for maintaining the confidentiality
              of your account credentials and for all activities that occur
              under your account.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">4. Usage Guidelines</h2>
            <p className="text-muted-foreground leading-relaxed">
              You agree not to misuse the Service or help anyone else do so. You
              must not try to access the Service using a method other than the
              interface and the instructions that we provide.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">
              5. Intellectual Property
            </h2>
            <p className="text-muted-foreground leading-relaxed">
              The Service and its original content, features, and functionality
              are and will remain the exclusive property of DocsTalk and its
              licensors.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">6. Disclaimer</h2>
            <p className="text-muted-foreground leading-relaxed">
              The Service is provided "AS IS" and "AS AVAILABLE" without
              warranties of any kind, whether express or implied.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">7. Contact Us</h2>
            <p className="text-muted-foreground leading-relaxed">
              If you have any questions about these Terms, please contact us at{" "}
              <a
                href="mailto:hello@envoyou.com"
                className="text-primary hover:underline"
              >
                hello@envoyou.com
              </a>
              .
            </p>
          </section>
        </div>
        </div>
      </main>
    </div>
  );
}
