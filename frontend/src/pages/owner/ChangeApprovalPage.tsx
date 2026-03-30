import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import {
  BadgeCheck,
  CircleSlash,
  ClipboardCheck,
  Filter,
  Loader2,
  ShieldAlert,
  Sparkles
} from 'lucide-react';
import ReasonInputDialog from '../../components/common/ReasonInputDialog';
import {
  changeApprovalService,
  type OperationalChangeRequest,
  type OperationalChangeStatus
} from '../../services/changeApprovalService';

const statusTabs: Array<{ key: OperationalChangeStatus | 'all'; label: string }> = [
  { key: 'pending', label: 'Menunggu Approval' },
  { key: 'approved', label: 'Sudah Disetujui' },
  { key: 'rejected', label: 'Ditolak' },
  { key: 'all', label: 'Semua' }
];

const formatActionLabel = (actionType: string) => {
  const labelMap: Record<string, string> = {
    product_create: 'Buat menu',
    product_update: 'Ubah menu',
    product_delete: 'Hapus menu',
    category_create: 'Buat kategori',
    category_update: 'Ubah kategori',
    category_delete: 'Hapus kategori',
    modifier_create: 'Buat modifier',
    modifier_update: 'Ubah modifier',
    modifier_delete: 'Hapus modifier',
    table_create: 'Buat meja',
    table_update: 'Ubah meja',
    table_delete: 'Hapus meja',
    stock_in: 'Tambah stok',
    stock_out: 'Kurangi stok',
    UPDATE_TRANSACTION_STATUS: 'Ubah status transaksi'
  };

  return labelMap[actionType] || actionType;
};

const formatStatusLabel = (status: OperationalChangeStatus) => {
  if (status === 'approved') return 'Disetujui';
  if (status === 'rejected') return 'Ditolak';
  return 'Menunggu';
};

const renderSummaryLines = (request: OperationalChangeRequest) => {
  const summary = request.summary || {};

  if (request.actionType === 'UPDATE_TRANSACTION_STATUS') {
    return [
      `Dari ${summary.currentStatus || '-'} ke ${summary.nextStatus || '-'}`,
      summary.transactionNumber ? `Transaksi: ${summary.transactionNumber}` : '',
      summary.total ? `Total: Rp ${Number(summary.total).toLocaleString('id-ID')}` : ''
    ].filter(Boolean);
  }

  if (request.actionType === 'stock_in' || request.actionType === 'stock_out') {
    return [
      summary.ingredientName ? `Bahan: ${summary.ingredientName}` : '',
      summary.quantity ? `Qty: ${summary.quantity}` : '',
      summary.currentStock !== undefined ? `Stok ${summary.currentStock} -> ${summary.projectedStock}` : ''
    ].filter(Boolean);
  }

  return [
    summary.name ? `Target: ${summary.name}` : '',
    summary.price !== undefined ? `Harga: Rp ${Number(summary.price).toLocaleString('id-ID')}` : '',
    Array.isArray(summary.changes) && summary.changes.length > 0 ? `Field: ${summary.changes.join(', ')}` : '',
    summary.capacity !== undefined ? `Kapasitas: ${summary.capacity} seat` : ''
  ].filter(Boolean);
};

