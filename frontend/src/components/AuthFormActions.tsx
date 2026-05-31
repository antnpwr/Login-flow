"use client";

import { LockOutlined, LoginOutlined, UserAddOutlined } from "@ant-design/icons";
import { Button, Form, Input } from "antd";
import { signIn } from "next-auth/react";

type AuthFormActionsProps = {
  mode: "login" | "register";
};

export function AuthFormActions({ mode }: AuthFormActionsProps) {
  const isRegister = mode === "register";

  async function handleFinish() {
    await signIn(
      "keycloak",
      { redirectTo: "/profile" },
      isRegister ? { kc_action: "register" } : undefined,
    );
  }

  return (
    <Form
      layout="vertical"
      requiredMark={false}
      className="auth-form"
      onFinish={handleFinish}
    >
      {isRegister ? (
        <Form.Item
          label="Username"
          name="username"
          rules={[{ required: true, message: "Enter a username" }]}
        >
          <Input autoComplete="username" size="large" placeholder="Username" />
        </Form.Item>
      ) : null}

      <Form.Item
        label="Email"
        name="email"
        rules={[{ required: true, message: "Enter your email" }]}
      >
        <Input autoComplete="email" size="large" placeholder="Email" />
      </Form.Item>

      <Form.Item
        label="Password"
        name="password"
        rules={[{ required: true, message: "Enter your password" }]}
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
        block
      >
        {isRegister ? "Create account" : "Login"}
      </Button>
    </Form>
  );
}
