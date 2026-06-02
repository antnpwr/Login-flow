"use client";

import {
  LockOutlined,
  LoginOutlined,
  MessageOutlined,
  UserAddOutlined,
  UserOutlined,
} from "@ant-design/icons";
import { Alert, Button, Form, Input, Space } from "antd";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState } from "react";

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
    setError(null);
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(values),
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

  return (
    <Space orientation="vertical" size={12} className="auth-actions">
      {error ? <Alert type="error" showIcon message={error} /> : null}

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

      <Button
        size="large"
        icon={<MessageOutlined />}
        block
        onClick={() =>
          signIn("keycloak", { redirectTo: "/profile" }, { kc_idp_hint: "line" })
        }
      >
        Continue with LINE
      </Button>
    </Space>
  );
}
