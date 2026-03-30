import api from './api';

export type OperationalChangeStatus = 'pending' | 'approved' | 'rejected';

export interface OperationalChangeRequest {
  id: number;
  tenantId: number;
  outletId: number | null;
  requesterId: number;
  requesterName: string;
  requesterRole: string;
  entityType: string;
  actionType: string;
  entityId: number | null;
  entityLabel: string | null;
  reason: string;
  payload: Record<string, any>;
  summary: Record<string, any>;
  status: OperationalChangeStatus;
  approvedBy: number | null;
  approvedByName: string | null;
  rejectedBy: number | null;
  rejectedByName: string | null;
  rejectionReason: string | null;
  appliedEntityId: number | null;
  createdAt: string;
  updatedAt: string;
  resolvedAt: string | null;
}

interface ChangeApprovalListResponse {
  success: boolean;
  data: OperationalChangeRequest[];
  count: number;
}

interface ChangeApprovalSingleResponse {
  success: boolean;
  data: OperationalChangeRequest;
  message: string;
}

export const changeApprovalService = {
  async getRequests(status: OperationalChangeStatus | 'all' = 'pending') {
    const response = await api.get<ChangeApprovalListResponse>('/change-approvals', {
      params: { status }
    });
    return response.data;
  },

  async approveRequest(id: number) {
    const response = await api.post<ChangeApprovalSingleResponse>(`/change-approvals/${id}/approve`);
    return response.data;
  },

  async rejectRequest(id: number, reason: string) {
    const response = await api.post<ChangeApprovalSingleResponse>(`/change-approvals/${id}/reject`, { reason });
    return response.data;
  }
};
