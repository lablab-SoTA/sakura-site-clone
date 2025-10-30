import CallbackHandler from "./callback-handler";
import { resolveRedirectPath, DEFAULT_REDIRECT_PATH } from "@/lib/navigation";

type CallbackPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export const metadata = {
  title: "メール確認 | xanime",
};

function extractParam(params: Record<string, string | string[] | undefined>, key: string): string | null {
  const value = params[key];
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }
  return value ?? null;
}

export default async function AuthCallbackPage({ searchParams }: CallbackPageProps) {
  const params = await searchParams;
  const code = extractParam(params, "code");
  const type = extractParam(params, "type");
  const redirectTo = resolveRedirectPath(extractParam(params, "redirectTo"), DEFAULT_REDIRECT_PATH);

  return <CallbackHandler code={code} type={type} redirectTo={redirectTo} />;
}
