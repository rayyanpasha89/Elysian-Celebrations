import "dotenv/config";
import {
  bootstrapCloudTestingData,
  getCloudBootstrapPassword,
} from "../src/lib/testing/cloud-bootstrap";

async function main() {
  const summary = await bootstrapCloudTestingData();
  const password = getCloudBootstrapPassword();

  console.log("");
  console.log("Elysian cloud testing bootstrap complete.");
  console.log(`Password: ${password}`);
  console.log("");
  console.log("Fixture logins:");
  for (const login of summary.logins) {
    console.log(`- ${login.role}: ${login.email} -> ${login.route}`);
  }
  console.log("");
  console.log("Seeded counts:");
  console.log(`- Users: ${summary.counts.users}`);
  console.log(`- Vendor profiles: ${summary.counts.vendorProfiles}`);
  console.log(`- Weddings: ${summary.counts.weddings}`);
  console.log(`- Bookings: ${summary.counts.bookings}`);
  console.log(`- Messages: ${summary.counts.messages}`);
  console.log(`- Reviews: ${summary.counts.reviews}`);
  console.log(`- Notifications: ${summary.counts.notifications}`);
  console.log(`- Contact inquiries: ${summary.counts.inquiries}`);
  console.log("");
  console.log(`Completed at: ${summary.ranAt}`);
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : "Unknown error";
  console.error(`Cloud bootstrap failed: ${message}`);
  process.exitCode = 1;
});
