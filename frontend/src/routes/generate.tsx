import { createFileRoute, Navigate } from "@tanstack/react-router";

export const Route = createFileRoute("/generate")({
  component: () => <Navigate to="/" />,
});
