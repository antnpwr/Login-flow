"use client";

import { SafetyCertificateOutlined } from "@ant-design/icons";
import { Card, Typography } from "antd";
import Link from "next/link";
import { AuthFormActions } from "@/components/AuthFormActions";

export default function LoginPage() {
  return (
    <section className="auth-screen">
      <Card className="auth-card">
        <div className="auth-mark">
          <SafetyCertificateOutlined />
        </div>
        <Typography.Title level={1}>Welcome back</Typography.Title>
        <AuthFormActions mode="login" />
        <p className="auth-switch">
          New here? <Link href="/register">Create an account</Link>
        </p>
      </Card>
    </section>
  );
}
