import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router";
import { ProtectedRoute } from "../ProtectedRoute";
import * as AuthContext from "../../context/AuthContext";
import type { User } from "../../api/types";

vi.mock("../../context/AuthContext", async () => {
  const actual = await vi.importActual<typeof AuthContext>("../../context/AuthContext");
  return { ...actual, useAuth: vi.fn() };
});

const mockedUseAuth = vi.mocked(AuthContext.useAuth);

function renderProtected(initialPath: string, roles?: Array<User["role"]>) {
  render(
    <MemoryRouter initialEntries={[initialPath]}>
      <Routes>
        <Route path="/login" element={<div>Login page</div>} />
        <Route path="/" element={<div>Home page</div>} />
        <Route
          path="/protected"
          element={
            <ProtectedRoute roles={roles}>
              <div>Protected content</div>
            </ProtectedRoute>
          }
        />
      </Routes>
    </MemoryRouter>,
  );
}

describe("ProtectedRoute", () => {
  beforeEach(() => {
    mockedUseAuth.mockReset();
  });

  it("shows a loading state while auth is resolving", () => {
    mockedUseAuth.mockReturnValue({
      user: null,
      isLoading: true,
      login: vi.fn(),
      register: vi.fn(),
      logout: vi.fn(),
    });

    renderProtected("/protected");

    expect(screen.getByText(/loading/i)).toBeInTheDocument();
    expect(screen.queryByText("Protected content")).not.toBeInTheDocument();
  });

  it("redirects to /login when there is no authenticated user", () => {
    mockedUseAuth.mockReturnValue({
      user: null,
      isLoading: false,
      login: vi.fn(),
      register: vi.fn(),
      logout: vi.fn(),
    });

    renderProtected("/protected");

    expect(screen.getByText("Login page")).toBeInTheDocument();
    expect(screen.queryByText("Protected content")).not.toBeInTheDocument();
  });

  it("renders the protected content when the user is authenticated and no role is required", () => {
    mockedUseAuth.mockReturnValue({
      user: { id: "1", name: "Riley", email: "riley@example.com", role: "customer" },
      isLoading: false,
      login: vi.fn(),
      register: vi.fn(),
      logout: vi.fn(),
    });

    renderProtected("/protected");

    expect(screen.getByText("Protected content")).toBeInTheDocument();
  });

  it("redirects to / when the user's role doesn't match the required roles", () => {
    mockedUseAuth.mockReturnValue({
      user: { id: "1", name: "Riley", email: "riley@example.com", role: "customer" },
      isLoading: false,
      login: vi.fn(),
      register: vi.fn(),
      logout: vi.fn(),
    });

    renderProtected("/protected", ["provider"]);

    expect(screen.getByText("Home page")).toBeInTheDocument();
    expect(screen.queryByText("Protected content")).not.toBeInTheDocument();
  });

  it("renders the protected content when the user's role matches", () => {
    mockedUseAuth.mockReturnValue({
      user: { id: "1", name: "Jamie", email: "jamie@example.com", role: "provider" },
      isLoading: false,
      login: vi.fn(),
      register: vi.fn(),
      logout: vi.fn(),
    });

    renderProtected("/protected", ["provider"]);

    expect(screen.getByText("Protected content")).toBeInTheDocument();
  });
});
