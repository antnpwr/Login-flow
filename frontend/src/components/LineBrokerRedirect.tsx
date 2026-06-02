"use client";

import { useEffect } from "react";
import { MessageOutlined } from "@ant-design/icons";
import { Spin } from "antd";
import { signIn } from "next-auth/react";

export function LineBrokerRedirect() {
  useEffect(() => {
    void signIn("keycloak", { redirectTo: "/profile" }, { kc_idp_hint: "line" });
  }, []);

  return (
    <section className="line-entry-screen">
      <div className="line-entry-card">
        <div className="auth-mark">
          <MessageOutlined />
        </div>
        <h1>Opening LINE login</h1>
        <p>Sending you to Keycloak so it can continue with LINE securely.</p>
        <Spin />
      </div>
    </section>
  );
}
