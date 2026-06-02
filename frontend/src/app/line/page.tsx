import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { LineBrokerRedirect } from "@/components/LineBrokerRedirect";

export default async function LineEntryPage() {
  const session = await auth();

  if (session?.user) {
    redirect("/profile");
  }

  return <LineBrokerRedirect />;
}
