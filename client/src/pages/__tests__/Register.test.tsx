import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Routes, Route } from "react-router";
import { Register } from "../Register";
import { ApiError } from "../../api/client";
import * as AuthContext from "../../context/AuthContext";

vi.mock("../../context/AuthContext", async () => {
  const actual = await vi.importActual<typeof AuthContext>("../../context/AuthContext");
  return { ...actual, useAuth: vi.fn() };
});

const mockedUseAuth = vi.mocked(AuthContext.useAuth);

function renderRegister() {
  render(
    <MemoryRouter initialEntries={["/register"]}>
      <Routes>
        <Route path="/register" element={<Register />} />
        <Route path="/" element={<div>Home page</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("Register", () => {
  const register = vi.fn();

  beforeEach(() => {
    register.mockReset();
    mockedUseAuth.mockReturnValue({
      user: null,
      isLoading: false,
      login: vi.fn(),
      register,
      logout: vi.fn(),
    });
  });

  it("does not submit when required fields are empty", async () => {
    const user = userEvent.setup();
    renderRegister();

    await user.click(screen.getByRole("button", { name: /create account/i }));

    expect(register).not.toHaveBeenCalled();
  });

  it("does not submit when the password is shorter than 8 characters", async () => {
    const user = userEvent.setup();
    renderRegister();

    await user.type(screen.getByLabelText(/name/i), "Jamie Provider");
    await user.type(screen.getByLabelText(/email/i), "jamie@example.com");
    await user.type(screen.getByLabelText(/password/i), "short");
    await user.click(screen.getByRole("button", { name: /create account/i }));

    expect(register).not.toHaveBeenCalled();
    expect(await screen.findByText(/at least 8 characters/i)).toBeInTheDocument();
  });

  it("defaults to the customer role and submits it", async () => {
    register.mockResolvedValue(undefined);
    const user = userEvent.setup();
    renderRegister();

    await user.type(screen.getByLabelText(/name/i), "Riley Customer");
    await user.type(screen.getByLabelText(/email/i), "riley@example.com");
    await user.type(screen.getByLabelText(/password/i), "supersecret1");
    await user.click(screen.getByRole("button", { name: /create account/i }));

    expect(register).toHaveBeenCalledWith({
      name: "Riley Customer",
      email: "riley@example.com",
      password: "supersecret1",
      role: "customer",
    });
  });

  it("submits the provider role when that option is selected", async () => {
    register.mockResolvedValue(undefined);
    const user = userEvent.setup();
    renderRegister();

    await user.type(screen.getByLabelText(/name/i), "Jamie Provider");
    await user.type(screen.getByLabelText(/email/i), "jamie@example.com");
    await user.type(screen.getByLabelText(/password/i), "supersecret1");
    await user.click(screen.getByRole("radio", { name: /provider, offering services/i }));
    await user.click(screen.getByRole("button", { name: /create account/i }));

    expect(register).toHaveBeenCalledWith(
      expect.objectContaining({ role: "provider" }),
    );
  });

  it("shows the API error message when registration fails", async () => {
    register.mockRejectedValue(new ApiError(409, "An account with that email already exists"));
    const user = userEvent.setup();
    renderRegister();

    await user.type(screen.getByLabelText(/name/i), "Riley Customer");
    await user.type(screen.getByLabelText(/email/i), "riley@example.com");
    await user.type(screen.getByLabelText(/password/i), "supersecret1");
    await user.click(screen.getByRole("button", { name: /create account/i }));

    expect(await screen.findByText("An account with that email already exists")).toBeInTheDocument();
  });

  it("navigates to home after successful registration", async () => {
    register.mockResolvedValue(undefined);
    const user = userEvent.setup();
    renderRegister();

    await user.type(screen.getByLabelText(/name/i), "Riley Customer");
    await user.type(screen.getByLabelText(/email/i), "riley@example.com");
    await user.type(screen.getByLabelText(/password/i), "supersecret1");
    await user.click(screen.getByRole("button", { name: /create account/i }));

    expect(await screen.findByText("Home page")).toBeInTheDocument();
  });
});
