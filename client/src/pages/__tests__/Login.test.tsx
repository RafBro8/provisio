import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Routes, Route } from "react-router";
import { Login } from "../Login";
import { ApiError } from "../../api/client";
import * as AuthContext from "../../context/AuthContext";

vi.mock("../../context/AuthContext", async () => {
  const actual = await vi.importActual<typeof AuthContext>("../../context/AuthContext");
  return { ...actual, useAuth: vi.fn() };
});

const mockedUseAuth = vi.mocked(AuthContext.useAuth);

function renderLogin(initialEntries: Parameters<typeof MemoryRouter>[0]["initialEntries"] = ["/login"]) {
  render(
    <MemoryRouter initialEntries={initialEntries}>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/" element={<div>Home page</div>} />
        <Route path="/account" element={<div>Account page</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("Login", () => {
  const login = vi.fn();

  beforeEach(() => {
    login.mockReset();
    mockedUseAuth.mockReturnValue({
      user: null,
      isLoading: false,
      login,
      register: vi.fn(),
      logout: vi.fn(),
    });
  });

  it("does not call login when required fields are empty", async () => {
    const user = userEvent.setup();
    renderLogin();

    await user.click(screen.getByRole("button", { name: /log in/i }));

    expect(login).not.toHaveBeenCalled();
  });

  it("submits the entered email and password", async () => {
    login.mockResolvedValue(undefined);
    const user = userEvent.setup();
    renderLogin();

    await user.type(screen.getByLabelText(/email/i), "riley@example.com");
    await user.type(screen.getByLabelText(/password/i), "supersecret1");
    await user.click(screen.getByRole("button", { name: /log in/i }));

    expect(login).toHaveBeenCalledWith("riley@example.com", "supersecret1");
  });

  it("shows the API error message when login fails", async () => {
    login.mockRejectedValue(new ApiError(401, "Invalid email or password"));
    const user = userEvent.setup();
    renderLogin();

    await user.type(screen.getByLabelText(/email/i), "riley@example.com");
    await user.type(screen.getByLabelText(/password/i), "wrong-password");
    await user.click(screen.getByRole("button", { name: /log in/i }));

    expect(await screen.findByText("Invalid email or password")).toBeInTheDocument();
  });

  it("navigates to home after a successful login with no prior destination", async () => {
    login.mockResolvedValue(undefined);
    const user = userEvent.setup();
    renderLogin();

    await user.type(screen.getByLabelText(/email/i), "riley@example.com");
    await user.type(screen.getByLabelText(/password/i), "supersecret1");
    await user.click(screen.getByRole("button", { name: /log in/i }));

    expect(await screen.findByText("Home page")).toBeInTheDocument();
  });

  it("navigates back to the originally requested page after login", async () => {
    login.mockResolvedValue(undefined);
    const user = userEvent.setup();
    renderLogin([{ pathname: "/login", state: { from: { pathname: "/account" } } }]);

    await user.type(screen.getByLabelText(/email/i), "riley@example.com");
    await user.type(screen.getByLabelText(/password/i), "supersecret1");
    await user.click(screen.getByRole("button", { name: /log in/i }));

    expect(await screen.findByText("Account page")).toBeInTheDocument();
  });
});
