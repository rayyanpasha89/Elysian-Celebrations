import { LegalPageShell } from "@/components/layout/legal-page-shell";

const sections = [
  {
    title: "What We Collect",
    paragraphs: [
      "When you inquire, create an account, or use the planning tools, we may collect contact details, wedding preferences, budget context, destination choices, and vendor interactions needed to operate the service.",
      "We only collect information that helps us respond to inquiries, support client and vendor accounts, improve planning flows, and keep the platform secure and reliable.",
    ],
  },
  {
    title: "How We Use It",
    paragraphs: [
      "We use your information to coordinate inquiries, support your account, personalize planning recommendations, and operate features like budget planning, messaging, and vendor discovery.",
      "We may also use aggregated, non-identifying usage information to understand where the product feels confusing or incomplete so we can improve the experience.",
    ],
  },
  {
    title: "Sharing and Storage",
    paragraphs: [
      "We do not sell your personal information. Information may be shared with service providers that support authentication, infrastructure, analytics, or communications, but only to the extent required to run the platform.",
      "Where planning activity involves vendors or collaborators, only the relevant details needed to support that workflow should be visible inside the experience.",
    ],
  },
  {
    title: "Your Choices",
    paragraphs: [
      "If you want to review, correct, or request deletion of account-related information, contact the Elysian Celebrations team through the contact page and we will help from there.",
      "This page is a product-facing policy summary and should be refined further as legal and operational requirements evolve.",
    ],
  },
];

export default function PrivacyPolicyPage() {
  return (
    <LegalPageShell
      eyebrow="Privacy Policy"
      title="Privacy with the same clarity as the planning."
      intro="This summary explains how Elysian Celebrations handles information shared through inquiries, accounts, and planning workflows."
      sections={sections}
    />
  );
}
