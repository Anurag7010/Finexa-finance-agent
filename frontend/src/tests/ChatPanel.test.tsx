import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";
import ChatPanel from "../components/chat/ChatPanel";
import * as api from "../lib/api";

vi.mock("../lib/api", () => ({
  sendChatMessage: vi.fn(),
  getChatHistory: vi.fn(),
  clearChatHistory: vi.fn(),
}));

describe("ChatPanel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows suggested prompts when history is empty", async () => {
    (api.getChatHistory as any).mockResolvedValue([]);

    render(<ChatPanel />);

    await waitFor(() => {
      expect(
        screen.getByText(/ask me anything about your finances/i),
      ).toBeInTheDocument();
    });

    expect(
      screen.getByText(/why am i spending so much this month/i),
    ).toBeInTheDocument();
  });

  it("sends a message and renders assistant reply", async () => {
    (api.getChatHistory as any).mockResolvedValue([]);
    (api.sendChatMessage as any).mockResolvedValue({
      reply: "Your spend is high in Shopping.",
    });

    render(<ChatPanel />);

    const input = await screen.findByPlaceholderText(/press enter to send/i);
    await userEvent.type(input, "Where am I overspending?");
    await userEvent.keyboard("{Enter}");

    await waitFor(() => {
      expect(api.sendChatMessage).toHaveBeenCalledWith(
        "Where am I overspending?",
      );
    });

    expect(
      await screen.findByText(/your spend is high in shopping/i),
    ).toBeInTheDocument();
  });
});
