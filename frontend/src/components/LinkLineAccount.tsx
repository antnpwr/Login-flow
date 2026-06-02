"use client";

import { MessageOutlined } from "@ant-design/icons";
import { Alert, Button, Space, Typography } from "antd";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { getLiffLineAccount } from "@/lib/liff-client";

type LinkLineResponse = {
  ok?: boolean;
  error?: string;
};

export function LinkLineAccount() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isLinking, setIsLinking] = useState(false);

  async function handleLinkLine() {
    setError(null);
    setIsLinking(true);

    try {
      const account = await getLiffLineAccount();

      if (!account) {
        return;
      }

      const response = await fetch("/api/link-line", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          lineIdToken: account.idToken,
        }),
      });
      const body = (await response.json()) as LinkLineResponse;

      if (!response.ok || !body.ok) {
        setError(body.error ?? "Could not link LINE account.");
        return;
      }

      router.push("/profile");
      router.refresh();
    } catch (lineError) {
      setError(
        lineError instanceof Error
          ? lineError.message
          : "Could not link LINE account.",
      );
    } finally {
      setIsLinking(false);
    }
  }

  return (
    <Space orientation="vertical" size={16} className="auth-actions">
      {error ? <Alert type="error" showIcon message={error} /> : null}
      <Typography.Paragraph className="auth-copy">
        Your password is correct, but this account must be linked with LINE
        before you can access the app.
      </Typography.Paragraph>
      <Button
        type="primary"
        size="large"
        icon={<MessageOutlined />}
        loading={isLinking}
        onClick={handleLinkLine}
        block
      >
        Link LINE account
      </Button>
    </Space>
  );
}
