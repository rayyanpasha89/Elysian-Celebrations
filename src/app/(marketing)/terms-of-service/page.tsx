import { LegalPageShell } from "@/components/layout/legal-page-shell";

const sections = [
  {
    title: "Using the Platform",
    paragraphs: [
      "Elysian Celebrations is designed to help couples, vendors, and administrators coordinate destination wedding planning through discovery, budgeting, messaging, and operational workflows.",
      "By using the platform, you agree to use it lawfully, provide accurate account information, and avoid actions that could harm the service, other users, or connected planning workflows.",
    ],
  },
  {
    title: "Accounts and Access",
    paragraphs: [
      "You are responsible for activity that occurs through your account and for maintaining the security of your credentials. Role-based areas such as client, vendor, and admin dashboards should only be used by the intended account holder.",
      "We may restrict or suspend access where needed to protect the platform, other users, or the integrity of planning and booking workflows.",
    ],
  },
  {
    title: "Planning and Booking Context",
    paragraphs: [
      "Information shown in the platform, including pricing cues, budget scenarios, or vendor details, is intended to support planning and coordination. Final commercial terms should still be confirmed directly through the relevant workflow before commitment.",
      "Where the product surfaces placeholders, previews, or advisory information, those views should not be treated as legally binding quotations unless explicitly confirmed through the booking process.",
    ],
  },
  {
    title: "Updates and Contact",
    paragraphs: [
      "We may continue refining the product, features, and related policies as the service evolves. Material changes should be reflected in the platform-facing terms over time.",
      "If you have a question about usage, restrictions, or account access, contact the Elysian Celebrations team through the contact page.",
    ],
  },
];

export default function TermsOfServicePage() {
  return (
    <LegalPageShell
      eyebrow="Terms of Service"
      title="The operating terms behind the planning experience."
      intro="These terms outline the basics of how the platform should be used by clients, vendors, and administrators."
      sections={sections}
    />
  );
}
