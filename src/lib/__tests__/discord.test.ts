import { describe, expect, it, vi, afterEach } from "vitest";
import { discordMessages, sendDiscordMessage } from "@/lib/discord";

describe("discordMessages", () => {
  it("formats a new match message with VND amounts", () => {
    const msg = discordMessages.newMatch({
      dateLabel: "19/09/2026",
      location: "Sân ABC",
      estimatedPerPerson: 61000,
      matchUrl: "https://app.example.com/matches/1",
    });
    expect(msg).toContain("19/09/2026");
    expect(msg).toContain("Sân ABC");
    expect(msg).toContain("61.000đ");
    expect(msg).toContain("https://app.example.com/matches/1");
  });

  it("falls back gracefully when there is no estimate yet", () => {
    const msg = discordMessages.newMatch({
      dateLabel: "19/09/2026",
      location: "Sân ABC",
      estimatedPerPerson: null,
      matchUrl: "https://app.example.com/matches/1",
    });
    expect(msg).toContain("chưa có dữ liệu");
  });
});

describe("sendDiscordMessage", () => {
  const originalFetch = global.fetch;
  afterEach(() => {
    global.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it("resolves without retrying on a 2xx response", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 200 });
    global.fetch = fetchMock as unknown as typeof fetch;

    await sendDiscordMessage("https://discord.test/webhook", "hello");

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("retries after the rate-limit's retry_after and then succeeds", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: false,
        status: 429,
        json: async () => ({ retry_after: 0.01 }),
      })
      .mockResolvedValueOnce({ ok: true, status: 200 });
    global.fetch = fetchMock as unknown as typeof fetch;

    await sendDiscordMessage("https://discord.test/webhook", "hello");

    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("throws on a non-429 error response", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      text: async () => "server error",
    });
    global.fetch = fetchMock as unknown as typeof fetch;

    await expect(sendDiscordMessage("https://discord.test/webhook", "hello")).rejects.toThrow();
  });
});
