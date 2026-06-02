"use client";

import { UserAddOutlined } from "@ant-design/icons";
import { Card, Typography } from "antd";
import Link from "next/link";
import { AuthFormActions } from "@/components/AuthFormActions";

export default function RegisterPage() {
  return (
    <section className="auth-screen">
      <Card className="auth-card">
        <div className="auth-mark">
          <UserAddOutlined />
        </div>
        <Typography.Title level={1}>Create account</Typography.Title>
        <Typography.Paragraph className="auth-copy">
          Create a local Keycloak account from this website. LINE sign-in stays
          brokered through Keycloak.
        </Typography.Paragraph>
        <AuthFormActions mode="register" />
        <p className="auth-switch">
          Already registered? <Link href="/">Login</Link>
        </p>
      </Card>
    </section>
  );
}
