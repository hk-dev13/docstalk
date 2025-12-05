import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy",
};

import Link from "next/link";
import { GridPattern, cn, Button } from "@docstalk/ui";

export default function PrivacyPage() {
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
            Privacy Policy
          </h1>
          <p className="text-muted-foreground mb-12 text-center">
            Last updated: December 6, 2025
          </p>

          <div className="prose prose-invert max-w-none space-y-8">
            <section>
              <h2 className="text-2xl font-bold mb-4">
                1. Information We Collect
              </h2>
              <p className="text-muted-foreground leading-relaxed">
                We collect information you provide directly to us, such as when
                you create an account, submit queries to our AI, or communicate
                with us. This may include your name, email address, and chat
                history.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4">
                2. How We Use Your Information
              </h2>
              <p className="text-muted-foreground leading-relaxed">
                We use the information we collect to operate, maintain, and
                improve our Service, including to provide personalized AI
                responses, analyze usage trends, and send you technical notices
                and support messages.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4">3. Data Sharing</h2>
              <p className="text-muted-foreground leading-relaxed">
                We do not share your personal information with third parties
                except as described in this policy, such as with vendors who
                perform services on our behalf or to comply with legal
                obligations.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4">4. Data Security</h2>
              <p className="text-muted-foreground leading-relaxed">
                We take reasonable measures to help protect information about
                you from loss, theft, misuse and unauthorized access,
                disclosure, alteration and destruction.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4">5. Your Rights</h2>
              <p className="text-muted-foreground leading-relaxed">
                You may have certain rights regarding your personal information,
                such as the right to access, correct, or delete your data.
                Please contact us to exercise these rights.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4">
                6. Changes to this Policy
              </h2>
              <p className="text-muted-foreground leading-relaxed">
                We may change this Privacy Policy from time to time. If we make
                changes, we will notify you by revising the date at the top of
                the policy.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4">7. Contact Us</h2>
              <p className="text-muted-foreground leading-relaxed">
                If you have any questions about this Privacy Policy, please
                contact us at{" "}
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
