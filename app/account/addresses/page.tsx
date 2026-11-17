// app/account/addresses/page.tsx
// Saved addresses are managed on the profile page; this opens it at the addresses section.
import { redirect } from "next/navigation";

export default function AddressesPage() {
  redirect("/account/profile?tab=addresses");
}
