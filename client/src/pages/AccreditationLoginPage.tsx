import type { AuthAdmin } from "../types/auth.types.js";
import LoginPage from "./LoginPage.js";

// Separate accreditation entry point reusing the SAME JWT system:
// no second user database, just a distinct route + staff-focused copy.
// App sends authenticated staff on to #/accredit after login.

interface AccreditationLoginPageProps {
  onLoggedIn: (admin: AuthAdmin) => void;
}

export default function AccreditationLoginPage({ onLoggedIn }: AccreditationLoginPageProps): JSX.Element {
  return (
    <LoginPage
      onLoggedIn={onLoggedIn}
      heading="Accreditation sign in"
      subheading="Event staff sign in to accredit guests at the door."
    />
  );
}
