import AuthForm from "../auth-form";

export const metadata = { title: "Entrar | StudyFlow" };

export default function LoginPage() {
  return <AuthForm modo="login" />;
}
