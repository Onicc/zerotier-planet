import { afterEach, describe, expect, it, vi } from 'vitest';
import { consoleApi } from './console';

describe('consoleApi.createNetwork', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it.each([
    { name: 'Private mesh', private: true },
    { name: 'Public mesh', private: false },
  ])('submits the selected privacy for $name', async (input) => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({
      network: { nwid: '8056c2e21c000001', name: input.name, private: input.private },
    }), {
      status: 201,
      headers: { 'Content-Type': 'application/json' },
    }));

    const result = await consoleApi.createNetwork(input);

    expect(result.network.private).toBe(input.private);
    expect(fetchMock).toHaveBeenCalledWith('/api/controller/networks', expect.objectContaining({
      method: 'POST',
      body: JSON.stringify(input),
    }));
  });
});
