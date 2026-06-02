"use client";

import {
  LockOutlined,
  LoginOutlined,
  MessageOutlined,
  UserAddOutlined,
  UserOutlined,
} from "@ant-design/icons";
import { Alert, Button, Form, Input, Space, Typography } from "antd";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  getCurrentLiffLineAccount,
  getLiffLineAccount,
  type LiffLineAccount,
} from "@/lib/liff-client";

type AuthFormActionsProps = {
  mode: "login" | "register";
};

type LoginFormValues = {
  username: string;
  password: string;
};

type RegisterFormValues = LoginFormValues & {
  email: string;
};

type RegisterResponse = {
  ok?: boolean;
  error?: string;
};

export function AuthFormActions({ mode }: AuthFormActionsProps) {
  const router = useRouter();
  const isRegister = mode === "register";
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLinkingLine, setIsLinkingLine] = useState(false);
  const [lineAccount, setLineAccount] = useState<LiffLineAccount | null>(null);

  useEffect(() => {
    let isMounted = true;

    if (!isRegister || lineAccount) {
      return;
    }

    async function restoreLineSession() {
      try {
        const account = await getCurrentLiffLineAccount();

        if (account && isMounted) {
          setLineAccount(account);
        }
      } catch {
        // The explicit link button shows actionable errors when the user clicks it.
      }
    }

    void restoreLineSession();

    return () => {
      isMounted = false;
    };
  }, [isRegister, lineAccount]);

  async function signInWithCredentials(values: LoginFormValues) {
    const result = await signIn("credentials", {
      username: values.username,
      password: values.password,
      redirect: false,
      redirectTo: "/profile",
    });

    if (result?.error) {
      setError("Email/username or password is incorrect.");
      return;
    }

    router.push("/profile");
    router.refresh();
  }

  async function handleLogin(values: LoginFormValues) {
    setError(null);
    setIsSubmitting(true);

    try {
      await signInWithCredentials(values);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleRegister(values: RegisterFormValues) {
    if (!lineAccount) {
      setError("Link your LINE account before creating an account.");
      return;
    }

    setError(null);
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...values,
          lineIdToken: lineAccount.idToken,
        }),
      });
      const body = (await response.json()) as RegisterResponse;

      if (!response.ok || !body.ok) {
        setError(body.error ?? "Could not create account.");
        return;
      }

      await signInWithCredentials(values);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleLineLink() {
    setError(null);
    setIsLinkingLine(true);

    try {
      const account = await getLiffLineAccount();

      if (account) {
        setLineAccount(account);
      }
    } catch (lineError) {
      setError(
        lineError instanceof Error
          ? lineError.message
          : "Could not link LINE account.",
      );
    } finally {
      setIsLinkingLine(false);
    }
  }

  return (
    <Space orientation="vertical" size={12} className="auth-actions">
      {error ? <Alert type="error" showIcon message={error} /> : null}

      {isRegister ? (
        <div className="line-link-panel">
          {lineAccount ? (
            <Alert
              type="success"
              showIcon
              message={`LINE linked: ${lineAccount.displayName}`}
            />
          ) : (
            <>
              <Typography.Paragraph className="line-link-copy">
                Link your LINE account first. Every account must have LINE
                attached before it can access the app.
              </Typography.Paragraph>
              <Button
                size="large"
                icon={<MessageOutlined />}
                loading={isLinkingLine}
                onClick={handleLineLink}
                block
              >
                Link LINE account
              </Button>
            </>
          )}
        </div>
      ) : null}

      {isRegister && !lineAccount ? null : (
        <Form
          layout="vertical"
          requiredMark={false}
          onFinish={isRegister ? handleRegister : handleLogin}
        >
          <Form.Item
            label="Username"
            name="username"
            rules={[
              {
                required: true,
                message: isRegister
                  ? "Enter a username"
                  : "Enter your email or username",
              },
            ]}
          >
            <Input
              autoComplete="username"
              size="large"
              placeholder={isRegister ? "Username" : "Email or username"}
              prefix={<UserOutlined />}
            />
          </Form.Item>

          {isRegister ? (
            <Form.Item
              label="Email"
              name="email"
              rules={[
                { required: true, message: "Enter your email" },
                { type: "email", message: "Enter a valid email" },
              ]}
            >
              <Input autoComplete="email" size="large" placeholder="Email" />
            </Form.Item>
          ) : null}

          <Form.Item
            label="Password"
            name="password"
            rules={[
              { required: true, message: "Enter your password" },
              ...(isRegister
                ? [{ min: 8, message: "Use at least 8 characters" }]
                : []),
            ]}
          >
            <Input.Password
              autoComplete={isRegister ? "new-password" : "current-password"}
              size="large"
              placeholder="Password"
              prefix={<LockOutlined />}
            />
          </Form.Item>

          <Button
            type="primary"
            htmlType="submit"
            size="large"
            icon={isRegister ? <UserAddOutlined /> : <LoginOutlined />}
            loading={isSubmitting}
            block
          >
            {isRegister ? "Create account" : "Login"}
          </Button>
        </Form>
      )}
    </Space>
  );
}
