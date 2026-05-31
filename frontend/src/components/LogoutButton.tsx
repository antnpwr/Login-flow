"use client";

import { LogoutOutlined } from "@ant-design/icons";
import { Button } from "antd";
import { signOut } from "next-auth/react";

export function LogoutButton() {
  return (
    <Button
      icon={<LogoutOutlined />}
      onClick={() => signOut({ redirectTo: "/" })}
    >
      Logout
    </Button>
  );
}