export default function ChangeApprovalPage() {
  const [requests, setRequests] = useState<OperationalChangeRequest[]>([]);
  const [activeTab, setActiveTab] = useState<OperationalChangeStatus | 'all'>('pending');
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<number | null>(null);
  const [rejectingRequest, setRejectingRequest] = useState<OperationalChangeRequest | null>(null);

  const loadRequests = async () => {
    setLoading(true);
    try {
      const response = await changeApprovalService.getRequests('all');
      setRequests(response.data);
    } catch (error) {
      console.error('Failed to load change approvals:', error);
      toast.error('Gagal memuat antrean approval perubahan.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadRequests();
  }, []);

  const filteredRequests = useMemo(() => {
    if (activeTab === 'all') {
      return requests;
    }

    return requests.filter((request) => request.status === activeTab);
  }, [activeTab, requests]);

  const stats = useMemo(() => ({
    pending: requests.filter((request) => request.status === 'pending').length,
    approved: requests.filter((request) => request.status === 'approved').length,
    rejected: requests.filter((request) => request.status === 'rejected').length,
  }), [requests]);

  const handleApprove = async (request: OperationalChangeRequest) => {
    setProcessingId(request.id);
    try {
      const response = await changeApprovalService.approveRequest(request.id);
      toast.success(response.message);
      await loadRequests();
    } catch (error: any) {
      console.error('Failed to approve request:', error);
      toast.error(error?.response?.data?.error?.message || 'Gagal menyetujui perubahan.');
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (reason: string) => {
    if (!rejectingRequest) {
      return;
    }

    setProcessingId(rejectingRequest.id);
    try {
      const response = await changeApprovalService.rejectRequest(rejectingRequest.id, reason);
      toast.success(response.message);
      setRejectingRequest(null);
      await loadRequests();
    } catch (error: any) {
      console.error('Failed to reject request:', error);
      toast.error(error?.response?.data?.error?.message || 'Gagal menolak perubahan.');
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-[32px] bg-gradient-to-br from-slate-900 via-blue-900 to-slate-800 text-white shadow-xl">
        <div className="grid gap-6 px-8 py-8 lg:grid-cols-[1.4fr_1fr]">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-medium uppercase tracking-[0.18em] text-blue-100">
              <Sparkles className="h-3.5 w-3.5" />
              Kontrol Perubahan Toko
            </div>
            <h1 className="mt-4 text-3xl font-semibold leading-tight">Owner bisa tahan dulu perubahan kasir sebelum data beneran berubah.</h1>
            <p className="mt-3 max-w-2xl text-sm text-blue-100/85">
              Semua permintaan yang masuk ke mode approval akan nongol di sini lengkap dengan alasan, siapa yang mengajukan, dan ringkasan perubahan yang dia minta.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-3xl border border-white/10 bg-white/10 p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-blue-100/70">Pending</p>
              <p className="mt-3 text-3xl font-semibold">{stats.pending}</p>
            </div>
            <div className="rounded-3xl border border-white/10 bg-white/10 p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-blue-100/70">Approved</p>
              <p className="mt-3 text-3xl font-semibold">{stats.approved}</p>
            </div>
            <div className="rounded-3xl border border-white/10 bg-white/10 p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-blue-100/70">Rejected</p>
              <p className="mt-3 text-3xl font-semibold">{stats.rejected}</p>
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Inbox Approval</h2>
            <p className="text-sm text-slate-500">Pilih tab untuk fokus ke permintaan yang masih menunggu atau lihat histori keputusan sebelumnya.</p>
          </div>
          <div className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-4 py-2 text-sm text-slate-600">
            <Filter className="h-4 w-4" />
            {filteredRequests.length} permintaan
          </div>
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          {statusTabs.map((tab) => {
            const isActive = tab.key === activeTab;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                  isActive
                    ? 'bg-slate-900 text-white shadow-lg shadow-slate-900/15'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </section>

      {loading ? (
        <div className="flex min-h-[280px] items-center justify-center rounded-[28px] border border-slate-200 bg-white">
          <div className="flex items-center gap-3 text-slate-500">
            <Loader2 className="h-5 w-5 animate-spin" />
            Memuat antrean approval...
          </div>
        </div>
      ) : filteredRequests.length === 0 ? (
        <div className="rounded-[28px] border border-dashed border-slate-300 bg-white px-8 py-16 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-slate-100 text-slate-500">
            <ClipboardCheck className="h-8 w-8" />
          </div>
          <h3 className="mt-5 text-xl font-semibold text-slate-900">Belum ada permintaan di tab ini</h3>
          <p className="mt-2 text-sm text-slate-500">Begitu kasir mengajukan perubahan saat mode approval aktif, antreannya akan muncul di sini.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredRequests.map((request) => {
            const isPending = request.status === 'pending';
            const summaryLines = renderSummaryLines(request);

            return (
              <article key={request.id} className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="space-y-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-blue-700">
                        {formatActionLabel(request.actionType)}
                      </span>
                      <span className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] ${
                        request.status === 'approved'
                          ? 'bg-emerald-50 text-emerald-700'
                          : request.status === 'rejected'
                            ? 'bg-rose-50 text-rose-700'
                            : 'bg-amber-50 text-amber-700'
                      }`}>
                        {formatStatusLabel(request.status)}
                      </span>
                    </div>

                    <div>
                      <h3 className="text-xl font-semibold text-slate-900">
                        {request.entityLabel || formatActionLabel(request.actionType)}
                      </h3>
                      <p className="mt-1 text-sm text-slate-500">
                        Diajukan oleh <span className="font-medium text-slate-700">{request.requesterName}</span> ({request.requesterRole}) pada{' '}
                        {new Date(request.createdAt).toLocaleString('id-ID')}
                      </p>
                    </div>

                    <div className="rounded-3xl bg-slate-50 p-4">
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Alasan kasir</p>
                      <p className="mt-2 text-sm leading-6 text-slate-700">{request.reason}</p>
                    </div>

                    {summaryLines.length > 0 && (
                      <div className="grid gap-2 md:grid-cols-2">
                        {summaryLines.map((line) => (
                          <div key={line} className="rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-600">
                            {line}
                          </div>
                        ))}
                      </div>
                    )}

                    {request.status === 'rejected' && request.rejectionReason && (
                      <div className="rounded-3xl bg-rose-50 p-4 text-sm text-rose-700">
                        <p className="font-semibold">Alasan penolakan</p>
                        <p className="mt-2 leading-6">{request.rejectionReason}</p>
                      </div>
                    )}

                    {request.status === 'approved' && request.approvedByName && (
                      <div className="rounded-3xl bg-emerald-50 p-4 text-sm text-emerald-700">
                        <p className="font-semibold">Disetujui oleh</p>
                        <p className="mt-2 leading-6">{request.approvedByName}</p>
                      </div>
                    )}
                  </div>

                  <div className="flex min-w-[220px] flex-col gap-3">
                    {isPending ? (
                      <>
                        <button
                          type="button"
                          onClick={() => void handleApprove(request)}
                          disabled={processingId === request.id}
                          className="inline-flex items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-emerald-300"
                        >
                          <BadgeCheck className="h-4 w-4" />
                          {processingId === request.id ? 'Menyetujui...' : 'Approve & Terapkan'}
                        </button>
                        <button
                          type="button"
                          onClick={() => setRejectingRequest(request)}
                          disabled={processingId === request.id}
                          className="inline-flex items-center justify-center gap-2 rounded-2xl bg-rose-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:bg-rose-300"
                        >
                          <CircleSlash className="h-4 w-4" />
                          Tolak Permintaan
                        </button>
                        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
                          <div className="flex items-start gap-2">
                            <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
                            <p>Cek alasannya dulu. Begitu kamu approve, perubahan ini langsung diterapkan ke data toko.</p>
                          </div>
                        </div>
                      </>
                    ) : (
                      <div className="rounded-3xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-600">
                        {request.status === 'approved'
                          ? 'Perubahan ini sudah diterapkan ke data toko.'
                          : 'Permintaan ini sudah dihentikan dan tidak mengubah data toko.'}
                      </div>
                    )}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      <ReasonInputDialog
        isOpen={Boolean(rejectingRequest)}
        onClose={() => setRejectingRequest(null)}
        onConfirm={(reason) => void handleReject(reason)}
        title="Tolak Permintaan Perubahan"
        message="Kasih alasan singkat supaya kasir paham kenapa perubahan ini belum boleh jalan."
        placeholder="Contoh: harga baru belum sesuai, cek stok fisik dulu, atau minta bukti tambahan."
        confirmText="Tolak Sekarang"
        isLoading={rejectingRequest ? processingId === rejectingRequest.id : false}
      />
    </div>
  );
}
