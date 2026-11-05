'use client';

import { useEffect, useState, useMemo, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { 
  Warehouse, 
  Plus, 
  Search, 
  CheckCircle2, 
  AlertTriangle, 
  Clock, 
  FileText, 
  Inbox, 
  ChevronRight, 
  Truck, 
  Building2, 
  PackageCheck, 
  X,
  User,
  ShieldCheck,
  Calendar
} from 'lucide-react';
import { fetchApi } from '@/lib/api';

interface GoodsReceivedHeader {
  id: number;
  grnNumber: string;
  supplierDeliveryNote: string | null;
  receivedDate: string;
  purchaseOrderId: number;
  poNumber: string;
  supplierId: number;
  supplierName: string;
  branchName: string | null;
  receiverEmail: string | null;
  notes: string | null;
  createdAt: string;
}

interface GoodsReceivedItemLine {
  id: number;
  inventoryItemId: number;
  itemName: string;
  itemSku: string | null;
  itemUnit: string;
  quantityAccepted: string;
  quantityRejected: string;
  unitCost: string;
  rejectionReason: string | null;
  notes: string | null;
}

interface GoodsReceivedDetail extends GoodsReceivedHeader {
  items: GoodsReceivedItemLine[];
}

interface POOption {
  id: number;
  poNumber: string;
  supplierName: string;
  status: string;
  totalAmount: string;
  items: {
    inventoryItemId: number;
    itemName: string;
    itemUnit: string;
    quantityOrdered: string;
    quantityReceived: string;
    unitCost: string;
  }[];
}

function ReceivingContent() {
  const searchParams = useSearchParams();
  const preselectedPoId = searchParams.get('poId');

  const [grns, setGrns] = useState<GoodsReceivedHeader[]>([]);
  const [openPOs, setOpenPOs] = useState<POOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');

  // Inspect Modal
  const [activeGrn, setActiveGrn] = useState<GoodsReceivedDetail | null>(null);

  // New Inward Delivery Modal
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [selectedPoId, setSelectedPoId] = useState<string>('');
  const [deliveryNote, setDeliveryNote] = useState('');
  const [receivingNotes, setReceivingNotes] = useState('');
  const [acceptedQtyBuffer, setAcceptedQtyBuffer] = useState<Record<number, string>>({});
  const [rejectedQtyBuffer, setRejectedQtyBuffer] = useState<Record<number, string>>({});
  const [rejectionReasonBuffer, setRejectionReasonBuffer] = useState<Record<number, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [grnRes, poRes] = await Promise.all([
        fetchApi('/api/v1/purchasing/receiving'),
        fetchApi('/api/v1/purchasing/orders'),
      ]);

      if (grnRes?.data) setGrns(grnRes.data);

      if (poRes?.data) {
        // Filter open POs available for delivery intake
        const receivable = poRes.data.filter(
          (o: any) => o.status === 'ISSUED' || o.status === 'PARTIALLY_RECEIVED'
        );
        setOpenPOs(receivable);

        if (preselectedPoId) {
          openReceivingModal(preselectedPoId, receivable);
        }
      }
    } catch (err) {
      console.error('Failed to load goods receiving data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const openReceivingModal = async (poId: string, currentOpenPOs = openPOs) => {
    setSelectedPoId(poId);
    setDeliveryNote('');
    setReceivingNotes('');
    setModalError(null);

    try {
      const res = await fetchApi(`/api/v1/purchasing/orders/${poId}`);
      if (res?.data) {
        const acceptBuf: Record<number, string> = {};
        const rejectBuf: Record<number, string> = {};
        const reasonBuf: Record<number, string> = {};

        res.data.items.forEach((item: any) => {
          const ordered = parseFloat(item.quantityOrdered) || 0;
          const received = parseFloat(item.quantityReceived) || 0;
          const remaining = Math.max(0, ordered - received);

          acceptBuf[item.inventoryItemId] = String(remaining);
          rejectBuf[item.inventoryItemId] = '0';
          reasonBuf[item.inventoryItemId] = '';
        });

        setAcceptedQtyBuffer(acceptBuf);
        setRejectedQtyBuffer(rejectBuf);
        setRejectionReasonBuffer(reasonBuf);

        // Ensure selected PO contains the full item list
        setOpenPOs((prev) => {
          if (!prev.some((p) => String(p.id) === String(poId))) {
            return [...prev, res.data];
          }
          return prev.map((p) => (String(p.id) === String(poId) ? res.data : p));
        });
      }
      setIsNewModalOpen(true);
    } catch (err: any) {
      alert(err.message || 'Failed to fetch PO details');
    }
  };

  const activePoDetails = useMemo(() => {
    return openPOs.find((p) => String(p.id) === selectedPoId);
  }, [openPOs, selectedPoId]);

  const handleProcessGRN = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activePoDetails) return;

    setIsSubmitting(true);
    setModalError(null);

    const itemsPayload = activePoDetails.items.map((i) => ({
      inventoryItemId: i.inventoryItemId,
      quantityAccepted: parseFloat(acceptedQtyBuffer[i.inventoryItemId] || '0'),
      quantityRejected: parseFloat(rejectedQtyBuffer[i.inventoryItemId] || '0'),
      unitCost: parseFloat(i.unitCost),
      rejectionReason: rejectionReasonBuffer[i.inventoryItemId] || undefined,
    }));

    try {
      await fetchApi('/api/v1/purchasing/receiving', {
        method: 'POST',
        body: JSON.stringify({
          purchaseOrderId: activePoDetails.id,
          supplierDeliveryNote: deliveryNote || undefined,
          notes: receivingNotes || undefined,
          items: itemsPayload,
        }),
      });

      setIsNewModalOpen(false);
      loadData();
    } catch (err: any) {
      setModalError(err.message || 'Failed to process delivery');
    } finally {
      setIsSubmitting(false);
    }
  };

  const openInspectGRN = async (id: number) => {
    try {
      const res = await fetchApi(`/api/v1/purchasing/receiving/${id}`);
      if (res?.data) {
        setActiveGrn(res.data);
      }
    } catch (err: any) {
      alert(err.message || 'Failed to load GRN details');
    }
  };

  const filteredGRNs = useMemo(() => {
    return grns.filter((g) => {
      return (
        g.grnNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        g.poNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        g.supplierName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (g.supplierDeliveryNote && g.supplierDeliveryNote.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    });
  }, [grns, searchTerm]);

  return (
    <div className="space-y-6">
      {/* Top Banner Navigation */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-2xl border border-gray-100 shadow-xs">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-semibold text-gray-400">Purchasing</span>
            <ChevronRight size={12} className="text-gray-400" />
            <span className="text-xs font-bold text-servora-navy">Goods Inward</span>
          </div>
          <h1 className="text-xl font-bold text-servora-navy">Goods Inward & Receiving (GRN)</h1>
          <p className="text-xs sm:text-sm text-servora-deepTeal mt-0.5">
            Loading dock receipt verification, purveyor invoice matching, rejection logging, and automatic stock credits.
          </p>
        </div>

        {openPOs.length > 0 && (
          <button
            onClick={() => openReceivingModal(String(openPOs[0].id))}
            className="bg-servora-core text-white text-xs font-semibold px-4 py-2.5 rounded-xl shadow-xs hover:bg-blue-700 transition-colors flex items-center gap-2"
          >
            <PackageCheck size={16} /> Process Dock Delivery
          </button>
        )}
      </div>

      {/* Query Bar */}
      <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-xs flex items-center justify-between">
        <div className="relative w-full max-w-sm">
          <Search className="absolute left-3 top-2.5 text-gray-400" size={15} />
          <input
            type="text"
            placeholder="Search GRN #, PO #, delivery note, or supplier..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs border border-gray-200 rounded-xl focus:border-servora-core focus:outline-none"
          />
        </div>
        <span className="text-xs text-servora-deepTeal font-medium">
          {grns.length} Verified Goods Receipts
        </span>
      </div>

      {/* GRN Ledger Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-xs overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center text-xs font-medium text-servora-deepTeal animate-pulse">
            Loading goods received notes history...
          </div>
        ) : filteredGRNs.length === 0 ? (
          <div className="p-12 text-center text-xs text-servora-deepTeal">
            No goods inward deliveries logged yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 text-servora-deepTeal uppercase tracking-wider border-b border-gray-100 text-[11px] font-bold">
                  <th className="py-3.5 px-4">GRN Number</th>
                  <th className="py-3.5 px-4">Origin PO #</th>
                  <th className="py-3.5 px-4">Vendor Delivery Note #</th>
                  <th className="py-3.5 px-4">Supplier Purveyor</th>
                  <th className="py-3.5 px-4">Intake Date</th>
                  <th className="py-3.5 px-4">Verified By</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-servora-navy">
                {filteredGRNs.map((g) => (
                  <tr key={g.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3.5 px-4 font-bold text-servora-navy font-mono">
                      {g.grnNumber}
                    </td>

                    <td className="py-3.5 px-4 font-mono font-semibold text-servora-core">
                      {g.poNumber}
                    </td>

                    <td className="py-3.5 px-4 font-mono text-gray-600">
                      {g.supplierDeliveryNote || 'NO-REF-ATTACHED'}
                    </td>

                    <td className="py-3.5 px-4 font-bold text-gray-800">
                      {g.supplierName}
                    </td>

                    <td className="py-3.5 px-4 text-gray-500 font-mono text-[11px]">
                      {new Date(g.receivedDate).toLocaleDateString()}
                    </td>

                    <td className="py-3.5 px-4 text-servora-deepTeal">
                      <span className="inline-flex items-center gap-1 text-[11px]">
                        <User size={12} className="text-gray-400" />
                        {g.receiverEmail || 'Dock Supervisor'}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => openInspectGRN(g.id)}
                        className="inline-flex items-center gap-1 px-3 py-1 bg-servora-pale text-servora-core rounded-lg font-bold text-xs hover:bg-blue-100 transition-colors"
                      >
                        Inspect Manifest &rarr;
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* INSPECT GRN MODAL */}
      {activeGrn && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-xl border border-gray-100 space-y-4 max-h-[85vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-gray-100 pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-servora-navy">{activeGrn.grnNumber}</h3>
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200">
                    <CheckCircle2 size={11} /> Stock Credited
                  </span>
                </div>
                <p className="text-[11px] text-servora-deepTeal mt-0.5">
                  PO: <strong>{activeGrn.poNumber}</strong> | Vendor: <strong>{activeGrn.supplierName}</strong>
                </p>
              </div>
              <button onClick={() => setActiveGrn(null)} className="text-gray-400 hover:text-servora-navy">
                <X size={18} />
              </button>
            </div>

            <div className="space-y-2">
              <span className="text-[11px] font-bold uppercase text-gray-400 tracking-wider">
                Received Line Manifest ({activeGrn.items.length})
              </span>
              <div className="border border-gray-100 rounded-xl overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-[10px] uppercase font-bold text-gray-500 border-b border-gray-100">
                    <tr>
                      <th className="p-3">Ingredient</th>
                      <th className="p-3 text-right">Accepted Qty</th>
                      <th className="p-3 text-right">Rejected Qty</th>
                      <th className="p-3 text-right">Unit Price</th>
                      <th className="p-3">Rejection Reason</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {activeGrn.items.map((line) => (
                      <tr key={line.id} className="hover:bg-slate-50/50">
                        <td className="p-3 font-semibold text-servora-navy">
                          {line.itemName}
                          <span className="block text-[10px] text-gray-400 font-mono">{line.itemSku || 'NO-SKU'}</span>
                        </td>
                        <td className="p-3 text-right font-mono font-bold text-emerald-700">
                          {parseFloat(line.quantityAccepted).toLocaleString()} {line.itemUnit}
                        </td>
                        <td className="p-3 text-right font-mono font-bold text-rose-600">
                          {parseFloat(line.quantityRejected) > 0 ? `${parseFloat(line.quantityRejected).toLocaleString()} ${line.itemUnit}` : '-'}
                        </td>
                        <td className="p-3 text-right font-mono text-gray-600">
                          KES {parseFloat(line.unitCost).toFixed(2)}
                        </td>
                        <td className="p-3 text-gray-500">
                          {line.rejectionReason || '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="flex justify-end pt-3 border-t border-gray-100">
              <button
                type="button"
                onClick={() => setActiveGrn(null)}
                className="px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-50 rounded-xl"
              >
                Close Manifest
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PROCESS GOODS DELIVERY MODAL */}
      {isNewModalOpen && activePoDetails && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-xl border border-gray-100 space-y-4 max-h-[85vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-gray-100 pb-3">
              <div>
                <h3 className="text-sm font-bold text-servora-navy">Receive Goods Delivery (Dock Verification)</h3>
                <p className="text-[11px] text-servora-deepTeal">
                  Matching Purchase Order <strong>{activePoDetails.poNumber}</strong> ({activePoDetails.supplierName})
                </p>
              </div>
              <button onClick={() => setIsNewModalOpen(false)} className="text-gray-400 hover:text-servora-navy">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleProcessGRN} className="space-y-4">
              {modalError && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs">
                  {modalError}
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-servora-navy mb-1">
                    Purveyor Delivery Note / Invoice Ref #
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. DN-998812 / INV-771"
                    value={deliveryNote}
                    onChange={(e) => setDeliveryNote(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs focus:border-servora-core focus:outline-none font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-servora-navy mb-1">Dock Inspection Notes</label>
                  <input
                    type="text"
                    placeholder="e.g. Cold chain temp probe reading: 3.5°C"
                    value={receivingNotes}
                    onChange={(e) => setReceivingNotes(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs focus:border-servora-core focus:outline-none"
                  />
                </div>
              </div>

              {/* Items Verification Table */}
              <div className="space-y-2 border-t border-gray-100 pt-3">
                <span className="text-xs font-bold text-servora-navy">Line Intake & Rejections</span>
                <div className="border border-gray-100 rounded-xl overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-[10px] uppercase font-bold text-gray-500 border-b border-gray-100">
                      <tr>
                        <th className="p-3">Item</th>
                        <th className="p-3 text-right">Ordered</th>
                        <th className="p-3 text-center">Accepted Qty</th>
                        <th className="p-3 text-center">Rejected Qty</th>
                        <th className="p-3">Rejection Reason</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {activePoDetails.items.map((line) => (
                        <tr key={line.inventoryItemId} className="hover:bg-slate-50/50">
                          <td className="p-3 font-semibold text-servora-navy">
                            {line.itemName}
                            <span className="block text-[10px] text-gray-400 font-mono">
                              KES {parseFloat(line.unitCost).toFixed(2)}/{line.itemUnit}
                            </span>
                          </td>

                          <td className="p-3 text-right font-mono font-medium text-gray-600">
                            {parseFloat(line.quantityOrdered).toLocaleString()} {line.itemUnit}
                          </td>

                          <td className="p-3 text-center">
                            <input
                              type="number"
                              min="0"
                              step="0.001"
                              required
                              value={acceptedQtyBuffer[line.inventoryItemId] ?? ''}
                              onChange={(e) =>
                                setAcceptedQtyBuffer({
                                  ...acceptedQtyBuffer,
                                  [line.inventoryItemId]: e.target.value,
                                })
                              }
                              className="w-20 px-2 py-1 text-xs border border-gray-300 rounded-lg text-center font-bold"
                            />
                          </td>

                          <td className="p-3 text-center">
                            <input
                              type="number"
                              min="0"
                              step="0.001"
                              value={rejectedQtyBuffer[line.inventoryItemId] ?? '0'}
                              onChange={(e) =>
                                setRejectedQtyBuffer({
                                  ...rejectedQtyBuffer,
                                  [line.inventoryItemId]: e.target.value,
                                })
                              }
                              className="w-20 px-2 py-1 text-xs border border-gray-300 rounded-lg text-center font-bold text-rose-600"
                            />
                          </td>

                          <td className="p-3">
                            <input
                              type="text"
                              placeholder="Reason if rejected..."
                              value={rejectionReasonBuffer[line.inventoryItemId] ?? ''}
                              onChange={(e) =>
                                setRejectionReasonBuffer({
                                  ...rejectionReasonBuffer,
                                  [line.inventoryItemId]: e.target.value,
                                })
                              }
                              className="w-full px-2 py-1 text-xs border border-gray-200 rounded-lg"
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsNewModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-50 rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 text-xs font-bold bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 shadow-xs disabled:opacity-50 transition-colors"
                >
                  {isSubmitting ? 'Crediting Stock...' : 'Confirm Delivery & Credit Ledger'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default function GoodsReceivingPage() {
  return (
    <Suspense fallback={<div className="p-12 text-center text-xs font-medium text-servora-deepTeal">Loading intake terminal...</div>}>
      <ReceivingContent />
    </Suspense>
  );
}