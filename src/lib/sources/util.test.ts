import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { describeFetchError, fetchJson, resetUnreachableHosts, UpstreamUnavailableError } from "./util";

const abortError = () => Object.assign(new Error("This operation was aborted"), { name: "AbortError" });

describe("fetchJson", () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    resetUnreachableHosts();
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("does not retry a timeout and skips the host during its cooldown", async () => {
    fetchMock.mockRejectedValue(abortError());

    await expect(fetchJson("https://slow.example/a")).rejects.toThrow("aborted");
    expect(fetchMock).toHaveBeenCalledTimes(1);

    await expect(fetchJson("https://slow.example/b")).rejects.toBeInstanceOf(UpstreamUnavailableError);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("still retries a server error once", async () => {
    fetchMock
      .mockResolvedValueOnce(new Response("", { status: 503, statusText: "Unavailable" }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ ok: 1 }), { status: 200 }));

    await expect(fetchJson("https://flaky.example/x")).resolves.toEqual({ ok: 1 });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("keeps other hosts working while one cools down", async () => {
    fetchMock.mockRejectedValueOnce(abortError());
    await expect(fetchJson("https://down.example/")).rejects.toThrow();

    fetchMock.mockResolvedValueOnce(new Response("[]", { status: 200 }));
    await expect(fetchJson("https://up.example/")).resolves.toEqual([]);
  });
});

describe("describeFetchError", () => {
  it("reports an aborted fetch as a timeout", () => {
    expect(describeFetchError(abortError())).toBe("timed out");
  });
});
