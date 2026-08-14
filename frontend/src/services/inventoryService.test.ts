import { beforeEach, describe, expect, it, vi } from 'vitest';
import api from './api';
import {
  inventoryService,
  inventorySettingsService,
  purchaseOrderService
} from './inventoryService';

vi.mock('./api', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn()
  }
}));

describe('inventory API contracts', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('uses the mounted inventory-module route without a stale /fnb prefix', async () => {
    vi.mocked(api.get).mockResolvedValue({ data: { success: true, data: [] } });

    await inventoryService.getAll({ outlet_id: 12 });

    expect(api.get).toHaveBeenCalledWith('/inventory-module', {
      params: { outlet_id: 12 }
    });
  });

  it('uses tenant-scoped purchase-order routes', async () => {
    vi.mocked(api.get).mockResolvedValue({ data: { success: true, data: [] } });

    await purchaseOrderService.getSuggestions(12);

    expect(api.get).toHaveBeenCalledWith('/purchase-orders/suggestions', {
      params: { outlet_id: 12 }
    });
  });

  it('uses the inventory settings route mounted by the backend', async () => {
    vi.mocked(api.put).mockResolvedValue({ data: { success: true } });

    await inventorySettingsService.update(12, { auto_reorder_enabled: true });

    expect(api.put).toHaveBeenCalledWith(
      '/inventory-settings',
      { auto_reorder_enabled: true },
      { params: { outlet_id: 12 } }
    );
  });
});
